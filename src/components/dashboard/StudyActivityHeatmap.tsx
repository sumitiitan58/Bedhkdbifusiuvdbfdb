import { useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Flame, Sparkles, TrendingUp } from 'lucide-react';
import { usePlatformData } from '../../context/PlatformDataContext';
import { ReusableCard } from '../ReusableCard';
import {
  build30DayActivityHeatmap,
  getIntensityLabel,
  type HeatmapDayCell,
  type HeatmapIntensityLevel,
} from '../../utils/activityHeatmap';
import { playClick, playSuccess } from '../../utils/soundEffects';

const WEEKDAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''] as const;

const LEVEL_TILE_CLASSES: Record<HeatmapIntensityLevel, string> = {
  0: 'bg-[#EBEDF0] dark:bg-slate-800/90 border-slate-200/80 dark:border-slate-700/70',
  1: 'bg-[#9BE9A8] dark:bg-emerald-950/90 border-[#7CD98E] dark:border-emerald-800',
  2: 'bg-[#40C463] dark:bg-emerald-700 border-[#2EB052] dark:border-emerald-600',
  3: 'bg-[#30A14E] dark:bg-emerald-500 border-[#248A3F] dark:border-emerald-400',
  4: 'bg-[#216E39] dark:bg-emerald-400 border-[#18572C] dark:border-emerald-300',
};

const LEGEND_LEVELS: HeatmapIntensityLevel[] = [0, 1, 2, 3, 4];

