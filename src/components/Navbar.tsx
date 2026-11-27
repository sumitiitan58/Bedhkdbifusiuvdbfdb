import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Command,
  Flame,
  Maximize2,
  Menu,
  Palette,
  Search,
  Sparkles,
  UserCircle2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { ThemeToggle } from './ThemeToggle';
import { BACKDROP_THEMES } from '../context/ThemeProvider';
import { useTheme } from '../hooks/useTheme';
import { isRouteActive } from '../utils/navigation';
import { useAuth } from '../context/AuthContext';
import { usePlatformData } from '../context/PlatformDataContext';
import { usePrepskm2 } from '../context/Prepskm2Context';
import {
  isSoundEnabled,
  playClick,
  playNav,
  playToggle,
  setSoundEnabled,
} from '../utils/soundEffects';

interface NavbarProps {
  onOpenSidebar?: () => void;
  hideSidebarToggle?: boolean;
}

type ExamTrackPillId = 'jee' | 'neet' | 'boards';

const EXAM_TRACK_PILLS: Array<{ id: ExamTrackPillId; label: string; shortLabel: string }> = [
  { id: 'jee', label: 'JEE Main/Adv', shortLabel: 'JEE' },
  { id: 'neet', label: 'NEET UG', shortLabel: 'NEET' },
  { id: 'boards', label: 'Class 9–12', shortLabel: '9–12' },
];

function inferTrackFromCohort(cohortId: string, label: string): ExamTrackPillId {
  const combined = `${cohortId} ${label}`.toLowerCase();
  if (combined.includes('neet')) return 'neet';
  if (combined.includes('jee')) return 'jee';
  return 'boards';
}

function useAnimatedCounter(target: number, durationMs = 420): number {
  const [display, setDisplay] = useState(target);
  const prevRef = useRef(target);

  useEffect(() => {
    const startVal = prevRef.current;
    if (startVal === target) return;
    const startTime = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - startTime) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(startVal + (target - startVal) * eased));
      if (t < 1) {
        rafId = window.requestAnimationFrame(tick);
      } else {
        prevRef.current = target;
      }
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [target, durationMs]);

  return display;
}

