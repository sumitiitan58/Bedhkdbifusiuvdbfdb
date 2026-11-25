import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
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
import { computePrepScore } from '../utils/prepScoreEngine';
import { extractMistakeEntries } from '../utils/testAnalysisEngine';
import { usePrepsVoice } from '../hooks/usePrepsVoice';
import { playAiSparkle, playClick } from '../utils/soundEffects';

const STARTER_PROMPTS = [
  {
    title: 'Prep Score Boost Plan',
    prompt: 'Analyze my current Prep Score out of 100 and list the top 3 chapter fixes to cross 85+.',
  },
  {
    title: 'Latest Test Progress',
    prompt: 'Mera latest test ka progress kaisa hai? Score, percentile aur key mistakes batao.',
  },
  {
    title: 'Cut Negative Marks',
    prompt: 'How do I stop silly mistakes and negative marking under JEE/NEET exam pressure?',
  },
  {
    title: '7-Day Weak Chapter Plan',
    prompt: 'Create a realistic 7-day weak chapter revision plan based on my mock tests.',
  },
];

export default function PrepsAiPage() {
  const location = useLocation();
  const { profile, firebaseUser, cohortId } = useAuth();
  const {
    allCohorts,
    attempts,
    chapters,
    questions,
    activeStudyDates,
    targetExamDate,
    targetExamLabel,
    bookmarkedQuestionIds,
    resolvedMistakeIds,
  } = usePlatformData();

  const [contextOpen, setContextOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState<PrepsAiChatMessage[]>([
    {
      role: 'assistant',
      text: 'Welcome to Preps AI! Your live Prep Score (0–100), mock scores, and Mistake Notebook are synced. Ask any JEE, NEET, or Board question in English or Hinglish — by text or voice.',
    },
  ]);
  const [followUps, setFollowUps] = useState<string[]>([
    'Mera latest test ka progress kaisa hai?',
    'Which subject needs the most attention this week?',
    'Explain Gauss Law traps in 5 bullets',
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
        setError(err instanceof Error ? err.message : 'Unable to reach Preps AI right now.');
      } finally {
        setLoading(false);
      }
    },
    [loading, studentContext, voice]
  );

  sendRef.current = handleSend;

  const prefillSentRef = useRef(false);
  useEffect(() => {
    const navState = location.state as
      | { prefillPrompt?: string; mistakeSummary?: unknown }
      | null
      | undefined;
    if (navState?.prefillPrompt && !prefillSentRef.current) {
      prefillSentRef.current = true;
      void handleSend(navState.prefillPrompt, false);
    }
  }, [handleSend, location.state]);

  return (
    <PageLayout>
      <SeoHead
        title="Preps AI Mentor — Voice & Chat JEE/NEET Tutor | Prepskm"
        description="Ask JEE, NEET & Board doubts, fix weak chapters, and analyze your Prep Score with Preps AI voice and chat mentoring on PREPSKM.IN."
        canonicalPath="/preps-ai"
      />

      <ResponsiveContainer className="py-5 sm:py-7">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Streamlined Header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#2563EB] dark:text-sky-400">
                Compact AI Study Studio · English &amp; Hinglish
              </p>
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0B1B3B] dark:text-white tracking-tight">
                Preps AI Mentor
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={voice.toggleWakeWord}
                aria-pressed={voice.wakeWordEnabled}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors whitespace-nowrap ${
                  voice.wakeWordEnabled
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white dark:bg-[#111A2E] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-[#2563EB]'
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                {voice.wakeWordEnabled ? '"Hello Preps" On' : '"Hello Preps"'}
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
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111A2E] text-slate-700 dark:text-slate-200 hover:border-[#2563EB] whitespace-nowrap"
              >
                {voice.autoSpeak ? (
                  <Volume2 className="w-3.5 h-3.5 text-[#2563EB]" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                )}
                {voice.isSpeaking ? 'Stop Audio' : voice.autoSpeak ? 'Voice On' : 'Muted'}
              </button>
            </div>
          </div>

          {/* Compact Accessible Live Context Accordion */}
          <ReusableCard padding="none" className="overflow-hidden">
            <button
              type="button"
              onClick={() => {
                playClick();
                setContextOpen((prev) => !prev);
              }}
              aria-expanded={contextOpen}
              className="w-full px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-left hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors"
            >
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-semibold tabular-nums">
                <span className="inline-flex items-center gap-1.5 text-[#2563EB] dark:text-sky-400 font-bold">
                  <Sparkles className="w-3.5 h-3.5" />
                  Live Context
                </span>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <span className="text-[#0B1B3B] dark:text-white">{cohortLabel}</span>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <span className="font-mono text-[#0B1B3B] dark:text-white">
                  Prep Score {prepScore.score}/100
                </span>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <span className="text-emerald-600 dark:text-emerald-400">
                  {studentContext.averageAccuracy}% Acc
                </span>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <span className="text-[#F97316]">{streak.currentStreak}d Streak</span>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <span className="text-slate-600 dark:text-slate-400">
                  {unresolvedMistakesCount} Mistakes
                </span>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 shrink-0">
                {contextOpen ? 'Hide' : 'Details'}
                {contextOpen ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </span>
            </button>

            {contextOpen && (
              <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs tabular-nums">
                <div>
                  <p className="text-slate-500">Tests Taken</p>
                  <p className="font-mono text-base font-bold text-[#0B1B3B] dark:text-white mt-0.5">
                    {studentContext.totalAttempts}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Readiness Tier</p>
                  <p className="font-semibold text-[#2563EB] dark:text-sky-400 mt-0.5">
                    {prepScore.tier}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">{targetExamLabel.split(' ')[0]} Countdown</p>
                  <p className="font-mono text-base font-bold text-[#0B1B3B] dark:text-white mt-0.5">
                    {countdown.daysRemaining}d left
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Vaulted Questions</p>
                  <p className="font-mono text-base font-bold text-[#F97316] mt-0.5">
                    {bookmarkedQuestionIds.length}
                  </p>
                </div>
                {studentContext.latestTest && (
                  <div className="col-span-2 sm:col-span-4 pt-2 border-t border-slate-200/70 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                    Latest Mock: <strong>{studentContext.latestTest.title}</strong> · Score{' '}
                    {studentContext.latestTest.score}/{studentContext.latestTest.maxScore} ·{' '}
                    {studentContext.latestTest.predictedPercentile}%ile
                  </div>
                )}
              </div>
            )}
          </ReusableCard>

          {/* Compact Instant Prompt Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {STARTER_PROMPTS.map((item) => (
              <button
                key={item.title}
                type="button"
                disabled={loading}
                onClick={() => void handleSend(item.prompt, false)}
                className="text-left px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111A2E] hover:border-[#2563EB] dark:hover:border-sky-400 transition-colors"
              >
                <p className="text-xs font-bold text-[#0B1B3B] dark:text-white truncate">
                  {item.title}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                  {item.prompt}
                </p>
              </button>
            ))}
          </div>

          {/* Focused Chat & Voice Workspace */}
          <ReusableCard
            padding="none"
            className="flex flex-col min-h-[440px] max-h-[64vh] overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[86%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-line ${
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
                  <div className="max-w-[85%] rounded-2xl px-4 py-2 text-xs sm:text-sm italic bg-blue-50 dark:bg-blue-950/50 text-[#2563EB] dark:text-sky-300 border border-blue-200 dark:border-blue-800">
                    Listening: &ldquo;{voice.liveTranscript}&rdquo;
                  </div>
                </div>
              )}

              {loading && (
                <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin text-[#2563EB]" />
                  Preps AI is preparing your personalized answer...
                </div>
              )}

              {(error || voice.voiceError) && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs sm:text-sm text-rose-700 dark:text-rose-300">
                  {error || voice.voiceError}
                </div>
              )}
            </div>

            {followUps.length > 0 && (
              <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-1.5 bg-slate-50/70 dark:bg-[#0D1527]">
                {followUps.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    disabled={loading}
                    onClick={() => void handleSend(chip, false)}
                    className="text-xs font-medium px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-[#2563EB] hover:text-[#2563EB] transition-colors"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleSend(input, false);
              }}
              className="p-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2.5 bg-white dark:bg-[#111A2E]"
            >
              <button
                type="button"
                onClick={voice.isListening ? voice.stopListening : voice.startListening}
                aria-label={voice.isListening ? 'Stop voice recording' : 'Ask Preps AI with microphone'}
                className={`h-10 px-3.5 rounded-xl inline-flex items-center gap-1.5 text-xs font-semibold shrink-0 transition-colors ${
                  voice.isListening
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-blue-50 hover:text-[#2563EB]'
                }`}
              >
                {voice.isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                <span className="hidden sm:inline">
                  {voice.isListening ? 'Listening' : 'Speak'}
                </span>
              </button>

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder='Ask a JEE/NEET doubt or type "Analyze my Prep Score"...'
                aria-label="Ask Preps AI"
                className="flex-1 min-w-0 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              />

              <ReusableButton
                type="submit"
                variant="primary"
                size="sm"
                disabled={loading || !input.trim()}
                className="h-10 px-4 shrink-0"
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
