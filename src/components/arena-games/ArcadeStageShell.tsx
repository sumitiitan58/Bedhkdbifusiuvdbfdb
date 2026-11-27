import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { Flame, Sparkles, Trophy, AlertTriangle } from 'lucide-react';

export interface FloatingXpBurst {
  id: number;
  label: string;
}

export function getComboMultiplier(combo: number): number {
  if (combo >= 5) return 5;
  if (combo >= 3) return 3;
  if (combo >= 2) return 2;
  return 1;
}

export function getCountdownTone(timeLeft: number): 'safe' | 'warn' | 'danger' {
  if (timeLeft <= 10) return 'danger';
  if (timeLeft <= 20) return 'warn';
  return 'safe';
}

export function triggerComboConfetti(combo: number): void {
  if (combo < 3 || typeof window === 'undefined') return;
  try {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    void confetti({
      particleCount: combo >= 5 ? 65 : 36,
      spread: 62,
      origin: { y: 0.65 },
      colors: ['#00B4FF', '#F27B13', '#10B981', '#FFFFFF'],
      disableForReducedMotion: true,
    });
  } catch {
    // ignore in headless / restricted canvas environments
  }
}

interface ArcadeStageShellProps {
  badge: string;
  title: string;
  subtitle?: string;
  timeLeft: number;
  totalTime: number;
  combo: number;
  score: number;
  elo: number;
  headerRightExtra?: ReactNode;
  xpBurst: FloatingXpBurst | null;
  rippleKey: number;
  shakeKey: number;
  wrongFeedback: string | null;
  children: ReactNode;
}

export function ArcadeStageShell({
  badge,
  title,
  subtitle,
  timeLeft,
  totalTime,
  combo,
  score,
  elo,
  headerRightExtra,
  xpBurst,
  rippleKey,
  shakeKey,
  wrongFeedback,
  children,
}: ArcadeStageShellProps) {
  const multiplier = getComboMultiplier(combo);
  const hotCombo = combo >= 3;
  const pct = Math.max(0, Math.min(100, (timeLeft / Math.max(1, totalTime)) * 100));
  const tone = getCountdownTone(timeLeft);

  const barColorClass =
    tone === 'danger'
      ? 'bg-[#F43F5E] shadow-[0_0_16px_rgba(244,63,94,0.85)] animate-pulse'
      : tone === 'warn'
        ? 'bg-[#F27B13] shadow-[0_0_14px_rgba(242,123,19,0.7)]'
        : 'bg-[#00B4FF] shadow-[0_0_14px_rgba(0,180,255,0.7)]';

  return (
    <div
      key={`stage-shake-${shakeKey}`}
      className={`relative rounded-2xl bg-white dark:bg-[#0D1324] border transition-all duration-200 overflow-hidden ${
        shakeKey > 0 ? 'arcade-shake' : ''
      } ${
        hotCombo
          ? 'border-[#F27B13] combo-aura-pulse'
          : 'border-slate-200/90 dark:border-[#00B4FF]/20 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
      }`}
    >
      {/* Emerald Shockwave Ripple on Correct Hit */}
      <AnimatePresence>
        {rippleKey > 0 && (
          <motion.span
            key={`ripple-${rippleKey}`}
            initial={{ opacity: 0.55, scale: 0.55 }}
            animate={{ opacity: 0, scale: 1.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 m-auto w-56 h-56 rounded-full border-4 border-[#10B981]/60 bg-[#10B981]/10 z-20"
          />
        )}
      </AnimatePresence>

      {/* Brief Danger Rose Border Flash on Wrong Hit */}
      <AnimatePresence>
        {shakeKey > 0 && (
          <motion.div
            key={`danger-flash-${shakeKey}`}
            initial={{ opacity: 0.75 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.36 }}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-inset ring-[#F43F5E] bg-[#F43F5E]/10 z-20"
          />
        )}
      </AnimatePresence>

      {/* Floating +XP Burst Text */}
      <AnimatePresence>
        {xpBurst && (
          <motion.div
            key={`xp-${xpBurst.id}`}
            initial={{ opacity: 1, y: 0, scale: 0.92 }}
            animate={{ opacity: 0, y: -32, scale: 1.08 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            aria-live="polite"
            className="pointer-events-none absolute top-16 right-6 z-30 px-2.5 py-1 rounded-lg bg-[#10B981] text-[#070A12] font-mono text-xs font-extrabold shadow-[0_0_18px_rgba(16,185,129,0.75)]"
          >
            {xpBurst.label}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6px Neon Countdown Progress Bar */}
      <div className="h-[6px] w-full bg-slate-200 dark:bg-[#070A12] overflow-hidden">
        <div
          className={`h-full transition-[width,background-color] duration-500 ease-linear ${barColorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Shared Arcade HUD Header */}
      <div className="px-5 py-4 border-b border-slate-100 dark:border-white/10 bg-slate-50/70 dark:bg-[#070A12]/60 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#1D56C6] dark:text-[#00B4FF] truncate">
            {badge}
          </p>
          <h2 className="font-display text-lg sm:text-xl font-extrabold text-[#0E234E] dark:text-white leading-tight truncate">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 font-mono text-xs tabular-nums shrink-0">
          {/* Combo Fire Badge */}
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-extrabold border transition-all ${
              hotCombo
                ? 'bg-[#F27B13] text-[#070A12] border-[#F27B13] shadow-[0_0_16px_rgba(242,123,19,0.65)] scale-105'
                : combo >= 2
                  ? 'bg-[#F27B13]/15 text-[#F27B13] border-[#F27B13]/40'
                  : 'bg-slate-100 dark:bg-[#0D1324] text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            {multiplier}x
          </span>

          {/* Live Score */}
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#00B4FF]/10 border border-[#00B4FF]/30 text-[#1D56C6] dark:text-[#00B4FF] font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            {score}
          </span>

          {/* Elo Pill */}
          <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#10B981]/10 border border-[#10B981]/30 text-[#10B981] font-bold">
            <Trophy className="w-3.5 h-3.5" />
            {elo} Elo
          </span>

          {/* Timer Readout */}
          <span
            className={`px-2.5 py-1 rounded-lg font-extrabold border ${
              tone === 'danger'
                ? 'bg-[#F43F5E]/20 border-[#F43F5E] text-[#F43F5E]'
                : tone === 'warn'
                  ? 'bg-[#F27B13]/20 border-[#F27B13] text-[#F27B13]'
                  : 'bg-slate-100 dark:bg-[#0D1324] border-slate-200 dark:border-white/10 text-slate-800 dark:text-white'
            }`}
          >
            {timeLeft}s
          </span>

          {headerRightExtra}
        </div>
      </div>

      {/* Main Game Stage Body */}
      <div className="p-5 sm:p-6 space-y-5 relative">{children}</div>

      {/* Slide-Up 1-Line Micro-Explanation Card on Wrong Answer */}
      <AnimatePresence>
        {wrongFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 14 }}
            transition={{ duration: 0.22 }}
            className="mx-5 sm:mx-6 mb-5 px-4 py-3 rounded-xl bg-[#F43F5E]/15 border border-[#F43F5E]/40 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2.5"
          >
            <AlertTriangle className="w-4 h-4 text-[#F43F5E] shrink-0 mt-0.5" />
            <p className="leading-relaxed font-medium">{wrongFeedback}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
