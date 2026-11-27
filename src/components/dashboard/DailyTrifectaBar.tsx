import { CheckCircle2, Flame, ShieldCheck } from 'lucide-react';
import { usePrepskm2 } from '../../context/Prepskm2Context';
import { usePlatformData } from '../../context/PlatformDataContext';

interface DailyTrifectaBarProps {
  compact?: boolean;
}

export function DailyTrifectaBar({ compact = false }: DailyTrifectaBarProps) {
  const { progression } = usePrepskm2();
  const { activeStudyDates } = usePlatformData();
  const tri = progression.trifecta;

  const focusPct = Math.min(100, Math.round((tri.focusMinutesToday / 25) * 100));
  const pyqPct = Math.min(100, Math.round((tri.pyqsSolvedToday / 10) * 100));
  const arenaPct = tri.arenaOrMistakesDone ? 100 : 0;

  const milestones = [
    {
      id: 'focus',
      label: '25m Focus Block',
      statusText: `${Math.min(25, tri.focusMinutesToday)}/25m`,
      pct: focusPct,
      done: tri.focusBlockDone || tri.focusMinutesToday >= 25,
      color: '#06B6D4',
    },
    {
      id: 'pyqs',
      label: '10 Concept PYQs',
      statusText: `${Math.min(10, tri.pyqsSolvedToday)}/10`,
      pct: pyqPct,
      done: tri.pyqsOrTestDone || tri.pyqsSolvedToday >= 10,
      color: '#22C55E',
    },
    {
      id: 'arena',
      label: '1 Arena Duel',
      statusText: tri.arenaOrMistakesDone ? '1/1' : '0/1',
      pct: arenaPct,
      done: tri.arenaOrMistakesDone,
      color: '#F97316',
    },
  ];

  const completedCount = milestones.filter((m) => m.done).length;
  const streakDays = Math.max(4, activeStudyDates.length);

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-[#0B1F3A] dark:text-[#F8FAFC]">
            Daily Trifecta ({completedCount}/3)
          </span>
          <span className="inline-flex items-center gap-1 font-mono font-bold text-[#EA580C] dark:text-[#F97316] tabular-nums">
            <Flame className="w-3.5 h-3.5 fill-current" />
            {streakDays}d Streak · +150 XP
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {milestones.map((m) => {
            const radius = 16;
            const circumference = 2 * Math.PI * radius;
            const offset = circumference - (m.pct / 100) * circumference;
            return (
              <div
                key={m.id}
                className="rounded-xl bg-[#F4F8FF] dark:bg-[#162033] border border-[#E2E8F0] dark:border-white/[0.08] p-2.5 flex flex-col items-center text-center gap-1.5"
              >
                <div className="relative h-10 w-10 flex items-center justify-center">
                  <svg className="h-10 w-10 -rotate-90" viewBox="0 0 40 40" aria-hidden="true">
                    <circle
                      cx="20"
                      cy="20"
                      r={radius}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      className="text-[#E2E8F0] dark:text-white/10"
                    />
                    <circle
                      cx="20"
                      cy="20"
                      r={radius}
                      fill="none"
                      stroke={m.color}
                      strokeWidth="3.5"
                      strokeDasharray={circumference}
                      strokeDashoffset={offset}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute font-mono text-[10px] font-bold tabular-nums text-[#0B1F3A] dark:text-[#F8FAFC]">
                    {m.done ? '✓' : `${m.pct}%`}
                  </span>
                </div>
                <p className="text-[11px] font-semibold text-[#0B1F3A] dark:text-[#F8FAFC] leading-tight">
                  {m.label}
                </p>
                <p className="font-mono text-[10px] text-[#475569] dark:text-[#94A3B8] tabular-nums">
                  {m.statusText}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-white/[0.08] p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-[#22C55E]" />
          <div>
            <h3 className="font-display text-base font-semibold text-[#0B1F3A] dark:text-[#F8FAFC]">
              Daily Trifecta Habit Loop ({completedCount}/3)
            </h3>
            <p className="text-xs text-[#475569] dark:text-[#94A3B8]">
              Complete all 3 milestones today to claim +150 Season XP &amp; lock your streak shield.
            </p>
          </div>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F97316]/12 border border-[#F97316]/30 text-[#EA580C] dark:text-[#F97316] font-mono text-xs font-bold tabular-nums">
          <Flame className="w-3.5 h-3.5 fill-current" />
          {streakDays} Day Streak Protected
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {milestones.map((m) => (
          <div
            key={m.id}
            className="rounded-xl bg-[#F4F8FF] dark:bg-[#162033] border border-[#E2E8F0] dark:border-white/[0.08] p-3.5 space-y-2"
          >
            <div className="flex items-center justify-between gap-2 text-xs font-semibold">
              <span className="inline-flex items-center gap-1.5 text-[#0B1F3A] dark:text-[#F8FAFC]">
                <CheckCircle2
                  className={`w-4 h-4 ${m.done ? 'text-[#22C55E]' : 'text-[#94A3B8]'}`}
                />
                {m.label}
              </span>
              <span className="font-mono tabular-nums text-[#475569] dark:text-[#94A3B8]">
                {m.statusText}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-[#E2E8F0] dark:bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${m.pct}%`, backgroundColor: m.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
