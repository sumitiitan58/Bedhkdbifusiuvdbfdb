import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  CheckCircle2,
  Hand,
  Lightbulb,
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
import prepsbotTeacherImg from '../../assets/images/prepsbot_teacher_transparent.png';
import { usePrepskm2 } from '../../context/Prepskm2Context';
import {
  buildTeacherDoubtFallback,
  generateLiveTeacherLesson,
  type LiveTeacherLanguage,
} from '../../utils/liveTeacherEngine';
import { KatexFormula, RichMathText } from '../math/KatexFormula';
import { LiveTeacherSvgBoard } from './LiveTeacherSvgBoard';
import { requestPrepsAiChat } from '../../services/geminiClient';
import { playAiSparkle, playClick, playSuccess } from '../../utils/soundEffects';

const SPEED_OPTIONS = [0.85, 1, 1.25, 1.5] as const;

type TeacherPose = 'wave' | 'speaking' | 'idle' | 'listening';

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
  const { liveTeacherRequest, closeLiveTeacher } = usePrepskm2();

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

  // Raise Hand / Ask Doubt state
  const [handRaised, setHandRaised] = useState(false);
  const [doubtInput, setDoubtInput] = useState('');
  const [doubtLoading, setDoubtLoading] = useState(false);
  const [doubtExchange, setDoubtExchange] = useState<DoubtExchange | null>(null);
  const [micListening, setMicListening] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const boardScrollRef = useRef<HTMLDivElement | null>(null);
  const activeStepRef = useRef<HTMLDivElement | null>(null);
  const doubtAnswerRef = useRef<HTMLDivElement | null>(null);

  const stopSpeech = useCallback(() => {
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
    setWelcomeWaving(true);
    setReplayNonce((n) => n + 1);
    playAiSparkle();

    const waveTimer = window.setTimeout(() => setWelcomeWaving(false), 1550);
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

  // Auto-scroll active step or doubt answer into view on the Digital Blackboard
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

  // Synchronized Web Speech Narration + auto-advance while Playing
  useEffect(() => {
    if (!lesson || !activeStep || !isPlaying || handRaised) {
      stopSpeech();
      return;
    }

    let cancelled = false;
    let fallbackTimer: number | null = null;

    const advanceIfPossible = () => {
      if (cancelled) return;
      setIsSpeakingAudio(false);
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
      stopSpeech();
      try {
        const utterance = new SpeechSynthesisUtterance(activeScript);
        const voice = pickPreferredVoice(language);
        if (voice) utterance.voice = voice;
        utterance.lang = language === 'hinglish' ? 'en-IN' : 'en-US';
        utterance.rate = speed;
        utterance.pitch = 1.03;
        utterance.onstart = () => {
          if (!cancelled) setIsSpeakingAudio(true);
        };
        utterance.onend = () => {
          advanceIfPossible();
        };
        utterance.onerror = () => {
          if (!cancelled) setIsSpeakingAudio(false);
        };
        window.speechSynthesis.speak(utterance);
        // Safety fallback timer in case headless/sandboxed browsers silently swallow speechSynthesis events
        const estMs = Math.max(4800, Math.round((activeScript.length * 64) / speed));
        fallbackTimer = window.setTimeout(() => {
          if (!cancelled && !window.speechSynthesis.speaking) {
            advanceIfPossible();
          }
        }, estMs);
      } catch {
        const estMs = Math.max(4500, Math.round((activeScript.length * 55) / speed));
        fallbackTimer = window.setTimeout(advanceIfPossible, estMs);
      }
    } else {
      const estMs = Math.max(4200, Math.round((activeScript.length * 52) / speed));
      fallbackTimer = window.setTimeout(advanceIfPossible, estMs);
    }

    return () => {
      cancelled = true;
      if (fallbackTimer !== null) window.clearTimeout(fallbackTimer);
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

  const handleToggleDoubtMic = () => {
    if (micListening) {
      stopMic();
      return;
    }
    const SpeechRecCtor =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike })
        .webkitSpeechRecognition;

    if (!SpeechRecCtor) {
      setDoubtInput((prev) => prev || 'Step 2 mein sin θ kyun liya?');
      return;
    }

    try {
      const rec = new SpeechRecCtor();
      rec.lang = language === 'hinglish' ? 'en-IN' : 'en-US';
      rec.continuous = false;
      rec.interimResults = false;
      rec.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript?.trim();
        if (transcript) {
          setDoubtInput(transcript);
        }
      };
      rec.onerror = () => setMicListening(false);
      rec.onend = () => setMicListening(false);
      recognitionRef.current = rec;
      setMicListening(true);
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

    // Speak the doubt resolution aloud if audio is enabled
    if (!voiceMuted && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        const spokenText = finalReply.replace(/\$\$?[^$]+\$\$?/g, 'the formula shown on the board');
        const utt = new SpeechSynthesisUtterance(spokenText);
        const voice = pickPreferredVoice(language);
        if (voice) utt.voice = voice;
        utt.lang = language === 'hinglish' ? 'en-IN' : 'en-US';
        utt.rate = speed;
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

  const teacherPose: TeacherPose = handRaised
    ? 'listening'
    : welcomeWaving
      ? 'wave'
      : isPlaying || isSpeakingAudio
        ? 'speaking'
        : 'idle';

  // Smooth pointing shift synced to the active blackboard step (0..3)
  const stepPointOffsetY = [-14, -4, 6, 14][currentStepIdx] ?? 0;
  const stepPointTiltDeg = handRaised ? 3.5 : isPlaying ? [2.2, 3.2, 2.8, 1.8][currentStepIdx] ?? 2 : 0;

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
            className="relative w-full max-w-[1260px] h-[94vh] sm:h-[90vh] max-h-[860px] rounded-2xl sm:rounded-3xl bg-[#0B0F19] border border-[#00B4FF]/30 shadow-[0_28px_80px_-14px_rgba(0,0,0,0.9),0_0_40px_rgba(0,180,255,0.16)] flex flex-col overflow-hidden text-slate-100"
          >
            {/* TOP CLASSROOM HEADER BAR */}
            <header className="px-3.5 sm:px-5 py-3 bg-[#070B14]/95 border-b border-white/10 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#00B4FF]/15 border border-[#00B4FF]/35 text-[11px] font-mono font-bold text-[#00B4FF] shrink-0">
                  <span className="h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
                  LIVE CLASSROOM
                </span>
                <div className="min-w-0">
                  <h2 className="font-display text-sm sm:text-base font-extrabold text-white truncate">
                    Preps AI Live Teacher · {lesson.topicTitle}
                  </h2>
                  <p className="text-[11px] text-slate-400 truncate">
                    Step {currentStepIdx + 1} of {lesson.steps.length}: {activeStep.title}
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
                      className={`px-2.5 py-1 rounded-lg transition-colors ${
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
                      className={`px-2 py-1 rounded-lg transition-colors ${
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
                  {voiceMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-[#00B4FF]" />}
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

            {/* MAIN CLASSROOM STAGE: Full-Body 3D PrepsBot Teacher (Left) + Digital Blackboard (Right) */}
            <div className="relative flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
              {/* DESKTOP LEFT STAGE: Full-Body Transparent 3D PrepsBot Teacher (Zero box, zero circle frame) */}
              <aside
                aria-label="3D PrepsBot Live Teacher Stage"
                className="hidden lg:flex lg:w-[275px] xl:w-[310px] shrink-0 relative flex-col items-center justify-between px-4 pt-4 pb-4 bg-gradient-to-b from-[#0B0F19] via-[#0B1222] to-[#080C16] border-r border-white/[0.07] overflow-hidden select-none"
              >
                {/* Soft ambient classroom backlight behind teacher */}
                <div
                  aria-hidden="true"
                  className={`pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 w-56 h-56 rounded-full blur-3xl transition-colors duration-500 ${
                    teacherPose === 'listening'
                      ? 'bg-[#00B4FF]/28'
                      : isPlaying
                        ? 'bg-[#1D56C6]/24'
                        : 'bg-slate-700/15'
                  }`}
                />

                {/* Top Teacher Live Pose Indicator (in normal flex flow so it never overlaps teacher hair) */}
                <div className="relative z-20 shrink-0 w-full flex items-center justify-center mb-2">
                  <span
                    data-testid="teacher-pose-badge"
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold border transition-colors ${
                      teacherPose === 'listening'
                        ? 'bg-[#00B4FF]/20 border-[#00B4FF]/60 text-[#00B4FF]'
                        : teacherPose === 'wave'
                          ? 'bg-[#F27B13]/20 border-[#F27B13]/50 text-amber-300'
                          : isPlaying
                            ? 'bg-[#10B981]/15 border-[#10B981]/45 text-[#10B981]'
                            : 'bg-white/5 border-white/15 text-slate-300'
                    }`}
                  >
                    <Sparkles className="w-3 h-3" />
                    {teacherPose === 'listening'
                      ? 'Listening to your doubt…'
                      : teacherPose === 'wave'
                        ? 'Welcome to Live Class!'
                        : isPlaying
                          ? `Pointing · Step ${currentStepIdx + 1}`
                          : 'Paused on Board'}
                  </span>
                </div>

                {/* Full-Body 3D PrepsBot Teacher Figure (Scales proportionally inside flex-1 min-h-0) */}
                <div className="relative flex-1 min-h-0 w-full flex items-end justify-center pb-2 overflow-hidden">
                  {/* Soft floor ambient shadow beneath boots */}
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none absolute bottom-0.5 w-36 h-4 rounded-full blur-md transition-colors duration-500 ${
                      teacherPose === 'listening' ? 'bg-[#00B4FF]/45' : 'bg-black/80'
                    }`}
                  />

                  <motion.div
                    animate={{
                      y: handRaised ? 0 : stepPointOffsetY,
                      x: isPlaying ? 6 : 0,
                      rotate: stepPointTiltDeg,
                    }}
                    transition={{ type: 'spring', stiffness: 130, damping: 18 }}
                    className="relative z-10 h-full max-h-[430px] w-full flex items-end justify-center"
                  >
                    <img
                      src={prepsbotTeacherImg}
                      alt="PrepsBot 3D Live Teacher pointing to blackboard"
                      draggable={false}
                      data-pose={teacherPose}
                      className={`h-full max-h-[420px] w-auto max-w-[235px] object-contain pointer-events-none ${
                        teacherPose === 'listening'
                          ? 'teacher-pose-listening'
                          : teacherPose === 'wave'
                            ? 'teacher-pose-wave drop-shadow-[0_18px_28px_rgba(242,123,19,0.35)]'
                            : teacherPose === 'speaking'
                              ? 'teacher-pose-speaking drop-shadow-[0_20px_30px_rgba(0,180,255,0.34)]'
                              : 'teacher-pose-idle drop-shadow-[0_16px_26px_rgba(0,0,0,0.65)]'
                      }`}
                    />
                  </motion.div>
                </div>

                {/* Live Audio Equalizer / Caption Strip */}
                <div className="w-full rounded-xl bg-[#0D1324]/90 border border-white/10 px-3 py-2 text-center space-y-1">
                  <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-white">
                    <span>PrepsBot Faculty</span>
                    <span className="text-[#00B4FF]">·</span>
                    <span className="font-mono text-[#F27B13] uppercase">{language}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    {handRaised
                      ? 'Type or speak your cross-question below'
                      : isPlaying
                        ? 'Explaining step-by-step on the board'
                        : 'Press Play or tap any step pill'}
                  </p>
                </div>
              </aside>

              {/* RIGHT / MAIN STAGE: DIGITAL BLACKBOARD (Extra left clearance on <lg so mobile bottom-left PrepsBot never blocks equations) */}
              <div
                ref={boardScrollRef}
                className="flex-1 min-h-0 overflow-y-auto live-blackboard-grid pl-[68px] sm:pl-[84px] lg:pl-6 pr-3 sm:pr-5 lg:pr-6 py-3.5 sm:py-5 lg:py-6 space-y-4"
              >
                {/* Question Prompt Header on Blackboard */}
                <div className="rounded-2xl bg-[#0D1528]/90 border border-white/10 p-3.5 sm:p-4 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#00B4FF]">
                      Question on Board
                    </span>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                      {lesson.studentAnswer && (
                        <span className="px-2 py-0.5 rounded-md bg-rose-500/15 border border-rose-400/35 text-rose-300 font-semibold">
                          Your Pick: {lesson.studentAnswer}
                        </span>
                      )}
                      {lesson.officialAnswer && (
                        <span className="px-2 py-0.5 rounded-md bg-[#10B981]/15 border border-[#10B981]/40 text-[#10B981] font-bold">
                          Official: {lesson.officialAnswer}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-100 leading-relaxed font-medium">
                    <RichMathText text={lesson.questionPrompt} />
                  </p>
                </div>

                {/* Blackboard Two-Column Grid: Sequential Steps (Left) + Animated SVG Diagram & Subtitle (Right) */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
                  {/* SEQUENTIAL ANIMATED STEPS (Previous steps stay visible above!) */}
                  <div className="xl:col-span-7 space-y-3">
                    {lesson.steps.slice(0, currentStepIdx + 1).map((step, idx) => {
                      const isCurrent = idx === currentStepIdx;
                      return (
                        <motion.article
                          key={step.stepNumber}
                          ref={isCurrent ? activeStepRef : undefined}
                          initial={{ opacity: 0, y: 16, scale: 0.985 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                          onClick={() => handleJumpStep(idx)}
                          className={`rounded-2xl border p-3.5 sm:p-4 space-y-2.5 cursor-pointer transition-all ${
                            isCurrent
                              ? 'bg-[#0F1B33]/95 border-[#00B4FF] shadow-[0_0_26px_rgba(0,180,255,0.2),inset_0_1px_0_rgba(255,255,255,0.08)]'
                              : 'bg-[#0D1324]/75 border-white/10 opacity-85 hover:opacity-100 hover:border-white/25'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={`h-6 w-6 rounded-lg font-mono text-xs font-extrabold inline-flex items-center justify-center shrink-0 ${
                                  isCurrent
                                    ? 'bg-[#00B4FF] text-[#070A12]'
                                    : 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40'
                                }`}
                              >
                                {isCurrent ? step.stepNumber : <CheckCircle2 className="w-3.5 h-3.5" />}
                              </span>
                              <h3 className="font-display text-sm font-bold text-white leading-snug">
                                Step {step.stepNumber}: {step.title}
                              </h3>
                            </div>
                            {isCurrent && (
                              <span className="px-2 py-0.5 rounded-md bg-[#F27B13]/20 border border-[#F27B13]/45 text-[10px] font-mono font-bold text-amber-300 uppercase shrink-0">
                                {handRaised ? 'Paused for Doubt' : isPlaying ? 'Speaking Now' : 'Active Step'}
                              </span>
                            )}
                          </div>

                          {/* Crisp KaTeX Board Equation */}
                          <div className="px-3 py-2.5 rounded-xl bg-[#070B14] border border-dashed border-[#00B4FF]/30 overflow-x-auto">
                            <KatexFormula
                              latex={step.boardLatex}
                              displayMode
                              className="text-sm sm:text-base font-bold text-[#00B4FF]"
                            />
                          </div>

                          <p className="text-xs sm:text-[13px] text-slate-200 leading-relaxed">
                            {step.boardNotes}
                          </p>

                          {/* Teacher Pro-Tip Strip */}
                          <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-400/25 text-[11px] sm:text-xs text-amber-200">
                            <Lightbulb className="w-3.5 h-3.5 text-[#F27B13] shrink-0 mt-0.5" />
                            <span>
                              <strong className="text-amber-300">Exam Pro-Tip:</strong> {step.proTip}
                            </span>
                          </div>
                        </motion.article>
                      );
                    })}

                    {/* INLINE BLACKBOARD DOUBT RESOLUTION CARD */}
                    <AnimatePresence>
                      {doubtExchange && (
                        <motion.div
                          key={doubtExchange.id}
                          ref={doubtAnswerRef}
                          data-testid="live-teacher-doubt-answer"
                          initial={{ opacity: 0, y: 14, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="rounded-2xl border border-[#10B981]/55 bg-gradient-to-br from-[#0D1F28] to-[#0B1626] p-4 space-y-2.5 shadow-[0_0_24px_rgba(16,185,129,0.18)]"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-[#10B981]">
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
                          <p className="text-xs font-semibold text-amber-300">
                            Your Doubt: &ldquo;{doubtExchange.question}&rdquo;
                          </p>
                          <div className="text-xs sm:text-[13px] text-slate-100 leading-relaxed whitespace-pre-line">
                            <RichMathText text={doubtExchange.reply} />
                          </div>
                          {doubtExchange.latex && (
                            <div className="px-3 py-2 rounded-xl bg-[#070B14] border border-[#10B981]/30 overflow-x-auto">
                              <KatexFormula
                                latex={doubtExchange.latex}
                                className="text-sm font-bold text-[#10B981]"
                              />
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* ANIMATED SVG DIAGRAM + SYNCHRONIZED TEACHER SUBTITLES */}
                  <div className="xl:col-span-5 space-y-2.5 xl:sticky xl:top-0">
                    <LiveTeacherSvgBoard
                      svgType={activeStep.svgType}
                      activeStep={activeStep.stepNumber}
                    />

                    {/* Live Teacher Voice Subtitle Card */}
                    <div className="rounded-xl border border-white/10 bg-[#0D1324]/90 p-3 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#F27B13]">
                          Teacher Audio Script ({language === 'hinglish' ? 'Hinglish' : 'English'})
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">
                          {speed}x · {voiceMuted ? 'Muted' : 'Voice Ready'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed italic">
                        &ldquo;{activeScript}&rdquo;
                      </p>
                    </div>

                    {/* Quick 1-Tap Step Summary Checklist */}
                    <div className="rounded-xl border border-white/10 bg-[#0D1324]/75 p-2.5 space-y-1.5">
                      <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
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
                                  ? 'bg-[#00B4FF]/20 border-[#00B4FF] text-white'
                                  : unlocked
                                    ? 'bg-[#10B981]/10 border-[#10B981]/35 text-emerald-200'
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

              {/* MOBILE COMPACT BOTTOM-LEFT DOCKED PREPSBOT TEACHER (Strictly inside stage above footer, zero overlap on equations) */}
              <div
                aria-hidden="true"
                className="lg:hidden pointer-events-none absolute bottom-1.5 left-1.5 z-20 flex flex-col items-center"
              >
                <span
                  className={`w-10 h-2 rounded-full blur-sm absolute bottom-0 ${
                    teacherPose === 'listening' ? 'bg-[#00B4FF]/60' : 'bg-black/75'
                  }`}
                />
                <img
                  src={prepsbotTeacherImg}
                  alt=""
                  draggable={false}
                  className={`w-[54px] sm:w-[68px] h-auto object-contain ${
                    teacherPose === 'listening'
                      ? 'teacher-pose-listening'
                      : isPlaying
                        ? 'teacher-pose-speaking drop-shadow-[0_8px_16px_rgba(0,180,255,0.4)]'
                        : 'teacher-pose-idle'
                  }`}
                />
              </div>
            </div>

            {/* RAISE HAND / ASK DOUBT DRAWER (Appears smoothly above bottom player bar when active) */}
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
                      Hand Raised — Lesson Paused on Step {activeStep.stepNumber}. Ask your exact doubt:
                    </span>
                    <button
                      type="button"
                      onClick={handleResumeAfterDoubt}
                      className="text-xs font-semibold text-slate-300 hover:text-white underline"
                    >
                      Resume Lesson
                    </button>
                  </div>

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
                      onClick={handleToggleDoubtMic}
                      aria-label={micListening ? 'Stop voice doubt input' : 'Ask doubt with microphone'}
                      className={`h-10 px-3 rounded-xl inline-flex items-center gap-1.5 text-xs font-bold border transition-colors shrink-0 ${
                        micListening
                          ? 'bg-rose-600 border-rose-500 text-white animate-pulse'
                          : 'bg-[#0D1324] border-white/15 text-slate-200 hover:border-[#00B4FF]'
                      }`}
                    >
                      {micListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-[#00B4FF]" />}
                      <span className="hidden sm:inline">{micListening ? 'Listening…' : 'Mic'}</span>
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
            <footer className="px-3.5 sm:px-5 py-3 bg-[#070B14] border-t border-white/10 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
              {/* Left Transport Controls: Prev, Play/Pause, Next, Replay */}
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
                  className="h-9 px-3.5 rounded-xl bg-[#00B4FF] hover:bg-[#33C4FF] text-[#070A12] font-display text-xs sm:text-sm font-extrabold inline-flex items-center gap-1.5 shadow-[0_0_18px_rgba(0,180,255,0.35)] transition-colors"
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
                  className="h-9 px-2.5 rounded-xl bg-[#0D1324] border border-white/10 hover:border-[#00B4FF] text-xs font-semibold text-slate-300 hover:text-white inline-flex items-center gap-1 transition-colors"
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

              {/* Right CTA: Interactive Raise Hand / Ask Doubt */}
              <button
                type="button"
                onClick={handleToggleRaiseHand}
                aria-pressed={handRaised}
                className={`h-9 px-3.5 rounded-xl font-display text-xs sm:text-sm font-extrabold inline-flex items-center gap-1.5 border transition-all shrink-0 ${
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
