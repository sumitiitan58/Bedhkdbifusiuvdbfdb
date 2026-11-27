import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  GraduationCap,
  HelpCircle,
  Loader2,
  MessageSquare,
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
import { AiRoleAvatar, AI_ROLE_META, type AiCharacterRole } from '../components/ai/AiRoleAvatar';
import {
  TutorWorkspaceStudio,
  type TutorStudioMode,
} from '../components/ai/TutorWorkspaceStudio';
import { useAuth } from '../context/AuthContext';
import { usePlatformData } from '../context/PlatformDataContext';
import { usePrepskm2 } from '../context/Prepskm2Context';
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
import {
  STARTER_KEEP_NOTES,
  type KeepStudyNote,
  type SheetPerformanceAnalysis,
} from '../utils/sheetTutorAnalyzer';
import { usePrepsVoice } from '../hooks/usePrepsVoice';
import { playAiSparkle, playClick } from '../utils/soundEffects';

const KEEP_NOTES_STORAGE_KEY = 'prepskm_keep_notes_v1';

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
    prompt: 'Create a realistic 7-day weak chapter revision plan based on my mock tests and sheets.',
  },
];

const STUDIO_TABS: Array<{
  id: TutorStudioMode;
  label: string;
  icon: typeof MessageSquare;
}> = [
  { id: 'chat', label: 'Mentor Chat & Voice', icon: MessageSquare },
  { id: 'sheets', label: 'Sheets Analyzer', icon: FileSpreadsheet },
  { id: 'learning-path', label: 'Learning Path', icon: BookOpen },
  { id: 'practice', label: 'Practice Quiz', icon: HelpCircle },
];

