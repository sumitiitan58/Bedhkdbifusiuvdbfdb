import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Hand,
  Loader2,
  Mic,
  MicOff,
  Pause,
  Play,
  RotateCcw,
  Send,
  SkipBack,
  SkipForward,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { usePrepskm2 } from '../../context/Prepskm2Context';
import type {
  LiveTeacherLanguage,
  LiveTeacherLesson,
} from '../../utils/liveTeacherEngine';
import {
  buildLessonRequestFromVoiceQuery,
  QUICK_CLASSROOM_TOPICS,
} from '../../utils/lipSyncEngine';
import { KatexFormula, RichMathText } from '../math/KatexFormula';
import { LiveTeacherSvgBoard } from './LiveTeacherSvgBoard';
import {
  HandwrittenQuestionCard,
  HandwritingStepCard,
  StudentSketchOverlay,
  WhiteboardToolbar,
  type BoardSurfaceTheme,
} from './HandwritingWhiteboard';
import {
  requestLiveTeacherLesson,
  requestPrepsAiChat,
  requestTutorTtsAudio,
} from '../../services/geminiClient';
import { playAiSparkle, playClick, playSuccess } from '../../utils/soundEffects';

const SPEED_OPTIONS = [0.85, 1, 1.25, 1.5] as const;
const TUTOR_VIDEO_SRC = '/assets/aistudio/live_tutor_muted.mp4';

interface DoubtExchange {
  id: string;
  question: string;
  reply: string;
  latex?: string;
  stepNumber: number;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

function pickPreferredVoice(lang: LiveTeacherLanguage): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  if (lang === 'hinglish') {
    return (
      voices.find((v) => /en[-_]in/i.test(v.lang)) ||
      voices.find((v) => /hi[-_]in/i.test(v.lang)) ||
      voices.find((v) => /en/i.test(v.lang)) ||
      voices[0]
    );
  }
  return (
    voices.find((v) => /en[-_](in|us|gb)/i.test(v.lang)) ||
    voices.find((v) => /en/i.test(v.lang)) ||
    voices[0]
  );
}

