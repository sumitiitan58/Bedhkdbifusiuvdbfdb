import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import {
  buildTeacherDoubtFallback,
  generateLiveTeacherLesson,
  type LiveTeacherLanguage,
} from '../../utils/liveTeacherEngine';
import {
  buildLessonRequestFromVoiceQuery,
  findTimelineMsForCharIndex,
  QUICK_CLASSROOM_TOPICS,
  sampleVisemeAtTime,
  textToVisemeTimeline,
  type VisemeSample,
} from '../../utils/lipSyncEngine';
import { KatexFormula, RichMathText } from '../math/KatexFormula';
import { LiveTeacherSvgBoard } from './LiveTeacherSvgBoard';
import {
  LipSyncTutorAvatar,
  type AvatarViewMode,
  type TutorPose,
} from './LipSyncTutorAvatar';
import {
  HandwrittenQuestionCard,
  HandwritingStepCard,
  StudentSketchOverlay,
  WhiteboardToolbar,
  type BoardSurfaceTheme,
} from './HandwritingWhiteboard';
import { requestPrepsAiChat } from '../../services/geminiClient';
import { playAiSparkle, playClick, playSuccess } from '../../utils/soundEffects';

const SPEED_OPTIONS = [0.85, 1, 1.25, 1.5] as const;

