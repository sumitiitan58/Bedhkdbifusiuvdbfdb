import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Award,
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  Clock,
  Flame,
  Gauge,
  LayoutGrid,
  Loader2,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  XCircle,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer as RechartsContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  IQConfig,
  StudentAnswerValue,
  TestAttemptRecord,
  TestQuestionRecord,
} from '../../types';
import {
  categorizeAttemptQuestions,
  computeDifficultyBreakdown,
  computeProAttemptMetrics,
  type AttemptTimeBucket,
} from '../../utils/testAnalysisEngine';
import {
  requestGeminiQuestionExplanation,
  requestTestAiReport,
  type GeminiQuestionExplanation,
  type TestAiReport,
} from '../../services/geminiClient';
import { ReusableCard } from '../ReusableCard';
import { ReusableButton } from '../ReusableButton';
import { SolutionCardDeck, type SolutionReviewItem } from '../exam/SolutionCardDeck';
import { playAiSparkle, playClick } from '../../utils/soundEffects';

export type AnalysisSubTab =
  | 'overview'
  | 'subject-movement'
  | 'attempt-time'
  | 'difficulty'
  | 'solutions';

const LETTERS = ['A', 'B', 'C', 'D'] as const;

function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const rem = s % 60;
  if (hrs > 0) return `${hrs}h ${mins}m`;
  if (mins > 0) return `${mins}m ${rem}s`;
  return `${rem}s`;
}

function formatStudentAnswer(
  q: TestQuestionRecord,
  ans: StudentAnswerValue | undefined
): string {
  if (!ans) return 'Unattempted';
  if (q.questionType === 'integer' && ans.type === 'integer') {
    return ans.value.trim() || 'Unattempted';
  }
  if (ans.type === 'single-mcq') {
    return ans.selectedIndex !== null ? `Option ${LETTERS[ans.selectedIndex]}` : 'Unattempted';
  }
  if (ans.type === 'multi-mcq') {
    return ans.selectedIndices.length > 0
      ? ans.selectedIndices.map((i) => `Option ${LETTERS[i]}`).join(', ')
      : 'Unattempted';
  }
  return 'Unattempted';
}

function formatOfficialAnswer(q: TestQuestionRecord): string {
  if (q.questionType === 'integer') return q.numericalAnswer ?? '—';
  return (q.correctOptionIndices ?? []).map((i) => `Option ${LETTERS[i]}`).join(', ') || '—';
}

const SUB_NAV_ITEMS: Array<{
  id: AnalysisSubTab;
  label: string;
  description: string;
  icon: typeof LayoutGrid;
}> = [
  {
    id: 'overview',
    label: 'Overview',
    description: 'Score, percentile & 6-metric scorecard',
    icon: LayoutGrid,
  },
  {
    id: 'subject-movement',
    label: 'Performance & Subjects',
    description: 'Subject accuracy & time comparison',
    icon: BarChart3,
  },
  {
    id: 'attempt-time',
    label: 'Attempt & Time Analysis',
    description: 'Perfect, overtime & silly mistakes',
    icon: Clock,
  },
  {
    id: 'difficulty',
    label: 'Difficulty Analysis',
    description: 'Easy, Medium & Hard breakdown',
    icon: Gauge,
  },
  {
    id: 'solutions',
    label: 'View Solutions',
    description: 'Step-by-step cards & AI shortcuts',
    icon: BookOpenCheck,
  },
];

interface ProTestAnalysisDashboardProps {
  attempt: TestAttemptRecord;
  questions: TestQuestionRecord[];
  iqConfig?: IQConfig;
  examCategory?: string;
  headerActions?: React.ReactNode;
}

