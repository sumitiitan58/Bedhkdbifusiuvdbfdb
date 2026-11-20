import { useMemo } from 'react';
import {
  Activity,
  Award,
  BarChart3,
  Clock,
  Info,
  ShieldCheck,
  Target,
  TrendingUp,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer as RechartsContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { PageLayout } from '../layouts/PageLayout';
import { ResponsiveContainer } from '../components/ResponsiveContainer';
import { ReusableCard } from '../components/ReusableCard';
import { ReusableButton } from '../components/ReusableButton';
import { SeoHead } from '../components/SeoHead';
import { usePlatformData } from '../context/PlatformDataContext';
import { computeCumulativeAnalytics } from '../utils/scoringEngine';

export default function AnalyticsPage() {
  const { attempts, iqConfig } = usePlatformData();

  const orderedAttempts = useMemo(
    () =>
      [...attempts].sort(
        (a, b) => new Date(a.submittedAtIso).getTime() - new Date(b.submittedAtIso).getTime()
      ),
    [attempts]
  );

  const summary = useMemo(
    () => computeCumulativeAnalytics(orderedAttempts),
    [orderedAttempts]
  );

  const totalRoomExitWarnings = useMemo(
    () => orderedAttempts.reduce((sum, a) => sum + (a.roomExitWarnings ?? 0), 0),
    [orderedAttempts]
  );

  const progressionSeries = useMemo(() => {
    let runningMarks = 0;
    let runningMax = 0;
    return orderedAttempts.map((att, idx) => {
      runningMarks += att.score;
      runningMax += att.maxScore;
      const cumulativePct =
        runningMax > 0 ? Math.max(0, Math.round((runningMarks / runningMax) * 100)) : 0;
      return {
        label: `#${idx + 1}`,
        shortTitle: att.testTitle.length > 22 ? `${att.testTitle.slice(0, 22)}…` : att.testTitle,
        score: att.score,
        maxScore: att.maxScore,
        accuracy: att.accuracyPercent,
        correct: att.correctCount,
        incorrect: att.incorrectCount,
        unattempted: att.unattemptedCount,
        avgTime: att.avgTimePerQuestion,
        iqScore: att.iqScore,
        cumulativePct,
      };
    });
  }, [orderedAttempts]);

  const subjectAggregate = useMemo(() => {
    const map = new Map<
      string,
      { subject: string; correct: number; incorrect: number; unattempted: number; score: number; maxScore: number }
    >();
    for (const att of orderedAttempts) {
      for (const s of att.subjectScores) {
        const cur = map.get(s.subjectName) ?? {
          subject: s.subjectName,
          correct: 0,
          incorrect: 0,
          unattempted: 0,
          score: 0,
          maxScore: 0,
        };
        cur.correct += s.correct;
        cur.incorrect += s.incorrect;
        cur.unattempted += s.unattempted;
        cur.score += s.score;
        cur.maxScore += s.maxScore;
        map.set(s.subjectName, cur);
      }
    }
    return Array.from(map.values()).map((row) => {
      const att = row.correct + row.incorrect;
      const scorePct = row.maxScore > 0 ? Math.max(0, Math.round((row.score / row.maxScore) * 100)) : 0;
      return {
        ...row,
        accuracy: att > 0 ? Math.round((row.correct / att) * 100) : 0,
        scorePct,
      };
    });
  }, [orderedAttempts]);

  const chapterAggregate = useMemo(() => {
    const map = new Map<
      string,
      { chapterName: string; subjectName: string; correct: number; incorrect: number; total: number }
    >();
    for (const att of orderedAttempts) {
      for (const c of att.chapterScores) {
        const key = `${c.subjectName}::${c.chapterName}`;
        const cur = map.get(key) ?? {
          chapterName: c.chapterName,
          subjectName: c.subjectName,
          correct: 0,
          incorrect: 0,
          total: 0,
        };
        cur.correct += c.correct;
        cur.incorrect += c.incorrect;
        cur.total += c.total;
        map.set(key, cur);
      }
    }
    return Array.from(map.values())
      .map((c) => {
        const attempted = c.correct + c.incorrect;
        return {
          ...c,
          accuracy: attempted > 0 ? Math.round((c.correct / attempted) * 100) : 0,
        };
      })
      .sort((a, b) => a.accuracy - b.accuracy);
  }, [orderedAttempts]);

  const paceTotals = useMemo(() => {
    return orderedAttempts.reduce(
      (acc, att) => ({
        tooFast: acc.tooFast + att.paceSummary.tooFastCount,
        optimal: acc.optimal + att.paceSummary.optimalCount,
        tooSlow: acc.tooSlow + att.paceSummary.tooSlowCount,
        unattempted: acc.unattempted + att.paceSummary.unattemptedCount,
      }),
      { tooFast: 0, optimal: 0, tooSlow: 0, unattempted: 0 }
    );
  }, [orderedAttempts]);

  return (
    <PageLayout>
      <SeoHead
        title="Student Performance Analytics & IQ Score — PREPSKM.IN"
        description="Real cumulative student performance analytics built exclusively from your submitted CBT Mock Tests and Chapter DPPs."
        canonicalPath="/analytics"
        noIndex
      />

      <ResponsiveContainer className="py-8 sm:py-10 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#F97316]">
              100% Real Attempt Diagnostics
            </p>
            <h1 className="font-display text-3xl font-extrabold text-[#0B1B3B] dark:text-white mt-0.5">
              Student Performance Analytics
            </h1>
            <p className="mt-1.5 text-sm sm:text-base text-slate-600 dark:text-slate-400">
              Every graph, radar chart, and chapter diagnostic updates live from your actual CBT Mock Tests and DPP submissions.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <ReusableButton variant="primary" size="sm" to="/cbt-mocks">
              Take CBT Mock
            </ReusableButton>
            <ReusableButton variant="secondary" size="sm" to="/dpp">
              Solve Chapter DPP
            </ReusableButton>
          </div>
        </div>

        {orderedAttempts.length === 0 ? (
          <ReusableCard className="py-14 text-center max-w-2xl mx-auto space-y-4">
            <BarChart3 className="w-12 h-12 text-[#2563EB] mx-auto" />
            <h2 className="font-display text-xl font-bold text-[#0B1B3B] dark:text-white">
              No Test Attempts Recorded Yet
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
              PREPSKM.IN never displays fabricated or placeholder charts. Complete your first CBT Mock Test or Chapter DPP to unlock all 8 performance visualizations, Subject Mastery Radar, weak-chapter diagnostics, and Exam IQ analytics.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <ReusableButton variant="primary" to="/cbt-mocks">
                Start JEE Main CBT Mock #01
              </ReusableButton>
              <ReusableButton variant="secondary" to="/dpp">
                Try Electrostatics DPP #01
              </ReusableButton>
            </div>
          </ReusableCard>
        ) : (
          <>
            {/* Cumulative KPI Strip */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <ReusableCard padding="sm">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-[#2563EB] dark:text-sky-400" />
                  Tests Taken
                </p>
                <p className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-[#0B1B3B] dark:text-white">
                  {summary.totalTests}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  {summary.totalCbts} CBT · {summary.totalDpps} DPP
                </p>
              </ReusableCard>

              <ReusableCard padding="sm">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-[#10B981]" />
                  Avg / Highest
                </p>
                <p className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-[#0B1B3B] dark:text-white">
                  {summary.averageScore}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  Best: {summary.highestScore}
                  {summary.scoreDeltaFromPrevious !== null && (
                    <span className="ml-1 text-[#10B981]">
                      ({summary.scoreDeltaFromPrevious >= 0 ? '+' : ''}
                      {summary.scoreDeltaFromPrevious})
                    </span>
                  )}
                </p>
              </ReusableCard>

              <ReusableCard padding="sm">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-[#F97316]" />
                  Accuracy
                </p>
                <p className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-[#10B981]">
                  {summary.overallAccuracy}%
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  {summary.cumulativeCorrect}✓ · {summary.cumulativeIncorrect}✗
                </p>
              </ReusableCard>

              <ReusableCard padding="sm">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  Avg Pace
                </p>
                <p className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-[#0B1B3B] dark:text-white">
                  {summary.averageTimePerQuestion}s
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  Opt {paceTotals.optimal} · Fast {paceTotals.tooFast}
                </p>
              </ReusableCard>

              <ReusableCard padding="sm" className="border-blue-200 dark:border-blue-800/80">
                <p className="text-xs font-semibold text-[#2563EB] dark:text-sky-400 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" />
                  IQ Score
                </p>
                <p className="mt-1.5 font-mono text-2xl font-bold tabular-nums text-[#2563EB] dark:text-sky-300">
                  {summary.latestIqScore}
                  <span className="text-xs font-medium text-slate-500">/150</span>
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  Avg IQ: {summary.averageIqScore}
                </p>
              </ReusableCard>

              <ReusableCard
                padding="sm"
                className={
                  totalRoomExitWarnings > 0
                    ? 'border-amber-300 dark:border-amber-700'
                    : 'border-emerald-200 dark:border-emerald-800/70'
                }
              >
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
                  Room Focus
                </p>
                <p
                  className={`mt-1.5 font-mono text-2xl font-bold tabular-nums ${
                    totalRoomExitWarnings > 0 ? 'text-[#F97316]' : 'text-[#10B981]'
                  }`}
                >
                  {totalRoomExitWarnings === 0 ? '100%' : `${totalRoomExitWarnings} W`}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {totalRoomExitWarnings === 0 ? 'Zero exit warnings' : 'Exit warnings logged'}
                </p>
              </ReusableCard>
            </div>

            {/* Transparent IQ & Pace Heuristic Formula Card */}
            <ReusableCard padding="sm">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-[#2563EB] dark:text-sky-400 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                  <p className="font-semibold text-[#0B1B3B] dark:text-white">
                    Transparent IQ Score & Pace Efficiency Heuristic
                  </p>
                  <p>
                    Official Exam Score is strictly computed from your marking scheme (+4/−1 or DPP rules). Separately, the IQ Score (40–150) combines your accuracy with question-level solving pace: responses under{' '}
                    <strong className="font-mono">{iqConfig.tooFastThresholdSec}s</strong> are tagged{' '}
                    <strong>Too Fast</strong>,{' '}
                    <strong className="font-mono">
                      {iqConfig.optimalMinSec}s–{iqConfig.optimalMaxSec}s
                    </strong>{' '}
                    as <strong>Optimal Pace</strong>, and above{' '}
                    <strong className="font-mono">{iqConfig.tooSlowThresholdSec}s</strong> as{' '}
                    <strong>Too Slow</strong>.
                  </p>
                </div>
              </div>
            </ReusableCard>

            {/* 8 Interactive Recharts Graphs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chart 1: Official Score Progression */}
              <ReusableCard padding="sm" className="space-y-3">
                <h2 className="font-display text-base font-bold text-[#0B1B3B] dark:text-white">
                  1. Official Score Progression Across Tests
                </h2>
                <div className="h-60 w-full">
                  <RechartsContainer width="100%" height="100%">
                    <LineChart data={progressionSeries} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#94A3B8" opacity={0.25} />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="score"
                        name="Official Score"
                        stroke="#2563EB"
                        strokeWidth={2.5}
                        dot={{ r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="maxScore"
                        name="Max Marks"
                        stroke="#94A3B8"
                        strokeDasharray="4 4"
                      />
                    </LineChart>
                  </RechartsContainer>
                </div>
              </ReusableCard>

              {/* Chart 2: Subject Mastery Radar Chart */}
              <ReusableCard padding="sm" className="space-y-3">
                <h2 className="font-display text-base font-bold text-[#0B1B3B] dark:text-white">
                  2. Subject Mastery Radar (Accuracy % vs Score %)
                </h2>
                <div className="h-60 w-full">
                  <RechartsContainer width="100%" height="100%">
                    <RadarChart data={subjectAggregate} cx="50%" cy="50%" outerRadius="72%">
                      <PolarGrid stroke="#94A3B8" opacity={0.35} />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                      <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <Radar
                        name="Accuracy %"
                        dataKey="accuracy"
                        stroke="#10B981"
                        fill="#10B981"
                        fillOpacity={0.28}
                      />
                      <Radar
                        name="Score %"
                        dataKey="scorePct"
                        stroke="#2563EB"
                        fill="#2563EB"
                        fillOpacity={0.22}
                      />
                      <Legend />
                      <Tooltip />
                    </RadarChart>
                  </RechartsContainer>
                </div>
              </ReusableCard>

              {/* Chart 3: Accuracy % Over Time */}
              <ReusableCard padding="sm" className="space-y-3">
                <h2 className="font-display text-base font-bold text-[#0B1B3B] dark:text-white">
                  3. Accuracy Percentage Trend
                </h2>
                <div className="h-60 w-full">
                  <RechartsContainer width="100%" height="100%">
                    <AreaChart data={progressionSeries} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#94A3B8" opacity={0.25} />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v) => [`${v}%`, 'Accuracy']} />
                      <Area
                        type="monotone"
                        dataKey="accuracy"
                        name="Accuracy %"
                        stroke="#10B981"
                        fill="#10B981"
                        fillOpacity={0.2}
                        strokeWidth={2.5}
                      />
                    </AreaChart>
                  </RechartsContainer>
                </div>
              </ReusableCard>

              {/* Chart 4: Correct vs Incorrect vs Unattempted */}
              <ReusableCard padding="sm" className="space-y-3">
                <h2 className="font-display text-base font-bold text-[#0B1B3B] dark:text-white">
                  4. Correct vs Incorrect vs Skipped Breakdown
                </h2>
                <div className="h-60 w-full">
                  <RechartsContainer width="100%" height="100%">
                    <BarChart data={progressionSeries} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#94A3B8" opacity={0.25} />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="correct" name="Correct" stackId="a" fill="#10B981" />
                      <Bar dataKey="incorrect" name="Incorrect" stackId="a" fill="#EF4444" />
                      <Bar dataKey="unattempted" name="Skipped" stackId="a" fill="#94A3B8" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </RechartsContainer>
                </div>
              </ReusableCard>

              {/* Chart 5: Subject-Wise Performance */}
              <ReusableCard padding="sm" className="space-y-3">
                <h2 className="font-display text-base font-bold text-[#0B1B3B] dark:text-white">
                  5. Subject-Wise Accuracy (%)
                </h2>
                <div className="h-60 w-full">
                  <RechartsContainer width="100%" height="100%">
                    <BarChart data={subjectAggregate} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#94A3B8" opacity={0.25} />
                      <XAxis dataKey="subject" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v) => [`${v}%`, 'Accuracy']} />
                      <Bar dataKey="accuracy" name="Accuracy %" fill="#2563EB" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </RechartsContainer>
                </div>
              </ReusableCard>

              {/* Chart 6: Time per Question vs Accuracy */}
              <ReusableCard padding="sm" className="space-y-3">
                <h2 className="font-display text-base font-bold text-[#0B1B3B] dark:text-white">
                  6. Avg Time per Question (s) vs Accuracy (%)
                </h2>
                <div className="h-60 w-full">
                  <RechartsContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#94A3B8" opacity={0.25} />
                      <XAxis type="number" dataKey="avgTime" name="Avg Time" unit="s" tick={{ fontSize: 12 }} />
                      <YAxis type="number" dataKey="accuracy" name="Accuracy" unit="%" domain={[0, 100]} tick={{ fontSize: 12 }} />
                      <ZAxis range={[70, 160]} />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                      <Scatter name="Test Attempts" data={progressionSeries} fill="#F97316" />
                    </ScatterChart>
                  </RechartsContainer>
                </div>
              </ReusableCard>

              {/* Chart 7: IQ Score Progression */}
              <ReusableCard padding="sm" className="space-y-3">
                <h2 className="font-display text-base font-bold text-[#0B1B3B] dark:text-white">
                  7. IQ Score Progression (Pace & Precision Index)
                </h2>
                <div className="h-60 w-full">
                  <RechartsContainer width="100%" height="100%">
                    <LineChart data={progressionSeries} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#94A3B8" opacity={0.25} />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <YAxis domain={[40, 150]} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="iqScore"
                        name="IQ Score"
                        stroke="#2563EB"
                        strokeWidth={2.5}
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </RechartsContainer>
                </div>
              </ReusableCard>

              {/* Chart 8: Cumulative Multi-Test Growth Curve */}
              <ReusableCard padding="sm" className="space-y-3">
                <h2 className="font-display text-base font-bold text-[#0B1B3B] dark:text-white">
                  8. Cumulative Multi-Test Mastery Growth (%)
                </h2>
                <div className="h-60 w-full">
                  <RechartsContainer width="100%" height="100%">
                    <AreaChart data={progressionSeries} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#94A3B8" opacity={0.25} />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v) => [`${v}%`, 'Cumulative Marks %']} />
                      <Area
                        type="monotone"
                        dataKey="cumulativePct"
                        name="Cumulative Score %"
                        stroke="#F97316"
                        fill="#F97316"
                        fillOpacity={0.18}
                        strokeWidth={2.5}
                      />
                    </AreaChart>
                  </RechartsContainer>
                </div>
              </ReusableCard>
            </div>

            {/* Chapter-Wise Diagnostics */}
            {chapterAggregate.length > 0 && (
              <ReusableCard padding="sm" className="space-y-3">
                <h2 className="font-display text-base font-bold text-[#0B1B3B] dark:text-white">
                  Chapter Mastery Diagnostics (Lowest Accuracy First)
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-xs uppercase text-slate-500 dark:text-slate-400">
                        <th className="py-2 pr-4">Chapter</th>
                        <th className="py-2 px-3">Subject</th>
                        <th className="py-2 px-3">Correct</th>
                        <th className="py-2 px-3">Incorrect</th>
                        <th className="py-2 pl-3">Accuracy</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 tabular-nums">
                      {chapterAggregate.map((ch) => (
                        <tr key={`${ch.subjectName}-${ch.chapterName}`}>
                          <td className="py-2.5 pr-4 font-semibold text-slate-900 dark:text-white">
                            {ch.chapterName}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                            {ch.subjectName}
                          </td>
                          <td className="py-2.5 px-3 text-emerald-700 dark:text-emerald-400">
                            {ch.correct}
                          </td>
                          <td className="py-2.5 px-3 text-rose-700 dark:text-rose-400">
                            {ch.incorrect}
                          </td>
                          <td className="py-2.5 pl-3 font-mono font-bold">{ch.accuracy}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ReusableCard>
            )}

            {/* Complete Historical Attempt Ledger */}
            <ReusableCard padding="sm" className="space-y-3">
              <h2 className="font-display text-base font-bold text-[#0B1B3B] dark:text-white">
                Complete Attempt History Ledger ({orderedAttempts.length})
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-xs uppercase text-slate-500 dark:text-slate-400">
                      <th className="py-2 pr-4">Test / DPP</th>
                      <th className="py-2 px-3">Type</th>
                      <th className="py-2 px-3">Official Score</th>
                      <th className="py-2 px-3">Accuracy</th>
                      <th className="py-2 px-3">Avg Pace</th>
                      <th className="py-2 px-3">IQ Score</th>
                      <th className="py-2 px-3">Room Warnings</th>
                      <th className="py-2 pl-3">Submitted</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 tabular-nums">
                    {[...orderedAttempts].reverse().map((att) => (
                      <tr key={att.id}>
                        <td className="py-2.5 pr-4 font-semibold text-slate-900 dark:text-white">
                          {att.testTitle}
                        </td>
                        <td className="py-2.5 px-3 text-xs uppercase font-semibold text-slate-500">
                          {att.destination === 'cbt-mock' ? 'CBT' : 'DPP'}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-[#0B1B3B] dark:text-sky-300">
                          {att.score} / {att.maxScore}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-emerald-700 dark:text-emerald-400">
                          {att.accuracyPercent}%
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                          {att.avgTimePerQuestion}s/Q
                        </td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-[#2563EB] dark:text-sky-400">
                          {att.iqScore}/150
                        </td>
                        <td className="py-2.5 px-3 font-mono text-xs">
                          {(att.roomExitWarnings ?? 0) > 0 ? (
                            <span className="text-[#F97316] font-bold">{att.roomExitWarnings}</span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400">0</span>
                          )}
                        </td>
                        <td className="py-2.5 pl-3 text-xs text-slate-500 dark:text-slate-400">
                          {new Date(att.submittedAtIso).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ReusableCard>
          </>
        )}
      </ResponsiveContainer>
    </PageLayout>
  );
}
