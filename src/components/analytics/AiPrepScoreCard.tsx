import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Calculator,
  CheckCircle2,
  Gauge,
  HelpCircle,
  Minus,
  Sparkles,
  Target,
  X,
} from 'lucide-react';
import { ReusableCard } from '../ReusableCard';
import { WorkspaceSyncControls } from './WorkspaceSyncControls';
import {
  computeAiPrepScore,
  type PrepReadinessTier,
  type PrepScoreReport,
} from '../../utils/prepScoreEngine';
import type { ChapterRecord, TestAttemptRecord, TestQuestionRecord } from '../../types';
import { playClick } from '../../utils/soundEffects';

interface AiPrepScoreCardProps {
  attempts: TestAttemptRecord[];
  questions: TestQuestionRecord[];
  chapters: ChapterRecord[];
  activeStudyDates: string[];
  resolvedMistakeIds: string[];
  cohortLabel: string;
  studentName: string;
  /**
   * Optional preview attempt (e.g. when viewing interactive sample scorecard on Test Analysis)
   * so students with 0 real attempts can still see a live computed Prep Score.
   */
  fallbackPreviewAttempt?: TestAttemptRecord | null;
  contextLabel?: string;
}

const TIER_STYLES: Record<
  PrepReadinessTier,
  { stroke: string; textClass: string; barClass: string }
> = {
  Foundation: {
    stroke: '#64748B',
    textClass: 'text-slate-700 dark:text-slate-300',
    barClass: 'bg-slate-500',
  },
  Contender: {
    stroke: '#F97316',
    textClass: 'text-[#F97316]',
    barClass: 'bg-[#F97316]',
  },
  '98+ %ile Ready': {
    stroke: '#2563EB',
    textClass: 'text-[#2563EB] dark:text-sky-400',
    barClass: 'bg-[#2563EB]',
  },
  'AIR Top 1000 Pace': {
    stroke: '#10B981',
    textClass: 'text-emerald-600 dark:text-emerald-400',
    barClass: 'bg-[#10B981]',
  },
};

const FACTOR_BAR_COLORS: Record<string, string> = {
  pacing: 'bg-[#2563EB]',
  'chapter-weightage': 'bg-[#F97316]',
  'accuracy-control': 'bg-[#10B981]',
  'consistency-recovery': 'bg-indigo-600 dark:bg-indigo-400',
};

function PrepScoreGaugeSvg({
  score,
  tier,
  deltaThisWeek,
  deltaLabel,
}: {
  score: number;
  tier: PrepReadinessTier;
  deltaThisWeek: number;
  deltaLabel: string;
}) {
  const radius = 92;
  const circumference = Math.PI * radius; // Semi-circle arc length
  const clampedRatio = Math.max(0, Math.min(1, score / 1000));
  const strokeDashoffset = circumference * (1 - clampedRatio);
  const style = TIER_STYLES[tier];

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-60 h-36 flex items-end justify-center">
        <svg
          viewBox="0 0 220 138"
          className="w-full h-full overflow-visible"
          role="img"
          aria-label={`AI Prep Score ${score} out of 1000, readiness tier ${tier}`}
        >
          {/* Background semi-circle track */}
          <path
            d="M 18 120 A 92 92 0 0 1 202 120"
            fill="none"
            stroke="currentColor"
            strokeWidth="16"
            strokeLinecap="round"
            className="text-slate-200/90 dark:text-slate-800"
          />
          {/* Progress arc */}
          <path
            d="M 18 120 A 92 92 0 0 1 202 120"
            fill="none"
            stroke={style.stroke}
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-[stroke-dashoffset] duration-700 ease-out"
          />
          {/* Scale anchors */}
          <text
            x="16"
            y="136"
            className="fill-slate-400 dark:fill-slate-500 text-[10px] font-mono"
            textAnchor="start"
          >
            0
          </text>
          <text
            x="110"
            y="12"
            className="fill-slate-400 dark:fill-slate-500 text-[10px] font-mono"
            textAnchor="middle"
          >
            500
          </text>
          <text
            x="204"
            y="136"
            className="fill-slate-400 dark:fill-slate-500 text-[10px] font-mono"
            textAnchor="end"
          >
            1000
          </text>
        </svg>

        <div className="absolute bottom-2 inset-x-0 text-center">
          <div className="flex items-baseline justify-center gap-1">
            <span className="font-mono text-4xl sm:text-5xl font-extrabold tracking-tight text-[#0B1B3B] dark:text-white tabular-nums">
              {score}
            </span>
            <span className="font-mono text-sm font-semibold text-slate-400 dark:text-slate-500 tabular-nums">
              / 1000
            </span>
          </div>
          <p className={`text-sm font-bold mt-0.5 ${style.textClass}`}>{tier}</p>
        </div>
      </div>

      {/* Weekly Delta — clean unboxed typography */}
      <div className="mt-2 flex items-center justify-center gap-1.5 text-xs font-semibold tabular-nums">
        {deltaThisWeek > 0 ? (
          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <ArrowUpRight className="w-3.5 h-3.5" />+{deltaThisWeek} {deltaLabel}
          </span>
        ) : deltaThisWeek < 0 ? (
          <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400">
            <ArrowDownRight className="w-3.5 h-3.5" />
            {deltaThisWeek} {deltaLabel}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
            <Minus className="w-3.5 h-3.5" />0 pts {deltaLabel}
          </span>
        )}
      </div>
    </div>
  );
}