const REST_VISEME: VisemeSample = {
  viseme: 'rest',
  openness: 0.05,
  width: 0.88,
  jawDropPx: 0,
  activeWordIndex: 0,
  energy: 0.04,
};

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

  const lesson = useMemo(
    () => (liveTeacherRequest ? generateLiveTeacherLesson(liveTeacherRequest) : null),
    [liveTeacherRequest]
  );

  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [language, setLanguage] = useState<LiveTeacherLanguage>('hinglish');
  const [speed, setSpeed] = useState<(typeof SPEED_OPTIONS)[number]>(1);
  const [voiceMuted, setVoiceMuted] = useState(false);
  const [isSpeakingAudio, setIsSpeakingAudio] = useState(false);
  const [welcomeWaving, setWelcomeWaving] = useState(true);
  const [replayNonce, setReplayNonce] = useState(0);

  // Avatar & Whiteboard interactive studio state
  const [avatarMode, setAvatarMode] = useState<AvatarViewMode>('lipsync');
  const [boardSurface, setBoardSurface] = useState<BoardSurfaceTheme>('blackboard');
  const [annotateActive, setAnnotateActive] = useState(false);
  const [inkColor, setInkColor] = useState('#00B4FF');
  const [clearInkSignal, setClearInkSignal] = useState(0);
  const [visemeSample, setVisemeSample] = useState<VisemeSample>(REST_VISEME);
  const [speechProgress, setSpeechProgress] = useState(0);

  // Raise Hand / Real-Time Voice Query state
  const [handRaised, setHandRaised] = useState(false);
  const [doubtInput, setDoubtInput] = useState('');
  const [doubtLoading, setDoubtLoading] = useState(false);
  const [doubtExchange, setDoubtExchange] = useState<DoubtExchange | null>(null);
  const [micListening, setMicListening] = useState(false);
  const [voiceQueryStatus, setVoiceQueryStatus] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const boardScrollRef = useRef<HTMLDivElement | null>(null);
  const activeStepRef = useRef<HTMLDivElement | null>(null);
  const doubtAnswerRef = useRef<HTMLDivElement | null>(null);
  // Real-time lip-sync clock anchor (re-synced by SpeechSynthesis onboundary events)
  const speechClockRef = useRef<{ startedAtPerf: number; offsetMs: number; active: boolean }>({
    startedAtPerf: 0,
    offsetMs: 0,
    active: false,
  });

  const stopSpeech = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore speech cancellation issues in restricted browsers
      }
    }
    speechClockRef.current.active = false;
    setIsSpeakingAudio(false);
    setVisemeSample(REST_VISEME);
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

  // Reset classroom cleanly whenever a new lesson opens
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
    setDoubtExchange(null);
    setVoiceQueryStatus(null);
    setWelcomeWaving(true);
    setReplayNonce((n) => n + 1);
    playAiSparkle();

    const waveTimer = window.setTimeout(() => setWelcomeWaving(false), 1400);
    return () => {
      window.clearTimeout(waveTimer);
      stopSpeech();
      stopMic();
    };
  }, [lesson, stopSpeech, stopMic]);

  // Escape key closes Live Classroom cleanly
  useEffect(() => {
    if (!lesson) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        stopSpeech();
        stopMic();
        closeLiveTeacher();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lesson, closeLiveTeacher, stopSpeech, stopMic]);

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

  const visemeTimeline = useMemo(
    () => textToVisemeTimeline(activeScript, speed),
    [activeScript, speed]
  );

  // Reset live speech-to-pencil progress when step or replay changes
  useEffect(() => {
    setSpeechProgress(0);
  }, [lesson, currentStepIdx, replayNonce, language]);

  // 60fps Audio-Driven Lip-Sync + Pencil-Handwriting Sync Loop (anchored by SpeechSynthesis onboundary + prosody clock)
  useEffect(() => {
    if (!lesson || !activeStep || (!isPlaying && !isSpeakingAudio) || handRaised) {
      speechClockRef.current.active = false;
      setVisemeSample(REST_VISEME);
      return;
    }

    const totalTimelineMs =
      visemeTimeline.length > 0 ? visemeTimeline[visemeTimeline.length - 1].endMs : 0;
    const effectiveTotalMs = Math.max(
      totalTimelineMs,
      Math.round((activeScript.length * 52) / Math.max(0.5, speed))
    );

    speechClockRef.current = {
      startedAtPerf: performance.now(),
      offsetMs: 0,
      active: true,
    };

    let rafId = 0;
    let lastProgressUpdate = 0;

    const stepLoop = (now: number) => {
      if (!speechClockRef.current.active) return;
      const rawElapsedMs =
        speechClockRef.current.offsetMs + (now - speechClockRef.current.startedAtPerf);

      // Update normalized 0..1 audio progress (~30fps) so pencil handwriting tracks spoken words cleanly
      if (now - lastProgressUpdate >= 32) {
        lastProgressUpdate = now;
        const normalized = Math.max(0, Math.min(1, rawElapsedMs / Math.max(1, effectiveTotalMs)));
        setSpeechProgress((prev) => (normalized > prev ? normalized : prev));
      }

      // Keep lip-sync prosody lively if step timer slightly outlives estimated timeline
      const effectiveMs =
        totalTimelineMs > 0 && rawElapsedMs >= totalTimelineMs && isPlaying
          ? rawElapsedMs % totalTimelineMs
          : rawElapsedMs;
      const sample = sampleVisemeAtTime(visemeTimeline, effectiveMs);
      setVisemeSample(sample);
      rafId = window.requestAnimationFrame(stepLoop);
    };

    rafId = window.requestAnimationFrame(stepLoop);
    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [lesson, activeStep, activeScript.length, speed, visemeTimeline, isPlaying, isSpeakingAudio, handRaised, replayNonce]);

  // Synchronized Browser-Native Web Speech Narration + `onboundary` Lip-Sync Anchoring
  useEffect(() => {
    const cancelSynthesisOnly = () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // ignore speech cancellation issues in restricted browsers
        }
      }
      setIsSpeakingAudio(false);
    };

    if (!lesson || !activeStep || !isPlaying || handRaised) {
      stopSpeech();
      return;
    }

    let cancelled = false;
    let fallbackTimer: number | null = null;

    const advanceIfPossible = () => {
      if (cancelled) return;
      speechClockRef.current.active = false;
      setIsSpeakingAudio(false);
      setVisemeSample(REST_VISEME);
      if (currentStepIdx < lesson.steps.length - 1) {
        fallbackTimer = window.setTimeout(() => {
          if (!cancelled) {
            setCurrentStepIdx((idx) => Math.min(lesson.steps.length - 1, idx + 1));
          }
        }, 900);
      } else {
        setIsPlaying(false);
        playSuccess();
      }
    };

    const canUseSpeech =
      !voiceMuted && typeof window !== 'undefined' && 'speechSynthesis' in window;

    if (canUseSpeech) {
      cancelSynthesisOnly();
      try {
        const utterance = new SpeechSynthesisUtterance(activeScript);
        const voice = pickPreferredVoice(language);
        if (voice) utterance.voice = voice;
        utterance.lang = language === 'hinglish' ? 'en-IN' : 'en-US';
        utterance.rate = speed;
        utterance.pitch = 1.03;

        utterance.onstart = () => {
          if (cancelled) return;
          speechClockRef.current = {
            startedAtPerf: performance.now(),
            offsetMs: 0,
            active: true,
          };
          setIsSpeakingAudio(true);
        };

        // Lock BOTH lip-sync frames AND whiteboard pencil handwriting directly to real browser TTS word boundaries!
        utterance.onboundary = (event) => {
          if (cancelled) return;
          if (activeScript.length > 0 && typeof event.charIndex === 'number') {
            const charRatio = Math.max(0, Math.min(1, event.charIndex / activeScript.length));
            setSpeechProgress((prev) => (charRatio > prev ? charRatio : prev));
          }
          const anchorMs = findTimelineMsForCharIndex(visemeTimeline, event.charIndex);
          if (anchorMs !== null) {
            speechClockRef.current = {
              startedAtPerf: performance.now(),
              offsetMs: anchorMs,
              active: true,
            };
          }
        };

        utterance.onend = () => {
          setSpeechProgress(1);
          advanceIfPossible();
        };

        utterance.onerror = () => {
          if (!cancelled) setIsSpeakingAudio(false);
        };

        window.speechSynthesis.speak(utterance);
        // Safety fallback timer for headless/sandboxed browsers without TTS audio sink
        const estMs = Math.max(5200, Math.round((activeScript.length * 64) / speed));
        fallbackTimer = window.setTimeout(() => {
          if (!cancelled && !window.speechSynthesis.speaking) {
            advanceIfPossible();
          }
        }, estMs);
      } catch {
        const estMs = Math.max(4600, Math.round((activeScript.length * 56) / speed));
        fallbackTimer = window.setTimeout(advanceIfPossible, estMs);
      }
    } else {
      const estMs = Math.max(4400, Math.round((activeScript.length * 52) / speed));
      fallbackTimer = window.setTimeout(advanceIfPossible, estMs);
    }

    return () => {
      cancelled = true;
      if (fallbackTimer !== null) window.clearTimeout(fallbackTimer);
      cancelSynthesisOnly();
    };
  }, [
    lesson,
    activeStep,
    activeScript,
    visemeTimeline,
    currentStepIdx,
    isPlaying,
    handRaised,
    language,
    speed,
    voiceMuted,
    replayNonce,
    stopSpeech,
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
          ? 'Explain Convex Lens image formation and magnification step-by-step'
          : 'Step 2 mein sin θ kyun liya?';
      setDoubtInput(sampleQuery);
      setVoiceQueryStatus('Browser voice input unavailable here — sample query loaded, press Ask Board or pick a topic.');
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
    setDoubtInput('');
    setVoiceQueryStatus(null);

    let finalReply = '';
    let finalLatex: string | undefined = activeStep.boardLatex;

    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        window.setTimeout(() => reject(new Error('Live teacher doubt request timed out')), 3200)
      );
      const res = await Promise.race([
        requestPrepsAiChat({
          message: `[Preps AI Live Teacher Classroom Cross-Question]\nTopic: ${lesson.topicTitle}\nCurrent Step ${activeStep.stepNumber} (${activeStep.title}): ${activeStep.boardNotes}\nFormula on Board: $${activeStep.boardLatex}$\nStudent Doubt (${language === 'hinglish' ? 'Reply in crisp warm Hinglish like a star Kota JEE/NEET faculty' : 'Reply in crisp clear English like a senior JEE/NEET faculty'} in 2-4 sentences, wrapping math in $...$): "${cleanDoubt}"`,
          history: [],
          studentContext: {
            source: 'live-teacher-raise-hand',
            subject: lesson.subjectName,
            chapter: lesson.chapterName,
            stepNumber: activeStep.stepNumber,
          },
        }),
        timeoutPromise,
      ]);
      finalReply = res.reply;
    } catch {
      const fallback = buildTeacherDoubtFallback(cleanDoubt, lesson, activeStep, language);
      finalReply = fallback.reply;
      finalLatex = fallback.latex;
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

    // Speak the doubt resolution aloud with lip-syncing!
    if (!voiceMuted && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        const spokenText = finalReply.replace(/\$\$?[^$]+\$\$?/g, 'the formula shown on the board');
        const doubtTimeline = textToVisemeTimeline(spokenText, speed);
        const utt = new SpeechSynthesisUtterance(spokenText);
        const voice = pickPreferredVoice(language);
        if (voice) utt.voice = voice;
        utt.lang = language === 'hinglish' ? 'en-IN' : 'en-US';
        utt.rate = speed;

        let doubtRaf = 0;
        let startedAt = performance.now();
        let offset = 0;
        const animateDoubtLips = (now: number) => {
          const sample = sampleVisemeAtTime(doubtTimeline, offset + (now - startedAt));
          setVisemeSample(sample);
          if (window.speechSynthesis.speaking) {
            doubtRaf = window.requestAnimationFrame(animateDoubtLips);
          } else {
            setVisemeSample(REST_VISEME);
          }
        };

        utt.onstart = () => {
          startedAt = performance.now();
          offset = 0;
          setIsSpeakingAudio(true);
          doubtRaf = window.requestAnimationFrame(animateDoubtLips);
        };
        utt.onboundary = (event) => {
          const anchor = findTimelineMsForCharIndex(doubtTimeline, event.charIndex);
          if (anchor !== null) {
            startedAt = performance.now();
            offset = anchor;
          }
        };
        utt.onend = () => {
          window.cancelAnimationFrame(doubtRaf);
          setIsSpeakingAudio(false);
          setVisemeSample(REST_VISEME);
        };
        utt.onerror = () => {
          window.cancelAnimationFrame(doubtRaf);
          setIsSpeakingAudio(false);
          setVisemeSample(REST_VISEME);
        };
        window.speechSynthesis.speak(utt);
      } catch {
        // ignore speech synthesis fallback issues
      }
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

  const teacherPose: TutorPose =
    handRaised || micListening
      ? 'listening'
      : welcomeWaving
        ? 'wave'
        : isPlaying || isSpeakingAudio
          ? 'speaking'
          : 'idle';

  const stepPointOffsetY = [-14, -4, 6, 14][currentStepIdx] ?? 0;
  const stepPointTiltDeg = handRaised ? 3.5 : isPlaying ? [2.2, 3.2, 2.8, 1.8][currentStepIdx] ?? 2 : 0;
  const isLightBoard = boardSurface === 'whiteboard';

  return (
    <AnimatePresence>
      {lesson && activeStep && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Preps AI Live Teacher Classroom"
          data-testid="live-teacher-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] bg-[#04070F]/88 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 lg:p-5"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 14 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="relative w-full max-w-[1280px] h-[94vh] sm:h-[91vh] max-h-[880px] rounded-2xl sm:rounded-3xl bg-[#0B0F19] border border-[#00B4FF]/30 shadow-[0_28px_80px_-14px_rgba(0,0,0,0.9),0_0_40px_rgba(0,180,255,0.16)] flex flex-col overflow-hidden text-slate-100"
          >
            {/* TOP CLASSROOM HEADER BAR */}
            <header className="px-3.5 sm:px-5 py-2.5 bg-[#070B14]/95 border-b border-white/10 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="min-w-0">
                  <h2 className="font-display text-sm sm:text-base font-extrabold text-white truncate">
                    Preps AI Live Tutor · {lesson.topicTitle}
                  </h2>
                  <p className="text-[11px] text-slate-400 truncate">
                    Step {currentStepIdx + 1} of {lesson.steps.length}: {activeStep.title} · Real-Time Lip-Sync &amp; Animated Handwriting
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

            {/* MAIN CLASSROOM STAGE: Lip-Sync AI Tutor Avatar (Left) + Dynamic Handwriting Whiteboard (Right) */}
            <div className="relative flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
              {/* DESKTOP LEFT STAGE: Audio-Driven Lip-Sync Tutor Avatar */}
              <aside
                aria-label="AI Tutor Lip-Sync Avatar Stage"
                className="hidden lg:flex lg:w-[285px] xl:w-[315px] shrink-0 relative flex-col items-center justify-between gap-2.5 px-4 pt-3.5 pb-4 bg-gradient-to-b from-[#0B0F19] via-[#0B1222] to-[#080C16] border-r border-white/[0.07] overflow-hidden select-none"
              >
                {/* Top Status & Avatar Mode Switcher */}
                <div className="relative z-20 shrink-0 w-full space-y-2">
                  <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                    <span
                      data-testid="teacher-pose-badge"
                      className={`font-bold truncate ${
                        teacherPose === 'listening'
                          ? 'text-[#00B4FF]'
                          : teacherPose === 'wave'
                            ? 'text-amber-300'
                            : isPlaying
                              ? 'text-[#10B981]'
                              : 'text-slate-400'
                      }`}
                    >
                      {micListening
                        ? 'Listening to voice…'
                        : teacherPose === 'listening'
                          ? 'Listening to your doubt…'
                          : teacherPose === 'wave'
                            ? 'Welcome to Live Class!'
                            : isPlaying
                              ? `Speaking · Step ${currentStepIdx + 1}`
                              : 'Paused on Board'}
                    </span>
                    <span className="text-slate-500 uppercase">{language}</span>
                  </div>

                  {/* Interactive 3-Mode Avatar Switcher (Lip-Sync Face | Robot Squad | 3D Tutor) */}
                  <div
                    role="group"
                    aria-label="Tutor avatar view mode"
                    className="grid grid-cols-3 p-0.5 rounded-xl bg-[#070C18] border border-white/10 text-[10px] font-bold gap-0.5"
                  >
                    <button
                      type="button"
                      aria-pressed={avatarMode === 'lipsync'}
                      onClick={() => {
                        playClick();
                        setAvatarMode('lipsync');
                      }}
                      className={`py-1 rounded-lg whitespace-nowrap transition-colors ${
                        avatarMode === 'lipsync'
                          ? 'bg-[#00B4FF] text-[#070A12]'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Lip-Sync
                    </button>
                    <button
                      type="button"
                      aria-pressed={avatarMode === 'robot-squad'}
                      onClick={() => {
                        playClick();
                        setAvatarMode('robot-squad');
                      }}
                      className={`py-1 rounded-lg whitespace-nowrap transition-colors ${
                        avatarMode === 'robot-squad'
                          ? 'bg-[#00B4FF] text-[#070A12]'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Robot Squad
                    </button>
                    <button
                      type="button"
                      aria-pressed={avatarMode === '3d'}
                      onClick={() => {
                        playClick();
                        setAvatarMode('3d');
                      }}
                      className={`py-1 rounded-lg whitespace-nowrap transition-colors ${
                        avatarMode === '3d'
                          ? 'bg-[#00B4FF] text-[#070A12]'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      3D Tutor
                    </button>
                  </div>
                </div>

                {/* Audio-Driven Lip-Sync Avatar + Live Voice Waveform */}
                <LipSyncTutorAvatar
                  mode={avatarMode}
                  pose={teacherPose}
                  visemeSample={visemeSample}
                  isPlaying={isPlaying || isSpeakingAudio}
                  handRaised={handRaised}
                  micListening={micListening}
                  stepPointOffsetY={stepPointOffsetY}
                  stepPointTiltDeg={stepPointTiltDeg}
                />

                {/* Real-Time Voice Query Quick CTA */}
                <button
                  type="button"
                  onClick={() => handleVoiceQueryTrigger('new-topic')}
                  className={`w-full shrink-0 py-2 px-3 rounded-xl border text-xs font-extrabold inline-flex items-center justify-center gap-2 transition-all whitespace-nowrap ${
                    micListening
                      ? 'bg-rose-600 border-rose-400 text-white shadow-[0_0_18px_rgba(244,63,94,0.45)]'
                      : 'bg-[#0D162C] border-[#00B4FF]/40 text-[#00B4FF] hover:bg-[#00B4FF]/15'
                  }`}
                >
                  {micListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  <span>{micListening ? 'Stop Listening' : 'Ask New Voice Query'}</span>
                </button>
              </aside>

              {/* RIGHT / MAIN STAGE: DYNAMIC ANIMATED HANDWRITING WHITEBOARD */}
              <div
                ref={boardScrollRef}
                data-testid="dynamic-whiteboard-stage"
                data-surface={boardSurface}
                className={`relative flex-1 min-h-0 overflow-y-auto pl-[74px] sm:pl-[88px] lg:pl-6 pr-3 sm:pr-5 lg:pr-6 py-3.5 sm:py-4 lg:py-5 space-y-3.5 transition-colors duration-200 ${
                  isLightBoard ? 'live-whiteboard-grid text-slate-900' : 'live-blackboard-grid text-slate-100'
                }`}
              >
                {/* Whiteboard Surface, Annotation & Quick Problem Switcher Bar (Always Above Sketch Canvas) */}
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

                {/* Annotatable Whiteboard Canvas Area (Toolbar stays 100% interactive above) */}
                <div className="relative space-y-3.5">
                  {/* Interactive Freehand Student Sketchpad Canvas */}
                  <StudentSketchOverlay
                    active={annotateActive}
                    inkColor={inkColor}
                    clearSignal={clearInkSignal}
                  />

                  {/* Audio-Synchronized Handwritten Full Question on Whiteboard */}
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

                {/* Whiteboard Two-Column Grid: Animated Handwritten Steps (Left) + SVG Diagram & Script (Right) */}
                <div className="relative z-10 grid grid-cols-1 xl:grid-cols-12 gap-3.5 items-start">
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
                  <div className="xl:col-span-5 space-y-2.5 xl:sticky xl:top-0">
                    <LiveTeacherSvgBoard
                      svgType={activeStep.svgType}
                      activeStep={activeStep.stepNumber}
                    />

                    {/* Live Audio Caption Card with Real-Time Audio <-> Pencil Sync Bar */}
                    <div
                      className={`rounded-xl border p-3 space-y-2 ${
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
                      className={`rounded-xl border p-2.5 space-y-1.5 ${
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
                              className={`text-left px-2 py-1.5 rounded-lg border text-[11px] leading-tight font-semibold transition-colors ${
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

              {/* MOBILE COMPACT BOTTOM-LEFT DOCKED LIP-SYNC TUTOR (Strictly inside stage above footer, zero overlap) */}
              <div
                aria-hidden="true"
                className="lg:hidden pointer-events-none absolute bottom-2 left-1.5 z-20"
              >
                <LipSyncTutorAvatar
                  mode={avatarMode}
                  pose={teacherPose}
                  visemeSample={visemeSample}
                  isPlaying={isPlaying || isSpeakingAudio}
                  handRaised={handRaised}
                  micListening={micListening}
                  stepPointOffsetY={0}
                  stepPointTiltDeg={0}
                  compact
                />
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
                  className="border-t border-[#00B4FF]/40 bg-[#081022] px-3.5 sm:px-5 py-3 space-y-2.5 shrink-0 overflow-hidden"
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

                  {/* 1-Click Contextual Doubt Chips */}
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
                      placeholder='e.g. "Step 2 mein sin θ kyun liya?"'
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

            {/* VIDEO-STYLE BOTTOM PLAYER BAR */}
            <footer className="px-3.5 sm:px-5 py-2.5 bg-[#070B14] border-t border-white/10 flex flex-wrap items-center justify-between gap-2 shrink-0">
              {/* Left Transport Controls */}
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

              {/* Center Clickable Step Timeline Pills */}
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

              {/* Right CTA: Interactive Raise Hand / Voice Query */}
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
        </motion.div>
      )}
    </AnimatePresence>
  );
}