export function LiveTeacherModal() {
  const { liveTeacherRequest, openLiveTeacher, closeLiveTeacher } = usePrepskm2();

  const [lesson, setLesson] = useState<LiveTeacherLesson | null>(null);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [lessonError, setLessonError] = useState<string | null>(null);
  const [lessonProvider, setLessonProvider] = useState<string | null>(null);
  const [lessonRetryNonce, setLessonRetryNonce] = useState(0);

  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [language, setLanguage] = useState<LiveTeacherLanguage>('hinglish');
  const [speed, setSpeed] = useState<(typeof SPEED_OPTIONS)[number]>(1);
  const [voiceMuted, setVoiceMuted] = useState(false);
  const [isSpeakingAudio, setIsSpeakingAudio] = useState(false);
  const [voiceEngineStatus, setVoiceEngineStatus] = useState<'gemini' | 'loading' | 'browser'>('loading');
  const [replayNonce, setReplayNonce] = useState(0);

  // Whiteboard interactive studio state
  const [boardSurface, setBoardSurface] = useState<BoardSurfaceTheme>('blackboard');
  const [annotateActive, setAnnotateActive] = useState(false);
  const [inkColor, setInkColor] = useState('#00B4FF');
  const [clearInkSignal, setClearInkSignal] = useState(0);
  const [speechProgress, setSpeechProgress] = useState(0);

  // Raise Hand / Real-Time Voice Query state
  const [handRaised, setHandRaised] = useState(false);
  const [doubtInput, setDoubtInput] = useState('');
  const [doubtLoading, setDoubtLoading] = useState(false);
  const [doubtError, setDoubtError] = useState<string | null>(null);
  const [lastAttemptedDoubt, setLastAttemptedDoubt] = useState('');
  const [doubtExchange, setDoubtExchange] = useState<DoubtExchange | null>(null);
  const [micListening, setMicListening] = useState(false);
  const [voiceQueryStatus, setVoiceQueryStatus] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const boardScrollRef = useRef<HTMLDivElement | null>(null);
  const activeStepRef = useRef<HTMLDivElement | null>(null);
  const doubtAnswerRef = useRef<HTMLDivElement | null>(null);
  const desktopVideoRef = useRef<HTMLVideoElement | null>(null);
  const mobileVideoRef = useRef<HTMLVideoElement | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const ttsCacheRef = useRef<Map<string, { audioBase64: string; mimeType: string }>>(new Map());
  const narrationSessionRef = useRef(0);

  const stopSpeech = useCallback(() => {
    narrationSessionRef.current += 1;
    if (activeAudioRef.current) {
      try {
        activeAudioRef.current.pause();
        activeAudioRef.current.src = '';
      } catch {
        // ignore audio cleanup issues
      }
      activeAudioRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore speech cancellation issues in restricted browsers
      }
    }
    setIsSpeakingAudio(false);
  }, []);

  const stopMic = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setMicListening(false);
  }, []);

  // Sync the user's strictly muted tutor video playback cleanly with lesson playing / speaking state
  useEffect(() => {
    const videos = [desktopVideoRef.current, mobileVideoRef.current].filter(
      (v): v is HTMLVideoElement => Boolean(v)
    );
    const shouldAnimateVideo = Boolean(lesson) && (isPlaying || isSpeakingAudio) && !handRaised;
    for (const video of videos) {
      video.muted = true;
      video.defaultMuted = true;
      if (shouldAnimateVideo) {
        void video.play().catch(() => {
          // ignore autoplay restriction if tab is unfocused
        });
      } else {
        try {
          video.pause();
        } catch {
          // ignore
        }
      }
    }
  }, [lesson, isPlaying, isSpeakingAudio, handRaised]);

  // Fetch 100% live AI-generated lesson whenever liveTeacherRequest changes or user retries
  useEffect(() => {
    if (!liveTeacherRequest) {
      setLesson(null);
      setLessonLoading(false);
      setLessonError(null);
      setLessonProvider(null);
      stopSpeech();
      stopMic();
      return;
    }

    let cancelled = false;
    stopSpeech();
    stopMic();
    setLesson(null);
    setLessonError(null);
    setLessonProvider(null);
    setLessonLoading(true);
    setDoubtExchange(null);
    setDoubtError(null);

    void (async () => {
      try {
        const res = await requestLiveTeacherLesson(liveTeacherRequest);
        if (cancelled) return;
        setLesson(res.lesson);
        setLessonProvider(res.provider ?? null);
        setLessonLoading(false);
      } catch (err) {
        if (cancelled) return;
        setLessonError(
          err instanceof Error
            ? err.message
            : 'Unable to generate a live whiteboard lesson right now. Please tap Retry.'
        );
        setLessonLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [liveTeacherRequest, lessonRetryNonce, stopSpeech, stopMic]);

  // Reset classroom cleanly whenever a newly generated live lesson arrives
  useEffect(() => {
    if (!lesson) {
      stopSpeech();
      stopMic();
      return;
    }
    setCurrentStepIdx(0);
    setIsPlaying(true);
    setHandRaised(false);
    setDoubtInput('');
    setDoubtError(null);
    setDoubtExchange(null);
    setVoiceQueryStatus(null);
    setReplayNonce((n) => n + 1);
    playAiSparkle();

    return () => {
      stopSpeech();
      stopMic();
    };
  }, [lesson, stopSpeech, stopMic]);

  // Escape key closes Live Classroom cleanly
  useEffect(() => {
    if (!liveTeacherRequest) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        stopSpeech();
        stopMic();
        closeLiveTeacher();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [liveTeacherRequest, closeLiveTeacher, stopSpeech, stopMic]);

  // Auto-scroll active step or doubt answer into view on the Whiteboard
  useEffect(() => {
    if (doubtExchange && doubtAnswerRef.current) {
      doubtAnswerRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }
    if (activeStepRef.current) {
      activeStepRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentStepIdx, doubtExchange]);

  const activeStep = lesson ? lesson.steps[currentStepIdx] ?? lesson.steps[0] : null;
  const activeScript = activeStep
    ? language === 'hinglish'
      ? activeStep.narrationScript
      : activeStep.englishNarrationScript
    : '';

  // Reset live speech-to-pencil progress when step or replay changes
  useEffect(() => {
    setSpeechProgress(0);
  }, [lesson, currentStepIdx, replayNonce, language]);

  // Play real Gemini Google Studio TTS (natural 18-year-old friend voice) with smooth fallback
  const speakTextWithGeminiTts = useCallback(
    async (
      text: string,
      lang: LiveTeacherLanguage,
      playbackSpeed: number,
      sessionId: number,
      onProgress: (ratio: number) => void,
      onComplete: () => void
    ) => {
      const clean = text.trim();
      if (!clean) {
        onProgress(1);
        onComplete();
        return;
      }

      const runBrowserFallback = () => {
        if (narrationSessionRef.current !== sessionId) return;
        setVoiceEngineStatus('browser');
        const estMs = Math.max(4400, Math.round((clean.length * 56) / Math.max(0.5, playbackSpeed)));
        const startedAt = performance.now();
        let rafId = 0;
        let done = false;

        const finish = () => {
          if (done || narrationSessionRef.current !== sessionId) return;
          done = true;
          window.cancelAnimationFrame(rafId);
          setIsSpeakingAudio(false);
          onProgress(1);
          onComplete();
        };

        const tick = (now: number) => {
          if (done || narrationSessionRef.current !== sessionId) return;
          const ratio = Math.max(0, Math.min(0.98, (now - startedAt) / estMs));
          onProgress(ratio);
          rafId = window.requestAnimationFrame(tick);
        };
        rafId = window.requestAnimationFrame(tick);

        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          try {
            window.speechSynthesis.cancel();
            const utt = new SpeechSynthesisUtterance(clean);
            const voice = pickPreferredVoice(lang);
            if (voice) utt.voice = voice;
            utt.lang = lang === 'hinglish' ? 'en-IN' : 'en-US';
            utt.rate = playbackSpeed;
            utt.pitch = 1.02;
            utt.onstart = () => {
              if (narrationSessionRef.current === sessionId) setIsSpeakingAudio(true);
            };
            utt.onboundary = (event) => {
              if (narrationSessionRef.current !== sessionId) return;
              if (clean.length > 0 && typeof event.charIndex === 'number') {
                onProgress(Math.max(0, Math.min(1, event.charIndex / clean.length)));
              }
            };
            utt.onend = finish;
            utt.onerror = finish;
            window.speechSynthesis.speak(utt);
            window.setTimeout(() => {
              if (!done && narrationSessionRef.current === sessionId && !window.speechSynthesis.speaking) {
                finish();
              }
            }, estMs + 1200);
            return;
          } catch {
            // fall through to timer
          }
        }
        window.setTimeout(finish, estMs);
      };

      try {
        setVoiceEngineStatus('loading');
        const cacheKey = `${lang}::${clean}`;
        let audioPayload = ttsCacheRef.current.get(cacheKey);
        if (!audioPayload) {
          audioPayload = await requestTutorTtsAudio({ text: clean, language: lang });
          ttsCacheRef.current.set(cacheKey, audioPayload);
        }

        if (narrationSessionRef.current !== sessionId) return;

        const audio = new Audio(`data:${audioPayload.mimeType};base64,${audioPayload.audioBase64}`);
        audio.playbackRate = playbackSpeed;
        activeAudioRef.current = audio;
        setVoiceEngineStatus('gemini');

        let rafId = 0;
        const trackProgress = () => {
          if (narrationSessionRef.current !== sessionId || activeAudioRef.current !== audio) return;
          if (Number.isFinite(audio.duration) && audio.duration > 0) {
            onProgress(Math.max(0, Math.min(1, audio.currentTime / audio.duration)));
          }
          if (!audio.paused && !audio.ended) {
            rafId = window.requestAnimationFrame(trackProgress);
          }
        };

        audio.onplay = () => {
          if (narrationSessionRef.current !== sessionId) return;
          setIsSpeakingAudio(true);
          rafId = window.requestAnimationFrame(trackProgress);
        };
        audio.onended = () => {
          window.cancelAnimationFrame(rafId);
          if (narrationSessionRef.current !== sessionId) return;
          setIsSpeakingAudio(false);
          onProgress(1);
          onComplete();
        };
        audio.onerror = () => {
          window.cancelAnimationFrame(rafId);
          if (narrationSessionRef.current !== sessionId) return;
          runBrowserFallback();
        };

        await audio.play();
      } catch {
        if (narrationSessionRef.current !== sessionId) return;
        runBrowserFallback();
      }
    },
    []
  );

  // Drive step narration with Gemini TTS (or clean timed progression when muted)
  useEffect(() => {
    if (!lesson || !activeStep || !isPlaying || handRaised) {
      stopSpeech();
      return;
    }

    stopSpeech();
    const sessionId = narrationSessionRef.current;
    let cancelled = false;
    let advanceTimer: number | null = null;
    let mutedRafId = 0;

    const advanceStep = () => {
      if (cancelled || narrationSessionRef.current !== sessionId) return;
      if (currentStepIdx < lesson.steps.length - 1) {
        advanceTimer = window.setTimeout(() => {
          if (!cancelled && narrationSessionRef.current === sessionId) {
            setCurrentStepIdx((idx) => Math.min(lesson.steps.length - 1, idx + 1));
          }
        }, 850);
      } else {
        setIsPlaying(false);
        playSuccess();
      }
    };

    if (voiceMuted) {
      const estMs = Math.max(4200, Math.round((activeScript.length * 48) / Math.max(0.5, speed)));
      const startedAt = performance.now();
      const tickMuted = (now: number) => {
        if (cancelled || narrationSessionRef.current !== sessionId) return;
        const ratio = Math.max(0, Math.min(1, (now - startedAt) / estMs));
        setSpeechProgress(ratio);
        if (ratio < 1) {
          mutedRafId = window.requestAnimationFrame(tickMuted);
        } else {
          advanceStep();
        }
      };
      mutedRafId = window.requestAnimationFrame(tickMuted);
    } else {
      void speakTextWithGeminiTts(
        activeScript,
        language,
        speed,
        sessionId,
        (ratio) => {
          if (!cancelled && narrationSessionRef.current === sessionId) {
            setSpeechProgress((prev) => (ratio > prev ? ratio : prev));
          }
        },
        advanceStep
      );
    }

    return () => {
      cancelled = true;
      if (advanceTimer !== null) window.clearTimeout(advanceTimer);
      window.cancelAnimationFrame(mutedRafId);
      stopSpeech();
    };
  }, [
    lesson,
    activeStep,
    activeScript,
    currentStepIdx,
    isPlaying,
    handRaised,
    language,
    speed,
    voiceMuted,
    replayNonce,
    stopSpeech,
    speakTextWithGeminiTts,
  ]);

  const handleTogglePlay = () => {
    playClick();
    if (handRaised) {
      setHandRaised(false);
      stopMic();
    }
    if (!isPlaying && lesson && currentStepIdx >= lesson.steps.length - 1) {
      setCurrentStepIdx(0);
      setIsPlaying(true);
      setReplayNonce((n) => n + 1);
      return;
    }
    setIsPlaying((p) => !p);
  };

  const handleJumpStep = (targetIdx: number) => {
    if (!lesson) return;
    playClick();
    const clamped = Math.max(0, Math.min(lesson.steps.length - 1, targetIdx));
    setHandRaised(false);
    stopMic();
    setCurrentStepIdx(clamped);
    setReplayNonce((n) => n + 1);
  };

  const handleReplayStep = () => {
    playClick();
    setHandRaised(false);
    stopMic();
    setIsPlaying(true);
    setReplayNonce((n) => n + 1);
  };

  const handleToggleRaiseHand = () => {
    playClick();
    if (!handRaised) {
      stopSpeech();
      setIsPlaying(false);
      setHandRaised(true);
    } else {
      stopMic();
      setHandRaised(false);
    }
  };

  const handleVoiceQueryTrigger = (mode: 'doubt' | 'new-topic' = 'doubt') => {
    playClick();
    if (micListening) {
      stopMic();
      return;
    }

    stopSpeech();
    setIsPlaying(false);
    setHandRaised(true);

    const SpeechRecCtor =
      (
        window as unknown as {
          SpeechRecognition?: new () => SpeechRecognitionLike;
          webkitSpeechRecognition?: new () => SpeechRecognitionLike;
        }
      ).SpeechRecognition ||
      (
        window as unknown as {
          webkitSpeechRecognition?: new () => SpeechRecognitionLike;
        }
      ).webkitSpeechRecognition;

    if (!SpeechRecCtor) {
      const sampleQuery =
        mode === 'new-topic'
          ? ''
          : lesson?.quickDoubtSuggestions?.[0] ||
            `Is step mein ${lesson?.chapterName || 'is concept'} ka formula kaise apply hua?`;
      if (sampleQuery) setDoubtInput(sampleQuery);
      setVoiceQueryStatus(
        'Browser voice input unavailable here — type your question below or pick a quick chip.'
      );
      return;
    }

    try {
      const rec = new SpeechRecCtor();
      rec.lang = language === 'hinglish' ? 'en-IN' : 'en-US';
      rec.continuous = false;
      rec.interimResults = false;
      rec.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript?.trim();
        if (!transcript) return;
        setVoiceQueryStatus(`Heard: "${transcript}"`);
        if (mode === 'new-topic' && transcript.length > 18) {
          openLiveTeacher(buildLessonRequestFromVoiceQuery(transcript));
        } else {
          setDoubtInput(transcript);
          void handleSubmitDoubt(transcript);
        }
      };
      rec.onerror = () => {
        setMicListening(false);
        setVoiceQueryStatus('Could not access microphone — type your query or tap a chip below.');
      };
      rec.onend = () => setMicListening(false);
      recognitionRef.current = rec;
      setMicListening(true);
      setVoiceQueryStatus('Listening to your voice query…');
      rec.start();
    } catch {
      setMicListening(false);
    }
  };

  const handleSubmitDoubt = async (rawDoubt: string) => {
    const cleanDoubt = rawDoubt.trim();
    if (!cleanDoubt || !lesson || !activeStep || doubtLoading) return;
    playClick();
    stopMic();
    stopSpeech();
    setDoubtLoading(true);
    setDoubtError(null);
    setLastAttemptedDoubt(cleanDoubt);
    setDoubtInput('');
    setVoiceQueryStatus(null);

    let finalReply = '';
    const finalLatex: string | undefined = activeStep.boardLatex;

    try {
      const res = await requestPrepsAiChat({
        message: `[Preps AI Live Teacher Classroom Cross-Question]\nSubject: ${lesson.subjectName}\nChapter: ${lesson.chapterName}\nTopic: ${lesson.topicTitle}\nOriginal Question: ${lesson.questionPrompt}\nCurrent Step ${activeStep.stepNumber} (${activeStep.title}): ${activeStep.boardNotes}\nFormula on Board: $${activeStep.boardLatex}$\nStudent Doubt (${language === 'hinglish' ? 'Reply strictly for this exact subject & chapter in crisp warm Hinglish like a friendly 18-year-old JEE/NEET peer mentor' : 'Reply strictly for this exact subject & chapter in crisp clear English like a friendly 18-year-old peer mentor'} in 2-4 sentences, wrapping math in $...$): "${cleanDoubt}"`,
        history: [],
        studentContext: {
          source: 'live-teacher-raise-hand',
          subject: lesson.subjectName,
          chapter: lesson.chapterName,
          topic: lesson.topicTitle,
          stepNumber: activeStep.stepNumber,
        },
      });
      finalReply = res.reply;
    } catch (err) {
      setDoubtError(
        err instanceof Error
          ? err.message
          : 'Live AI Tutor could not resolve this doubt right now. Please tap Retry.'
      );
      setDoubtLoading(false);
      return;
    }

    setDoubtExchange({
      id: `doubt-${Date.now()}`,
      question: cleanDoubt,
      reply: finalReply,
      latex: finalLatex,
      stepNumber: activeStep.stepNumber,
    });
    setDoubtLoading(false);
    playAiSparkle();

    if (!voiceMuted) {
      const spokenText = finalReply.replace(/\$\$?[^$]+\$\$?/g, 'the formula shown on the board');
      const sessionId = narrationSessionRef.current;
      void speakTextWithGeminiTts(spokenText, language, speed, sessionId, () => {}, () => {});
    }
  };

  const handleResumeAfterDoubt = () => {
    playSuccess();
    stopSpeech();
    stopMic();
    setHandRaised(false);
    setIsPlaying(true);
    setReplayNonce((n) => n + 1);
  };

  const isLightBoard = boardSurface === 'whiteboard';

  return (
    <AnimatePresence>
      {liveTeacherRequest && (!lesson || !activeStep) && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Preps AI Live Teacher Classroom"
          data-testid="live-teacher-modal-status"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] w-screen h-screen bg-[#070B14] flex items-center justify-center p-6"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="w-full max-w-xl rounded-2xl bg-[#0D1324] border border-[#00B4FF]/35 shadow-[0_24px_70px_rgba(0,0,0,0.85)] p-6 space-y-4 text-slate-100"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#00B4FF]">
                  Preps AI Live Classroom · Full-Screen Tutor
                </p>
                <h2 className="font-display text-lg font-extrabold text-white mt-0.5 truncate">
                  {liveTeacherRequest.subjectName || liveTeacherRequest.chapterName
                    ? [liveTeacherRequest.subjectName, liveTeacherRequest.chapterName]
                        .filter(Boolean)
                        .join(' · ')
                    : 'Preparing Your Exact Solution'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  playClick();
                  stopSpeech();
                  stopMic();
                  closeLiveTeacher();
                }}
                aria-label="Close Live Teacher Classroom"
                className="inline-flex items-center justify-center h-9 w-9 rounded-xl bg-white/5 hover:bg-rose-500/20 border border-white/10 text-slate-300 hover:text-rose-300 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-xl bg-[#070B14] border border-white/10 p-3.5 text-xs sm:text-sm text-slate-300 leading-relaxed line-clamp-4">
              {liveTeacherRequest.questionText}
            </div>

            {lessonLoading ? (
              <div className="flex items-center gap-3 py-3 text-sm text-[#00B4FF]">
                <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                <span>
                  Preparing your full-screen live whiteboard and voice explanation…
                </span>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-400/40 text-xs sm:text-sm text-rose-200 leading-relaxed">
                  {lessonError || 'Unable to generate the live whiteboard lesson right now.'}
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      playClick();
                      closeLiveTeacher();
                    }}
                    className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-300 hover:text-white transition-colors"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playClick();
                      setLessonRetryNonce((n) => n + 1);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00B4FF] hover:bg-[#33C4FF] text-[#070A12] text-xs font-extrabold transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Retry Live AI Lesson
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}

      {lesson && activeStep && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Preps AI Live Teacher Classroom"
          data-testid="live-teacher-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] w-screen h-screen bg-[#070B14] flex flex-col overflow-hidden text-slate-100"
        >
          {/* TOP FULL-SCREEN CLASSROOM HEADER BAR */}
          <header className="px-4 sm:px-6 py-2.5 bg-[#070B14] border-b border-white/10 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="min-w-0">
                <h2 className="font-display text-sm sm:text-base font-extrabold text-white truncate">
                  Explain Like a Teacher · {lesson.topicTitle}
                </h2>
                <p className="text-[11px] text-slate-400 truncate">
                  {lesson.subjectName} · {lesson.chapterName} · Step {currentStepIdx + 1} of{' '}
                  {lesson.steps.length}: {activeStep.title}
                  {lessonProvider ? ` · ${lessonProvider}` : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Hinglish / English 1-Click Toggle */}
              <div
                role="group"
                aria-label="Narration language"
                className="inline-flex items-center p-0.5 rounded-xl bg-[#0D1324] border border-white/10 text-[11px] font-bold"
              >
                {(
                  [
                    { id: 'hinglish', label: 'Hinglish' },
                    { id: 'english', label: 'English' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={language === opt.id}
                    onClick={() => {
                      playClick();
                      setLanguage(opt.id);
                      setReplayNonce((n) => n + 1);
                    }}
                    className={`px-2.5 py-1 rounded-lg whitespace-nowrap transition-colors ${
                      language === opt.id
                        ? 'bg-[#00B4FF] text-[#070A12]'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Playback Speed Selector */}
              <div
                role="group"
                aria-label="Playback speed"
                className="hidden sm:inline-flex items-center p-0.5 rounded-xl bg-[#0D1324] border border-white/10 font-mono text-[11px] font-bold"
              >
                {SPEED_OPTIONS.map((sp) => (
                  <button
                    key={sp}
                    type="button"
                    aria-pressed={speed === sp}
                    onClick={() => {
                      playClick();
                      setSpeed(sp);
                      setReplayNonce((n) => n + 1);
                    }}
                    className={`px-2 py-1 rounded-lg whitespace-nowrap transition-colors ${
                      speed === sp
                        ? 'bg-[#F27B13] text-[#070A12]'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {sp}x
                  </button>
                ))}
              </div>

              {/* Audio Mute Toggle */}
              <button
                type="button"
                onClick={() => {
                  playClick();
                  setVoiceMuted((m) => !m);
                }}
                aria-label={voiceMuted ? 'Unmute teacher voice' : 'Mute teacher voice'}
                title={voiceMuted ? 'Unmute teacher voice' : 'Mute teacher voice'}
                className="inline-flex items-center justify-center h-8 w-8 rounded-xl bg-[#0D1324] border border-white/10 text-slate-300 hover:border-[#00B4FF] hover:text-[#00B4FF] transition-colors"
              >
                {voiceMuted ? (
                  <VolumeX className="w-4 h-4 text-slate-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-[#00B4FF]" />
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  playClick();
                  stopSpeech();
                  stopMic();
                  closeLiveTeacher();
                }}
                aria-label="Close Live Teacher Classroom"
                className="inline-flex items-center justify-center h-8 w-8 rounded-xl bg-white/5 hover:bg-rose-500/20 border border-white/10 hover:border-rose-400/50 text-slate-300 hover:text-rose-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* FULL-SCREEN STAGE: User's Muted Tutor Video (Left) + Dynamic Handwriting Whiteboard (Right) */}
          <div className="relative flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
            {/* DESKTOP LEFT STAGE: Strictly Muted Uploaded Tutor Video (Zero Other Avatars) */}
            <aside
              aria-label="AI Tutor Video Stage"
              className="hidden lg:flex lg:w-[300px] xl:w-[340px] shrink-0 relative flex-col justify-between gap-3 px-4 py-4 bg-gradient-to-b from-[#0B0F19] via-[#0B1222] to-[#080C16] border-r border-white/[0.08] overflow-hidden select-none"
            >
              <div className="flex items-center justify-between gap-2 text-[11px] font-mono shrink-0">
                <span
                  data-testid="teacher-pose-badge"
                  className={`font-bold truncate ${
                    handRaised || micListening
                      ? 'text-[#00B4FF]'
                      : isPlaying || isSpeakingAudio
                        ? 'text-[#10B981]'
                        : 'text-slate-400'
                  }`}
                >
                  {micListening
                    ? 'Listening to voice…'
                    : handRaised
                      ? 'Listening to your doubt…'
                      : isPlaying || isSpeakingAudio
                        ? `Explaining · Step ${currentStepIdx + 1}`
                        : 'Paused on Board'}
                </span>
                <span className="text-[10px] text-slate-400 uppercase">
                  {voiceMuted
                    ? 'Muted'
                    : voiceEngineStatus === 'gemini'
                      ? 'Gemini Voice'
                      : voiceEngineStatus === 'loading'
                        ? 'Syncing Voice'
                        : 'Voice Active'}
                </span>
              </div>

              {/* Dedicated Muted Uploaded Tutor Video */}
              <div className="relative flex-1 min-h-0 rounded-2xl overflow-hidden border border-[#00B4FF]/25 bg-[#050810] shadow-[0_14px_34px_rgba(0,0,0,0.65)]">
                <video
                  ref={desktopVideoRef}
                  data-testid="live-tutor-video"
                  src={TUTOR_VIDEO_SRC}
                  muted
                  loop
                  playsInline
                  autoPlay
                  className="w-full h-full object-cover"
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#070B14]/90 via-[#070B14]/35 to-transparent" />
                <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-white drop-shadow">
                    Preps AI Study Friend
                  </span>
                  <span className="text-[10px] font-mono text-[#00B4FF] uppercase">
                    {language} · {speed}x
                  </span>
                </div>
              </div>

              {/* Real-Time Voice Query Quick CTA */}
              <button
                type="button"
                onClick={() => handleVoiceQueryTrigger('new-topic')}
                className={`w-full shrink-0 py-2.5 px-3 rounded-xl border text-xs font-extrabold inline-flex items-center justify-center gap-2 transition-all whitespace-nowrap ${
                  micListening
                    ? 'bg-rose-600 border-rose-400 text-white shadow-[0_0_18px_rgba(244,63,94,0.45)]'
                    : 'bg-[#0D162C] border-[#00B4FF]/40 text-[#00B4FF] hover:bg-[#00B4FF]/15'
                }`}
              >
                {micListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                <span>{micListening ? 'Stop Listening' : 'Ask New Voice Query'}</span>
              </button>
            </aside>

            {/* RIGHT / MAIN STAGE: FULL-SCREEN DYNAMIC HANDWRITING WHITEBOARD */}
            <div
              ref={boardScrollRef}
              data-testid="dynamic-whiteboard-stage"
              data-surface={boardSurface}
              className={`relative flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 lg:px-7 py-4 space-y-4 transition-colors duration-200 ${
                isLightBoard ? 'live-whiteboard-grid text-slate-900' : 'live-blackboard-grid text-slate-100'
              }`}
            >
              {/* Mobile Compact Muted Tutor Video Strip */}
              <div className="lg:hidden flex items-center gap-3 rounded-xl border border-white/10 bg-[#0D1528]/90 p-2">
                <div className="w-16 h-16 rounded-lg overflow-hidden border border-[#00B4FF]/30 bg-black shrink-0">
                  <video
                    ref={mobileVideoRef}
                    src={TUTOR_VIDEO_SRC}
                    muted
                    loop
                    playsInline
                    autoPlay
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white truncate">
                    Preps AI Study Friend · Step {currentStepIdx + 1}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {voiceMuted ? 'Voice muted' : 'Natural peer voice active'} · {language}
                  </p>
                </div>
              </div>

              {/* Whiteboard Surface, Annotation & Quick Problem Switcher Bar */}
              <div
                className={`relative z-30 rounded-xl border p-2.5 sm:p-3 space-y-2.5 ${
                  isLightBoard
                    ? 'bg-white/95 border-slate-200 shadow-sm'
                    : 'bg-[#0D1528]/90 border-white/10'
                }`}
              >
                <WhiteboardToolbar
                  surface={boardSurface}
                  onChangeSurface={(next) => {
                    playClick();
                    setBoardSurface(next);
                  }}
                  annotateActive={annotateActive}
                  onToggleAnnotate={() => {
                    playClick();
                    setAnnotateActive((a) => !a);
                  }}
                  inkColor={inkColor}
                  onSelectInkColor={setInkColor}
                  onClearInk={() => {
                    playClick();
                    setClearInkSignal((n) => n + 1);
                  }}
                />

                {/* Quick Interactive Live-Class Problem Switcher */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                  <span
                    className={`text-[10px] font-mono font-bold uppercase shrink-0 ${
                      isLightBoard ? 'text-slate-500' : 'text-slate-400'
                    }`}
                  >
                    Live Problems:
                  </span>
                  {QUICK_CLASSROOM_TOPICS.map((topic) => (
                    <button
                      key={topic.id}
                      type="button"
                      onClick={() => {
                        playClick();
                        openLiveTeacher({
                          subjectName: topic.subjectName,
                          chapterName: topic.chapterName,
                          questionText: topic.questionText,
                          source: 'preps-ai',
                        });
                      }}
                      className={`px-2 py-1 rounded-lg border text-[11px] font-semibold whitespace-nowrap shrink-0 transition-colors ${
                        lesson.topicTitle.includes(topic.chapterName.split(' ')[0])
                          ? isLightBoard
                            ? 'bg-[#1D56C6] border-[#1D56C6] text-white'
                            : 'bg-[#00B4FF]/20 border-[#00B4FF] text-[#00B4FF]'
                          : isLightBoard
                            ? 'bg-slate-50 border-slate-200 text-slate-700 hover:border-[#1D56C6]'
                            : 'bg-[#070B14] border-white/10 text-slate-300 hover:border-white/30'
                      }`}
                    >
                      {topic.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Annotatable Whiteboard Canvas Area */}
              <div className="relative space-y-4">
                <StudentSketchOverlay
                  active={annotateActive}
                  inkColor={inkColor}
                  clearSignal={clearInkSignal}
                />

                <HandwrittenQuestionCard
                  questionPrompt={lesson.questionPrompt}
                  studentAnswer={lesson.studentAnswer}
                  officialAnswer={lesson.officialAnswer}
                  surface={boardSurface}
                  speechProgress={speechProgress}
                  isFirstStep={currentStepIdx === 0}
                  isPlaying={isPlaying}
                  replayNonce={replayNonce}
                />

                <div className="relative z-10 grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
                  {/* SEQUENTIAL ANIMATED HANDWRITING STEPS */}
                  <div className="xl:col-span-7 space-y-3">
                    {lesson.steps.slice(0, currentStepIdx + 1).map((step, idx) => {
                      const isCurrent = idx === currentStepIdx;
                      return (
                        <HandwritingStepCard
                          key={`${lesson.id}-step-${step.stepNumber}`}
                          step={step}
                          isCurrent={isCurrent}
                          isPlaying={isPlaying}
                          speed={speed}
                          replayNonce={replayNonce}
                          handRaised={handRaised}
                          surface={boardSurface}
                          speechProgress={isCurrent ? speechProgress : 1}
                          onSelectStep={() => handleJumpStep(idx)}
                          cardRef={isCurrent ? activeStepRef : undefined}
                        />
                      );
                    })}

                    {/* INLINE WHITEBOARD DOUBT RESOLUTION CARD */}
                    <AnimatePresence>
                      {doubtExchange && (
                        <motion.div
                          key={doubtExchange.id}
                          ref={doubtAnswerRef}
                          data-testid="live-teacher-doubt-answer"
                          initial={{ opacity: 0, y: 14, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10 }}
                          className={`rounded-2xl border p-4 space-y-2.5 ${
                            isLightBoard
                              ? 'border-emerald-300 bg-emerald-50/90 text-slate-900'
                              : 'border-[#10B981]/55 bg-gradient-to-br from-[#0D1F28] to-[#0B1626] text-slate-100 shadow-[0_0_24px_rgba(16,185,129,0.18)]'
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span
                              className={`inline-flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wider ${
                                isLightBoard ? 'text-emerald-700' : 'text-[#10B981]'
                              }`}
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              Doubt Resolved on Board (Step {doubtExchange.stepNumber})
                            </span>
                            <button
                              type="button"
                              onClick={handleResumeAfterDoubt}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#10B981] hover:bg-emerald-400 text-[#070A12] text-xs font-extrabold transition-colors"
                            >
                              <Play className="w-3 h-3" />
                              Resume Lesson
                            </button>
                          </div>
                          <p
                            className={`text-xs font-semibold ${
                              isLightBoard ? 'text-amber-800' : 'text-amber-300'
                            }`}
                          >
                            Your Doubt: &ldquo;{doubtExchange.question}&rdquo;
                          </p>
                          <div className="font-handwriting text-lg sm:text-xl leading-snug whitespace-pre-line">
                            <RichMathText text={doubtExchange.reply} />
                          </div>
                          {doubtExchange.latex && (
                            <div
                              className={`px-3 py-2 rounded-xl border overflow-x-auto ${
                                isLightBoard
                                  ? 'bg-white border-emerald-300'
                                  : 'bg-[#070B14] border-[#10B981]/30'
                              }`}
                            >
                              <KatexFormula
                                latex={doubtExchange.latex}
                                className={`text-sm font-bold ${
                                  isLightBoard ? 'text-emerald-800' : 'text-[#10B981]'
                                }`}
                              />
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* ANIMATED SVG DIAGRAM + LIVE AUDIO SCRIPT + ROADMAP */}
                  <div className="xl:col-span-5 space-y-3 xl:sticky xl:top-0">
                    <LiveTeacherSvgBoard
                      svgType={activeStep.svgType}
                      activeStep={activeStep.stepNumber}
                    />

                    {/* Live Audio Caption Card with Real-Time Audio <-> Pencil Sync Bar */}
                    <div
                      className={`rounded-xl border p-3.5 space-y-2 ${
                        isLightBoard
                          ? 'border-slate-200 bg-white text-slate-800'
                          : 'border-white/10 bg-[#0D1324]/90 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
                        <span className="font-bold uppercase tracking-wider text-[#F27B13]">
                          Tutor Voice Script ({language === 'hinglish' ? 'Hinglish' : 'English'})
                        </span>
                        <span className={isLightBoard ? 'text-slate-500' : 'text-slate-400'}>
                          {speed}x · Sync {Math.round(speechProgress * 100)}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#00B4FF] to-[#F27B13] transition-[width] duration-75"
                          style={{ width: `${Math.round(speechProgress * 100)}%` }}
                        />
                      </div>
                      <p className="text-xs leading-relaxed italic">
                        &ldquo;{activeScript}&rdquo;
                      </p>
                    </div>

                    {/* Quick 1-Tap Step Summary Checklist */}
                    <div
                      className={`rounded-xl border p-3 space-y-2 ${
                        isLightBoard
                          ? 'border-slate-200 bg-white text-slate-800'
                          : 'border-white/10 bg-[#0D1324]/75 text-slate-200'
                      }`}
                    >
                      <p
                        className={`text-[10px] font-mono font-bold uppercase tracking-wider ${
                          isLightBoard ? 'text-slate-500' : 'text-slate-400'
                        }`}
                      >
                        Lesson Roadmap
                      </p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {lesson.steps.map((s, idx) => {
                          const unlocked = idx <= currentStepIdx;
                          const isCurr = idx === currentStepIdx;
                          return (
                            <button
                              key={s.stepNumber}
                              type="button"
                              onClick={() => handleJumpStep(idx)}
                              className={`text-left px-2.5 py-2 rounded-lg border text-[11px] leading-tight font-semibold transition-colors ${
                                isCurr
                                  ? isLightBoard
                                    ? 'bg-[#1D56C6] border-[#1D56C6] text-white'
                                    : 'bg-[#00B4FF]/20 border-[#00B4FF] text-white'
                                  : unlocked
                                    ? isLightBoard
                                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                      : 'bg-[#10B981]/10 border-[#10B981]/35 text-emerald-200'
                                    : isLightBoard
                                      ? 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-400'
                                      : 'bg-[#070B14] border-white/10 text-slate-400 hover:border-white/25'
                              }`}
                            >
                              <span className="font-mono font-bold mr-1">S{s.stepNumber}.</span>
                              {s.title}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RAISE HAND / REAL-TIME VOICE DOUBT DRAWER */}
          <AnimatePresence>
            {handRaised && (
              <motion.div
                data-testid="live-teacher-doubt-panel"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-[#00B4FF]/40 bg-[#081022] px-4 sm:px-6 py-3 space-y-2.5 shrink-0 overflow-hidden"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00B4FF]">
                    <Hand className="w-4 h-4 text-amber-300" />
                    Hand Raised — Lesson Paused on Step {activeStep.stepNumber}. Speak or type your doubt:
                  </span>
                  <button
                    type="button"
                    onClick={handleResumeAfterDoubt}
                    className="text-xs font-semibold text-slate-300 hover:text-white underline"
                  >
                    Resume Lesson
                  </button>
                </div>

                {voiceQueryStatus && (
                  <p className="text-[11px] font-mono text-amber-300">{voiceQueryStatus}</p>
                )}

                {doubtError && (
                  <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-rose-500/15 border border-rose-400/40 text-xs text-rose-200">
                    <span>{doubtError}</span>
                    {lastAttemptedDoubt && (
                      <button
                        type="button"
                        onClick={() => void handleSubmitDoubt(lastAttemptedDoubt)}
                        className="px-2.5 py-1 rounded-lg bg-rose-500/30 hover:bg-rose-500/45 text-white font-bold text-[11px] transition-colors"
                      >
                        Retry
                      </button>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5">
                  {lesson.quickDoubtSuggestions.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      data-testid="doubt-chip"
                      disabled={doubtLoading}
                      onClick={() => void handleSubmitDoubt(chip)}
                      className="px-2.5 py-1 rounded-lg bg-[#0D1730] border border-[#00B4FF]/30 hover:border-[#00B4FF] text-[11px] font-semibold text-slate-200 hover:text-[#00B4FF] transition-colors"
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleSubmitDoubt(doubtInput);
                  }}
                  className="flex items-center gap-2"
                >
                  <button
                    type="button"
                    onClick={() => handleVoiceQueryTrigger('doubt')}
                    aria-label={micListening ? 'Stop voice doubt input' : 'Ask doubt with microphone'}
                    className={`h-10 px-3 rounded-xl inline-flex items-center gap-1.5 text-xs font-bold border transition-colors shrink-0 ${
                      micListening
                        ? 'bg-rose-600 border-rose-500 text-white'
                        : 'bg-[#0D1324] border-white/15 text-slate-200 hover:border-[#00B4FF]'
                    }`}
                  >
                    {micListening ? (
                      <MicOff className="w-4 h-4" />
                    ) : (
                      <Mic className="w-4 h-4 text-[#00B4FF]" />
                    )}
                    <span className="hidden sm:inline">{micListening ? 'Listening…' : 'Speak'}</span>
                  </button>

                  <input
                    type="text"
                    value={doubtInput}
                    onChange={(e) => setDoubtInput(e.target.value)}
                    placeholder={`Ask any doubt about ${lesson.chapterName} (Step ${activeStep.stepNumber})...`}
                    aria-label="Type your doubt for Preps AI Live Teacher"
                    className="flex-1 min-w-0 h-10 px-3.5 rounded-xl bg-[#0D1324] border border-white/15 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#00B4FF]"
                  />

                  <button
                    type="submit"
                    disabled={doubtLoading || !doubtInput.trim()}
                    className="h-10 px-4 rounded-xl bg-[#00B4FF] hover:bg-[#33C4FF] disabled:opacity-40 text-[#070A12] text-xs sm:text-sm font-extrabold inline-flex items-center gap-1.5 shrink-0 transition-colors"
                  >
                    {doubtLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Ask Board
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* BOTTOM PLAYER BAR */}
          <footer className="px-4 sm:px-6 py-2.5 bg-[#070B14] border-t border-white/10 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                disabled={currentStepIdx === 0}
                onClick={() => handleJumpStep(currentStepIdx - 1)}
                aria-label="Previous step"
                className="h-9 w-9 rounded-xl bg-[#0D1324] border border-white/10 hover:border-[#00B4FF] disabled:opacity-40 inline-flex items-center justify-center text-slate-200 transition-colors"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleTogglePlay}
                aria-label={isPlaying ? 'Pause lesson narration' : 'Play lesson narration'}
                className="h-9 px-3.5 rounded-xl bg-[#00B4FF] hover:bg-[#33C4FF] text-[#070A12] font-display text-xs sm:text-sm font-extrabold inline-flex items-center gap-1.5 shadow-[0_0_18px_rgba(0,180,255,0.35)] whitespace-nowrap transition-colors"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{isPlaying ? 'Pause' : 'Play'}</span>
              </button>

              <button
                type="button"
                disabled={currentStepIdx >= lesson.steps.length - 1}
                onClick={() => handleJumpStep(currentStepIdx + 1)}
                aria-label="Next step"
                className="h-9 w-9 rounded-xl bg-[#0D1324] border border-white/10 hover:border-[#00B4FF] disabled:opacity-40 inline-flex items-center justify-center text-slate-200 transition-colors"
              >
                <SkipForward className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleReplayStep}
                aria-label="Replay current step"
                title="Replay current step"
                className="h-9 px-2.5 rounded-xl bg-[#0D1324] border border-white/10 hover:border-[#00B4FF] text-xs font-semibold text-slate-300 hover:text-white inline-flex items-center gap-1 whitespace-nowrap transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Replay</span>
              </button>
            </div>

            <div
              role="tablist"
              aria-label="Lesson step timeline"
              className="flex items-center gap-1.5 overflow-x-auto"
            >
              {lesson.steps.map((s, idx) => {
                const isActive = idx === currentStepIdx;
                const isDone = idx < currentStepIdx;
                return (
                  <button
                    key={s.stepNumber}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => handleJumpStep(idx)}
                    className={`h-8 px-2.5 rounded-lg font-mono text-xs font-bold border transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-[#00B4FF]/20 border-[#00B4FF] text-[#00B4FF] shadow-[0_0_12px_rgba(0,180,255,0.28)]'
                        : isDone
                          ? 'bg-[#10B981]/15 border-[#10B981]/45 text-[#10B981]'
                          : 'bg-[#0D1324] border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    Step {s.stepNumber}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleToggleRaiseHand}
              aria-pressed={handRaised}
              className={`h-9 px-3.5 rounded-xl font-display text-xs sm:text-sm font-extrabold inline-flex items-center gap-1.5 border whitespace-nowrap transition-all shrink-0 ${
                handRaised
                  ? 'bg-[#F27B13] border-amber-300 text-[#070A12] shadow-[0_0_20px_rgba(242,123,19,0.45)]'
                  : 'bg-[#F27B13]/15 border-[#F27B13]/50 text-amber-300 hover:bg-[#F27B13]/25'
              }`}
            >
              <Hand className="w-4 h-4" />
              <span>{handRaised ? 'Listening…' : 'Raise Hand'}</span>
            </button>
          </footer>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
