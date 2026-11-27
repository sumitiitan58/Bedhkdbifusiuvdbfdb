import { useEffect, useState } from 'react';
import { CheckCircle2, Flame, Trophy, Users, Zap } from 'lucide-react';
import { useExam } from '../../context/ExamContext';
import { playClick, playSuccess } from '../../utils/soundEffects';

function getNextSundaySlotDelta(): { days: number; hours: number; minutes: number; seconds: number; slotLabel: string } {
  const now = new Date();
  const target = new Date(now);
  const day = now.getDay(); // 0 = Sunday
  let daysUntilSunday = (7 - day) % 7;

  // Pick 9:00 AM slot or 2:00 PM slot on Sunday
  if (daysUntilSunday === 0) {
    if (now.getHours() < 9) {
      target.setHours(9, 0, 0, 0);
    } else if (now.getHours() < 14) {
      target.setHours(14, 0, 0, 0);
    } else {
      daysUntilSunday = 7;
      target.setDate(now.getDate() + 7);
      target.setHours(9, 0, 0, 0);
    }
  } else {
    target.setDate(now.getDate() + daysUntilSunday);
    target.setHours(9, 0, 0, 0);
  }

  const diffMs = Math.max(0, target.getTime() - now.getTime());
  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const slotLabel = target.getHours() === 14 ? 'Sunday 2:00 PM IST' : 'Sunday 9:00 AM IST';

  return { days, hours, minutes, seconds, slotLabel };
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function SundayBlitzCard() {
  const {
    sundayBlitzRegistered,
    sundayBlitzTrack,
    setSundayBlitzTrack,
    toggleSundayBlitzRegistration,
  } = useExam();

  const [countdown, setCountdown] = useState(getNextSundaySlotDelta);

  useEffect(() => {
    const id = window.setInterval(() => {
      setCountdown(getNextSundaySlotDelta());
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const registeredCount = (sundayBlitzTrack === 'jee' ? 14820 : 19340) + (sundayBlitzRegistered ? 1 : 0);

  return (
    <div className="rounded-2xl bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-white/[0.08] p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
      <div className="space-y-2.5 min-w-0">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span className="inline-flex items-center gap-1.5 text-[#EA580C] dark:text-[#F97316]">
            <Flame className="w-4 h-4" />
            Sunday All-India Blitz
          </span>
          <span className="text-[#94A3B8]" aria-hidden="true">·</span>
          <span className="text-[#475569] dark:text-[#94A3B8]">{countdown.slotLabel}</span>
          <span className="text-[#94A3B8]" aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1 font-mono tabular-nums text-[#0284C7] dark:text-[#06B6D4]">
            <Users className="w-3.5 h-3.5" />
            {registeredCount.toLocaleString('en-IN')} registered
          </span>
        </div>

        <h3 className="font-display text-lg sm:text-xl font-bold text-[#0B1F3A] dark:text-[#F8FAFC] leading-snug">
          All-India Live Mock Rank Battle — Compete for +1,200 Season XP &amp; Top 100 Badges
        </h3>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          {/* Track Selector */}
          <div
            role="tablist"
            aria-label="Sunday Blitz exam track"
            className="inline-flex items-center p-0.5 rounded-full bg-[#EEF4FF] dark:bg-[#162033] border border-[#E2E8F0] dark:border-white/[0.08]"
          >
            <button
              type="button"
              role="tab"
              aria-selected={sundayBlitzTrack === 'jee'}
              onClick={() => {
                playClick();
                setSundayBlitzTrack('jee');
              }}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                sundayBlitzTrack === 'jee'
                  ? 'bg-[#0284C7] dark:bg-[#06B6D4] text-white dark:text-[#070B14]'
                  : 'text-[#475569] dark:text-[#94A3B8] hover:text-[#0B1F3A] dark:hover:text-white'
              }`}
            >
              JEE Main Blitz
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={sundayBlitzTrack === 'neet'}
              onClick={() => {
                playClick();
                setSundayBlitzTrack('neet');
              }}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                sundayBlitzTrack === 'neet'
                  ? 'bg-[#0284C7] dark:bg-[#06B6D4] text-white dark:text-[#070B14]'
                  : 'text-[#475569] dark:text-[#94A3B8] hover:text-[#0B1F3A] dark:hover:text-white'
              }`}
            >
              NEET UG Blitz
            </button>
          </div>

          <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-[#15803D] dark:text-[#22C55E]">
            <Trophy className="w-3.5 h-3.5" />
            Pool: 50,000 XP + Free 1:1 Mentor Passes
          </span>
        </div>
      </div>

      {/* Right: JetBrains Mono Live Countdown + 1-Click Register Free Toggle */}
      <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-stretch sm:items-center gap-4 shrink-0">
        <div
          aria-label="Countdown to Sunday Blitz"
          className="grid grid-cols-4 gap-2 text-center bg-[#F4F8FF] dark:bg-[#162033] border border-[#E2E8F0] dark:border-white/[0.08] rounded-xl px-3.5 py-2.5"
        >
          {[
            { label: 'Days', val: pad2(countdown.days) },
            { label: 'Hrs', val: pad2(countdown.hours) },
            { label: 'Min', val: pad2(countdown.minutes) },
            { label: 'Sec', val: pad2(countdown.seconds) },
          ].map((unit) => (
            <div key={unit.label} className="min-w-[42px]">
              <p className="font-mono text-base sm:text-lg font-bold tabular-nums text-[#0B1F3A] dark:text-[#F8FAFC] leading-none">
                {unit.val}
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] mt-1">
                {unit.label}
              </p>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => {
            if (!sundayBlitzRegistered) playSuccess();
            else playClick();
            toggleSundayBlitzRegistration();
          }}
          className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap shrink-0 ${
            sundayBlitzRegistered
              ? 'bg-[#22C55E]/15 text-[#15803D] dark:text-[#22C55E] border border-[#22C55E]/40 hover:bg-[#22C55E]/25'
              : 'bg-[#F97316] hover:bg-[#FB923C] text-white'
          }`}
        >
          {sundayBlitzRegistered ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Registered Free
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              Register Free
            </>
          )}
        </button>
      </div>
    </div>
  );
}
