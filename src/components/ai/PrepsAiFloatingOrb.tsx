import { useCallback, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
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
import { computePrepScore } from '../../utils/prepScoreEngine';
import { extractMistakeEntries } from '../../utils/testAnalysisEngine';
import { usePrepsVoice } from '../../hooks/usePrepsVoice';
import { playAiSparkle, playClick } from '../../utils/soundEffects';

const QUICK_PROMPTS = [
  'Analyze my Prep Score & next 3 fixes',
  'Mera latest test progress kaisa hai?',
  '7-day weak chapter sprint',
];

export function PrepsAiFloatingOrb() {
  const location = useLocation();
  const { profile, firebaseUser, cohortId } = useAuth();
  const {
    allCohorts,
    attempts,
    chapters,
    questions,
    activeStudyDates,
    targetExamDate,
    bookmarkedQuestionIds,
    resolvedMistakeIds,
  } = usePlatformData();

  const [open, setOpen] = useState(false);
  const [contextExpanded, setContextExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState<PrepsAiChatMessage[]>([
    {
      role: 'assistant',
      text: 'Namaste! Main Preps AI hoon — koi bhi JEE/NEET doubt pucho, ya Hands-Free mic ON karke seedha "Preps AI" bolo!',
    },
  ]);
  const [followUps, setFollowUps] = useState<string[]>(QUICK_PROMPTS);

  const messagesRef = useRef<PrepsAiChatMessage[]>(messages);
  messagesRef.current = messages;
  const inputRef = useRef<HTMLInputElement | null>(null);

  const cohortLabel = useMemo(
    () => allCohorts.find((c) => c.id === cohortId)?.label ?? 'Class 12 JEE',
    [allCohorts, cohortId]
  );

  const streak = useMemo(() => computeStudyStreak(activeStudyDates), [activeStudyDates]);
  const countdown = useMemo(() => computeExamCountdown(targetExamDate), [targetExamDate]);

  const unresolvedMistakesCount = useMemo(() => {
    const resolvedSet = new Set(resolvedMistakeIds);
    return extractMistakeEntries(attempts, questions).filter(
      (m) => !resolvedSet.has(m.questionId)
    ).length;
  }, [attempts, questions, resolvedMistakeIds]);

  const prepScore = useMemo(
    () =>
      computePrepScore({
        attempts,
        questions,
        chapters,
        activeStudyDates,
        resolvedMistakeIds,
        cohortLabel,
      }),
    [attempts, questions, chapters, activeStudyDates, resolvedMistakeIds, cohortLabel]
  );

  const studentContext = useMemo(
    () => ({
      ...buildPrepsAiStudentContext({
        studentName: profile?.displayName || firebaseUser?.displayName || 'Student',
        cohortLabel,
        attempts,
        currentStreakDays: streak.currentStreak,
        targetExamDaysLeft: countdown.daysRemaining,
        bookmarkedQuestionsCount: bookmarkedQuestionIds.length,
        unresolvedMistakesCount,
      }),
      prepScore: prepScore.score,
      prepScoreMax: 100,
      prepTier: prepScore.tier,
    }),
    [
      attempts,
      bookmarkedQuestionIds.length,
      cohortLabel,
      countdown.daysRemaining,
      firebaseUser?.displayName,
      prepScore.score,
      prepScore.tier,
      profile?.displayName,
      streak.currentStreak,
      unresolvedMistakesCount,
    ]
  );

  const sendMessageRef = useRef<(text: string, viaVoice?: boolean) => Promise<void>>(
    async () => {}
  );

  const voice = usePrepsVoice({
    onTranscriptReady: (transcript, viaVoice) => {
      setOpen(true);
      void sendMessageRef.current(transcript, viaVoice);
    },
    onWakeWordDetected: () => {
      setOpen(true);
      window.setTimeout(() => inputRef.current?.focus(), 100);
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

  if (location.pathname === '/preps-ai') {
    return null;
  }

  return (
    <div
      style={{ contain: 'layout style' }}
      className="fixed bottom-20 lg:bottom-6 right-4 sm:right-6 z-50 flex flex-col items-end gap-2.5 pointer-events-none"
    >
      <AnimatePresence>
        {open && (
          <motion.section
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            aria-label="Preps AI Compact Widget"
            className="pointer-events-auto w-[calc(100vw-1.5rem)] sm:w-[360px] max-h-[68vh] bg-white dark:bg-[#0F182D] border border-slate-200 dark:border-slate-700/90 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Slim Compact Header */}
            <div className="px-3.5 py-2.5 bg-[#0B1B3B] text-white flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-7 h-7 rounded-lg bg-[#2563EB] flex items-center justify-center shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </span>
                <div className="min-w-0">
                  <h2 className="font-display text-xs font-bold leading-tight truncate">
                    Preps AI
                  </h2>
                  <p className="text-[11px] text-sky-200 truncate tabular-nums">
                    {voice.isListening
                      ? 'Listening...'
                      : `Prep ${prepScore.score}/100 · ${cohortLabel}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={voice.toggleWakeWord}
                  aria-pressed={voice.wakeWordEnabled}
                  aria-label={
                    voice.wakeWordEnabled
                      ? 'Disable Hands-Free Preps AI wake word'
                      : 'Enable Hands-Free Preps AI wake word'
                  }
                  title={
                    voice.wakeWordEnabled
                      ? 'Hands-Free ON — Say "Preps AI"'
                      : 'Enable Hands-Free "Preps AI" Voice Mode'
                  }
                  className={`p-1.5 rounded-lg transition-colors ${
                    voice.wakeWordEnabled
                      ? 'bg-emerald-600 text-white'
                      : 'hover:bg-white/10 text-sky-200'
                  }`}
                >
                  <Radio className={`w-3.5 h-3.5 ${voice.wakeWordEnabled ? 'animate-pulse' : ''}`} />
                </button>

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
                  className="p-1.5 rounded-lg hover:bg-white/10 text-sky-200"
                >
                  {voice.autoSpeak ? (
                    <Volume2 className="w-3.5 h-3.5" />
                  ) : (
                    <VolumeX className="w-3.5 h-3.5" />
                  )}
                </button>

                <Link
                  to="/preps-ai"
                  onClick={() => setOpen(false)}
                  aria-label="Expand Preps AI Studio"
                  className="p-1.5 rounded-lg hover:bg-white/10 text-sky-200"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close Preps AI widget"
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Accessible Collapsible Live Context Bar */}
            <div className="bg-slate-50 dark:bg-[#141F36] border-b border-slate-200/80 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setContextExpanded((prev) => !prev)}
                aria-expanded={contextExpanded}
                className="w-full px-3.5 py-2 flex items-center justify-between gap-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-[#2563EB] dark:hover:text-sky-400 transition-colors tabular-nums"
              >
                <span className="truncate">
                  Live Context · Prep {prepScore.score}/100 · {streak.currentStreak}d Streak ·{' '}
                  {unresolvedMistakesCount} Mistakes
                </span>
                {contextExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                )}
              </button>

              {contextExpanded && (
                <div className="px-3.5 pb-2.5 pt-1 border-t border-slate-200/70 dark:border-slate-800 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] tabular-nums">
                  <div>
                    <span className="text-slate-400">Track: </span>
                    <span className="font-semibold text-[#0B1B3B] dark:text-white">
                      {cohortLabel}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Prep Score: </span>
                    <span className="font-mono font-bold text-[#2563EB] dark:text-sky-400">
                      {prepScore.score}/100
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Tests: </span>
                    <span className="font-mono font-semibold text-[#0B1B3B] dark:text-white">
                      {studentContext.totalAttempts} ({studentContext.averageAccuracy}% acc)
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Pending: </span>
                    <span className="font-mono font-semibold text-rose-600 dark:text-rose-400">
                      {unresolvedMistakesCount} mistakes
                    </span>
                  </div>
                  {studentContext.latestTest && (
                    <div className="col-span-2 truncate text-slate-500 dark:text-slate-400">
                      Latest: {studentContext.latestTest.title} ({studentContext.latestTest.score}/
                      {studentContext.latestTest.maxScore})
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Compact Messages Area */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 min-h-[190px] max-h-[280px]">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl px-3 py-2 text-xs sm:text-sm leading-relaxed whitespace-pre-line ${
                      msg.role === 'user'
                        ? 'bg-[#2563EB] text-white rounded-br-sm'
                        : 'bg-slate-100 dark:bg-[#17233D] text-slate-800 dark:text-slate-100 rounded-bl-sm'
                    }`}
                  >
                    <div>{msg.text}</div>
                    {msg.role === 'assistant' && voice.ttsSupported && (
                      <div className="mt-1.5 flex justify-end">
                        <button
                          type="button"
                          onClick={() =>
                            voice.isSpeaking ? voice.stopSpeaking() : voice.speakText(msg.text)
                          }
                          aria-label={voice.isSpeaking ? 'Stop audio' : 'Read reply aloud'}
                          className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#2563EB] dark:text-sky-400 hover:underline"
                        >
                          {voice.isSpeaking ? (
                            <VolumeX className="w-3 h-3" />
                          ) : (
                            <Volume2 className="w-3 h-3" />
                          )}
                          <span>{voice.isSpeaking ? 'Stop' : 'Listen'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {voice.liveTranscript && (
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-xl px-3 py-1.5 text-xs italic bg-blue-50 dark:bg-blue-950/50 text-[#2563EB] dark:text-sky-300 border border-blue-200 dark:border-blue-800">
                    Hearing (auto-sends in 2s): &ldquo;{voice.liveTranscript}&rdquo;
                  </div>
                </div>
              )}

              {loading && (
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#2563EB]" />
                  Thinking with your live stats...
                </div>
              )}

              {(error || voice.voiceError) && (
                <p className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-3 py-2 rounded-xl">
                  {error || voice.voiceError}
                </p>
              )}
            </div>

            {/* Quick Prompt Row */}
            <div className="px-3 py-1.5 border-t border-slate-100 dark:border-slate-800 flex gap-1.5 overflow-x-auto">
              {followUps.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  disabled={loading}
                  onClick={() => void handleSend(chip, false)}
                  className="shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 hover:bg-blue-50 hover:text-[#2563EB] dark:hover:bg-blue-950/60 dark:hover:text-sky-300 transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Compact Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleSend(input, false);
              }}
              className="p-2.5 border-t border-slate-200 dark:border-slate-800 flex items-center gap-1.5 bg-white dark:bg-[#0F182D]"
            >
              <button
                type="button"
                onClick={() => (voice.isListening ? voice.stopListening() : voice.startListening())}
                aria-label={voice.isListening ? 'Stop voice input' : 'Start voice input'}
                className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  voice.isListening
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-blue-50 hover:text-[#2563EB]'
                }`}
              >
                {voice.isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder='Ask Preps AI or say "Preps AI"...'
                aria-label="Message Preps AI"
                className="flex-1 min-w-0 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              />

              <button
                type="submit"
                disabled={loading || !input.trim()}
                aria-label="Send message to Preps AI"
                className="h-9 w-9 rounded-xl bg-[#2563EB] hover:bg-blue-700 disabled:opacity-45 text-white flex items-center justify-center shrink-0 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Compact Floating Preps AI Launcher + Hands-Free Mic Toggle */}
      <div className="pointer-events-auto inline-flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => {
            playClick();
            voice.toggleWakeWord();
          }}
          aria-pressed={voice.wakeWordEnabled}
          aria-label={
            voice.wakeWordEnabled
              ? 'Disable Hands-Free Preps AI Voice Mode'
              : 'Enable Hands-Free Preps AI Voice Mode'
          }
          title={
            voice.wakeWordEnabled
              ? 'Hands-Free Voice Mode ON — Say "Preps AI"'
              : 'Hands-Free Voice Mode (Say "Preps AI")'
          }
          className={`inline-flex items-center justify-center h-11 w-11 rounded-full shadow-lg border transition-colors ${
            voice.wakeWordEnabled
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-400/50'
              : 'bg-white dark:bg-[#111A2E] hover:bg-slate-50 dark:hover:bg-slate-800 text-[#0B1B3B] dark:text-sky-300 border-slate-200 dark:border-slate-700'
          }`}
        >
          <Radio className={`w-4 h-4 ${voice.wakeWordEnabled ? 'animate-pulse' : ''}`} />
        </button>

        <button
          type="button"
          onClick={() => {
            playClick();
            setOpen((prev) => !prev);
          }}
          aria-expanded={open}
          aria-label={open ? 'Close Preps AI Widget' : 'Open Preps AI Widget'}
          className="inline-flex items-center gap-2 h-11 px-4 rounded-full bg-[#0B1B3B] hover:bg-[#162C5B] dark:bg-[#2563EB] dark:hover:bg-blue-700 text-white font-display font-bold text-xs shadow-lg border border-white/15 transition-colors"
        >
          {voice.isListening ? (
            <Mic className="w-4 h-4 text-[#F97316]" />
          ) : (
            <Sparkles className="w-4 h-4 text-sky-300" />
          )}
          <span>{voice.wakeWordEnabled ? 'Preps AI · Hands-Free' : 'Preps AI'}</span>
        </button>
      </div>
    </div>
  );
}
