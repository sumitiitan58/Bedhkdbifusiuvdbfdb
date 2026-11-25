import { useMemo, useState } from 'react';
import { Calendar, CheckCircle2, Flame, Pencil, Target } from 'lucide-react';
import { ReusableCard } from '../ReusableCard';
import { usePlatformData } from '../../context/PlatformDataContext';
import { computeExamCountdown, computeStudyStreak } from '../../utils/streakTracker';
import { playClick, playSuccess } from '../../utils/soundEffects';

export function StreakTargetWidget() {
  const {
    activeStudyDates,
    recordDailyActivity,
    targetExamDate,
    targetExamLabel,
    setTargetExam,
  } = usePlatformData();

  const [editingDate, setEditingDate] = useState(false);
  const [draftDate, setDraftDate] = useState(targetExamDate);
  const [draftLabel, setDraftLabel] = useState(targetExamLabel);

  const streak = useMemo(() => computeStudyStreak(activeStudyDates), [activeStudyDates]);
  const countdown = useMemo(() => computeExamCountdown(targetExamDate), [targetExamDate]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Daily Study Streak Card */}
      <ReusableCard className="lg:col-span-7 flex flex-col justify-between gap-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-950/50 text-[#F97316] flex items-center justify-center shrink-0">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Daily Consistency Streak
              </p>
              <div className="flex items-baseline gap-2.5 mt-0.5 tabular-nums">
                <span className="font-mono text-3xl font-extrabold text-[#0B1B3B] dark:text-white">
                  {streak.currentStreak} {streak.currentStreak === 1 ? 'Day' : 'Days'}
                </span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Best: {streak.longestStreak}d
                </span>
              </div>
            </div>
          </div>

          {streak.activeToday ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              Today Logged
            </span>
          ) : (
            <button
              type="button"
              onClick={() => {
                playSuccess();
                recordDailyActivity();
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#F97316] hover:bg-[#EA580C] text-white transition-colors"
            >
              Check In Today
            </button>
          )}
        </div>

        {/* 7-Day Visual Rhythm Strip */}
        <div className="grid grid-cols-7 gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
          {streak.last7Days.map((day) => (
            <div
              key={day.dateIso}
              className={`rounded-xl py-2.5 text-center border transition-colors ${
                day.active
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300'
                  : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200/70 dark:border-slate-800 text-slate-400'
              }`}
            >
              <p className="text-[11px] font-bold uppercase">{day.dayLabel}</p>
              <p className="mt-1 font-mono text-xs font-extrabold">
                {day.active ? '✓' : '·'}
              </p>
            </div>
          ))}
        </div>
      </ReusableCard>

      {/* Target JEE / NEET Exam Countdown Card */}
      <ReusableCard className="lg:col-span-5 flex flex-col justify-between gap-4 bg-gradient-to-br from-[#0B1B3B] to-[#163063] text-white border-transparent">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-sky-300 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" />
              {targetExamLabel}
            </p>
            <div className="flex items-baseline gap-2 tabular-nums">
              <span className="font-mono text-4xl font-extrabold">{countdown.daysRemaining}</span>
              <span className="text-sm font-semibold text-sky-200">
                {countdown.daysRemaining === 1 ? 'day left' : 'days left'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              playClick();
              setDraftDate(targetExamDate);
              setDraftLabel(targetExamLabel);
              setEditingDate((e) => !e);
            }}
            aria-label="Edit target exam date"
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-sky-200 transition-colors"
          >
            <Pencil className="w-4 h-4" />
          </button>
        </div>

        {editingDate ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setTargetExam(draftDate, draftLabel);
              setEditingDate(false);
            }}
            className="space-y-2.5 pt-2 border-t border-white/15"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                value={draftLabel}
                onChange={(e) => setDraftLabel(e.target.value)}
                aria-label="Target exam name"
                placeholder="JEE Main 2027"
                className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-xs text-white placeholder:text-slate-300"
              />
              <input
                type="date"
                value={draftDate}
                onChange={(e) => setDraftDate(e.target.value)}
                aria-label="Target exam date"
                className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-xs text-white"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingDate(false)}
                className="px-3 py-1 text-xs font-semibold text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1 rounded-lg bg-[#F97316] text-xs font-bold text-white"
              >
                Save Target
              </button>
            </div>
          </form>
        ) : (
          <div className="flex items-center justify-between pt-3 border-t border-white/15 text-xs text-sky-100">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#F97316]" />
              Target Date: <strong className="font-mono">{countdown.formattedTarget}</strong>
            </span>
            <span className="text-sky-300 font-semibold">Stay consistent</span>
          </div>
        )}
      </ReusableCard>
    </div>
  );
}