export function StudyActivityHeatmap() {
  const { activeStudyDates, attempts, recordDailyActivity } = usePlatformData();

  const heatmap = useMemo(
    () =>
      build30DayActivityHeatmap({
        activeStudyDates,
        attempts,
      }),
    [activeStudyDates, attempts]
  );

  const [selectedDateIso, setSelectedDateIso] = useState<string>(
    () => heatmap.days[heatmap.days.length - 1]?.dateIso ?? ''
  );

  const selectedCell: HeatmapDayCell | undefined = useMemo(() => {
    return (
      heatmap.days.find((d) => d.dateIso === selectedDateIso) ??
      heatmap.days[heatmap.days.length - 1]
    );
  }, [heatmap.days, selectedDateIso]);

  return (
    <ReusableCard className="space-y-4">
      {/* Header Row */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            <CalendarDays className="w-4 h-4 shrink-0" />
            <span>30-Day Study Activity Heatmap · {heatmap.monthSpanLabel}</span>
          </div>
          <h2 className="font-display text-lg sm:text-xl font-extrabold text-[#0B1B3B] dark:text-white tracking-tight">
            Daily Study Consistency
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 tabular-nums">
            <strong className="text-[#0B1B3B] dark:text-white">
              {heatmap.activeDaysCount}/{heatmap.totalDays} active days
            </strong>{' '}
            ({heatmap.consistencyPercent}% consistency) · {heatmap.totalMocks30d} CBT mock
            {heatmap.totalMocks30d === 1 ? '' : 's'} &amp; DPPs submitted
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!heatmap.studiedToday ? (
            <button
              type="button"
              onClick={() => {
                playSuccess();
                recordDailyActivity();
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              Log Today&apos;s Study
            </button>
          ) : (
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Today Logged</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Split: GitHub-Style 7x5 Contribution Matrix + Key Consistency Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        {/* Left: GitHub-style Weekday Matrix (Sun–Sat rows × 5-6 Week columns) */}
        <div className="lg:col-span-7 space-y-3">
          <div
            data-testid="study-activity-heatmap-grid"
            className="p-4 rounded-2xl bg-slate-50/90 dark:bg-[#0C1426] border border-slate-200/80 dark:border-slate-800 overflow-x-auto"
          >
            <div className="inline-flex items-start gap-3 min-w-max">
              {/* Weekday axis labels (Mon / Wed / Fri) */}
              <div className="grid grid-rows-7 gap-2 pt-5 text-[11px] font-semibold text-slate-400 dark:text-slate-500 select-none">
                {WEEKDAY_LABELS.map((lbl, idx) => (
                  <span key={idx} className="h-6 sm:h-7 flex items-center leading-none">
                    {lbl}
                  </span>
                ))}
              </div>

              {/* Week columns */}
              <div className="flex items-start gap-2">
                {heatmap.weeksGrid.map((week, weekIdx) => {
                  const firstInRange = week.find((c) => c.isInRange);
                  const prevWeek = weekIdx > 0 ? heatmap.weeksGrid[weekIdx - 1] : null;
                  const prevFirstInRange = prevWeek?.find((c) => c.isInRange);
                  const showMonthHeader =
                    firstInRange &&
                    (!prevFirstInRange ||
                      firstInRange.monthShort !== prevFirstInRange.monthShort ||
                      weekIdx === 0);

                  return (
                    <div key={weekIdx} className="flex flex-col gap-2">
                      <span className="h-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 leading-none">
                        {showMonthHeader ? firstInRange.monthShort : ''}
                      </span>

                      <div className="grid grid-rows-7 gap-2">
                        {week.map((cell) => {
                          if (!cell.isInRange) {
                            return (
                              <span
                                key={cell.dateIso}
                                aria-hidden="true"
                                className="w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-transparent"
                              />
                            );
                          }

                          const isSelected = selectedCell?.dateIso === cell.dateIso;
                          const ariaDesc = `${cell.formattedDate}: ${
                            cell.activityCount === 0
                              ? 'No study logged'
                              : `${cell.checkedIn ? 'Daily study logged' : ''}${
                                  cell.mocksCount > 0
                                    ? `, ${cell.mocksCount} CBT test${cell.mocksCount === 1 ? '' : 's'} submitted`
                                    : ''
                                }`
                          } (${getIntensityLabel(cell.intensityLevel)})`;

                          return (
                            <button
                              key={cell.dateIso}
                              type="button"
                              data-heatmap-day={cell.dateIso}
                              data-intensity={cell.intensityLevel}
                              aria-label={ariaDesc}
                              aria-pressed={isSelected}
                              title={ariaDesc}
                              onMouseEnter={() => setSelectedDateIso(cell.dateIso)}
                              onFocus={() => setSelectedDateIso(cell.dateIso)}
                              onClick={() => {
                                playClick();
                                setSelectedDateIso(cell.dateIso);
                              }}
                              className={`w-6 h-6 sm:w-7 sm:h-7 rounded-md border transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] flex items-center justify-center text-[10px] font-mono font-bold tabular-nums ${
                                LEVEL_TILE_CLASSES[cell.intensityLevel]
                              } ${
                                cell.intensityLevel >= 2
                                  ? 'text-white dark:text-slate-950'
                                  : 'text-slate-500 dark:text-slate-400'
                              } ${
                                isSelected
                                  ? 'ring-2 ring-[#0B1B3B] dark:ring-sky-400 ring-offset-2 ring-offset-slate-50 dark:ring-offset-[#0C1426]'
                                  : ''
                              } ${
                                cell.isToday && !isSelected
                                  ? 'ring-1 ring-[#F97316] ring-offset-1 ring-offset-slate-50 dark:ring-offset-[#0C1426]'
                                  : ''
                              }`}
                            >
                              {cell.dayNumber}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Legend Bar */}
            <div className="mt-4 pt-3 border-t border-slate-200/70 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <span>Last 30 calendar days · Tap or hover any day for details</span>
              <div className="inline-flex items-center gap-1.5">
                <span>Less</span>
                {LEGEND_LEVELS.map((lvl) => (
                  <span
                    key={lvl}
                    aria-hidden="true"
                    className={`w-3.5 h-3.5 rounded-[4px] border ${LEVEL_TILE_CLASSES[lvl]}`}
                  />
                ))}
                <span>More</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Interactive Day Inspector & 30-Day Consistency Metrics */}
        <div className="lg:col-span-5 space-y-3">
          {selectedCell && (
            <div
              data-testid="heatmap-selected-summary"
              className="p-4 rounded-2xl bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#2563EB] dark:text-sky-400">
                  {selectedCell.isToday ? 'Today · ' : ''}
                  {selectedCell.formattedDate}
                </span>
                <span
                  className={`text-xs font-bold ${
                    selectedCell.intensityLevel >= 3
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : selectedCell.intensityLevel >= 1
                        ? 'text-[#2563EB] dark:text-sky-400'
                        : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {getIntensityLabel(selectedCell.intensityLevel)}
                </span>
              </div>

              <p className="text-sm font-semibold text-[#0B1B3B] dark:text-white leading-snug">
                {selectedCell.activityCount === 0
                  ? 'No study session recorded on this day.'
                  : `${selectedCell.checkedIn ? 'Daily study session logged' : 'Study active'}${
                      selectedCell.mocksCount > 0
                        ? ` + ${selectedCell.mocksCount} CBT mock/DPP completed`
                        : ''
                    }.`}
              </p>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Complete chapter notes, focus sprints, or CBT mocks to turn each tile deeper green.
              </p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2.5 tabular-nums">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                <Flame className="w-3.5 h-3.5 text-[#F97316]" />
                <span>Streak</span>
              </div>
              <p className="font-mono text-xl font-extrabold text-[#0B1B3B] dark:text-white mt-1">
                {heatmap.currentStreak}d
              </p>
              <p className="text-[10px] text-slate-500">Best {heatmap.longestStreak}d</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                <span>30d Rate</span>
              </div>
              <p className="font-mono text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                {heatmap.consistencyPercent}%
              </p>
              <p className="text-[10px] text-slate-500">{heatmap.activeDaysCount}/30 days</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>Tests</span>
              </div>
              <p className="font-mono text-xl font-extrabold text-[#2563EB] dark:text-sky-400 mt-1">
                {heatmap.totalMocks30d}
              </p>
              <p className="text-[10px] text-slate-500">Last 30d</p>
            </div>
          </div>
        </div>
      </div>
    </ReusableCard>
  );
}
