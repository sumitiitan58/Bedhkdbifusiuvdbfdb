import { useEffect, useMemo, useRef, useState, type ClipboardEvent, type DragEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  BookmarkCheck,
  BookmarkPlus,
  GraduationCap,
  ImagePlus,
  Loader2,
  Send,
  Sparkles,
  Trophy,
  Upload,
  X,
} from 'lucide-react';
import prepsbotMascotImg from '../../assets/images/prepsbot_3d_transparent.png';
import { RichMathText } from '../math/KatexFormula';
import { usePrepskm2 } from '../../context/Prepskm2Context';
import { useAuth } from '../../context/AuthContext';
import { usePlatformData } from '../../context/PlatformDataContext';
import { requestPrepsAiChat } from '../../services/geminiClient';
import { playAiSparkle, playClick, playSuccess } from '../../utils/soundEffects';

type PrepsBotMode = 'doubt' | 'strategy' | 'hint';

interface BotMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  imagePreview?: string;
  mode?: PrepsBotMode;
  savedToMistakes?: boolean;
}

const MODE_OPTIONS: Array<{ id: PrepsBotMode; label: string; systemInstruction: string }> = [
  {
    id: 'doubt',
    label: 'Doubt Solver',
    systemInstruction:
      'Solve step-by-step clearly for JEE/NEET. Wrap math equations in $...$ or $$...$$ LaTeX.',
  },
  {
    id: 'strategy',
    label: 'Strategy Coach',
    systemInstruction:
      'Give concise, high-ROI exam strategy, time management, and chapter prioritization advice in crisp Hinglish/English.',
  },
  {
    id: 'hint',
    label: 'Hint Mode',
    systemInstruction:
      'Do NOT reveal the final numerical answer immediately. Give only the first intuitive hint and governing formula wrapped in $...$.',
  },
];

const QUICK_ACTION_CHIPS = [
  {
    label: 'Explain Step 2',
    buildPrompt: (topic: string) =>
      `Explain Step 2 clearly for "${topic}" without skipping algebra. Wrap key equations in $...$.`,
  },
  {
    label: 'Give Formula Only',
    buildPrompt: (topic: string) =>
      `Give ONLY the core governing formula (in LaTeX $...$) and SI units for "${topic}" — no long paragraph.`,
  },
  {
    label: 'Generate 3 Similar PYQs',
    buildPrompt: (topic: string) =>
      `Generate 3 similar JEE/NEET PYQ-style MCQs based on "${topic}" with options (A)-(D) and concise answer key.`,
  },
  {
    label: 'Analyze My Weak Chapters',
    buildPrompt: () =>
      `Analyze my current weak chapters and suggest a focused 45-minute repair sprint using Prepskm Arena and PYQs.`,
  },
];

const SAVED_MISTAKE_NOTES_KEY = 'prepskm_saved_ai_mistakes_v1';

function getContextualNudge(pathname: string): string {
  if (pathname === '/') return 'Aaj Organic ka 60s Reaction Duel khelein?';
  if (pathname.startsWith('/arena')) return 'Formula Blitz mein 3x combo try karein?';
  if (pathname.startsWith('/analytics') || pathname.startsWith('/mistakes')) {
    return '2 questions mein silly mistake hui—step-by-step samjhaun?';
  }
  if (pathname.startsWith('/cbt-mocks')) {
    return 'Mock se pehle 3-min Paper Scanner warm-up karein?';
  }
  if (pathname.startsWith('/materials')) {
    return 'Koi formula ya derivation unclear hai? Photo bhejo!';
  }
  return 'Doubt aaya? Screenshot drop karo ya step-by-step pucho!';
}

function saveSolutionToMistakeNotebook(entry: { id: string; text: string; cohort: string }) {
  try {
    const raw = window.localStorage.getItem(SAVED_MISTAKE_NOTES_KEY);
    const existing = raw ? (JSON.parse(raw) as Array<Record<string, unknown>>) : [];
    const next = [
      {
        id: entry.id,
        text: entry.text,
        cohort: entry.cohort,
        savedAtIso: new Date().toISOString(),
      },
      ...existing.filter((item) => item.id !== entry.id),
    ].slice(0, 50);
    window.localStorage.setItem(SAVED_MISTAKE_NOTES_KEY, JSON.stringify(next));
  } catch {
    // ignore storage limits
  }
}