export function ProTestAnalysisDashboard({
  attempt,
  questions,
  iqConfig,
  examCategory = 'JEE Main',
  headerActions,
}: ProTestAnalysisDashboardProps) {
  const [activeTab, setActiveTab] = useState<AnalysisSubTab>('overview');
  const [bucketFilter, setBucketFilter] = useState<'all' | AttemptTimeBucket>('all');

  // Instant AI Report state
  const [aiReport, setAiReport] = useState<TestAiReport | null>(null);
  const [aiReportLoading, setAiReportLoading] = useState(false);
  const [aiReportError, setAiReportError] = useState('');

  // Per-question AI explanations for SolutionCardDeck
  const [aiExplanations, setAiExplanations] = useState<Record<string, GeminiQuestionExplanation>>({});
  const [aiLoadingId, setAiLoadingId] = useState<string | null>(null);
  const [aiErrorById, setAiErrorById] = useState<Record<string, string>>({});

  const testQuestions = useMemo(
    () =>
      questions
        .filter((q) => q.testId === attempt.testId)
        .sort((a, b) => a.questionNumber - b.questionNumber),
    [attempt.testId, questions]
  );

  const proMetrics = useMemo(
    () => computeProAttemptMetrics(attempt, testQuestions, examCategory),
    [attempt, testQuestions, examCategory]
  );

  const attemptAnalysis = useMemo(
    () => categorizeAttemptQuestions(attempt, testQuestions, iqConfig),
    [attempt, testQuestions, iqConfig]
  );

  const difficultyBreakdown = useMemo(
    () => computeDifficultyBreakdown(attempt, testQuestions),
    [attempt, testQuestions]
  );

  const timingMap = useMemo(
    () => new Map(attempt.questionTimings.map((t) => [t.questionId, t])),
    [attempt.questionTimings]
  );

  const solutionItems = useMemo<SolutionReviewItem[]>(() => {
    return testQuestions.map((q) => {
      const timing = timingMap.get(q.id);
      const status = !timing?.answered
        ? 'skipped'
        : timing.isCorrect
          ? 'correct'
          : 'wrong';
      const pos = q.positiveMarks ?? 4;
      const neg = q.negativeMarks ?? 1;
      const deltaMarks = status === 'correct' ? pos : status === 'wrong' ? -neg : 0;
      return {
        question: q,
        studentAnswer: attempt.answers?.[q.id],
        status,
        deltaMarks,
        timing,
      };
    });
  }, [attempt.answers, testQuestions, timingMap]);

  const subjectChartData = useMemo(
    () =>
      attempt.subjectScores.map((s) => ({
        subject: s.subjectName,
        accuracy: s.accuracyPercent,
        score: s.score,
        maxScore: s.maxScore,
        avgTime: s.avgTimeSeconds,
        totalMinutes: Number(
          (((s.correct + s.incorrect + s.unattempted) * s.avgTimeSeconds) / 60).toFixed(1)
        ),
      })),
    [attempt.subjectScores]
  );

  const bucketChartData = useMemo(
    () => [
      {
        name: 'Perfect Attempts',
        value: attemptAnalysis.perfectCount,
        color: '#10B981',
      },
      {
        name: 'Overtime Correct',
        value: attemptAnalysis.overtimeCorrectCount,
        color: '#2563EB',
      },
      {
        name: 'Silly Mistakes',
        value: attemptAnalysis.sillyMistakeCount + attemptAnalysis.overtimeWrongCount,
        color: '#EF4444',
      },
      {
        name: 'Unattempted',
        value: attemptAnalysis.unattemptedCount,
        color: '#94A3B8',
      },
    ],
    [attemptAnalysis]
  );

  const filteredBucketItems = useMemo(() => {
    if (bucketFilter === 'all') return attemptAnalysis.items;
    if (bucketFilter === 'silly-mistake') {
      return attemptAnalysis.items.filter(
        (i) => i.bucket === 'silly-mistake' || i.bucket === 'overtime-wrong'
      );
    }
    return attemptAnalysis.items.filter((i) => i.bucket === bucketFilter);
  }, [attemptAnalysis.items, bucketFilter]);

  const handleGenerateAiReport = async () => {
    playClick();
    setAiReportLoading(true);
    setAiReportError('');
    try {
      const report = await requestTestAiReport({
        testTitle: attempt.testTitle,
        cohortLabel: examCategory,
        metrics: proMetrics,
        subjectScores: attempt.subjectScores,
        attemptBuckets: {
          perfect: attemptAnalysis.perfectCount,
          overtimeCorrect: attemptAnalysis.overtimeCorrectCount,
          sillyMistakes: attemptAnalysis.sillyMistakeCount,
          overtimeWrong: attemptAnalysis.overtimeWrongCount,
          unattempted: attemptAnalysis.unattemptedCount,
        },
        difficultyBreakdown,
      });
      setAiReport(report);
      playAiSparkle();
    } catch (err) {
      setAiReportError(
        err instanceof Error ? err.message : 'Unable to generate AI report right now.'
      );
    } finally {
      setAiReportLoading(false);
    }
  };

  const handleExplainWithAi = async (q: TestQuestionRecord) => {
    playClick();
    setAiLoadingId(q.id);
    setAiErrorById((prev) => ({ ...prev, [q.id]: '' }));
    try {
      const explanation = await requestGeminiQuestionExplanation({
        subjectName: q.subjectName,
        chapterName: q.chapterName,
        questionText: q.questionText || `Question ${q.questionNumber} (${q.subjectName})`,
        optionTexts: q.optionTexts,
        correctAnswer: formatOfficialAnswer(q),
        studentAnswer: formatStudentAnswer(q, attempt.answers?.[q.id]),
        solutionText: q.solutionText,
      });
      setAiExplanations((prev) => ({ ...prev, [q.id]: explanation }));
      playAiSparkle();
    } catch (err) {
      setAiErrorById((prev) => ({
        ...prev,
        [q.id]: err instanceof Error ? err.message : 'AI explanation failed.',
      }));
    } finally {
      setAiLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Title & Action Strip (AI Report + View Solutions) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1 min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-[#F97316]">
            {attempt.destination === 'cbt-mock' ? 'CBT Mock Test Analysis' : 'Chapter DPP Analysis'} ·{' '}
            {new Date(attempt.submittedAtIso).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </p>
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0B1B3B] dark:text-white truncate">
            {attempt.testTitle}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <ReusableButton
            variant="accent"
            size="sm"
            disabled={aiReportLoading}
            onClick={() => void handleGenerateAiReport()}
          >
            {aiReportLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {aiReport ? 'Refresh AI Report' : 'AI Report'}
          </ReusableButton>

          <ReusableButton
            variant={activeTab === 'solutions' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => {
              playClick();
              setActiveTab('solutions');
            }}
          >
            <BookOpenCheck className="w-4 h-4" />
            View Solutions ({testQuestions.length})
          </ReusableButton>

          {headerActions}
        </div>
      </div>

      {/* Inline Instant AI Performance Report Drawer */}
      {(aiReport || aiReportError) && (
        <ReusableCard className="border-blue-200 dark:border-blue-800/80 bg-gradient-to-br from-blue-50/60 via-white to-white dark:from-[#12203D] dark:via-[#111A2E] dark:to-[#111A2E] space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#2563EB] dark:text-sky-400" />
              <h3 className="font-display text-base sm:text-lg font-bold text-[#0B1B3B] dark:text-white">
                Preps AI Performance Report
              </h3>
            </div>
            <button
              type="button"
              onClick={() => {
                setAiReport(null);
                setAiReportError('');
              }}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              Dismiss
            </button>
          </div>

          {aiReportError ? (
            <p className="text-sm text-rose-600 dark:text-rose-400">{aiReportError}</p>
          ) : (
            aiReport && (
              <div className="space-y-4">
                <p className="text-base font-semibold text-[#0B1B3B] dark:text-white">
                  {aiReport.verdict}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  <strong className="text-[#0B1B3B] dark:text-white">Mark-Leak Audit: </strong>
                  {aiReport.markLeakAnalysis}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                      Key Strengths
                    </p>
                    <ul className="space-y-1.5 text-sm text-slate-700 dark:text-slate-200 list-disc pl-5">
                      {aiReport.strengths.map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#F97316]">
                      Immediate Fixes Before Next Mock
                    </p>
                    <ul className="space-y-1.5 text-sm text-slate-700 dark:text-slate-200 list-disc pl-5">
                      {aiReport.immediateFixes.map((fix, idx) => (
                        <li key={idx}>{fix}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <p className="pt-3 border-t border-slate-200/80 dark:border-slate-800 text-sm font-semibold text-[#2563EB] dark:text-sky-400">
                  Next Mock Target: {aiReport.nextMockTarget}
                </p>
              </div>
            )
          )}
        </ReusableCard>
      )}

      {/* Structured Left Sub-Navigation + Main Analysis Canvas */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Sub-Navigation */}
        <aside className="xl:col-span-3">
          <ReusableCard padding="sm" className="xl:sticky xl:top-20 space-y-2">
            <p className="px-2 pb-2 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
              Analysis Sections
            </p>
            <nav
              aria-label="Test analysis sub-navigation"
              className="flex xl:flex-col gap-1.5 overflow-x-auto xl:overflow-visible pb-1 xl:pb-0"
            >
              {SUB_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      playClick();
                      setActiveTab(item.id);
                    }}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-start gap-3 text-left px-3.5 py-3 rounded-xl transition-colors shrink-0 xl:shrink ${
                      active
                        ? 'bg-[#0B1B3B] text-white dark:bg-[#2563EB]'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 mt-0.5 shrink-0 ${
                        active ? 'text-white' : 'text-[#2563EB] dark:text-sky-400'
                      }`}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-bold leading-snug whitespace-nowrap xl:whitespace-normal">
                        {item.label}
                      </span>
                      <span
                        className={`hidden xl:block text-xs mt-0.5 ${
                          active ? 'text-slate-200' : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {item.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </nav>
          </ReusableCard>
        </aside>

        {/* Main Analysis Workspace */}
        <div className="xl:col-span-9 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <>
              {/* Hero Metric Pair: Overall Score (with Subject Breakdown) + Predicted Percentile */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <ReusableCard className="lg:col-span-7 flex flex-col justify-between gap-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Overall Score
                      </p>
                      <div className="mt-2 flex items-baseline gap-2.5 tabular-nums">
                        <span className="font-mono text-4xl sm:text-5xl font-extrabold text-[#0B1B3B] dark:text-white">
                          {proMetrics.score}
                        </span>
                        <span className="font-mono text-xl font-semibold text-slate-400">
                          / {proMetrics.maxScore}
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400 tabular-nums">
                        {proMetrics.scorePercent}% net score · Exam IQ {attempt.iqScore}/150
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-[#2563EB] dark:text-sky-400 flex items-center justify-center shrink-0">
                      <Award className="w-6 h-6" />
                    </div>
                  </div>

                  {/* Subject-Wise Score Breakdown Strip */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5 border-t border-slate-100 dark:border-slate-800">
                    {attempt.subjectScores.map((s) => (
                      <div key={s.subjectName} className="space-y-1">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {s.subjectName}
                        </p>
                        <p className="font-mono text-xl font-extrabold text-[#0B1B3B] dark:text-white tabular-nums">
                          {s.score}{' '}
                          <span className="text-xs font-medium text-slate-400">/ {s.maxScore}</span>
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                          {s.accuracyPercent}% acc · {s.correct}✓ {s.incorrect}✗
                        </p>
                      </div>
                    ))}
                  </div>
                </ReusableCard>

                <ReusableCard className="lg:col-span-5 bg-gradient-to-br from-[#0B1B3B] to-[#17336B] dark:from-[#122447] dark:to-[#0C1830] text-white border-transparent flex flex-col justify-between gap-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-sky-300">
                        Predicted Percentile
                      </p>
                      <p className="mt-2 font-mono text-4xl sm:text-5xl font-extrabold tabular-nums">
                        {proMetrics.predictedPercentile}
                        <span className="text-2xl text-sky-300">%ile</span>
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-white/10 text-[#F97316] flex items-center justify-center shrink-0">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                  </div>

                  <div className="space-y-2.5 pt-4 border-t border-white/15">
                    <div className="flex items-center justify-between text-xs text-slate-200 tabular-nums">
                      <span>Projected Rank</span>
                      <span className="font-mono font-bold text-white">
                        #{proMetrics.leaderboardRank.toLocaleString()} /{' '}
                        {proMetrics.estimatedTestTakers.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/15 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#F97316]"
                        style={{ width: `${Math.min(100, Math.max(4, proMetrics.predictedPercentile))}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-300">
                      Calibrated against historical {examCategory} score-to-percentile bands.
                    </p>
                  </div>
                </ReusableCard>
              </div>

              {/* 6-Card Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 tabular-nums">
                <ReusableCard>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Leaderboard Rank
                    </p>
                    <Trophy className="w-4 h-4 text-[#F97316]" />
                  </div>
                  <p className="mt-3 font-mono text-3xl font-extrabold text-[#0B1B3B] dark:text-white">
                    #{proMetrics.leaderboardRank.toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Out of {proMetrics.estimatedTestTakers.toLocaleString()} benchmark aspirants
                  </p>
                </ReusableCard>

                <ReusableCard>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Questions Attempted
                    </p>
                    <Target className="w-4 h-4 text-[#2563EB]" />
                  </div>
                  <p className="mt-3 font-mono text-3xl font-extrabold text-[#0B1B3B] dark:text-white">
                    {proMetrics.attemptedCount}{' '}
                    <span className="text-base font-medium text-slate-400">
                      / {proMetrics.totalQuestions}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {attempt.unattemptedCount} skipped ·{' '}
                    {Math.round((proMetrics.attemptedCount / proMetrics.totalQuestions) * 100)}% attempt rate
                  </p>
                </ReusableCard>

                <ReusableCard>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Accuracy %
                    </p>
                    <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                  </div>
                  <p className="mt-3 font-mono text-3xl font-extrabold text-[#10B981]">
                    {proMetrics.accuracyPercent}%
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {attempt.correctCount} correct · {attempt.incorrectCount} incorrect
                  </p>
                </ReusableCard>

                <ReusableCard>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Positive Score
                    </p>
                    <Flame className="w-4 h-4 text-[#10B981]" />
                  </div>
                  <p className="mt-3 font-mono text-3xl font-extrabold text-emerald-700 dark:text-emerald-400">
                    +{proMetrics.positiveScore}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Gross marks earned from correct answers
                  </p>
                </ReusableCard>

                <ReusableCard>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Marks Lost (Negative)
                    </p>
                    <XCircle className="w-4 h-4 text-rose-500" />
                  </div>
                  <p className="mt-3 font-mono text-3xl font-extrabold text-rose-600 dark:text-rose-400">
                    -{proMetrics.marksLostNegative}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Penalty deducted across {attempt.incorrectCount} wrong answers
                  </p>
                </ReusableCard>

                <ReusableCard>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Time Taken
                    </p>
                    <Clock className="w-4 h-4 text-[#2563EB]" />
                  </div>
                  <p className="mt-3 font-mono text-3xl font-extrabold text-[#0B1B3B] dark:text-white">
                    {formatDuration(proMetrics.totalTimeSeconds)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Avg {proMetrics.avgTimePerQuestion}s per question
                  </p>
                </ReusableCard>
              </div>
            </>
          )}

          {/* TAB 2: PERFORMANCE & SUBJECT MOVEMENT */}
          {activeTab === 'subject-movement' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ReusableCard className="space-y-4">
                  <div>
                    <h3 className="font-display text-lg font-bold text-[#0B1B3B] dark:text-white">
                      Subject-Wise Accuracy (%)
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Compare precision across every subject in this test
                    </p>
                  </div>
                  <div className="h-64 w-full">
                    <RechartsContainer width="100%" height="100%">
                      <BarChart
                        data={subjectChartData}
                        margin={{ top: 8, right: 12, left: -12, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#94A3B8" opacity={0.22} />
                        <XAxis dataKey="subject" tick={{ fontSize: 12 }} />
                        <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(val) => [`${val}%`, 'Accuracy']} />
                        <Bar dataKey="accuracy" name="Accuracy %" fill="#10B981" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </RechartsContainer>
                  </div>
                </ReusableCard>

                <ReusableCard className="space-y-4">
                  <div>
                    <h3 className="font-display text-lg font-bold text-[#0B1B3B] dark:text-white">
                      Time Spent Comparison (Avg sec / Q)
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Identify which subject consumed disproportionate exam time
                    </p>
                  </div>
                  <div className="h-64 w-full">
                    <RechartsContainer width="100%" height="100%">
                      <BarChart
                        data={subjectChartData}
                        margin={{ top: 8, right: 12, left: -12, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#94A3B8" opacity={0.22} />
                        <XAxis dataKey="subject" tick={{ fontSize: 12 }} />
                        <YAxis unit="s" tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(val) => [`${val}s`, 'Avg Time / Q']} />
                        <Bar dataKey="avgTime" name="Avg Sec / Q" fill="#2563EB" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </RechartsContainer>
                  </div>
                </ReusableCard>
              </div>

              <ReusableCard>
                <h3 className="font-display text-lg font-bold text-[#0B1B3B] dark:text-white mb-4">
                  Subject Scorecard Table
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-xs uppercase text-slate-500 dark:text-slate-400">
                        <th className="py-3 pr-4">Subject</th>
                        <th className="py-3 px-4">Net Score</th>
                        <th className="py-3 px-4">Correct</th>
                        <th className="py-3 px-4">Wrong</th>
                        <th className="py-3 px-4">Skipped</th>
                        <th className="py-3 px-4">Accuracy</th>
                        <th className="py-3 pl-4">Avg Time / Q</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 tabular-nums">
                      {attempt.subjectScores.map((s) => (
                        <tr key={s.subjectName}>
                          <td className="py-3.5 pr-4 font-bold text-[#0B1B3B] dark:text-white">
                            {s.subjectName}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-[#2563EB] dark:text-sky-400">
                            {s.score} / {s.maxScore}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-emerald-700 dark:text-emerald-400">
                            {s.correct}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-rose-600 dark:text-rose-400">
                            {s.incorrect}
                          </td>
                          <td className="py-3.5 px-4 text-slate-500">{s.unattempted}</td>
                          <td className="py-3.5 px-4 font-mono font-semibold">{s.accuracyPercent}%</td>
                          <td className="py-3.5 pl-4 font-mono text-slate-600 dark:text-slate-400">
                            {s.avgTimeSeconds}s
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ReusableCard>
            </div>
          )}

          {/* TAB 3: ATTEMPT & TIME ANALYSIS */}
          {activeTab === 'attempt-time' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 tabular-nums">
                <button
                  type="button"
                  onClick={() => setBucketFilter(bucketFilter === 'perfect' ? 'all' : 'perfect')}
                  className={`text-left p-5 rounded-2xl border transition-all ${
                    bucketFilter === 'perfect'
                      ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111A2E]'
                  }`}
                >
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                    Perfect Attempts
                  </p>
                  <p className="mt-2 font-mono text-3xl font-extrabold text-[#0B1B3B] dark:text-white">
                    {attemptAnalysis.perfectCount}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Fast/optimal pace &amp; correct
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setBucketFilter(
                      bucketFilter === 'overtime-correct' ? 'all' : 'overtime-correct'
                    )
                  }
                  className={`text-left p-5 rounded-2xl border transition-all ${
                    bucketFilter === 'overtime-correct'
                      ? 'border-[#2563EB] bg-blue-50/70 dark:bg-blue-950/30'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111A2E]'
                  }`}
                >
                  <p className="text-xs font-bold uppercase tracking-wider text-[#2563EB] dark:text-sky-400">
                    Overtime Correct
                  </p>
                  <p className="mt-2 font-mono text-3xl font-extrabold text-[#0B1B3B] dark:text-white">
                    {attemptAnalysis.overtimeCorrectCount}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Correct but exceeded time budget
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setBucketFilter(bucketFilter === 'silly-mistake' ? 'all' : 'silly-mistake')
                  }
                  className={`text-left p-5 rounded-2xl border transition-all ${
                    bucketFilter === 'silly-mistake'
                      ? 'border-rose-500 bg-rose-50/70 dark:bg-rose-950/30'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111A2E]'
                  }`}
                >
                  <p className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                    Silly Mistakes
                  </p>
                  <p className="mt-2 font-mono text-3xl font-extrabold text-[#0B1B3B] dark:text-white">
                    {attemptAnalysis.sillyMistakeCount + attemptAnalysis.overtimeWrongCount}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {attemptAnalysis.sillyMistakeCount} fast/normal wrong ·{' '}
                    {attemptAnalysis.overtimeWrongCount} overtime wrong
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setBucketFilter(bucketFilter === 'unattempted' ? 'all' : 'unattempted')
                  }
                  className={`text-left p-5 rounded-2xl border transition-all ${
                    bucketFilter === 'unattempted'
                      ? 'border-slate-500 bg-slate-100 dark:bg-slate-800'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111A2E]'
                  }`}
                >
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Unattempted
                  </p>
                  <p className="mt-2 font-mono text-3xl font-extrabold text-[#0B1B3B] dark:text-white">
                    {attemptAnalysis.unattemptedCount}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Left untouched or skipped
                  </p>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <ReusableCard className="lg:col-span-5 space-y-3">
                  <h3 className="font-display text-base font-bold text-[#0B1B3B] dark:text-white">
                    Attempt Quality Distribution
                  </h3>
                  <div className="h-60 w-full">
                    <RechartsContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={bucketChartData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={48}
                          outerRadius={78}
                          paddingAngle={3}
                        >
                          {bucketChartData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                      </PieChart>
                    </RechartsContainer>
                  </div>
                </ReusableCard>

                <ReusableCard className="lg:col-span-7 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-display text-base font-bold text-[#0B1B3B] dark:text-white">
                      Question-Level Time Log ({filteredBucketItems.length})
                    </h3>
                    {bucketFilter !== 'all' && (
                      <button
                        type="button"
                        onClick={() => setBucketFilter('all')}
                        className="text-xs font-semibold text-[#2563EB] dark:text-sky-400 hover:underline"
                      >
                        Show All Questions
                      </button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredBucketItems.map((item) => (
                      <div
                        key={item.questionId}
                        className="py-2.5 flex items-center justify-between gap-3 text-sm"
                      >
                        <div className="min-w-0">
                          <span className="font-mono font-bold text-[#0B1B3B] dark:text-white">
                            Q{item.questionNumber}
                          </span>
                          <span className="mx-2 text-slate-300 dark:text-slate-700">·</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-200">
                            {item.subjectName}
                          </span>
                          <span className="mx-2 text-slate-300 dark:text-slate-700">·</span>
                          <span className="text-slate-500 dark:text-slate-400 truncate">
                            {item.chapterName}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 tabular-nums text-xs font-semibold">
                          <span className="font-mono text-slate-500 dark:text-slate-400">
                            {item.timeSpentSeconds}s
                          </span>
                          <span
                            className={
                              item.bucket === 'perfect'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : item.bucket === 'overtime-correct'
                                  ? 'text-[#2563EB] dark:text-sky-400'
                                  : item.bucket === 'unattempted'
                                    ? 'text-slate-500'
                                    : 'text-rose-600 dark:text-rose-400'
                            }
                          >
                            {item.bucket === 'perfect'
                              ? 'Perfect'
                              : item.bucket === 'overtime-correct'
                                ? 'Overtime ✓'
                                : item.bucket === 'unattempted'
                                  ? 'Skipped'
                                  : item.bucket === 'overtime-wrong'
                                    ? 'Overtime ✗'
                                    : 'Silly Mistake'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ReusableCard>
              </div>
            </div>
          )}

          {/* TAB 4: DIFFICULTY ANALYSIS */}
          {activeTab === 'difficulty' && (
            <div className="space-y-6">
              <ReusableCard className="space-y-4">
                <div>
                  <h3 className="font-display text-lg font-bold text-[#0B1B3B] dark:text-white">
                    Difficulty Tier Breakdown (Attempted vs. Skipped)
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Maximize Easy &amp; Medium accuracy first before spending time on Hard traps
                  </p>
                </div>
                <div className="h-64 w-full">
                  <RechartsContainer width="100%" height="100%">
                    <BarChart
                      data={difficultyBreakdown}
                      margin={{ top: 8, right: 12, left: -12, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#94A3B8" opacity={0.22} />
                      <XAxis dataKey="tier" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="correct" name="Correct" fill="#10B981" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="wrong" name="Wrong" fill="#EF4444" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="skipped" name="Skipped" fill="#94A3B8" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </RechartsContainer>
                </div>
              </ReusableCard>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 tabular-nums">
                {difficultyBreakdown.map((tier) => (
                  <ReusableCard key={tier.tier} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-display text-base font-bold text-[#0B1B3B] dark:text-white">
                        {tier.tier} Questions
                      </h4>
                      <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400">
                        {tier.total} Total
                      </span>
                    </div>
                    <p className="font-mono text-3xl font-extrabold text-[#2563EB] dark:text-sky-400">
                      {tier.accuracyPercent}%{' '}
                      <span className="text-xs font-sans font-medium text-slate-500">accuracy</span>
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {tier.attempted} Attempted ({tier.correct}✓ · {tier.wrong}✗) · {tier.skipped}{' '}
                      Skipped
                    </p>
                  </ReusableCard>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: STEP-BY-STEP SOLUTIONS */}
          {activeTab === 'solutions' && (
            <SolutionCardDeck
              title={`Step-by-Step Solutions — ${attempt.testTitle}`}
              items={solutionItems}
              onExplainWithAi={handleExplainWithAi}
              aiExplanations={aiExplanations}
              aiLoadingId={aiLoadingId}
              aiErrorById={aiErrorById}
            />
          )}

          {/* Subtle room integrity footer notice if warnings > 0 */}
          {(attempt.roomExitWarnings ?? 0) > 0 && (
            <div className="flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-300 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70">
              <AlertTriangle className="w-4 h-4 shrink-0 text-[#F97316]" />
              <span>
                {attempt.roomExitWarnings} exam room-exit warning(s) were logged during this session.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
