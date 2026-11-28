import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Hand,
  Loader2,
  LogOut,
  Mic,
  MicOff,
  MoreVertical,
  Pause,
  Play,
  RotateCcw,
  Send,
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
import { KatexFormula, RichMathText } from '../math/KatexFormula';
import { LiveTeacherSvgBoard } from './LiveTeacherSvgBoard';
import {
  HandwrittenQuestionCard,
  HandwritingStepCard,
  PencilWritingNib,
  type BoardSurfaceTheme,
} from './HandwritingWhiteboard';
import {
  requestLiveTeacherLesson,
  requestPrepsAiChat,
  requestTutorTtsAudio,
} from '../../services/geminiClient';
import { playAiSparkle, playClick, playSuccess } from '../../utils/soundEffects';
import { detectTutorResponseLanguage } from '../../utils/tutorLanguagePolicy';
import { selectBestIndianVoice } from '../../utils/speakText';

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
  return selectBestIndianVoice(voices, lang);
}

function stripLatexToReadable(text: string): string {
  return text
    .replace(/\$\$([^$]+)\$\$/g, '$1')
    .replace(/\$([^$]+)\$/g, '$1')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
    .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
    .replace(/\\theta/g, 'θ')
    .replace(/\\mu/g, 'μ')
    .replace(/\\pi/g, 'π')
    .replace(/\\times/g, '×')
    .replace(/\\/g, '')
    .trim();
}

/**
 * Splits a narration script into fast 1-2 sentence chunks so real Gemini TTS
 * begins speaking the first sentence almost immediately while pre-fetching the next chunk.
 */