export function PrepsBotWidget() {
  const location = useLocation();
  const {
    copilotOpen,
    setCopilotOpen,
    pendingCopilotPrompt,
    clearPendingCopilotPrompt,
    zenMode,
    levelProgress,
    prepsbotVictory,
    triggerPrepsBotVictory,
    clearPrepsBotVictory,
    liveTeacherRequest,
    openLiveTeacher,
  } = usePrepskm2();
  const { cohortId } = useAuth();
  const { allCohorts, attempts } = usePlatformData();

  const cohortLabel = useMemo(
    () => allCohorts.find((c) => c.id === cohortId)?.label ?? 'JEE Main / NEET UG',
    [allCohorts, cohortId]
  );

  // Detect live NTA CBT Light Mode so PrepsBot hides automatically during an exam
  const [inLiveCbtExam, setInLiveCbtExam] = useState(false);

  useEffect(() => {
    const checkExamMode = () => {
      setInLiveCbtExam(document.documentElement.dataset.ntaExamMode === 'light');
    };
    checkExamMode();
    const observer = new MutationObserver(checkExamMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-nta-exam-mode'],
    });
    return () => observer.disconnect();
  }, [location.pathname]);

  const [mode, setMode] = useState<PrepsBotMode>('doubt');
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const [nudgeVisible, setNudgeVisible] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [spinCount, setSpinCount] = useState(0);
  const isArenaFightMode = location.pathname.startsWith('/arena');

  const [messages, setMessages] = useState<BotMessage[]>([
    {
      id: 'welcome-prepsbot',
      role: 'assistant',
      mode: 'doubt',
      text: `Namaste! Main **PrepsBot** hoon (${cohortLabel}). Doubt photo drop karo ya formula pucho — jaise $v_e = \\sqrt{\\frac{2GM}{R}}$ ya Aldol mechanism — step-by-step clear karta hoon!`,
    },
  ]);

  const [streamingMsgId, setStreamingMsgId] = useState<string | null>(null);
  const [streamedChars, setStreamedChars] = useState<number>(0);

  const [input, setInput] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>('image/png');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fileRef = useRef<HTMLInputElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const prevAttemptsCountRef = useRef<number | null>(null);

  // Trigger prepsbot-victory automatically when a user completes a new mock test / DPP attempt
  useEffect(() => {
    if (prevAttemptsCountRef.current === null) {
      prevAttemptsCountRef.current = attempts.length;
      return;
    }
    if (attempts.length > prevAttemptsCountRef.current) {
      const latest = attempts[0];
      triggerPrepsBotVictory({
        title: 'Mock Test Completed!',
        subtitle: latest
          ? `${latest.testTitle} logged (${latest.score}/${latest.maxScore}) — Prep Score updated!`
          : 'Prep Score & Percentile updated — check your Mistake Notebook!',
        badge: 'MOCK COMPLETE',
      });
    }
    prevAttemptsCountRef.current = attempts.length;
  }, [attempts, triggerPrepsBotVictory]);

  // Allow any flow (mock finish, level milestone, etc.) to trigger PrepsBot's victory pose via window event
  useEffect(() => {
    const onVictoryEvent = (event: Event) => {
      const detail = (event as CustomEvent<{ title?: string; subtitle?: string; badge?: string }>).detail;
      triggerPrepsBotVictory({
        title: detail?.title || 'Milestone Achieved!',
        subtitle: detail?.subtitle || 'PrepsBot celebrates your hard work!',
        badge: detail?.badge || 'VICTORY',
      });
    };
    window.addEventListener('prepsbot:victory', onVictoryEvent);
    return () => window.removeEventListener('prepsbot:victory', onVictoryEvent);
  }, [triggerPrepsBotVictory]);

  // Auto-play triumph chime & clear victory pose cleanly after celebration window
  useEffect(() => {
    if (!prepsbotVictory) return;
    playSuccess();
    setSpinCount((c) => c + 1);
    const timer = window.setTimeout(() => {
      clearPrepsBotVictory();
    }, 5500);
    return () => window.clearTimeout(timer);
  }, [prepsbotVictory, clearPrepsBotVictory]);

  const isVictoryActive = Boolean(prepsbotVictory);
  const nudgeText = useMemo(() => getContextualNudge(location.pathname), [location.pathname]);

  // Show contextual nudge smoothly after route change if not dismissed
  useEffect(() => {
    if (copilotOpen || nudgeDismissed || inLiveCbtExam || zenMode) {
      setNudgeVisible(false);
      return;
    }
    const timer = window.setTimeout(() => setNudgeVisible(true), 650);
    return () => window.clearTimeout(timer);
  }, [location.pathname, copilotOpen, nudgeDismissed, inLiveCbtExam, zenMode]);

  // Smooth typewriter streaming reveal for the newest assistant message
  useEffect(() => {
    if (!streamingMsgId) return;
    const target = messages.find((m) => m.id === streamingMsgId);
    if (!target) {
      setStreamingMsgId(null);
      return;
    }
    if (streamedChars >= target.text.length) {
      setStreamingMsgId(null);
      return;
    }
    const step = Math.max(4, Math.ceil(target.text.length / 26));
    const timer = window.setTimeout(() => {
      setStreamedChars((c) => Math.min(target.text.length, c + step));
    }, 18);
    return () => window.clearTimeout(timer);
  }, [streamingMsgId, streamedChars, messages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamedChars, loading]);

  const sendMessage = async (textToSend: string, modeOverride?: PrepsBotMode) => {
    const trimmed = textToSend.trim();
    if (!trimmed && !imageBase64) return;
    setErrorMsg('');

    const activeMode = modeOverride ?? mode;
    const modeSpec = MODE_OPTIONS.find((m) => m.id === activeMode) ?? MODE_OPTIONS[0];
    const currentImage = imageBase64;
    const currentMime = imageMime;

    const userMsg: BotMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: trimmed || 'Please solve this uploaded question step-by-step.',
      imagePreview: currentImage ? `data:${currentMime};base64,${currentImage}` : undefined,
      mode: activeMode,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setImageBase64(null);
    setLoading(true);
    playAiSparkle();

    try {
      const result = await requestPrepsAiChat({
        message: `[Mode: ${modeSpec.label} — ${modeSpec.systemInstruction}]\n${
          currentImage
            ? `${userMsg.text}\n[Student attached doubt image (${currentMime})]`
            : userMsg.text
        }`,
        studentContext: {
          cohortLabel,
          source: 'prepsbot-3d-mentor',
          mode: activeMode,
          attemptsCount: attempts.length,
          hasUploadedImage: Boolean(currentImage),
        },
        history: messages.slice(-6).map((m) => ({
          role: m.role,
          text: m.text,
        })),
      });

      const assistantId = `a-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: 'assistant',
          text: result.reply,
          mode: activeMode,
        },
      ]);
      setStreamingMsgId(assistantId);
      setStreamedChars(12);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to reach PrepsBot right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (copilotOpen && pendingCopilotPrompt) {
      const prompt = pendingCopilotPrompt;
      clearPendingCopilotPrompt();
      void sendMessage(prompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [copilotOpen, pendingCopilotPrompt]);

  const handleImageFile = (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please drop or pick an image file (PNG, JPG, WEBP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? '');
      const parts = dataUrl.split(',');
      if (parts.length === 2) {
        setImageMime(file.type || 'image/png');
        setImageBase64(parts[1]);
        setErrorMsg('');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    handleImageFile(e.dataTransfer.files?.[0]);
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        e.preventDefault();
        handleImageFile(items[i].getAsFile());
        break;
      }
    }
  };

  const handleSaveMistake = (msg: BotMessage) => {
    playSuccess();
    saveSolutionToMistakeNotebook({
      id: msg.id,
      text: msg.text,
      cohort: cohortLabel,
    });
    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, savedToMistakes: true } : m))
    );
  };

  // Hide completely during live NTA CBT Exam Mode, Zen Study Mode, or active Live Teacher Classroom
  if (inLiveCbtExam || zenMode || liveTeacherRequest) return null;

  const lastUserTopic =
    [...messages].reverse().find((m) => m.role === 'user')?.text.slice(0, 90) ||
    'Rotational Motion / Organic Reaction Mechanisms';

  return (
    <div className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-[75] flex flex-col items-end pointer-events-none">
      {/* EXPANDED PREPSBOT DRAWER (380x540 desktop, responsive sheet on mobile) */}
      <AnimatePresence>
        {copilotOpen && (
          <motion.section
            role="dialog"
            aria-modal="false"
            aria-label="PrepsBot AI Mentor"
            initial={{ opacity: 0, scale: 0.92, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 14 }}
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className="pointer-events-auto mb-3 w-[calc(100vw-2rem)] sm:w-[380px] h-[540px] max-h-[78vh] origin-bottom-right rounded-2xl bg-[#0D1324] text-slate-100 border border-[#00B4FF]/30 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.75),0_0_32px_rgba(0,180,255,0.18),inset_0_1px_0_rgba(255,255,255,0.08)] flex flex-col overflow-hidden relative"
          >
            {/* Drag-and-drop overlay */}
            {dragActive && (
              <div className="absolute inset-0 z-20 bg-[#070A12]/90 backdrop-blur-sm border-2 border-dashed border-[#00B4FF] rounded-2xl flex flex-col items-center justify-center gap-2 text-center p-6">
                <Upload className="w-8 h-8 text-[#00B4FF]" />
                <p className="font-display text-sm font-bold text-white">
                  Drop Doubt Screenshot Here
                </p>
                <p className="text-xs text-slate-400">
                  PrepsBot will read the problem and solve it step-by-step
                </p>
              </div>
            )}

            {/* Header with Mascot Mini-Avatar, Green Online Dot & Mode Switcher */}
            <div className="px-4 pt-3.5 pb-3 bg-[#070A12]/90 border-b border-white/10 space-y-2.5 shrink-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <motion.button
                    type="button"
                    onClick={() => {
                      playClick();
                      setSpinCount((c) => c + 1);
                    }}
                    animate={{ rotateY: spinCount * 360 }}
                    transition={{ type: 'spring', stiffness: 180, damping: 16 }}
                    title="Tap PrepsBot to spin!"
                    aria-label="Spin PrepsBot 3D mascot"
                    className="relative w-11 h-12 shrink-0 flex items-center justify-center bg-transparent border-0 p-0"
                    style={{ perspective: 500 }}
                  >
                    <img
                      src={prepsbotMascotImg}
                      alt="PrepsBot 3D Mascot"
                      className="w-full h-full object-contain drop-shadow-[0_4px_10px_rgba(0,180,255,0.45)]"
                    />
                    <span
                      aria-label="Online"
                      className="absolute bottom-0.5 right-0 w-2.5 h-2.5 rounded-full bg-[#10B981] ring-2 ring-[#070A12]"
                    />
                  </motion.button>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h2 className="font-display text-sm font-extrabold text-white truncate">
                        PrepsBot • AI Mentor
                      </h2>
                    </div>
                    <p className="text-[11px] text-[#00B4FF] truncate font-medium">
                      Live KaTeX · Photo Doubts · {cohortLabel}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      triggerPrepsBotVictory({
                        title: `Level ${levelProgress.level} Champion`,
                        subtitle: `${levelProgress.currentLevelXp}/${levelProgress.nextLevelXp} XP toward Level ${levelProgress.level + 1}`,
                        badge: `LVL ${levelProgress.level}`,
                      });
                    }}
                    title="View XP Level & celebrate PrepsBot Victory Pose"
                    aria-label={`Level ${levelProgress.level} victory pose`}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#F27B13]/15 border border-[#F27B13]/35 text-[10px] font-mono font-bold text-[#F27B13] hover:bg-[#F27B13]/25 transition-colors"
                  >
                    <Trophy className="w-3 h-3" />
                    Lvl {levelProgress.level}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playClick();
                      setCopilotOpen(false);
                    }}
                    aria-label="Close PrepsBot Mentor"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 3-Mode Sliding Pill Switcher */}
              <div
                role="tablist"
                aria-label="PrepsBot mentor mode"
                className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#0D1324] border border-white/10"
              >
                {MODE_OPTIONS.map((opt) => {
                  const active = mode === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => {
                        playClick();
                        setMode(opt.id);
                      }}
                      className={`relative py-1.5 px-2 rounded-lg text-[11px] font-bold transition-colors whitespace-nowrap ${
                        active ? 'text-[#070A12]' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="prepsbotMode"
                          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                          className="absolute inset-0 rounded-lg bg-[#00B4FF]"
                        />
                      )}
                      <span className="relative z-10">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Action Chips + Glowing Live Teacher CTA */}
            <div className="px-3.5 py-2 border-b border-white/10 bg-[#070A12]/50 flex items-center gap-1.5 overflow-x-auto shrink-0">
              <button
                type="button"
                onClick={() => {
                  playClick();
                  openLiveTeacher({
                    questionText: lastUserTopic,
                    source: 'preps-ai',
                  });
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#00B4FF] to-[#1D56C6] text-[#070A12] font-extrabold text-[11px] whitespace-nowrap shrink-0 shadow-[0_0_16px_rgba(0,180,255,0.45)] hover:brightness-110 transition-all"
              >
                <GraduationCap className="w-3.5 h-3.5" />
                Explain Like a Teacher
              </button>
              {QUICK_ACTION_CHIPS.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  disabled={loading}
                  onClick={() => void sendMessage(chip.buildPrompt(lastUserTopic))}
                  className="px-2.5 py-1 rounded-lg bg-[#0D1324] border border-[#00B4FF]/25 hover:border-[#00B4FF] text-[11px] font-semibold text-slate-200 hover:text-[#00B4FF] whitespace-nowrap shrink-0 transition-colors"
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Conversation Stream */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3.5 space-y-3">
              {messages.map((msg) => {
                const isStreaming = msg.id === streamingMsgId;
                const displayText = isStreaming
                  ? msg.text.slice(0, streamedChars)
                  : msg.text;
                const isAssistant = msg.role === 'assistant';

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isAssistant ? 'items-start' : 'items-end'}`}
                  >
                    <div
                      className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-[13px] leading-relaxed whitespace-pre-line ${
                        isAssistant
                          ? 'bg-[#070A12] text-slate-100 border border-[#00B4FF]/20 rounded-bl-sm'
                          : 'bg-[#1D56C6] text-white rounded-br-sm'
                      }`}
                    >
                      {msg.imagePreview && (
                        <img
                          src={msg.imagePreview}
                          alt="Uploaded doubt preview"
                          referrerPolicy="no-referrer"
                          className="mb-2 max-h-36 rounded-lg border border-white/20 object-contain"
                        />
                      )}
                      <RichMathText text={displayText} />
                      {isStreaming && (
                        <span className="inline-block w-1.5 h-3.5 ml-0.5 align-middle bg-[#00B4FF] animate-pulse" />
                      )}
                    </div>

                    {/* Action strip on assistant replies: Live Teacher + Save to Mistake Notebook */}
                    {isAssistant && !isStreaming && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            playClick();
                            openLiveTeacher({
                              questionText:
                                msg.id === 'welcome-prepsbot' ? lastUserTopic : lastUserTopic,
                              solutionText: msg.text,
                              source: 'preps-ai',
                            });
                          }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#00B4FF]/15 border border-[#00B4FF]/40 text-[#00B4FF] hover:bg-[#00B4FF]/25 shadow-[0_0_10px_rgba(0,180,255,0.2)] transition-colors"
                        >
                          <GraduationCap className="w-3 h-3" />
                          Explain Like a Teacher
                        </button>
                        {msg.id !== 'welcome-prepsbot' && (
                          <button
                            type="button"
                            onClick={() => handleSaveMistake(msg)}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors ${
                              msg.savedToMistakes
                                ? 'text-[#10B981] bg-[#10B981]/10'
                                : 'text-slate-400 hover:text-[#00B4FF] hover:bg-white/5'
                            }`}
                          >
                            {msg.savedToMistakes ? (
                              <>
                                <BookmarkCheck className="w-3 h-3" />
                                Saved to Mistake Notebook
                              </>
                            ) : (
                              <>
                                <BookmarkPlus className="w-3 h-3" />
                                Save to Mistake Notebook
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {loading && (
                <div className="flex items-center gap-2 text-xs text-[#00B4FF] px-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>PrepsBot is deriving the solution...</span>
                </div>
              )}

              {errorMsg && (
                <div className="p-2.5 rounded-xl bg-[#F43F5E]/15 border border-[#F43F5E]/40 text-xs text-[#F43F5E]">
                  {errorMsg}
                </div>
              )}
            </div>

            {/* Composer with Screenshot Upload & Paste Support */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void sendMessage(input);
              }}
              className="p-3 border-t border-white/10 bg-[#070A12] space-y-2 shrink-0"
            >
              {imageBase64 && (
                <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-[#00B4FF]/15 border border-[#00B4FF]/35 text-[11px] text-[#00B4FF]">
                  <span className="truncate font-semibold">Doubt image ready to solve</span>
                  <button
                    type="button"
                    onClick={() => setImageBase64(null)}
                    className="font-bold hover:underline shrink-0"
                  >
                    Remove
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageFile(e.target.files?.[0])}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  aria-label="Upload doubt screenshot"
                  title="Upload or drag-drop doubt photo"
                  className="p-2.5 rounded-xl bg-[#0D1324] border border-white/10 text-slate-300 hover:border-[#00B4FF] hover:text-[#00B4FF] transition-colors shrink-0"
                >
                  <ImagePlus className="w-4 h-4" />
                </button>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onPaste={handlePaste}
                  placeholder="Ask doubt or paste screenshot..."
                  className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-[#0D1324] border border-white/10 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#00B4FF]"
                />
                <button
                  type="submit"
                  disabled={loading || (!input.trim() && !imageBase64)}
                  aria-label="Send message to PrepsBot"
                  className="p-2.5 rounded-xl bg-[#00B4FF] hover:bg-[#33C4FF] disabled:opacity-40 text-[#070A12] font-bold transition-colors shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </motion.section>
        )}
      </AnimatePresence>

      {/* FLOATING DOCK: Victory Banner or Contextual Nudge + Free-Floating 3D Transparent PrepsBot (No Circle Frame) */}
      <div className="flex items-end gap-2 sm:gap-3 pointer-events-auto">
        <AnimatePresence mode="wait">
          {prepsbotVictory ? (
            <motion.div
              key={`victory-${prepsbotVictory.id}`}
              role="status"
              aria-live="polite"
              data-testid="prepsbot-victory-banner"
              initial={{ opacity: 0, x: 20, scale: 0.88 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 14, scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 360, damping: 22 }}
              className="flex items-start gap-2.5 max-w-[290px] mb-4 pl-3.5 pr-2 py-2.5 rounded-2xl rounded-br-sm bg-gradient-to-br from-[#0D1324] via-[#101C36] to-[#0D1324] backdrop-blur-xl border border-amber-400/60 shadow-[0_14px_34px_rgba(0,0,0,0.6),0_0_26px_rgba(245,158,11,0.3)] text-xs text-slate-100"
            >
              <div className="h-7 w-7 rounded-lg bg-amber-400/20 border border-amber-400/40 text-amber-300 inline-flex items-center justify-center shrink-0 mt-0.5">
                <Trophy className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] font-extrabold uppercase tracking-wider text-amber-300">
                    {prepsbotVictory.badge}
                  </span>
                  <span className="h-1 w-1 rounded-full bg-[#10B981]" />
                  <span className="font-mono text-[10px] font-bold text-[#10B981]">
                    Lvl {levelProgress.level}
                  </span>
                </div>
                <p className="font-display text-xs font-extrabold text-white leading-snug">
                  {prepsbotVictory.title}
                </p>
                <p className="text-[11px] text-slate-300 leading-snug">
                  {prepsbotVictory.subtitle}
                </p>
              </div>
              <button
                type="button"
                aria-label="Dismiss victory celebration"
                onClick={clearPrepsBotVictory}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ) : (
            nudgeVisible &&
            !copilotOpen && (
              <motion.div
                key="nudge-bubble"
                initial={{ opacity: 0, x: 18, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 14, scale: 0.92 }}
                transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                className="hidden sm:flex items-center gap-2 max-w-[270px] mb-5 pl-3.5 pr-2 py-2.5 rounded-2xl rounded-br-sm bg-[#0D1324]/95 backdrop-blur-xl border border-[#00B4FF]/35 shadow-[0_12px_30px_rgba(0,0,0,0.5),0_0_20px_rgba(0,180,255,0.16)] text-xs text-slate-100"
              >
                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    setSpinCount((c) => c + 1);
                    setNudgeVisible(false);
                    setCopilotOpen(true);
                  }}
                  className="text-left leading-snug font-medium hover:text-[#00B4FF] transition-colors"
                >
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#F27B13] mr-1.5">
                    <Sparkles className="w-3 h-3" />
                    PrepsBot
                  </span>
                  {nudgeText}
                </button>
                <button
                  type="button"
                  aria-label="Dismiss PrepsBot nudge"
                  onClick={() => {
                    playClick();
                    setNudgeDismissed(true);
                    setNudgeVisible(false);
                  }}
                  className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )
          )}
        </AnimatePresence>

        {/* Direct Free-Floating 3D Mascot (Zero background, zero circle border, 360° 3D spin, Arena fight stance & Victory pose) */}
        <button
          type="button"
          onClick={() => {
            playClick();
            setSpinCount((c) => c + 1);
            setCopilotOpen(!copilotOpen);
          }}
          data-victory={isVictoryActive ? 'true' : 'false'}
          aria-label={copilotOpen ? 'Minimize PrepsBot AI Mentor' : 'Open PrepsBot AI Mentor'}
          title={
            isVictoryActive
              ? 'PrepsBot • Victory Celebration!'
              : isArenaFightMode
                ? 'PrepsBot • Battle Coach (Tap to spin & open!)'
                : 'PrepsBot • 3D AI Mentor'
          }
          className="group relative w-[76px] h-[94px] sm:w-[88px] sm:h-[108px] flex flex-col items-center justify-end bg-transparent border-0 p-0 focus-visible:rounded-2xl select-none"
          style={{ perspective: 750 }}
        >
          {/* Celebratory Sparkle Burst around floating mascot during victory pose */}
          {isVictoryActive && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -inset-2 flex items-start justify-between"
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-bounce" />
              <Sparkles className="w-4 h-4 text-[#10B981] animate-pulse mt-1" />
            </span>
          )}

          {/* Ambient neon floor glow & levitation shadow beneath feet */}
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute bottom-1 w-12 h-3 rounded-full blur-md prepsbot-shadow ${
              isVictoryActive
                ? 'bg-gradient-to-r from-amber-400 via-[#10B981] to-[#00B4FF] w-16 h-3.5'
                : isArenaFightMode
                  ? 'bg-[#F27B13]/65'
                  : 'bg-[#00B4FF]/55'
            }`}
          />

          {/* 3D Animated Robot Figure (Hover triggers playful 360° round-round spin & lift) */}
          <motion.div
            animate={{ rotateY: spinCount * 360 }}
            whileHover={{ scale: 1.12, y: -6, rotateY: spinCount * 360 + 360 }}
            whileTap={{ scale: 0.93 }}
            transition={{ type: 'spring', stiffness: 170, damping: 16 }}
            className="w-full h-full flex items-center justify-center"
            style={{ transformStyle: 'preserve-3d' }}
          >
            <img
              src={prepsbotMascotImg}
              alt="PrepsBot 3D AI Mentor Mascot"
              draggable={false}
              className={`w-full h-full object-contain pointer-events-none ${
                isVictoryActive
                  ? 'prepsbot-victory'
                  : isArenaFightMode
                    ? 'prepsbot-fight drop-shadow-[0_12px_22px_rgba(242,123,19,0.45)]'
                    : 'prepsbot-float drop-shadow-[0_14px_22px_rgba(0,180,255,0.42)]'
              }`}
            />
          </motion.div>
        </button>
      </div>
    </div>
  );
}