export function AiPrepScoreCard({
  attempts,
  questions,
  chapters,
  activeStudyDates,
  resolvedMistakeIds,
  cohortLabel,
  studentName,
  fallbackPreviewAttempt = null,
  contextLabel = 'Real-Time Readiness Index',
}: AiPrepScoreCardProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const effectiveAttempts = useMemo(() => {
    if (attempts.length > 0) return attempts;
    return fallbackPreviewAttempt ? [fallbackPreviewAttempt] : [];
  }, [attempts, fallbackPreviewAttempt]);

  const isPreviewMode = attempts.length === 0 && Boolean(fallbackPreviewAttempt);

  const report: PrepScoreReport = useMemo(
    () =>
      computeAiPrepScore({
        attempts: effectiveAttempts,
        questions,
        chapters,
        activeStudyDates,
        resolvedMistakeIds,
        cohortLabel,
      }),
    [effectiveAttempts, questions, chapters, activeStudyDates, resolvedMistakeIds, cohortLabel]
  );

  return (
    <>
      <ReusableCard className="p-6 space-y-6">
        {/* Card Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800/90">
          <div className="space-y-1">
            <p className="text-xs font-bold tracking-wide text-[#2563EB] dark:text-sky-400 flex items-center gap-1.5">
              <Gauge className="w-4 h-4 shrink-0" />
              <span>AI Prep Score</span>
              <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                ·
              </span>
              <span className="text-slate-500 dark:text-slate-400 font-semibold">
                {isPreviewMode ? `${cohortLabel} Sample Preview` : `${contextLabel} · ${cohortLabel}`}
              </span>
            </p>
            <h2 className="font-display text-xl sm:text-2xl font-extrabold text-[#0B1B3B] dark:text-white tracking-tight">
              Exam Readiness Score
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
              {report.tierDescription}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                playClick();
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-[#0B1B3B] dark:bg-[#2563EB] text-white text-xs sm:text-sm font-semibold hover:opacity-95 transition-opacity whitespace-nowrap shrink-0"
            >
              <HelpCircle className="w-4 h-4" />
              How AI Calculated This
            </button>
          </div>
        </div>

        {/* Main 2-Column Body: Gauge + 4-Factor Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
          {/* Left: Gauge + Target Gap */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center lg:border-r lg:border-slate-100 lg:dark:border-slate-800/90 lg:pr-6 space-y-4">
            <PrepScoreGaugeSvg
              score={report.score}
              tier={report.tier}
              deltaThisWeek={report.deltaThisWeek}
              deltaLabel={report.deltaLabel}
            />

            <div className="w-full pt-3 border-t border-slate-100 dark:border-slate-800/80 text-center space-y-1">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 tabular-nums">
                {report.pointsTo850 > 0 ? (
                  <>
                    <span className="font-mono font-bold text-[#0B1B3B] dark:text-white">
                      +{report.pointsTo850} pts
                    </span>{' '}
                    needed to cross 850+ AIR Top 1000 Pace
                  </>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    Above 850+ target pace — maintain consistency
                  </span>
                )}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                Benchmark: {report.diagnostics.idealSecondsPerQuestion}s/Q · Streak:{' '}
                {report.diagnostics.activeStreakDays}d · Mistakes cleared:{' '}
                {report.diagnostics.mistakeRecoveryPercent}%
              </p>
            </div>
          </div>

          {/* Right: 4-Bar Factor Breakdown */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span>4-Factor Weighted Breakdown</span>
              <span className="font-mono tabular-nums">Total: {report.score} / 1000</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              {report.factors.map((factor) => (
                <div key={factor.id} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-sm font-bold text-[#0B1B3B] dark:text-white">
                        {factor.shortLabel}
                      </span>
                      <span className="ml-1.5 text-xs font-medium text-slate-400 tabular-nums">
                        ({factor.weightPercent}%)
                      </span>
                    </div>
                    <span className="font-mono text-xs font-bold text-[#0B1B3B] dark:text-slate-200 tabular-nums shrink-0">
                      {factor.score} / {factor.maxScore}
                    </span>
                  </div>

                  <div
                    className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"
                    role="progressbar"
                    aria-valuenow={factor.score}
                    aria-valuemin={0}
                    aria-valuemax={factor.maxScore}
                    aria-label={factor.label}
                  >
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        FACTOR_BAR_COLORS[factor.id] ?? 'bg-[#2563EB]'
                      }`}
                      style={{ width: `${Math.max(4, factor.percent)}%` }}
                    />
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">
                    {factor.summary}
                  </p>
                </div>
              ))}
            </div>

            {/* 3 Concise Data-Backed AI Insights */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800/90 space-y-2.5">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#F97316]" />
                Why Your Score Moved (3 Key Drivers)
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {report.insights.map((ins) => (
                  <div
                    key={ins.id}
                    className="py-2.5 px-3 rounded-xl bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 space-y-1"
                  >
                    <p
                      className={`text-xs font-bold leading-snug flex items-start gap-1.5 ${
                        ins.sentiment === 'positive'
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : ins.sentiment === 'negative'
                            ? 'text-rose-700 dark:text-rose-400'
                            : 'text-[#0B1B3B] dark:text-slate-200'
                      }`}
                    >
                      {ins.sentiment === 'positive' ? (
                        <ArrowUpRight className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      ) : ins.sentiment === 'negative' ? (
                        <ArrowDownRight className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      ) : (
                        <Target className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#2563EB]" />
                      )}
                      <span>{ins.headline}</span>
                    </p>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      {ins.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Google Workspace Export & Action Sync Row */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800/90">
          <WorkspaceSyncControls
            report={report}
            attempts={effectiveAttempts}
            cohortLabel={cohortLabel}
            studentName={studentName}
            compact
          />
        </div>
      </ReusableCard>

      {/* "How AI Calculated This" Accessible Modal with 850+ Chapter Action Plan */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="prep-score-modal-title"
          className="fixed inset-0 z-[90] bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-[#0F182D] border border-slate-200 dark:border-slate-700 shadow-2xl">
            {/* Sticky Modal Header */}
            <div className="sticky top-0 z-10 px-6 py-4 bg-white/95 dark:bg-[#0F182D]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-sky-400 flex items-center justify-center shrink-0">
                  <Calculator className="w-5 h-5" />
                </span>
                <div className="min-w-0">
                  <h3
                    id="prep-score-modal-title"
                    className="font-display text-lg font-extrabold text-[#0B1B3B] dark:text-white truncate"
                  >
                    How AI Calculated Your Prep Score ({report.score} / 1000)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {report.tier} · {cohortLabel} · Formula weights &amp; personalized 850+ roadmap
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close AI Prep Score calculation details"
                className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Telemetry Formula Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Avg Pace / Q</p>
                  <p className="font-mono text-lg font-bold text-[#0B1B3B] dark:text-white tabular-nums mt-0.5">
                    {report.diagnostics.avgSecondsPerQuestion}s
                    <span className="text-xs font-normal text-slate-400 ml-1">
                      / {report.diagnostics.idealSecondsPerQuestion}s
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Rushed &amp; Traps</p>
                  <p className="font-mono text-lg font-bold text-[#0B1B3B] dark:text-white tabular-nums mt-0.5">
                    {report.diagnostics.rushedWrongCount}
                    <span className="text-xs font-normal text-slate-400 mx-1">·</span>
                    {report.diagnostics.timeSinkCount}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    &lt;10s wrong · &gt;180s sink
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Net Marks Yield</p>
                  <p className="font-mono text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5">
                    {report.diagnostics.netPositiveRatioPercent}%
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                    +{report.diagnostics.positiveMarksEarned} / -{report.diagnostics.negativeMarksLost}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Mistake Recovery</p>
                  <p className="font-mono text-lg font-bold text-[#2563EB] dark:text-sky-400 tabular-nums mt-0.5">
                    {report.diagnostics.mistakeRecoveryPercent}%
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                    {report.diagnostics.mistakeResolvedCount}/{report.diagnostics.mistakeTotalCount}{' '}
                    resolved · {report.diagnostics.activeStreakDays}d streak
                  </p>
                </div>
              </div>

              {/* Exact Weight Formula Table */}
              <div className="space-y-3">
                <h4 className="font-display text-sm font-bold text-[#0B1B3B] dark:text-white">
                  1. Weighted Scoring Formula (1000 Points Max)
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                        <th className="py-2 pr-3 font-semibold">Factor</th>
                        <th className="py-2 px-3 font-semibold text-right">Weight</th>
                        <th className="py-2 px-3 font-semibold text-right">Score</th>
                        <th className="py-2 pl-3 font-semibold">Diagnostic Basis</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                      {report.factors.map((f) => (
                        <tr key={f.id}>
                          <td className="py-2.5 pr-3 font-semibold text-[#0B1B3B] dark:text-white">
                            {f.label}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                            {f.weightPercent}%
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums text-[#0B1B3B] dark:text-white">
                            {f.score} / {f.maxScore}
                          </td>
                          <td className="py-2.5 pl-3 text-slate-600 dark:text-slate-400">
                            {f.summary}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Personalized Chapter-Level Action Items to Push Score Above 850+ */}
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="font-display text-sm font-bold text-[#0B1B3B] dark:text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    2. Personalized Action Plan to Reach 850+
                  </h4>
                  <span className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
                    Gap to 850: {report.pointsTo850} pts
                  </span>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800/80 border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden">
                  {report.actionItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-semibold text-[#2563EB] dark:text-sky-400">
                            {item.subjectName}
                          </span>
                          <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                            ·
                          </span>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                            +{item.estimatedGainPts} pts potential
                          </span>
                          <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                            ·
                          </span>
                          <span
                            className={`font-semibold ${
                              item.priority === 'High'
                                ? 'text-[#F97316]'
                                : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {item.priority} Priority
                          </span>
                        </div>
                        <p className="text-sm font-bold text-[#0B1B3B] dark:text-white">
                          {item.title}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                          {item.reason}
                        </p>
                      </div>

                      <Link
                        to={item.route}
                        onClick={() => {
                          playClick();
                          setModalOpen(false);
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-[#2563EB] text-xs font-semibold text-[#0B1B3B] dark:text-white whitespace-nowrap shrink-0 self-start sm:self-center transition-colors"
                      >
                        {item.actionLabel}
                        <ArrowRight className="w-3.5 h-3.5 text-[#2563EB]" />
                      </Link>
                    </div>
                  ))}
                </div>
              </div>

              {/* Workspace Sync inside Modal */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <WorkspaceSyncControls
                  report={report}
                  attempts={effectiveAttempts}
                  cohortLabel={cohortLabel}
                  studentName={studentName}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