function splitIntoRealtimeChunks(text: string): string[] {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];
  if (normalized.length <= 155) return [normalized];
  const sentences = normalized
    .split(/(?<=[.!?।])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (sentences.length <= 1) return [normalized];

  const chunks: string[] = [];
  let current = '';
  for (const sentence of sentences) {
    if (!current) {
      current = sentence;
    } else if (current.length + sentence.length + 1 <= 175 && chunks.length > 0) {
      current = `${current} ${sentence}`;
    } else {
      chunks.push(current);
      current = sentence;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

export function LiveTeacherModal() {
  const { liveTeacherRequest, closeLiveTeacher } = usePrepskm2();

  const [lesson, setLesson] = useState<LiveTeacherLesson | null>(null);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [lessonError, setLessonError] = useState<string | null>(null);
  const [lessonRetryNonce, setLessonRetryNonce] = useState(0);

  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [language, setLanguage] = useState<LiveTeacherLanguage>('hinglish');
  const [speed, setSpeed] = useState<(typeof SPEED_OPTIONS)[number]>(1);
  const [voiceMuted, setVoiceMuted] = useState(false);
  const [isSpeakingAudio, setIsSpeakingAudio] = useState(false);
  const [replayNonce, setReplayNonce] = useState(0);

  // Board surface & compact 3-dot settings menu
  const [boardSurface, setBoardSurface] = useState<BoardSurfaceTheme>('blackboard');
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [speechProgress, setSpeechProgress] = useState(0);

  // Raise Hand & Live Doubt Resolution (preserving original steps + active avatar + animated pencil)
  const [handRaised, setHandRaised] = useState(false);
  const [doubtInput, setDoubtInput] = useState('');
  const [doubtLoading, setDoubtLoading] = useState(false);
  const [doubtError, setDoubtError] = useState<string | null>(null);
  const [lastAttemptedDoubt, setLastAttemptedDoubt] = useState('');
  const [doubtExchanges, setDoubtExchanges] = useState<DoubtExchange[]>([]);
  const [activeDoubtId, setActiveDoubtId] = useState<string | null>(null);
  const [doubtWritingProgress, setDoubtWritingProgress] = useState(1);
  const [isExplainingDoubt, setIsExplainingDoubt] = useState(false);
  const [micListening, setMicListening] = useState(false);
  const [voiceQueryStatus, setVoiceQueryStatus] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const boardScrollRef = useRef<HTMLDivElement | null>(null);
  const activeStepRef = useRef<HTMLDivElement | null>(null);
  const doubtAnswerRef = useRef<HTMLDivElement | null>(null);
  const desktopVideoRef = useRef<HTMLVideoElement | null>(null);
  const mobileVideoRef = useRef<HTMLVideoElement | null>(null);
  const settingsPopoverRef = useRef<HTMLDivElement | null>(null);
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
        // ignore
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

  // Close 3-dot settings menu on outside click
  useEffect(() => {
    if (!settingsMenuOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (settingsPopoverRef.current && !settingsPopoverRef.current.contains(e.target as Node)) {
        setSettingsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [settingsMenuOpen]);

  const isWritingStepNow = Boolean(lesson) && isPlaying && speechProgress < 0.99;
  const isWritingDoubtNow = Boolean(activeDoubtId) && doubtWritingProgress < 0.99;
  // Video MUST remain actively ON whenever AI Tutor is writing OR speaking (steps OR live doubts)!
  const shouldAnimateVideo =
    Boolean(lesson) &&
    (isWritingStepNow ||
      isWritingDoubtNow ||
      isSpeakingAudio ||
      isExplainingDoubt ||
      doubtLoading ||
      (isPlaying && !handRaised));

  const syncTutorVideoPlayback = useCallback(() => {
    const videos = [desktopVideoRef.current, mobileVideoRef.current].filter(
      (v): v is HTMLVideoElement => Boolean(v)
    );
    for (const video of videos) {
      video.muted = true;
      video.defaultMuted = true;
      video.loop = true;
      if (shouldAnimateVideo) {
        if (video.paused) {
          void video.play().catch(() => {
            // ignore autoplay policy rejection before interaction
          });
        }
      } else {
        try {
          if (!video.paused) video.pause();
        } catch {
          // ignore
        }
      }
    }
  }, [shouldAnimateVideo]);

  useEffect(() => {
    syncTutorVideoPlayback();
  }, [syncTutorVideoPlayback]);

  // Fetch 100% live AI-generated lesson whenever liveTeacherRequest changes or user retries
  useEffect(() => {
    if (!liveTeacherRequest) {
      setLesson(null);
      setLessonLoading(false);
      setLessonError(null);
      setSettingsMenuOpen(false);
      stopSpeech();
      stopMic();
      return;
    }

    let cancelled = false;
    stopSpeech();
    stopMic();
    setLesson(null);
    setLessonError(null);
    setLessonLoading(true);
    setLanguage(
      liveTeacherRequest.preferredLanguage ??
        detectTutorResponseLanguage(liveTeacherRequest.questionText)
    );
    setDoubtExchanges([]);
    setActiveDoubtId(null);
    setDoubtWritingProgress(1);
    setIsExplainingDoubt(false);
    setDoubtError(null);

    void (async () => {
      try {
        const res = await requestLiveTeacherLesson(liveTeacherRequest);
        if (cancelled) return;
        setLesson(res.lesson);
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
    setSettingsMenuOpen(false);
    setDoubtInput('');
    setDoubtError(null);
    setDoubtExchanges([]);
    setActiveDoubtId(null);
    setIsExplainingDoubt(false);
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
        if (settingsMenuOpen) {
          setSettingsMenuOpen(false);
          return;
        }
        stopSpeech();
        stopMic();
        closeLiveTeacher();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [liveTeacherRequest, settingsMenuOpen, closeLiveTeacher, stopSpeech, stopMic]);

  // Continuous smooth auto-scroll keeping active step or active doubt line centered in viewport
  useEffect(() => {
    if (activeDoubtId && doubtAnswerRef.current) {
      doubtAnswerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (activeStepRef.current) {
      activeStepRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentStepIdx, activeDoubtId, doubtExchanges.length]);

  const activeStep = lesson ? lesson.steps[currentStepIdx] ?? lesson.steps[0] : null;
  const activeScript = activeStep
    ? language === 'hinglish'
      ? activeStep.narrationScript
      : activeStep.englishNarrationScript
    : '';

  useEffect(() => {
    setSpeechProgress(0);
  }, [lesson, currentStepIdx, replayNonce, language]);

  // Fetch & cache real Gemini TTS audio chunk (supports parallel lookahead pre-fetching without ever rejecting)
  const fetchOrGetCachedTts = useCallback(
    async (
      text: string,
      lang: LiveTeacherLanguage
    ): Promise<{ audioBase64: string; mimeType: string } | null> => {
      const cacheKey = `${lang}::${text}`;
      const hit = ttsCacheRef.current.get(cacheKey);
      if (hit) return hit;
      const fetched = await requestTutorTtsAudio({ text, language: lang }).catch(() => null);
      if (fetched) {
        ttsCacheRef.current.set(cacheKey, fetched);
      }
      return fetched;
    },
    []
  );

  // Lookahead pre-fetch next step's first real-voice chunk while current step plays
  useEffect(() => {
    if (!lesson || voiceMuted) return;
    const nextStep = lesson.steps[currentStepIdx + 1];
    if (!nextStep) return;
    const nextScript =
      language === 'hinglish' ? nextStep.narrationScript : nextStep.englishNarrationScript;
    const firstChunk = splitIntoRealtimeChunks(nextScript)[0];
    if (firstChunk) {
      void fetchOrGetCachedTts(firstChunk, language).catch(() => {
        // silent background prefetch
      });
    }
  }, [lesson, currentStepIdx, language, voiceMuted, fetchOrGetCachedTts]);

  // Real-time sentence-chunked Gemini TTS pipeline with zero-stall fallback
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

      const chunks = splitIntoRealtimeChunks(clean);
      const totalChars = Math.max(1, chunks.reduce((acc, c) => acc + c.length, 0));
      let finished = false;
      let progressRaf = 0;

      const completeOnce = () => {
        if (finished || narrationSessionRef.current !== sessionId) return;
        finished = true;
        window.cancelAnimationFrame(progressRaf);
        setIsSpeakingAudio(false);
        onProgress(1);
        onComplete();
      };

      const runBrowserFallbackForText = (chunkText: string, startShare: number, shareSpan: number) =>
        new Promise<void>((resolve) => {
          if (finished || narrationSessionRef.current !== sessionId) {
            resolve();
            return;
          }
          const wordCount = Math.max(4, chunkText.split(/\s+/).length);
          const estMs = Math.max(2600, Math.round((wordCount * 390) / Math.max(0.5, playbackSpeed)));
          let settled = false;
          const finishChunk = () => {
            if (settled) return;
            settled = true;
            window.cancelAnimationFrame(progressRaf);
            onProgress(Math.min(0.99, startShare + shareSpan));
            resolve();
          };
          const safety = window.setTimeout(finishChunk, estMs + 2600);
          const startedAt = performance.now();
          const tick = (now: number) => {
            if (settled || finished || narrationSessionRef.current !== sessionId) return;
            const localRatio = Math.max(0, Math.min(0.98, (now - startedAt) / estMs));
            onProgress(Math.min(0.99, startShare + localRatio * shareSpan));
            if (localRatio < 0.98) {
              progressRaf = window.requestAnimationFrame(tick);
            }
          };
          progressRaf = window.requestAnimationFrame(tick);

          if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            try {
              window.speechSynthesis.cancel();
              const utt = new SpeechSynthesisUtterance(chunkText);
              const voice = pickPreferredVoice(lang);
              if (voice) utt.voice = voice;
              utt.lang = lang === 'hinglish' ? 'en-IN' : 'en-US';
              utt.rate = playbackSpeed;
              utt.pitch = 0.96;
              utt.onstart = () => {
                if (narrationSessionRef.current === sessionId) setIsSpeakingAudio(true);
              };
              utt.onend = () => {
                window.clearTimeout(safety);
                finishChunk();
              };
              utt.onerror = () => {
                window.clearTimeout(safety);
                finishChunk();
              };
              window.speechSynthesis.speak(utt);
              return;
            } catch {
              // fall through to deterministic clock
            }
          }
          setIsSpeakingAudio(true);
          window.setTimeout(() => {
            window.clearTimeout(safety);
            finishChunk();
          }, estMs);
        });

      // Kick off real-time audio fetches progressively (chunk 0 immediately, chunk i+1 while chunk i plays!)
      const pendingFetches: Array<Promise<{ audioBase64: string; mimeType: string } | null> | null> =
        chunks.map(() => null);
      const startFetch = (idx: number) => {
        if (idx >= chunks.length || pendingFetches[idx]) return;
        pendingFetches[idx] = fetchOrGetCachedTts(chunks[idx], lang).catch(() => null);
      };

      // Begin speaking/writing visual momentum immediately so video stays active while chunk 0 buffers
      setIsSpeakingAudio(true);
      startFetch(0);
      if (chunks.length > 1) startFetch(1);

      let charsCovered = 0;

      for (let i = 0; i < chunks.length; i++) {
        if (finished || narrationSessionRef.current !== sessionId) return;
        const chunk = chunks[i];
        const startShare = charsCovered / totalChars;
        const shareSpan = chunk.length / totalChars;
        if (i + 1 < chunks.length) startFetch(i + 1);

        try {
          const audioPayload = await pendingFetches[i]!;
          if (finished || narrationSessionRef.current !== sessionId) return;

          if (!audioPayload) {
            await runBrowserFallbackForText(chunk, startShare, shareSpan);
            charsCovered += chunk.length;
            continue;
          }

          await new Promise<void>((resolve) => {
            const audio = new Audio(`data:${audioPayload.mimeType};base64,${audioPayload.audioBase64}`);
            audio.playbackRate = playbackSpeed;
            activeAudioRef.current = audio;

            const estChunkMs = Math.max(
              3200,
              Math.round((chunk.split(/\s+/).length * 460) / Math.max(0.5, playbackSpeed))
            );
            let doneChunk = false;
            const finishChunk = () => {
              if (doneChunk) return;
              doneChunk = true;
              window.clearTimeout(chunkSafety);
              window.cancelAnimationFrame(progressRaf);
              onProgress(Math.min(0.99, startShare + shareSpan));
              resolve();
            };
            const chunkSafety = window.setTimeout(finishChunk, estChunkMs + 4500);

            const trackProgress = () => {
              if (
                doneChunk ||
                finished ||
                narrationSessionRef.current !== sessionId ||
                activeAudioRef.current !== audio
              ) {
                return;
              }
              if (Number.isFinite(audio.duration) && audio.duration > 0) {
                const localRatio = Math.max(0, Math.min(1, audio.currentTime / audio.duration));
                onProgress(Math.min(0.99, startShare + localRatio * shareSpan));
              }
              if (!audio.paused && !audio.ended) {
                progressRaf = window.requestAnimationFrame(trackProgress);
              }
            };

            audio.onplay = () => {
              if (narrationSessionRef.current !== sessionId) return;
              setIsSpeakingAudio(true);
              progressRaf = window.requestAnimationFrame(trackProgress);
            };
            audio.onended = finishChunk;
            audio.onerror = () => {
              window.clearTimeout(chunkSafety);
              window.cancelAnimationFrame(progressRaf);
              if (narrationSessionRef.current !== sessionId) {
                resolve();
                return;
              }
              void runBrowserFallbackForText(chunk, startShare, shareSpan).then(resolve);
            };

            void audio.play().catch(() => {
              window.clearTimeout(chunkSafety);
              window.cancelAnimationFrame(progressRaf);
              void runBrowserFallbackForText(chunk, startShare, shareSpan).then(resolve);
            });
          });
        } catch {
          if (finished || narrationSessionRef.current !== sessionId) return;
          await runBrowserFallbackForText(chunk, startShare, shareSpan);
        }

        charsCovered += chunk.length;
      }

      completeOnce();
    },
    [fetchOrGetCachedTts]
  );

  // Event-driven sequential step playback queue (never stalls between steps)
  useEffect(() => {
    if (!lesson || !activeStep || !isPlaying || handRaised || isExplainingDoubt) {
      if (!isExplainingDoubt) {
        stopSpeech();
      }
      return;
    }

    stopSpeech();
    const sessionId = narrationSessionRef.current;
    let cancelled = false;
    let advanceTimer: number | null = null;
    let mutedRafId = 0;

    const triggerNextStep = () => {
      if (cancelled || narrationSessionRef.current !== sessionId) return;
      if (currentStepIdx < lesson.steps.length - 1) {
        advanceTimer = window.setTimeout(() => {
          if (!cancelled && narrationSessionRef.current === sessionId) {
            setCurrentStepIdx((idx) => Math.min(lesson.steps.length - 1, idx + 1));
          }
        }, 700);
      } else {
        setIsPlaying(false);
        playSuccess();
      }
    };

    if (voiceMuted) {
      const estMs = Math.max(3800, Math.round((activeScript.length * 46) / Math.max(0.5, speed)));
      const startedAt = performance.now();
      const tickMuted = (now: number) => {
        if (cancelled || narrationSessionRef.current !== sessionId) return;
        const ratio = Math.max(0, Math.min(1, (now - startedAt) / estMs));
        setSpeechProgress(ratio);
        if (ratio < 1) {
          mutedRafId = window.requestAnimationFrame(tickMuted);
        } else {
          triggerNextStep();
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
        triggerNextStep
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
    isExplainingDoubt,
    language,
    speed,
    voiceMuted,
    replayNonce,
    stopSpeech,
    speakTextWithGeminiTts,
  ]);

  const handleTogglePlay = () => {
    playClick();
    setSettingsMenuOpen(false);
    if (handRaised || isExplainingDoubt) {
      stopSpeech();
      stopMic();
      setHandRaised(false);
      setIsExplainingDoubt(false);
      setDoubtWritingProgress(1);
    }
    if (!isPlaying && lesson && currentStepIdx >= lesson.steps.length - 1) {
      setCurrentStepIdx(0);
      setIsPlaying(true);
      setReplayNonce((n) => n + 1);
      return;
    }
    setIsPlaying((p) => !p);
  };

  const handleReplayFromStart = () => {
    playClick();
    setSettingsMenuOpen(false);
    stopSpeech();
    stopMic();
    setHandRaised(false);
    setIsExplainingDoubt(false);
    setCurrentStepIdx(0);
    setIsPlaying(true);
    setReplayNonce((n) => n + 1);
  };

  const handleJumpStep = (targetIdx: number) => {
    if (!lesson) return;
    playClick();
    const clamped = Math.max(0, Math.min(lesson.steps.length - 1, targetIdx));
    setHandRaised(false);
    setIsExplainingDoubt(false);
    stopMic();
    setCurrentStepIdx(clamped);
    setIsPlaying(true);
    setReplayNonce((n) => n + 1);
  };

  const handleToggleRaiseHand = () => {
    playClick();
    setSettingsMenuOpen(false);
    if (!handRaised) {
      stopSpeech();
      setIsPlaying(false);
      setIsExplainingDoubt(false);
      setHandRaised(true);
    } else {
      stopMic();
      setHandRaised(false);
    }
  };

  const handleVoiceDoubtTrigger = () => {
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
        lesson?.quickDoubtSuggestions?.[0] ||
        `Is step mein ${lesson?.chapterName || 'is concept'} ka formula kaise apply hua?`;
      setDoubtInput(sampleQuery);
      setVoiceQueryStatus('Browser microphone unavailable — type your doubt below or tap a quick suggestion.');
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
        setDoubtInput(transcript);
        void handleSubmitDoubt(transcript);
      };
      rec.onerror = () => {
        setMicListening(false);
        setVoiceQueryStatus('Could not access microphone — type your doubt below.');
      };
      rec.onend = () => setMicListening(false);
      recognitionRef.current = rec;
      setMicListening(true);
      setVoiceQueryStatus('Listening to your doubt…');
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

    const doubtLang = detectTutorResponseLanguage(cleanDoubt);
    setLanguage(doubtLang);

    let finalReply = '';
    const finalLatex: string | undefined = activeStep.boardLatex;

    try {
      const res = await requestPrepsAiChat({
        message: `[Preps AI Live Teacher Classroom Cross-Question]\nSubject: ${lesson.subjectName}\nChapter: ${lesson.chapterName}\nTopic: ${lesson.topicTitle}\nOriginal Question: ${lesson.questionPrompt}\nCurrent Step ${activeStep.stepNumber} (${activeStep.title}): ${activeStep.boardNotes}\nFormula on Board: $${activeStep.boardLatex}$\nStudent Doubt (${doubtLang === 'hinglish' ? 'Reply strictly for this exact subject & chapter in crisp warm Hinglish like a realistic 17-18 year-old Indian male peer mentor' : 'Reply strictly for this exact subject & chapter in crisp clear English like a realistic 17-18 year-old Indian male peer mentor'} in 2-4 sentences, wrapping math in $...$): "${cleanDoubt}"`,
        history: [],
        studentContext: {
          source: 'live-teacher-raise-hand',
          subject: lesson.subjectName,
          chapter: lesson.chapterName,
          topic: lesson.topicTitle,
          stepNumber: activeStep.stepNumber,
          preferredLanguage: doubtLang,
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

    const newExchange: DoubtExchange = {
      id: `doubt-${Date.now()}`,
      question: cleanDoubt,
      reply: finalReply,
      latex: finalLatex,
      stepNumber: activeStep.stepNumber,
    };

    // Preserve ALL original lesson steps & append student doubt cleanly below
    setDoubtExchanges((prev) => [...prev, newExchange]);
    setActiveDoubtId(newExchange.id);
    setDoubtWritingProgress(0.03);
    setIsExplainingDoubt(true);
    setDoubtLoading(false);
    playAiSparkle();

    // Animate moving pencil writing word-by-word synced with real Tutor Voice & active Avatar video!
    const sessionId = narrationSessionRef.current;
    const spokenText = finalReply.replace(/\$\$?[^$]+\$\$?/g, 'the formula shown on the board');

    if (voiceMuted) {
      const readableLen = Math.max(40, stripLatexToReadable(finalReply).length);
      const durationMs = Math.max(3200, Math.round((readableLen * 40) / Math.max(0.5, speed)));
      const startTs = performance.now();
      const tickWrite = (now: number) => {
        if (narrationSessionRef.current !== sessionId) return;
        const ratio = Math.max(0.03, Math.min(1, (now - startTs) / durationMs));
        setDoubtWritingProgress(ratio);
        if (ratio < 1) {
          window.requestAnimationFrame(tickWrite);
        } else {
          setIsExplainingDoubt(false);
        }
      };
      window.requestAnimationFrame(tickWrite);
    } else {
      void speakTextWithGeminiTts(
        spokenText,
        doubtLang,
        speed,
        sessionId,
        (ratio) => {
          if (narrationSessionRef.current === sessionId) {
            setDoubtWritingProgress((prev) => Math.max(prev, Math.min(1, ratio)));
          }
        },
        () => {
          if (narrationSessionRef.current === sessionId) {
            setDoubtWritingProgress(1);
            setIsExplainingDoubt(false);
          }
        }
      );
    }
  };

  const handleResumeAfterDoubt = () => {
    playSuccess();
    stopSpeech();
    stopMic();
    setHandRaised(false);
    setIsExplainingDoubt(false);
    setDoubtWritingProgress(1);
    setIsPlaying(true);
    setReplayNonce((n) => n + 1);
  };

  const isLightBoard = boardSurface === 'whiteboard';
  const showConceptDiagram = Boolean(activeStep?.svgType && activeStep.svgType !== 'generic');

  return (
    <AnimatePresence>
      {/* LOADING / ERROR STATUS SCREEN */}
      {liveTeacherRequest && (!lesson || !activeStep) && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Preps AI Live Teacher Classroom"
          data-testid="live-teacher-modal-status"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] w-screen h-screen bg-[#0b1120] flex items-center justify-center p-6"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="w-full max-w-xl rounded-2xl bg-[rgba(30,41,59,0.65)] backdrop-blur-xl border border-sky-400/25 shadow-[0_24px_70px_rgba(0,0,0,0.85)] p-6 space-y-4 text-slate-100"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-sky-400">
                  Preps AI Live Classroom
                </p>
                <h2 className="font-handwritten text-2xl font-bold text-white mt-0.5 truncate">
                  {liveTeacherRequest.subjectName || liveTeacherRequest.chapterName
                    ? [liveTeacherRequest.subjectName, liveTeacherRequest.chapterName]
                        .filter(Boolean)
                        .join(' · ')
                    : 'Preparing Your Live Whiteboard'}
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

            <div className="rounded-xl bg-[#0b1120] border border-white/10 p-4 font-handwritten text-lg text-slate-200 line-clamp-4">
              {liveTeacherRequest.questionText}
            </div>

            {lessonLoading ? (
              <div className="flex items-center gap-3 py-2 text-sm text-sky-400">
                <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                <span>Setting up full-screen AI tutor video and live handwritten board…</span>
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
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-400 hover:bg-sky-300 text-[#070B14] text-xs font-extrabold transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Retry
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}

      {/* CLEAN FULL-SCREEN VIDEO MODE (ZERO TOP HEADER BAR, ZERO BOTTOM STEP PILLS, ZERO GENERIC DIAGRAM) */}
      {lesson && activeStep && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Preps AI Live Teacher Full-Screen Classroom"
          data-testid="live-teacher-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] w-screen h-screen bg-[#0b1120] flex flex-col overflow-hidden text-slate-100"
        >
          {/* 100% FULL-SCREEN STAGE: AI Tutor Video (Left) + Handwritten Whiteboard (Right) */}
          <div className="relative flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
            {/* LEFT FULL-HEIGHT AI TUTOR VIDEO STAGE */}
            <aside
              aria-label="AI Tutor Video Stage"
              data-video-active={shouldAnimateVideo ? 'true' : 'false'}
              className="hidden lg:flex lg:w-[320px] xl:w-[370px] shrink-0 relative bg-[#06070A] border-r border-white/[0.08] overflow-hidden select-none"
            >
              <video
                ref={desktopVideoRef}
                data-testid="live-tutor-video"
                src={TUTOR_VIDEO_SRC}
                muted
                loop
                playsInline
                autoPlay
                onLoadedData={syncTutorVideoPlayback}
                onCanPlay={syncTutorVideoPlayback}
                className="w-full h-full object-cover"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#06070A]/90 via-[#06070A]/35 to-transparent" />
              <div className="pointer-events-none absolute bottom-20 left-4 right-4 flex items-center justify-between gap-2">
                <span
                  data-testid="teacher-pose-badge"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#06070A]/80 backdrop-blur-md border border-white/10 text-[11px] font-bold text-white"
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isExplainingDoubt || isWritingDoubtNow
                        ? 'bg-[#C6FF00] animate-pulse'
                        : handRaised
                          ? 'bg-amber-400 animate-pulse'
                          : shouldAnimateVideo
                            ? 'bg-[#C6FF00] animate-pulse'
                            : 'bg-slate-500'
                    }`}
                  />
                  {isExplainingDoubt || isWritingDoubtNow
                    ? 'Writing & Explaining Doubt'
                    : handRaised && !doubtLoading
                      ? 'Listening…'
                      : shouldAnimateVideo
                        ? 'Teaching Live · Real Voice'
                        : 'Paused'}
                </span>
              </div>
            </aside>

            {/* RIGHT FULL-HEIGHT HANDWRITTEN WHITEBOARD CANVAS */}
            <div
              ref={boardScrollRef}
              data-testid="dynamic-whiteboard-stage"
              data-surface={boardSurface}
              className={`relative flex-1 min-h-0 overflow-y-auto px-5 sm:px-8 lg:px-10 pt-6 pb-36 space-y-5 transition-colors duration-200 ${
                isLightBoard ? 'live-whiteboard-grid text-slate-900' : 'live-blackboard-grid text-slate-100'
              }`}
            >
              {/* Mobile Compact Tutor Video Strip */}
              <div className="lg:hidden flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0D0F15]/90 p-2.5">
                <div className="w-16 h-16 rounded-xl overflow-hidden border border-[#C6FF00]/35 bg-black shrink-0">
                  <video
                    ref={mobileVideoRef}
                    src={TUTOR_VIDEO_SRC}
                    muted
                    loop
                    playsInline
                    autoPlay
                    onLoadedData={syncTutorVideoPlayback}
                    onCanPlay={syncTutorVideoPlayback}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-handwritten text-lg font-bold text-white truncate">
                    {lesson.topicTitle}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {isExplainingDoubt
                      ? 'Explaining your doubt on board…'
                      : `Step ${currentStepIdx + 1} of ${lesson.steps.length}`}
                  </p>
                </div>
              </div>

              <div className="max-w-4xl mx-auto space-y-5">
                {/* Original Problem Card (Preserved Untouched) */}
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

                {/* Only Render Subject-Specific Concept Visual (NEVER Generic Flowchart) */}
                {showConceptDiagram && (
                  <LiveTeacherSvgBoard
                    svgType={activeStep.svgType}
                    activeStep={activeStep.stepNumber}
                  />
                )}

                {/* Sequential Live Handwritten Solution Steps */}
                <div className="space-y-4">
                  {lesson.steps.slice(0, currentStepIdx + 1).map((step, idx) => {
                    const isCurrent = idx === currentStepIdx;
                    return (
                      <HandwritingStepCard
                        key={`${lesson.id}-step-${step.stepNumber}`}
                        step={step}
                        isCurrent={isCurrent}
                        isPlaying={isPlaying && !isExplainingDoubt}
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
                </div>

                {/* STUDENT DOUBT RESOLUTION CARDS (PRESERVES ORIGINAL STEPS + LIVE ANIMATED PENCIL!) */}
                <AnimatePresence>
                  {doubtExchanges.map((ex) => {
                    const isActiveDoubt = ex.id === activeDoubtId;
                    const progress = isActiveDoubt ? doubtWritingProgress : 1;
                    const readable = stripLatexToReadable(ex.reply);
                    const isWritingNow = isActiveDoubt && progress < 0.99;
                    const visibleChars = Math.max(1, Math.ceil(progress * readable.length));
                    const revealedText = readable.slice(0, visibleChars);

                    return (
                      <motion.div
                        key={ex.id}
                        ref={isActiveDoubt ? doubtAnswerRef : undefined}
                        data-testid="live-teacher-doubt-answer"
                        initial={{ opacity: 0, y: 16, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10 }}
                        className={`rounded-2xl border p-5 space-y-3 ${
                          isLightBoard
                            ? 'border-emerald-300 bg-emerald-50/95 text-slate-900 shadow-sm'
                            : 'border-emerald-400/45 bg-gradient-to-br from-[#0D1F28] to-[#0B1626] text-slate-100 shadow-[0_0_28px_rgba(16,185,129,0.16)]'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wider ${
                              isLightBoard ? 'text-emerald-700' : 'text-emerald-400'
                            }`}
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            Student Doubt · Step {ex.stepNumber}
                          </span>
                          <button
                            type="button"
                            onClick={handleResumeAfterDoubt}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-[#070B14] text-xs font-extrabold transition-colors"
                          >
                            <Play className="w-3 h-3" />
                            Resume Lesson
                          </button>
                        </div>

                        <p
                          className={`font-handwritten text-base font-bold ${
                            isLightBoard ? 'text-amber-800' : 'text-amber-300'
                          }`}
                        >
                          Q: &ldquo;{ex.question}&rdquo;
                        </p>

                        <div className="font-handwritten text-xl sm:text-2xl whitespace-pre-line">
                          {isWritingNow ? (
                            <span>
                              {revealedText}
                              <PencilWritingNib isLightBoard={isLightBoard} />
                            </span>
                          ) : (
                            <RichMathText text={ex.reply} />
                          )}
                        </div>

                        {ex.latex && (!isWritingNow || progress > 0.55) && (
                          <div
                            className={`px-3.5 py-2.5 rounded-xl border overflow-x-auto ${
                              isLightBoard
                                ? 'bg-white border-emerald-300'
                                : 'bg-[#070B14] border-emerald-400/30'
                            }`}
                          >
                            <KatexFormula
                              latex={ex.latex}
                              className={`text-base font-bold ${
                                isLightBoard ? 'text-emerald-800' : 'text-emerald-300'
                              }`}
                            />
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* COMPACT FLOATING RAISE HAND INPUT BAR (ONLY VISIBLE WHEN HAND RAISED) */}
          <AnimatePresence>
            {handRaised && (
              <motion.div
                data-testid="live-teacher-doubt-panel"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 14 }}
                className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[95] w-[calc(100vw-2rem)] max-w-2xl rounded-2xl bg-[#0b1120]/95 backdrop-blur-xl border border-sky-400/35 shadow-[0_20px_60px_rgba(0,0,0,0.85)] p-4 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-300">
                    <Hand className="w-4 h-4 text-amber-300" />
                    Ask your doubt — original steps stay right on the board
                  </span>
                  <button
                    type="button"
                    onClick={handleResumeAfterDoubt}
                    className="text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    Resume
                  </button>
                </div>

                {voiceQueryStatus && (
                  <p className="text-[11px] font-mono text-amber-300">{voiceQueryStatus}</p>
                )}

                {doubtError && (
                  <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-rose-500/15 border border-rose-400/40 text-xs text-rose-200">
                    <span>{doubtError}</span>
                    {lastAttemptedDoubt && (
                      <button
                        type="button"
                        onClick={() => void handleSubmitDoubt(lastAttemptedDoubt)}
                        className="px-2.5 py-1 rounded-lg bg-rose-500/30 text-white font-bold text-[11px]"
                      >
                        Retry
                      </button>
                    )}
                  </div>
                )}

                {lesson.quickDoubtSuggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {lesson.quickDoubtSuggestions.slice(0, 3).map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        data-testid="doubt-chip"
                        disabled={doubtLoading}
                        onClick={() => void handleSubmitDoubt(chip)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-sky-400/25 hover:border-sky-400 text-[11px] font-semibold text-slate-200 hover:text-sky-300 transition-colors"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                )}

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleSubmitDoubt(doubtInput);
                  }}
                  className="flex items-center gap-2"
                >
                  <button
                    type="button"
                    onClick={handleVoiceDoubtTrigger}
                    aria-label={micListening ? 'Stop voice doubt input' : 'Speak your doubt'}
                    className={`h-10 px-3 rounded-xl inline-flex items-center gap-1.5 text-xs font-bold border transition-colors shrink-0 ${
                      micListening
                        ? 'bg-rose-600 border-rose-500 text-white'
                        : 'bg-slate-800/80 border-slate-400/20 text-slate-200 hover:border-sky-400'
                    }`}
                  >
                    {micListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-sky-400" />}
                    <span className="hidden sm:inline">{micListening ? 'Listening…' : 'Speak'}</span>
                  </button>

                  <input
                    type="text"
                    value={doubtInput}
                    onChange={(e) => setDoubtInput(e.target.value)}
                    placeholder={`Ask about Step ${activeStep.stepNumber}…`}
                    aria-label="Type your doubt for Preps AI Live Teacher"
                    className="flex-1 min-w-0 h-10 px-3.5 rounded-xl bg-slate-900 border border-slate-400/20 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
                  />

                  <button
                    type="submit"
                    disabled={doubtLoading || !doubtInput.trim()}
                    className="h-10 px-4 rounded-xl bg-sky-400 hover:bg-sky-300 disabled:opacity-40 text-[#070B14] text-xs sm:text-sm font-extrabold inline-flex items-center gap-1.5 shrink-0 transition-colors"
                  >
                    {doubtLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Ask
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* MINIMAL FLOATING BOTTOM CONTROL STRIP — EXACTLY 4 CONTROLS */}
          <div
            data-testid="live-teacher-minimal-controls"
            className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[96] flex items-center gap-2 px-3 py-2 rounded-full bg-[#0b1120]/90 backdrop-blur-xl border border-slate-400/20 shadow-[0_14px_40px_rgba(0,0,0,0.75)]"
          >
            {/* 1. Play / Pause */}
            <button
              type="button"
              data-testid="live-teacher-play-pause"
              onClick={handleTogglePlay}
              aria-label={isPlaying ? 'Pause lesson' : 'Play lesson'}
              className="h-10 px-4 rounded-full bg-sky-400 hover:bg-sky-300 text-[#070B14] font-display text-xs sm:text-sm font-extrabold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isPlaying ? 'Pause' : 'Play'}</span>
            </button>

            {/* 2. Replay */}
            <button
              type="button"
              data-testid="live-teacher-replay"
              onClick={handleReplayFromStart}
              aria-label="Replay lesson from Step 1"
              title="Replay from Step 1"
              className="h-10 px-3.5 rounded-full bg-slate-800/85 hover:bg-slate-700/85 border border-slate-400/15 text-xs sm:text-sm font-semibold text-slate-200 hover:text-white inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Replay</span>
            </button>

            {/* 3. Raise Hand */}
            <button
              type="button"
              data-testid="live-teacher-raise-hand"
              onClick={handleToggleRaiseHand}
              aria-pressed={handRaised}
              className={`h-10 px-4 rounded-full font-display text-xs sm:text-sm font-extrabold inline-flex items-center gap-1.5 border transition-all whitespace-nowrap ${
                handRaised
                  ? 'bg-amber-400 border-amber-300 text-[#070B14] shadow-[0_0_20px_rgba(251,191,36,0.45)]'
                  : 'bg-amber-500/15 border-amber-400/40 text-amber-300 hover:bg-amber-500/25'
              }`}
            >
              <Hand className="w-4 h-4" />
              <span>{handRaised ? 'Hand Raised' : 'Raise Hand'}</span>
            </button>

            {/* 4. Three-Dot Settings Menu (⋮) */}
            <div ref={settingsPopoverRef} className="relative">
              <button
                type="button"
                data-testid="live-teacher-settings-btn"
                aria-haspopup="menu"
                aria-expanded={settingsMenuOpen}
                aria-label="Classroom settings"
                onClick={() => {
                  playClick();
                  setSettingsMenuOpen((open) => !open);
                }}
                className={`h-10 w-10 rounded-full border inline-flex items-center justify-center transition-colors ${
                  settingsMenuOpen
                    ? 'bg-sky-400/20 border-sky-400 text-sky-300'
                    : 'bg-slate-800/85 border-slate-400/15 text-slate-200 hover:text-white hover:border-sky-400/50'
                }`}
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              <AnimatePresence>
                {settingsMenuOpen && (
                  <motion.div
                    role="menu"
                    data-testid="live-teacher-settings-popover"
                    initial={{ opacity: 0, y: 10, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.16 }}
                    className="absolute bottom-13 right-0 w-72 rounded-2xl bg-[#0f172a]/98 backdrop-blur-xl border border-slate-400/20 shadow-[0_20px_60px_rgba(0,0,0,0.85)] p-4 space-y-4 text-xs text-slate-200"
                  >
                    {/* Playback Speed */}
                    <div className="space-y-1.5">
                      <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Playback Speed
                      </p>
                      <div className="grid grid-cols-4 gap-1">
                        {SPEED_OPTIONS.map((sp) => (
                          <button
                            key={sp}
                            type="button"
                            onClick={() => {
                              playClick();
                              setSpeed(sp);
                              setReplayNonce((n) => n + 1);
                            }}
                            className={`py-1.5 rounded-lg font-mono font-bold transition-colors ${
                              speed === sp
                                ? 'bg-sky-400 text-[#070B14]'
                                : 'bg-slate-800/80 text-slate-300 hover:text-white'
                            }`}
                          >
                            {sp}x
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Voice Language */}
                    <div className="space-y-1.5">
                      <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Voice Language
                      </p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(['hinglish', 'english'] as const).map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => {
                              playClick();
                              setLanguage(opt);
                              setReplayNonce((n) => n + 1);
                            }}
                            className={`py-1.5 rounded-lg font-semibold capitalize transition-colors ${
                              language === opt
                                ? 'bg-sky-400 text-[#070B14] font-bold'
                                : 'bg-slate-800/80 text-slate-300 hover:text-white'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Board Surface */}
                    <div className="space-y-1.5">
                      <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Board Surface
                      </p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(['blackboard', 'whiteboard'] as const).map((surf) => (
                          <button
                            key={surf}
                            type="button"
                            onClick={() => {
                              playClick();
                              setBoardSurface(surf);
                            }}
                            className={`py-1.5 rounded-lg font-semibold capitalize transition-colors ${
                              boardSurface === surf
                                ? 'bg-sky-400 text-[#070B14] font-bold'
                                : 'bg-slate-800/80 text-slate-300 hover:text-white'
                            }`}
                          >
                            {surf}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Jump to Step Dropdown */}
                    <div className="space-y-1.5">
                      <label
                        htmlFor="live-teacher-step-select"
                        className="block font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400"
                      >
                        Jump to Step
                      </label>
                      <select
                        id="live-teacher-step-select"
                        value={currentStepIdx}
                        onChange={(e) => {
                          handleJumpStep(Number(e.target.value));
                          setSettingsMenuOpen(false);
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-slate-800/90 border border-slate-400/20 text-xs font-semibold text-white focus:outline-none focus:border-sky-400"
                      >
                        {lesson.steps.map((s, idx) => (
                          <option key={s.stepNumber} value={idx}>
                            Step {s.stepNumber}: {s.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Audio Mute & Exit Full Screen */}
                    <div className="pt-2 border-t border-slate-400/15 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          playClick();
                          setVoiceMuted((m) => !m);
                        }}
                        className="flex-1 py-2 px-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 font-semibold inline-flex items-center justify-center gap-1.5 transition-colors"
                      >
                        {voiceMuted ? (
                          <>
                            <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                            Unmute
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3.5 h-3.5 text-sky-400" />
                            Mute
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        data-testid="live-teacher-exit-btn"
                        onClick={() => {
                          playClick();
                          stopSpeech();
                          stopMic();
                          closeLiveTeacher();
                        }}
                        className="flex-1 py-2 px-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/30 text-rose-300 font-bold inline-flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Exit
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