export function Navbar({ onOpenSidebar, hideSidebarToggle = false }: NavbarProps) {
  const location = useLocation();
  const { firebaseUser, profile, cohortId, selectCohort } = useAuth();
  const { allCohorts, activeStudyDates } = usePlatformData();
  const { progression, levelProgress, setCommandPaletteOpen, setZenMode, sidebarCollapsed } = usePrepskm2();
  const { backdropTheme, cycleBackdropTheme } = useTheme();
  const [soundOn, setSoundOn] = useState<boolean>(() => isSoundEnabled());
  const currentBackdropMeta =
    BACKDROP_THEMES.find((t) => t.id === backdropTheme) ?? BACKDROP_THEMES[0];

  const avatarSrc = profile?.photoURL || firebaseUser?.photoURL || '';
  const displayFirstName =
    profile?.displayName?.trim().split(' ')[0] ||
    firebaseUser?.displayName?.split(' ')[0] ||
    'Profile';

  const currentCohort = useMemo(
    () => allCohorts.find((c) => c.id === cohortId) ?? allCohorts[0],
    [allCohorts, cohortId]
  );

  const activeTrack = useMemo(
    () => inferTrackFromCohort(cohortId, currentCohort?.label ?? ''),
    [cohortId, currentCohort?.label]
  );

  const animatedXp = useAnimatedCounter(progression.seasonXp);
  const streakDays = Math.max(4, activeStudyDates.length);

  const handleTrackSwitch = (trackId: ExamTrackPillId) => {
    playClick();
    let match = allCohorts.find((c) => {
      const hay = `${c.id} ${c.label} ${c.stream}`.toLowerCase();
      if (trackId === 'jee') return hay.includes('12') && hay.includes('jee');
      if (trackId === 'neet') return hay.includes('12') && hay.includes('neet');
      return hay.includes('board') || hay.includes('class 10') || hay.includes('foundation');
    });
    if (!match) {
      match = allCohorts.find((c) => {
        const hay = `${c.id} ${c.label}`.toLowerCase();
        if (trackId === 'jee') return hay.includes('jee');
        if (trackId === 'neet') return hay.includes('neet');
        return !hay.includes('jee') && !hay.includes('neet');
      });
    }
    if (match) {
      void selectCohort(match.id);
    }
  };

  const handleToggleSound = () => {
    const next = !soundOn;
    setSoundEnabled(next);
    setSoundOn(next);
    if (next) playToggle(true);
  };

  return (
    <header className="sticky top-0 z-30 backdrop-blur-2xl bg-white/70 dark:bg-[#070A12]/65 border-b border-white/60 dark:border-[#00B4FF]/15 shadow-[0_6px_24px_-12px_rgba(14,35,78,0.16)]">
      <div className="w-full max-w-[1440px] mx-auto px-2.5 sm:px-4 md:px-6 h-16 flex items-center justify-between gap-2 sm:gap-3">
        {/* Left: Sidebar trigger, Logo (mobile/collapsed) + Exam Track Sliding Pill Switcher */}
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          {!hideSidebarToggle && onOpenSidebar && (
            <button
              type="button"
              onClick={() => {
                playClick();
                onOpenSidebar();
              }}
              aria-label="Open workspace navigation"
              className="lg:hidden inline-flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors shrink-0"
            >
              <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}

          <Link
            to="/"
            onClick={() => playNav()}
            aria-label="PREPSKM.IN Home"
            className={`${
              sidebarCollapsed ? 'inline-flex' : 'inline-flex lg:hidden'
            } items-center whitespace-nowrap shrink-0 focus-visible:rounded-xl`}
          >
            <BrandLogo variant="navbar" />
          </Link>

          {/* Exam Track Pill Switcher with Framer Motion layoutId="activeTrack" */}
          <div
            role="tablist"
            aria-label="Exam track switcher"
            className="hidden sm:inline-flex items-center p-1 rounded-xl bg-slate-100/90 dark:bg-[#0D1324] border border-slate-200/80 dark:border-[#00B4FF]/20 shrink-0"
          >
            {EXAM_TRACK_PILLS.map((pill) => {
              const isSelected = activeTrack === pill.id;
              return (
                <button
                  key={pill.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => handleTrackSwitch(pill.id)}
                  className={`relative px-2.5 md:px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                    isSelected
                      ? 'text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {isSelected && (
                    <motion.span
                      layoutId="activeTrack"
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                      className="absolute inset-0 rounded-lg bg-[#0E234E] dark:bg-[#1D56C6] border border-[#00B4FF]/40 shadow-[0_0_16px_rgba(0,180,255,0.28)]"
                    />
                  )}
                  <span className="relative z-10 hidden xl:inline">{pill.label}</span>
                  <span className="relative z-10 xl:hidden">{pill.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Center: Global Command Palette Trigger (⌘K / Ctrl+K) */}
        <button
          type="button"
          onClick={() => {
            playClick();
            setCommandPaletteOpen(true);
          }}
          aria-label="Open global command palette"
          className="hidden lg:flex items-center justify-between gap-2 flex-1 min-w-[170px] max-w-[270px] xl:max-w-[330px] h-9 px-3 rounded-xl border border-slate-200/90 dark:border-[#00B4FF]/20 bg-slate-50/90 dark:bg-[#0D1324] text-xs text-slate-500 dark:text-slate-400 hover:border-[#00B4FF]/60 hover:text-slate-900 dark:hover:text-white transition-all"
        >
          <span className="inline-flex items-center gap-2 min-w-0">
            <Search className="w-3.5 h-3.5 text-[#00B4FF] shrink-0" />
            <span className="truncate">Search chapters, games, mocks</span>
          </span>
          <kbd className="inline-flex items-center gap-0.5 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-white dark:bg-[#070A12] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-[#00B4FF] shrink-0">
            <Command className="w-2.5 h-2.5" />K
          </kbd>
        </button>

        {/* Right: Streak Flame, Season XP CountUp, Zen Toggle, Sound, Theme, Profile */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Tablet Cmd+K icon */}
          <button
            type="button"
            onClick={() => {
              playClick();
              setCommandPaletteOpen(true);
            }}
            aria-label="Open command palette"
            className="hidden sm:inline-flex lg:hidden items-center justify-center h-9 w-9 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0D1324] text-[#00B4FF] shrink-0"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Live Streak Flame */}
          <div
            title={`${streakDays}-day study streak`}
            className="inline-flex items-center gap-1 h-8 sm:h-9 px-2 sm:px-2.5 rounded-xl border border-[#F27B13]/30 bg-[#F27B13]/10 text-[#F27B13] font-mono text-xs font-bold tabular-nums shrink-0"
          >
            <Flame className="w-3.5 h-3.5 fill-[#F27B13]" />
            <span>{streakDays}d</span>
          </div>

          {/* Season XP & Level Animated Counter */}
          <Link
            to="/arena"
            onClick={() => playNav()}
            title={`Level ${levelProgress.level} (${levelProgress.currentLevelXp}/${levelProgress.nextLevelXp} XP) — click to open Prepskm Arena`}
            className="hidden sm:inline-flex items-center gap-1.5 h-9 px-2.5 rounded-xl border border-[#00B4FF]/25 bg-[#00B4FF]/10 text-[#1D56C6] dark:text-[#00B4FF] font-mono text-xs font-bold tabular-nums hover:border-[#00B4FF]/60 transition-colors whitespace-nowrap shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#F27B13] shrink-0" />
            <span className="hidden xl:inline text-amber-300">L{levelProgress.level}</span>
            <span>{animatedXp.toLocaleString('en-IN')} XP</span>
          </Link>

          {/* 1-Click Zen Mode Toggle */}
          <button
            type="button"
            onClick={() => {
              playClick();
              setZenMode(true);
            }}
            aria-label="Enter 1-click Zen Study Mode"
            title="1-Click Zen Study Mode"
            className="hidden md:inline-flex items-center gap-1.5 h-9 px-2.5 rounded-xl border border-[#10B981]/30 bg-[#10B981]/10 text-[#10B981] text-xs font-semibold hover:bg-[#10B981]/20 transition-colors whitespace-nowrap shrink-0"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Zen</span>
          </button>

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={handleToggleSound}
            aria-label={soundOn ? 'Mute UI sound effects' : 'Enable UI sound effects'}
            title={soundOn ? 'Sound effects on' : 'Sound effects muted'}
            className="hidden sm:inline-flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors shrink-0"
          >
            {soundOn ? (
              <Volume2 className="w-4 h-4 text-[#00B4FF]" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
          </button>

          {/* Dynamic Colorful Background Theme Switcher */}
          <button
            type="button"
            data-testid="backdrop-theme-toggle"
            onClick={() => {
              playClick();
              cycleBackdropTheme();
            }}
            aria-label={`Switch background theme (current: ${currentBackdropMeta.label})`}
            title={`Backdrop Theme: ${currentBackdropMeta.label} — click to switch`}
            className="inline-flex items-center justify-center gap-1.5 h-8 sm:h-9 px-2 rounded-xl border border-slate-200/90 dark:border-white/15 bg-white/70 dark:bg-[#0D1324]/75 text-slate-700 dark:text-slate-200 hover:border-[#00B4FF]/60 transition-colors shrink-0"
          >
            <span
              className="w-3.5 h-3.5 rounded-full shrink-0 ring-1 ring-white/60"
              style={{ background: currentBackdropMeta.swatch }}
            />
            <Palette className="w-3.5 h-3.5 text-[#00B4FF] hidden sm:inline" />
          </button>

          <ThemeToggle />

          <Link
            to="/profile"
            onClick={() => playNav()}
            aria-label="Student Profile"
            className={`inline-flex items-center justify-center gap-1.5 h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm font-semibold rounded-xl border transition-colors duration-150 whitespace-nowrap shrink-0 ${
              isRouteActive(location.pathname, '/profile')
                ? 'bg-[#00B4FF] text-[#070A12] border-[#00B4FF]'
                : 'bg-[#0E234E] hover:bg-[#1D56C6] text-white border-[#00B4FF]/30'
            }`}
          >
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt={profile?.displayName ?? 'Profile'}
                referrerPolicy="no-referrer"
                className="w-5 h-5 rounded-full object-cover shrink-0 border border-white/40"
              />
            ) : (
              <UserCircle2 className="w-4 h-4 shrink-0" />
            )}
            <span className="hidden xl:inline max-w-[92px] truncate">{displayFirstName}</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
