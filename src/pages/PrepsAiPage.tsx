import { useCallback, useMemo, useRef, useState } from 'react';
import {
  BookMarked,
  Flame,
  Loader2,
  Mic,
  MicOff,
  Radio,
  Send,
  Sparkles,
  Target,
  TrendingUp,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { PageLayout } from '../layouts/PageLayout';
import { ResponsiveContainer } from '../components/ResponsiveContainer';
import { ReusableCard } from '../components/ReusableCard';
import { ReusableButton } from '../components/ReusableButton';
import { SeoHead } from '../components/SeoHead';
import { useAuth } from '../context/AuthContext';
import { usePlatformData } from '../context/PlatformDataContext';
import {
  requestPrepsAiChat,
  type PrepsAiChatMessage,
} from '../services/geminiClient';
import {
  buildPrepsAiStudentContext,
  computeExamCountdown,
  computeStudyStreak,
} from '../utils/streakTracker';
import { extractMistakeEntries } from '../utils/testAnalysisEngine';
import { usePrepsVoice } from '../hooks/usePrepsVoice';
import { playAiSparkle, playClick } from '../utils/soundEffects';

const STARTER_PROMPTS = [
  {
    title: 'Latest Test Progress',
    prompt: 'Mera latest test ka progress kaisa hai? Score, percentile aur key mistakes batao.',
  },
  {
    title: 'Subject Mark-Leak Fix',
    prompt: 'Maths mein marks kyun kat rahe hain aur negative marking kaise kam karun?',
  },
  {
    title: 'Weak Chapter 7-Day Plan',
    prompt: 'Create a realistic 7-day weak chapter revision plan based on my mock tests.',
  },
  {
    title: 'Quick Formula & Concept Doubt',
    prompt: 'Explain Gauss Law applications and common JEE Main traps in 5 bullet points.',
  },
];

export default function PrepsAiPage() {
  const { profile, firebaseUser, cohortId } = useAuth();
  const {
    allCohorts,
    attempts,
    questions,
    activeStudyDates,
    targetExamDate,
    targetExamLabel,
    bookmarkedQuestionIds,
    resolvedMistakeIds,
  } = usePlatformData();

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState<PrepsAiChatMessage[]>([
    {
      role: 'assistant',
      text: 'Welcome to Preps AI! I have synced your live mock test scores, subject accuracies, and Mistake Notebook. Ask me anything in English or Hinglish — or tap the mic / enable "Hello Preps" for hands-free voice mentoring.',
    },
  ]);
  const [followUps, setFollowUps] = useState<string[]>([
    'Mera latest test ka progress kaisa hai?',
    'Which subject needs the most attention this week?',
    'How do I avoid silly mistakes under time pressure?',
  ]);

  const messagesRef = useRef(messages);
  messagesRef.current = messages;

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

  const studentContext = useMemo(
    () =>
      buildPrepsAiStudentContext({
        studentName: profile?.displayName || firebaseUser?.displayName || 'Student',
        cohortLabel,
        attempts,
        currentStreakDays: streak.currentStreak,
        targetExamDaysLeft: countdown.daysRemaining,
        bookmarkedQuestionsCount: bookmarkedQuestionIds.length,
        unresolvedMistakesCount,
      }),
    [
      attempts,
      bookmarkedQuestionIds.length,
      cohortLabel,
      countdown.daysRemaining,
      firebaseUser?.displayName,
      profile?.displayName,
      streak.currentStreak,
      unresolvedMistakesCount,
    ]
  );

  const sendRef = useRef<(text: string, viaVoice?: boolean) => Promise<void>>(async () => {});

  const voice = usePrepsVoice({
    onTranscriptReady: (transcript, viaVoice) => {
      void sendRef.current(transcript, viaVoice);
    },
    onWakeWordDetected: () => {
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
          history: nextHistory.slice(-10),
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
          err instanceof Error ? err.message : 'Unable to reach Preps AI right now.'
        );
      } finally {
        setLoading(false);
      }
    },
    [loading, studentContext, voice]
  );

  sendRef.current = handleSend;

  return (
    <PageLayout>
      <SeoHead
        title="Preps AI — Voice & Chat JEE/NEET Mentor | PREPSKM.IN"
        description="Full-screen AI mentor for JEE and NEET aspirants. Ask doubts, build weak-chapter study plans, and get voice-powered mock test coaching grounded in your real scores."
        canonicalPath="/preps-ai"
      />

      <ResponsiveContainer className="py-6 sm:py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-[#2563EB] dark:text-sky-400">
              Personal JEE / NEET Mentor · English &amp; Hinglish Voice Support
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-[#0B1B3B] dark:text-white tracking-tight">
              Preps AI Mentor Studio
            </h1>
            <p className="text-base text-slate-600 dark:text-slate-400">
              Ask doubts, request weak-chapter study plans, or analyze your mock test trajectory using chat or voice.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={voice.toggleWakeWord}
              aria-pressed={voice.wakeWordEnabled}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                voice.wakeWordEnabled
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white dark:bg-[#111A2E] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-[#2563EB]'
              }`}
            >
              <Radio className="w-4 h-4" />
              {voice.wakeWordEnabled ? '"Hello Preps" Listening' : 'Wake Word: "Hello Preps"'}
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
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111A2E] text-slate-700 dark:text-slate-200 hover:border-[#2563EB]"
            >
              {voice.autoSpeak ? (
                <Volume2 className="w-4 h-4 text-[#2563EB]" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-400" />
              )}
              {voice.isSpeaking
                ? 'Stop Speaking'
                : voice.autoSpeak
                  ? 'Voice Replies On'
                  : 'Voice Muted'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Left: Live Student Context Snapshot */}
          <aside className="xl:col-span-4 space-y-6">
            <ReusableCard className="space-y-4">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-[#2563EB]" />
                <h2 className="font-display text-lg font-bold text-[#0B1B3B] dark:text-white">
                  Live Context Synced
                </h2>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Preps AI automatically reads these metrics so every strategy answer is tailored to your actual progress.
              </p>

              <div className="grid grid-cols-2 gap-3 tabular-nums pt-2">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800">
                  <p className="text-xs font-semibold text-slate-500">Tests Taken</p>
                  <p className="mt-1 font-mono text-2xl font-extrabold text-[#0B1B3B] dark:text-white">
                    {studentContext.totalAttempts}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800">
                  <p className="text-xs font-semibold text-slate-500">Avg Accuracy</p>
                  <p className="mt-1 font-mono text-2xl font-extrabold text-[#10B981]">
                    {studentContext.averageAccuracy}%
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800">
                  <p className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-[#F97316]" /> Streak
                  </p>
                  <p className="mt-1 font-mono text-2xl font-extrabold text-[#0B1B3B] dark:text-white">
                    {streak.currentStreak}d
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800">
                  <p className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                    <Target className="w-3.5 h-3.5 text-[#2563EB]" /> {targetExamLabel.split(' ')[0]}
                  </p>
                  <p className="mt-1 font-mono text-2xl font-extrabold text-[#2563EB] dark:text-sky-400">
                    {countdown.daysRemaining}d
                  </p>
                </div>
              </div>

              {studentContext.latestTest ? (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-sm">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Latest Mock Snapshot
                  </p>
                  <p className="font-bold text-[#0B1B3B] dark:text-white truncate">
                    {studentContext.latestTest.title}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                    Score {studentContext.latestTest.score}/{studentContext.latestTest.maxScore} ·{' '}
                    {studentContext.latestTest.predictedPercentile}%ile · -
                    {studentContext.latestTest.marksLostNegative} negative marks
                  </p>
                </div>
              ) : (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Take your first CBT Mock to unlock personalized score &amp; weak-chapter coaching.
                  </p>
                  <ReusableButton variant="secondary" size="sm" to="/cbt-mocks" className="w-full">
                    <TrendingUp className="w-4 h-4" />
                    Take a CBT Mock
                  </ReusableButton>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <BookMarked className="w-4 h-4 text-[#F97316]" />
                  {unresolvedMistakesCount} active mistakes · {bookmarkedQuestionIds.length} vaulted
                </span>
              </div>
            </ReusableCard>

            {/* Quick Starter Cards */}
            <ReusableCard className="space-y-3">
              <h2 className="font-display text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Instant Prompts
              </h2>
              <div className="space-y-2">
                {STARTER_PROMPTS.map((item) => (
                  <button
                    key={item.title}
                    type="button"
                    disabled={loading}
                    onClick={() => void handleSend(item.prompt, false)}
                    className="w-full text-left p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-[#2563EB] dark:hover:border-sky-400 bg-slate-50/70 dark:bg-slate-900/60 transition-colors"
                  >
                    <p className="text-sm font-bold text-[#0B1B3B] dark:text-white">{item.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                      {item.prompt}
                    </p>
                  </button>
                ))}
              </div>
            </ReusableCard>
          </aside>

          {/* Right: Spacious Chat & Voice Workspace */}
          <ReusableCard
            padding="none"
            className="xl:col-span-8 flex flex-col min-h-[580px] max-h-[78vh] overflow-hidden"
          >
            {/* Chat Transcript */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm sm:text-base leading-relaxed whitespace-pre-line ${
                      msg.role === 'user'
                        ? 'bg-[#0B1B3B] dark:bg-[#2563EB] text-white rounded-br-sm'
                        : 'bg-slate-100 dark:bg-[#17233D] text-slate-800 dark:text-slate-100 rounded-bl-sm'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}

              {voice.liveTranscript && (
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm italic bg-blue-50 dark:bg-blue-950/50 text-[#2563EB] dark:text-sky-300 border border-blue-200 dark:border-blue-800">
                    Listening: &ldquo;{voice.liveTranscript}&rdquo;
                  </div>
                </div>
              )}

              {loading && (
                <div className="flex items-center gap-2.5 text-sm text-slate-500 dark:text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin text-[#2563EB]" />
                  Preps AI is preparing your personalized answer...
                </div>
              )}

              {(error || voice.voiceError) && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-sm text-rose-700 dark:text-rose-300">
                  {error || voice.voiceError}
                </div>
              )}
            </div>

            {/* Suggested Follow-Ups */}
            {followUps.length > 0 && (
              <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2 bg-slate-50/70 dark:bg-[#0D1527]">
                {followUps.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    disabled={loading}
                    onClick={() => void handleSend(chip, false)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-[#2563EB] hover:text-[#2563EB] transition-colors"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}

            {/* Composer */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleSend(input, false);
              }}
              className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3 bg-white dark:bg-[#111A2E]"
            >
              <button
                type="button"
                onClick={voice.isListening ? voice.stopListening : voice.startListening}
                aria-label={voice.isListening ? 'Stop voice recording' : 'Ask Preps AI with microphone'}
                className={`h-11 px-4 rounded-xl inline-flex items-center gap-2 text-sm font-semibold shrink-0 transition-colors ${
                  voice.isListening
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-blue-50 hover:text-[#2563EB]'
                }`}
              >
                {voice.isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                <span className="hidden sm:inline">
                  {voice.isListening ? 'Listening...' : 'Speak'}
                </span>
              </button>

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder='Ask a JEE/NEET doubt or type "Mera latest test ka progress kaisa hai?"'
                aria-label="Ask Preps AI"
                className="flex-1 min-w-0 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              />

              <ReusableButton
                type="submit"
                variant="primary"
                disabled={loading || !input.trim()}
                className="h-11 px-5 shrink-0"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Send</span>
              </ReusableButton>
            </form>
          </ReusableCard>
        </div>
      </ResponsiveContainer>
    </PageLayout>
  );
}
