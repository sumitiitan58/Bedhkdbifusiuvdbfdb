import { useMemo, useState } from 'react';
import {
  Activity,
  Award,
  BookMarked,
  ClipboardCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer as RechartsContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PageLayout } from '../layouts/PageLayout';
import { ResponsiveContainer } from '../components/ResponsiveContainer';
import { ReusableCard } from '../components/ReusableCard';
import { ReusableButton } from '../components/ReusableButton';
import { SeoHead } from '../components/SeoHead';
import { ProTestAnalysisDashboard } from '../components/analytics/ProTestAnalysisDashboard';
import { AiPrepScoreCard } from '../components/analytics/AiPrepScoreCard';
import { useAuth } from '../context/AuthContext';
import { usePlatformData } from '../context/PlatformDataContext';
import { estimatePercentileAndRank } from '../utils/testAnalysisEngine';
import { testMatchesCohort } from '../utils/catalogMerge';
import { playClick } from '../utils/soundEffects';
import type { TestAttemptRecord } from '../types';

export default function AnalyticsPage() {
  const { cohortId, profile, firebaseUser } = useAuth();
  const {
    attempts,
    questions,
    chapters,
    iqConfig,
    allCohorts,
    mockTests,
    activeStudyDates,
    resolvedMistakeIds,
  } = usePlatformData();

  const sortedAttempts = useMemo(
    () =>
      [...attempts].sort((a, b) =>
        (b.submittedAtIso || '').localeCompare(a.submittedAtIso || '')
      ),
    [attempts]
  );

  const [selectedAttemptId, setSelectedAttemptId] = useState<string>('');
  const [showSamplePreview, setShowSamplePreview] = useState(false);

  const activeCohortLabel = useMemo(
    () => allCohorts.find((c) => c.id === cohortId)?.label ?? 'JEE Main',
    [allCohorts, cohortId]
  );

  // Build a realistic preview attempt using actual starter questions so new students can explore the Pro Analysis UI before submitting their first test
  const samplePreviewAttempt = useMemo<TestAttemptRecord | null>(() => {
    const sampleTest =
      mockTests.find(
        (t) =>
          t.destination === 'cbt-mock' &&
          testMatchesCohort(t, cohortId) &&
          questions.some((q) => q.testId === t.id)
      ) ??
      mockTests.find(
        (t) => t.destination === 'cbt-mock' && questions.some((q) => q.testId === t.id)
      ) ??
      mockTests[0];
    if (!sampleTest) return null;
    const sampleQs = questions
      .filter((q) => q.testId === sampleTest.id)
      .sort((a, b) => a.questionNumber - b.questionNumber);
    if (sampleQs.length === 0) return null;

    const timings = sampleQs.map((q, idx) => {
      const mod = idx % 5;
      const answered = mod !== 4;
      const isCorrect = mod === 0 || mod === 1 || mod === 2;
      const timeSpentSeconds =
        mod === 2 ? 186 : mod === 3 ? 8 : mod === 4 ? 12 : 72;
      const paceCategory = !answered
        ? ('Unattempted' as const)
        : timeSpentSeconds > 135
          ? ('Too Slow' as const)
          : timeSpentSeconds < 25
            ? ('Too Fast' as const)
            : ('Optimal Pace' as const);
      return {
        questionId: q.id,
        questionNumber: q.questionNumber,
        subjectName: q.subjectName,
        chapterName: q.chapterName || 'Core Syllabus',
        openedAtMs: 0,
        answeredAtMs: answered ? timeSpentSeconds * 1000 : null,
        timeSpentSeconds,
        answered,
        isCorrect,
        paceCategory,
      };
    });

    const subjectBuckets = new Map<
      string,
      { score: number; maxScore: number; correct: number; incorrect: number; unattempted: number; time: number }
    >();
    const answers: TestAttemptRecord['answers'] = {};
    let totalScore = 0;
    let totalMax = 0;
    let correctCount = 0;
    let incorrectCount = 0;
    let unattemptedCount = 0;
    let totalTime = 0;

    timings.forEach((t, idx) => {
      const q = sampleQs[idx];
      const pos = q.positiveMarks ?? 4;
      const neg = q.negativeMarks ?? 1;
      totalMax += pos;
      totalTime += t.timeSpentSeconds;

      const cur = subjectBuckets.get(t.subjectName) ?? {
        score: 0,
        maxScore: 0,
        correct: 0,
        incorrect: 0,
        unattempted: 0,
        time: 0,
      };
      cur.maxScore += pos;
      cur.time += t.timeSpentSeconds;

      if (!t.answered) {
        unattemptedCount++;
        cur.unattempted++;
      } else if (t.isCorrect) {
        correctCount++;
        cur.correct++;
        totalScore += pos;
        cur.score += pos;
        answers[q.id] =
          q.questionType === 'integer'
            ? { type: 'integer', value: q.numericalAnswer ?? '1' }
            : { type: 'single-mcq', selectedIndex: q.correctOptionIndices?.[0] ?? 0 };
      } else {
        incorrectCount++;
        cur.incorrect++;
        totalScore -= neg;
        cur.score -= neg;
        const wrongIdx = ((q.correctOptionIndices?.[0] ?? 0) + 1) % 4;
        answers[q.id] =
          q.questionType === 'integer'
            ? { type: 'integer', value: '0' }
            : { type: 'single-mcq', selectedIndex: wrongIdx };
      }
      subjectBuckets.set(t.subjectName, cur);
    });

    const attempted = correctCount + incorrectCount;
    const accuracyPercent = attempted > 0 ? Math.round((correctCount / attempted) * 100) : 0;

    return {
      id: 'sample-preview-attempt',
      userId: 'preview',
      testId: sampleTest.id,
      testTitle: `${sampleTest.title} (Interactive Sample Scorecard)`,
      destination: sampleTest.destination,
      cohortId: sampleTest.cohortId,
      score: totalScore,
      maxScore: totalMax,
      correctCount,
      incorrectCount,
      unattemptedCount,
      accuracyPercent,
      totalTimeSeconds: totalTime,
      avgTimePerQuestion: Math.round(totalTime / Math.max(1, sampleQs.length)),
      iqScore: 118,
      subjectScores: Array.from(subjectBuckets.entries()).map(([subjectName, v]) => {
        const subAtt = v.correct + v.incorrect;
        const subTotal = v.correct + v.incorrect + v.unattempted;
        return {
          subjectName,
          total: subTotal,
          score: v.score,
          maxScore: v.maxScore,
          correct: v.correct,
          incorrect: v.incorrect,
          unattempted: v.unattempted,
          accuracyPercent: subAtt > 0 ? Math.round((v.correct / subAtt) * 100) : 0,
          avgTimeSeconds: Math.round(v.time / Math.max(1, subTotal)),
        };
      }),
      chapterScores: [],
      paceSummary: {
        tooFastCount: timings.filter((t) => t.paceCategory === 'Too Fast').length,
        optimalCount: timings.filter((t) => t.paceCategory === 'Optimal Pace').length,
        tooSlowCount: timings.filter((t) => t.paceCategory === 'Too Slow').length,
        unattemptedCount,
        rushingFlagNote: 'Balanced pace with a few rapid guesses to review.',
      },
      questionTimings: timings,
      answers,
      submittedAtIso: new Date().toISOString(),
    };
  }, [mockTests, questions, cohortId]);

  const activeAttempt = useMemo(() => {
    if (sortedAttempts.length === 0) {
      return showSamplePreview ? samplePreviewAttempt : null;
    }
    if (selectedAttemptId) {
      return sortedAttempts.find((a) => a.id === selectedAttemptId) ?? sortedAttempts[0];
    }
    return sortedAttempts[0];
  }, [sortedAttempts, selectedAttemptId, showSamplePreview, samplePreviewAttempt]);

  const trendData = useMemo(
    () =>
      [...sortedAttempts]
        .reverse()
        .slice(-10)
        .map((a, idx) => {
          const pct = estimatePercentileAndRank(a.score, a.maxScore, activeCohortLabel).predictedPercentile;
          return {
            name: `T${idx + 1}`,
            title: a.testTitle,
            accuracy: a.accuracyPercent,
            percentile: pct,
            scorePct: a.maxScore > 0 ? Math.round((a.score / a.maxScore) * 100) : 0,
          };
        }),
    [sortedAttempts, activeCohortLabel]
  );

  return (
    <PageLayout>
      <SeoHead
        title="Test Analysis & Percentile Insights | Prepskm"
        description="Review your JEE & NEET CBT mock scores, predicted percentile, subject accuracy, time pacing breakdown, and step-by-step solutions on PREPSKM.IN."
        canonicalPath="/analytics"
      />

      <ResponsiveContainer className="py-6 sm:py-8 space-y-6">
        {/* Page Header + Attempt Picker */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-[#F97316]">
              Deep Performance Intelligence · {activeCohortLabel}
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-[#0B1B3B] dark:text-white tracking-tight">
              Test Analysis Dashboard
            </h1>
            <p className="text-base text-slate-600 dark:text-slate-400">
              Inspect overall score, predicted percentile, attempt quality, difficulty tiers, and step-by-step solutions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {sortedAttempts.length > 0 && (
              <div className="min-w-[240px]">
                <label htmlFor="attempt-selector" className="sr-only">
                  Select test attempt to analyze
                </label>
                <select
                  id="attempt-selector"
                  value={activeAttempt?.id ?? ''}
                  onChange={(e) => {
                    playClick();
                    setSelectedAttemptId(e.target.value);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111A2E] text-sm font-semibold text-[#0B1B3B] dark:text-white"
                >
                  {sortedAttempts.map((att) => (
                    <option key={att.id} value={att.id}>
                      {att.testTitle} ({att.score}/{att.maxScore})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <ReusableButton variant="secondary" size="sm" to="/mistakes">
              <BookMarked className="w-4 h-4" />
              Mistake Notebook
            </ReusableButton>

            <ReusableButton variant="primary" size="sm" to="/cbt-mocks">
              <ClipboardCheck className="w-4 h-4" />
              Take New Test
            </ReusableButton>
          </div>
        </div>

        {/* Dynamic Prep Score (0–100) Gauge + Google Workspace Sheets & Tasks Sync */}
        <AiPrepScoreCard
          attempts={sortedAttempts}
          questions={questions}
          chapters={chapters}
          activeStudyDates={activeStudyDates}
          resolvedMistakeIds={resolvedMistakeIds}
          cohortLabel={activeCohortLabel}
          studentName={profile?.displayName ?? firebaseUser?.displayName ?? 'Student'}
          fallbackPreviewAttempt={showSamplePreview ? samplePreviewAttempt : null}
          contextLabel="Test Analytics Readiness"
        />

        {/* Main Analysis Content OR Clean Empty State with Sample Scorecard Toggle */}
        {activeAttempt ? (
          <>
            {showSamplePreview && sortedAttempts.length === 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-sm text-[#0B1B3B] dark:text-sky-200">
                <span>
                  Viewing an interactive sample scorecard. Submit any CBT Mock Test to see your real score, rank, and Mistake Notebook populated automatically.
                </span>
                <ReusableButton variant="primary" size="sm" to="/cbt-mocks">
                  Start Real CBT Mock
                </ReusableButton>
              </div>
            )}

            <ProTestAnalysisDashboard
              key={activeAttempt.id}
              attempt={activeAttempt}
              questions={questions}
              iqConfig={iqConfig}
              examCategory={activeCohortLabel}
            />

            {/* Multi-Test Trajectory Chart (when student has 2+ attempts) */}
            {trendData.length >= 2 && (
              <ReusableCard className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-display text-lg font-bold text-[#0B1B3B] dark:text-white flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-[#2563EB]" />
                      Mock Test Trajectory (Last {trendData.length} Tests)
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Track your accuracy and predicted percentile momentum across tests
                    </p>
                  </div>
                  <ReusableButton variant="secondary" size="sm" to="/preps-ai">
                    <Sparkles className="w-4 h-4 text-[#2563EB]" />
                    Analyze Trajectory with Preps AI
                  </ReusableButton>
                </div>

                <div className="h-64 w-full">
                  <RechartsContainer width="100%" height="100%">
                    <LineChart data={trendData} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#94A3B8" opacity={0.22} />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="accuracy"
                        name="Accuracy %"
                        stroke="#10B981"
                        strokeWidth={2.5}
                        dot={{ r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="percentile"
                        name="Predicted %ile"
                        stroke="#2563EB"
                        strokeWidth={2.5}
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </RechartsContainer>
                </div>
              </ReusableCard>
            )}
          </>
        ) : (
          <ReusableCard className="py-14 px-6 text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-sky-400 flex items-center justify-center mx-auto">
              <Award className="w-8 h-8" />
            </div>
            <div className="space-y-2 max-w-xl mx-auto">
              <h2 className="font-display text-2xl font-extrabold text-[#0B1B3B] dark:text-white">
                No CBT Mock Attempts Yet
              </h2>
              <p className="text-base text-slate-600 dark:text-slate-400">
                Complete any JEE or NEET mock test to unlock your Predicted Percentile, Subject Movement charts, Attempt &amp; Time buckets, Difficulty Analysis, and AI Report.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <ReusableButton variant="accent" to="/cbt-mocks">
                <ClipboardCheck className="w-4 h-4" />
                Attempt Your First CBT Mock
              </ReusableButton>
              {samplePreviewAttempt && (
                <ReusableButton
                  variant="secondary"
                  onClick={() => {
                    playClick();
                    setShowSamplePreview(true);
                  }}
                >
                  <Activity className="w-4 h-4" />
                  Preview Pro Analysis Demo
                </ReusableButton>
              )}
            </div>
          </ReusableCard>
        )}
      </ResponsiveContainer>
    </PageLayout>
  );
}