function loadSavedKeepNotes(): KeepStudyNote[] {
  try {
    const raw = window.localStorage.getItem(KEEP_NOTES_STORAGE_KEY);
    if (!raw) return STARTER_KEEP_NOTES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as KeepStudyNote[]) : STARTER_KEEP_NOTES;
  } catch {
    return STARTER_KEEP_NOTES;
  }
}

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
  const { openLiveTeacher } = usePrepskm2();

  const [activeTab, setActiveTab] = useState<TutorStudioMode>('chat');
  const [contextOpen, setContextOpen] = useState(false);
  const [sheetAnalysis, setSheetAnalysis] = useState<SheetPerformanceAnalysis | null>(null);
  const [keepNotes, setKeepNotes] = useState<KeepStudyNote[]>(() => loadSavedKeepNotes());

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState<PrepsAiChatMessage[]>([
    {
      role: 'assistant',
      text: 'Namaste! Main hoon Preps AI — tumhara JEE, NEET aur Board prep bhaiya & mentor. Koi bhi doubt pucho (text ya voice mein), apni Google Sheet analyze karwao, ya "Hands-Free Voice Mode" ON karke seedha "Preps AI" bolo!',
    },
  ]);
  const [followUps, setFollowUps] = useState<string[]>([
    'Mera latest test ka progress kaisa hai?',
    'Electrostatics ka simple Hinglish learning path bana do',
    'Mere Keep notes se 3 common exam traps batao',
  ]);

  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const chatInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(KEEP_NOTES_STORAGE_KEY, JSON.stringify(keepNotes));
    } catch {
      // ignore storage quota errors
    }
  }, [keepNotes]);

  const handleAddKeepNote = useCallback((note: Omit<KeepStudyNote, 'id' | 'updatedAtIso'>) => {
    setKeepNotes((prev) => [
      {
        ...note,
        id: `keep-${Date.now()}`,
        updatedAtIso: new Date().toISOString(),
      },
      ...prev,
    ]);
  }, []);

  const handleDeleteKeepNote = useCallback((id: string) => {
    setKeepNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const cohortLabel = useMemo(
    () => allCohorts.find((c) => c.id === cohortId)?.label ?? 'Class 12 JEE',
    [allCohorts, cohortId]
  );

  const studentName = profile?.displayName || firebaseUser?.displayName || 'Student';
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
        studentName,
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
      sheetPerformanceSummary: sheetAnalysis
        ? {
            sheetTitle: sheetAnalysis.sheetTitle,
            tabName: sheetAnalysis.tabName,
            overallScorePercent: sheetAnalysis.overallScorePercent,
            overallAccuracyPercent: sheetAnalysis.overallAccuracyPercent,
            trend: sheetAnalysis.trend,
            trendDeltaPercent: sheetAnalysis.trendDeltaPercent,
            strongestSubject: sheetAnalysis.strongestSubject,
            weakestSubject: sheetAnalysis.weakestSubject,
            topWeakChapters: sheetAnalysis.weakChapters.slice(0, 4).map((c) => ({
              chapter: c.chapter,
              subject: c.subject,
              accuracyPercent: c.averageAccuracyPercent,
            })),
          }
        : null,
      keepStudyNotes: keepNotes.slice(0, 5).map((n) => ({
        title: n.title,
        subject: n.subject,
        chapter: n.chapter,
        content: n.content.slice(0, 280),
      })),
    }),
    [
      attempts,
      bookmarkedQuestionIds.length,
      cohortLabel,
      countdown.daysRemaining,
      keepNotes,
      prepScore.score,
      prepScore.tier,
      sheetAnalysis,
      streak.currentStreak,
      studentName,
      unresolvedMistakesCount,
    ]
  );

  const sendRef = useRef<(text: string, viaVoice?: boolean) => Promise<void>>(async () => {});

  const voice = usePrepsVoice({
    onTranscriptReady: (transcript, viaVoice) => {
      setActiveTab('chat');
      void sendRef.current(transcript, viaVoice);
    },
    onWakeWordDetected: () => {
      setActiveTab('chat');
      window.setTimeout(() => chatInputRef.current?.focus(), 60);
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

  const handleOpenChatWithPrompt = useCallback(
    (prompt: string) => {
      setActiveTab('chat');
      void handleSend(prompt, false);
    },
    [handleSend]
  );

  const prefillSentRef = useRef(false);
  useEffect(() => {
    const navState = location.state as
      | { prefillPrompt?: string; mistakeSummary?: unknown }
      | null
      | undefined;
    if (navState?.prefillPrompt && !prefillSentRef.current) {
      prefillSentRef.current = true;
      setActiveTab('chat');
      void handleSend(navState.prefillPrompt, false);
    }
  }, [handleSend, location.state]);

  return (
    <PageLayout>
      <SeoHead
        title="Preps AI Tutor & Mentor — Sheets, Keep Notes & Practice | Prepskm"
        description="Analyze student Google Sheets performance, build personalized chapter learning paths with Google Keep notes, and practice adaptive JEE/NEET questions with Preps AI."
        canonicalPath="/preps-ai"
      />

      <ResponsiveContainer className="py-5 sm:py-7">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Streamlined Header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#2563EB] dark:text-sky-400">
                Expert AI Tutor &amp; Mentor · Google Sheets &amp; Keep Context
              </p>
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0B1B3B] dark:text-white tracking-tight">
                Preps AI Mentor
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  playClick();
                  const latestUserQ =
                    input.trim() ||
                    [...messages].reverse().find((m) => m.role === 'user')?.text?.trim() ||
                    '';
                  if (!latestUserQ) {
                    setActiveTab('chat');
                    setError('Pehle neeche apna specific subject, chapter ya doubt likhein, phir Explain Like a Teacher click karein.');
                    window.setTimeout(() => chatInputRef.current?.focus(), 60);
                    return;
                  }
                  setError('');
                  const latestReply =
                    [...messages].reverse().find((m) => m.role === 'assistant')?.text;
                  openLiveTeacher({
                    questionText: latestUserQ,
                    solutionText: input.trim() ? undefined : latestReply,
                    source: 'preps-ai',
                  });
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold bg-gradient-to-r from-[#00B4FF] to-[#1D56C6] text-[#070A12] shadow-[0_0_20px_rgba(0,180,255,0.4)] hover:brightness-110 transition-all whitespace-nowrap"
              >
                <GraduationCap className="w-4 h-4" />
                Explain Like a Teacher
              </button>

              <button
                type="button"
                onClick={voice.toggleWakeWord}
                aria-pressed={voice.wakeWordEnabled}
                title='Enable continuous background listening for "Preps AI" wake word'
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors whitespace-nowrap ${
                  voice.wakeWordEnabled
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white dark:bg-[#111A2E] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-[#2563EB]'
                }`}
              >
                <Radio className={`w-3.5 h-3.5 ${voice.wakeWordEnabled ? 'animate-pulse' : ''}`} />
                {voice.wakeWordEnabled ? 'Hands-Free: Say "Preps AI"' : 'Hands-Free Voice Mode'}
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
                {voice.isSpeaking ? 'Stop Audio' : voice.autoSpeak ? 'Voice On (IN)' : 'Muted'}
              </button>
            </div>
          </div>

          {/* 3 Distinct Standalone Role-Specific AI Characters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {(
              [
                {
                  role: 'mentor' as AiCharacterRole,
                  onClick: () => setActiveTab('chat'),
                },
                {
                  role: 'tutor' as AiCharacterRole,
                  onClick: () => {
                    playClick();
                    openLiveTeacher({
                      questionText:
                        input.trim() ||
                        'Explain Gauss Law in Electrostatics with a JEE Main example',
                      source: 'preps-ai',
                    });
                  },
                },
                {
                  role: 'analytics' as AiCharacterRole,
                  onClick: () => setActiveTab('sheets'),
                },
              ]
            ).map(({ role, onClick }) => {
              const meta = AI_ROLE_META[role];
              return (
                <button
                  key={role}
                  type="button"
                  onClick={onClick}
                  className="text-left rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0F172A] hover:border-[#06B6D4]/55 px-3.5 py-2.5 flex items-center gap-3 transition-colors"
                >
                  <AiRoleAvatar role={role} size="md" animated={role === 'tutor'} />
                  <div className="min-w-0">
                    <p className="font-display text-xs sm:text-sm font-extrabold text-[#0B1B3B] dark:text-white truncate">
                      {meta.label}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {meta.subtitle}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* 4-Mode Expert Tutor Studio Tabs */}
          <div
            role="tablist"
            aria-label="Preps AI Tutor Studio modes"
            className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1.5 rounded-2xl bg-slate-100/90 dark:bg-[#0D1527] border border-slate-200/80 dark:border-slate-800"
          >
            {STUDIO_TABS.map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => {
                    playClick();
                    setActiveTab(tab.id);
                  }}
                  className={`inline-flex items-center justify-center gap-1.5 h-10 px-3 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
                    isSelected
                      ? 'bg-[#0B1B3B] dark:bg-[#2563EB] text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-[#0B1B3B] dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
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
                  {sheetAnalysis
                    ? `Sheet ${sheetAnalysis.overallAccuracyPercent}% Acc`
                    : `${studentContext.averageAccuracy}% Acc`}
                </span>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <span className="text-amber-600 dark:text-amber-400">
                  {keepNotes.length} Keep Note{keepNotes.length === 1 ? '' : 's'}
                </span>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <span className="text-[#F97316]">{streak.currentStreak}d Streak</span>
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
                  <p className="text-slate-500">Unresolved Mistakes</p>
                  <p className="font-mono text-base font-bold text-[#F97316] mt-0.5">
                    {unresolvedMistakesCount}
                  </p>
                </div>
                {sheetAnalysis && (
                  <div className="col-span-2 sm:col-span-4 pt-2 border-t border-slate-200/70 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                    Active Google Sheet: <strong>{sheetAnalysis.sheetTitle}</strong> (
                    {sheetAnalysis.tabName}) · {sheetAnalysis.overallScorePercent}% Avg Score ·{' '}
                    Trend: {sheetAnalysis.trend}
                  </div>
                )}
              </div>
            )}
          </ReusableCard>

          {activeTab === 'chat' ? (
            <>
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
                        <div>{msg.text}</div>
                        {msg.role === 'assistant' && idx > 0 && (
                          <div className="mt-2 pt-1.5 border-t border-slate-200/70 dark:border-slate-700/70 flex flex-wrap items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                playClick();
                                const prevUserMsg = [...messages.slice(0, idx)]
                                  .reverse()
                                  .find((m) => m.role === 'user')?.text?.trim();
                                if (!prevUserMsg) {
                                  chatInputRef.current?.focus();
                                  return;
                                }
                                openLiveTeacher({
                                  questionText: prevUserMsg,
                                  solutionText: msg.text,
                                  source: 'preps-ai',
                                });
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#00B4FF]/15 border border-[#00B4FF]/45 text-[#00B4FF] hover:bg-[#00B4FF]/25 shadow-[0_0_12px_rgba(0,180,255,0.22)] transition-colors"
                            >
                              <GraduationCap className="w-3.5 h-3.5" />
                              Explain Like a Teacher
                            </button>

                            {voice.ttsSupported && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (voice.isSpeaking) {
                                    voice.stopSpeaking();
                                  } else {
                                    voice.speakText(msg.text);
                                  }
                                }}
                                aria-label={voice.isSpeaking ? 'Stop reading aloud' : 'Read reply aloud'}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2563EB] dark:text-sky-400 hover:underline"
                              >
                                {voice.isSpeaking ? (
                                  <VolumeX className="w-3 h-3" />
                                ) : (
                                  <Volume2 className="w-3 h-3" />
                                )}
                                <span>{voice.isSpeaking ? 'Stop' : 'Listen'}</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {voice.liveTranscript && (
                    <div className="flex justify-end">
                      <div className="max-w-[85%] rounded-2xl px-4 py-2 text-xs sm:text-sm italic bg-blue-50 dark:bg-blue-950/50 text-[#2563EB] dark:text-sky-300 border border-blue-200 dark:border-blue-800">
                        Listening (auto-sends after 2s pause): &ldquo;{voice.liveTranscript}&rdquo;
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
                    onClick={() => (voice.isListening ? voice.stopListening() : voice.startListening())}
                    aria-label={
                      voice.isListening ? 'Stop voice recording' : 'Ask Preps AI with microphone'
                    }
                    className={`h-10 px-3.5 rounded-xl inline-flex items-center gap-1.5 text-xs font-semibold shrink-0 transition-colors ${
                      voice.isListening
                        ? 'bg-rose-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-blue-50 hover:text-[#2563EB]'
                    }`}
                  >
                    {voice.isListening ? (
                      <MicOff className="w-4 h-4" />
                    ) : (
                      <Mic className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">
                      {voice.isListening ? 'Listening' : 'Speak'}
                    </span>
                  </button>

                  <input
                    ref={chatInputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder='Doubt pucho ya Hands-Free ON karke "Preps AI" bolo...'
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
            </>
          ) : (
            <TutorWorkspaceStudio
              activeTab={activeTab}
              studentName={studentName}
              cohortLabel={cohortLabel}
              sheetAnalysis={sheetAnalysis}
              onSheetAnalysisChange={setSheetAnalysis}
              keepNotes={keepNotes}
              onAddKeepNote={handleAddKeepNote}
              onDeleteKeepNote={handleDeleteKeepNote}
              onOpenChatWithPrompt={handleOpenChatWithPrompt}
            />
          )}
        </div>
      </ResponsiveContainer>
    </PageLayout>
  );
}
