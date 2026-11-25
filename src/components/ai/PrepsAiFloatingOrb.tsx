import { useCallback, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowUpRight,
  Loader2,
  Mic,
  MicOff,
  Radio,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePlatformData } from '../../context/PlatformDataContext';
import {
  requestPrepsAiChat,
  type PrepsAiChatMessage,
} from '../../services/geminiClient';
import {
  buildPrepsAiStudentContext,
  computeExamCountdown,
  computeStudyStreak,
} from '../../utils/streakTracker';
import { extractMistakeEntries } from '../../utils/testAnalysisEngine';
import { usePrepsVoice } from '../../hooks/usePrepsVoice';
import { playAiSparkle, playClick } from '../../utils/soundEffects';

const QUICK_PROMPTS = [
  'Mera latest test ka progress kaisa hai?',
  'Maths mein marks kyun kat rahe hain?',
  'Give me a 7-day weak chapter plan',
];

export function PrepsAiFloatingOrb() {
  const location = useLocation();
  const { profile, firebaseUser, cohortId } = useAuth();
  const {
    allCohorts,
    attempts,
    questions,
    activeStudyDates,
    targetExamDate,
    bookmarkedQuestionIds,
    resolvedMistakeIds,
  } = usePlatformData();

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState<PrepsAiChatMessage[]>([
    {
      role: 'assistant',
      text: 'Hi! I am Preps AI. Tap the mic or ask about your latest mock test progress, weak chapters, or any JEE/NEET concept.',
    },
  ]);
  const [followUps, setFollowUps] = useState<string[]>(QUICK_PROMPTS);

  const messagesRef = useRef<PrepsAiChatMessage[]>(messages);
  messagesRef.current = messages;

  const studentContext = useMemo(() => {
    const cohortLabel = allCohorts.find((c) => c.id === cohortId)?.label ?? 'Class 12 JEE';
    const streak = computeStudyStreak(activeStudyDates);
    const countdown = computeExamCountdown(targetExamDate);
    const resolvedSet = new Set(resolvedMistakeIds);
    const unresolvedMistakesCount = extractMistakeEntries(attempts, questions).filter(
      (m) => !resolvedSet.has(m.questionId)
    ).length;

    return buildPrepsAiStudentContext({
      studentName: profile?.displayName || firebaseUser?.displayName || 'Student',
      cohortLabel,
      attempts,
      currentStreakDays: streak.currentStreak,
      targetExamDaysLeft: countdown.daysRemaining,
      bookmarkedQuestionsCount: bookmarkedQuestionIds.length,
      unresolvedMistakesCount,
    });
  }, [
    activeStudyDates,
    allCohorts,
    attempts,
    bookmarkedQuestionIds.length,
    cohortId,
    firebaseUser?.displayName,
    profile?.displayName,
    questions,
    resolvedMistakeIds,
    targetExamDate,
  ]);

  const sendMessageRef = useRef<(text: string, viaVoice?: boolean) => Promise<void>>(async () => {});

  const voice = usePrepsVoice({
    onTranscriptReady: (transcript, viaVoice) => {
      setOpen(true);
      void sendMessageRef.current(transcript, viaVoice);
    },
    onWakeWordDetected: () => {
      setOpen(true);
      playAiSparkle();
    },
  });

  const handleSend = useCallback(
    async (rawText: string, viaVoice = false) => {
      const clean = rawText.trim();
      if (!clean || loading) return;

      playClick();
      setError('');
      setInput('');
      const nextHistory: PrepsAiChatMessage[] = [
        ...messagesRef.current,
        { role: 'user', text: clean },
      ];
      setMessages(nextHistory);
      setLoading(true);

      try {
        const res = await requestPrepsAiChat({
          message: clean,
          history: nextHistory.slice(-8),
          studentContext,
          voiceMode: viaVoice,
        });
        setMessages((prev) => [...prev, { role: 'assistant', text: res.reply }]);
        if (res.suggestedFollowUps.length > 0) {
          setFollowUps(res.suggestedFollowUps);
        }
        playAiSparkle();
        if (viaVoice || voice.autoSpeak) {
          voice.speakText(res.reply);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Preps AI could not reply right now.'
        );
      } finally {
        setLoading(false);
      }
    },
    [loading, studentContext, voice]
  );

  sendMessageRef.current = handleSend;

  // Hide on dedicated full-screen Preps AI page so there is no duplicate assistant
  if (location.pathname === '/preps-ai') {
    return null;
  }

  return (
    <div className="fixed bottom-20 lg:bottom-6 right-4 sm:right-6 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.section
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            aria-label="Preps AI Assistant Drawer"
            className="w-[calc(100vw-2rem)] sm:w-[390px] max-h-[75vh] bg-white dark:bg-[#0F182D] border border-slate-200 dark:border-slate-700/90 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 py-3.5 bg-[#0B1B3B] text-white flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#F97316] flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-white" />
                </span>
                <div className="min-w-0">
                  <h2 className="font-display text-sm font-bold leading-tight truncate">
                    Preps AI Mentor
                  </h2>
                  <p className="text-[11px] text-sky-200 truncate">
                    {voice.isListening
                      ? 'Listening to your voice...'
                      : voice.wakeWordEnabled
                        ? 'Hands-free: say "Hello Preps"'
                        : `${studentContext.totalAttempts} test(s) synced`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (voice.isSpeaking) {
                      voice.stopSpeaking();
                    } else {
                      voice.setAutoSpeak((s) => !s);
                    }
                  }}
                  aria-label={voice.autoSpeak ? 'Disable voice replies' : 'Enable voice replies'}
                  title={voice.autoSpeak ? 'Voice output on' : 'Voice output muted'}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-sky-200"
                >
                  {voice.autoSpeak ? (
                    <Volume2 className="w-4 h-4" />
                  ) : (
                    <VolumeX className="w-4 h-4" />
                  )}
                </button>

                <Link
                  to="/preps-ai"
                  onClick={() => setOpen(false)}
                  aria-label="Open full-screen Preps AI"
                  title="Open full-screen Preps AI"
                  className="p-1.5 rounded-lg hover:bg-white/10 text-sky-200"
                >
                  <ArrowUpRight className="w-4 h-4" />
                </Link>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close Preps AI drawer"
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Wake-word & Voice Bar */}
            <div className="px-4 py-2 bg-slate-50 dark:bg-[#141F36] border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
              <button
                type="button"
                onClick={voice.toggleWakeWord}
                aria-pressed={voice.wakeWordEnabled}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                  voice.wakeWordEnabled
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-[#2563EB]'
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                {voice.wakeWordEnabled ? '"Hello Preps" Active' : 'Enable "Hello Preps"'}
              </button>

              {voice.isSpeaking && (
                <button
                  type="button"
                  onClick={voice.stopSpeaking}
                  className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline"
                >
                  Stop Audio
                </button>
              )}
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[220px] max-h-[340px]">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-line ${
                      msg.role === 'user'
                        ? 'bg-[#2563EB] text-white rounded-br-sm'
                        : 'bg-slate-100 dark:bg-[#17233D] text-slate-800 dark:text-slate-100 rounded-bl-sm'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}

              {voice.liveTranscript && (
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl px-3.5 py-2 text-xs italic bg-blue-50 dark:bg-blue-950/50 text-[#2563EB] dark:text-sky-300 border border-blue-200 dark:border-blue-800">
                    Hearing: &ldquo;{voice.liveTranscript}&rdquo;
                  </div>
                </div>
              )}

              {loading && (
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#2563EB]" />
                  Preps AI is analyzing your stats...
                </div>
              )}

              {(error || voice.voiceError) && (
                <p className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-3 py-2 rounded-xl">
                  {error || voice.voiceError}
                </p>
              )}
            </div>

            {/* Quick Prompt Chips */}
            <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 flex gap-1.5 overflow-x-auto">
              {followUps.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  disabled={loading}
                  onClick={() => void handleSend(chip, false)}
                  className="shrink-0 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 hover:bg-blue-50 hover:text-[#2563EB] dark:hover:bg-blue-950/60 dark:hover:text-sky-300 transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleSend(input, false);
              }}
              className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 bg-white dark:bg-[#0F182D]"
            >
              <button
                type="button"
                onClick={voice.isListening ? voice.stopListening : voice.startListening}
                aria-label={voice.isListening ? 'Stop voice input' : 'Start voice input'}
                className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  voice.isListening
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-blue-50 hover:text-[#2563EB]'
                }`}
              >
                {voice.isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Preps AI or tap mic..."
                aria-label="Message Preps AI"
                className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              />

              <button
                type="submit"
                disabled={loading || !input.trim()}
                aria-label="Send message to Preps AI"
                className="h-10 w-10 rounded-xl bg-[#2563EB] hover:bg-blue-700 disabled:opacity-45 text-white flex items-center justify-center shrink-0 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Persistent Floating Preps AI Orb Button (Bottom-Right Fixed) */}
      <button
        type="button"
        onClick={() => {
          playClick();
          setOpen((prev) => !prev);
        }}
        aria-expanded={open}
        aria-label={open ? 'Close Preps AI Assistant' : 'Open Preps AI Voice & Chat Assistant'}
        className="preps-orb-pulse group inline-flex items-center gap-2.5 h-14 px-4 sm:px-5 rounded-full bg-gradient-to-r from-[#0B1B3B] via-[#1D4ED8] to-[#2563EB] text-white font-display font-bold text-sm shadow-xl border border-white/20 hover:scale-[1.03] active:scale-[0.98] transition-transform"
      >
        <span className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center shrink-0">
          {voice.isListening ? (
            <Mic className="w-4 h-4 text-[#F97316] animate-pulse" />
          ) : (
            <Sparkles className="w-4 h-4 text-sky-200" />
          )}
        </span>
        <span className="pr-0.5">Preps AI</span>
      </button>
    </div>
  );
}
