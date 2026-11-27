import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Command,
  Maximize2,
  Menu,
  Sparkles,
  UserCircle2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { ThemeToggle } from './ThemeToggle';
import { ALL_APP_ROUTES, isRouteActive } from '../utils/navigation';
import { useAuth } from '../context/AuthContext';
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

export function Navbar({ onOpenSidebar, hideSidebarToggle = false }: NavbarProps) {
  const location = useLocation();
  const { firebaseUser, profile, openOnboardingModal } = useAuth();
  const { setCommandPaletteOpen, setZenMode, setCopilotOpen } = usePrepskm2();
  const [soundOn, setSoundOn] = useState<boolean>(() => isSoundEnabled());

  const avatarSrc = profile?.photoURL || firebaseUser?.photoURL || '';
  const displayFirstName =
    profile?.displayName?.trim().split(' ')[0] ||
    firebaseUser?.displayName?.split(' ')[0] ||
    'Profile';

  const currentRouteMeta =
    ALL_APP_ROUTES.find((r) => isRouteActive(location.pathname, r.path)) ?? ALL_APP_ROUTES[0];

  const handleToggleSound = () => {
    const next = !soundOn;
    setSoundEnabled(next);
    setSoundOn(next);
    if (next) playToggle(true);
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#09090B]/95 backdrop-blur-md border-b border-slate-200/90 dark:border-white/[0.08]">
      <div className="w-full max-w-[1440px] mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-3">
        {/* Left Zone */}
        <div className="flex items-center gap-3 min-w-0">
          {!hideSidebarToggle && onOpenSidebar && (
            <button
              type="button"
              onClick={() => {
                playClick();
                onOpenSidebar();
              }}
              aria-label="Open workspace navigation"
              className="lg:hidden inline-flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 dark:border-white/[0.10] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <Link
            to="/"
            onClick={() => playNav()}
            aria-label="PREPSKM.IN Home"
            className="lg:hidden inline-flex items-center whitespace-nowrap shrink-0 focus-visible:rounded-xl"
          >
            <BrandLogo variant="navbar" />
          </Link>

          <div className="hidden lg:flex items-center gap-3 min-w-0">
            <span className="font-display text-base font-bold text-[#0B1B3B] dark:text-white shrink-0 whitespace-nowrap">
              {currentRouteMeta.label}
            </span>
            <span aria-hidden="true" className="text-slate-300 dark:text-white/20 shrink-0">
              ·
            </span>
            <span className="text-sm text-slate-500 dark:text-slate-400 truncate min-w-0">
              {currentRouteMeta.shortDescription}
            </span>
          </div>
        </div>

        {/* Right Zone: Cmd+K, Zen Mode, Preps AI Copilot, Sound, Theme, Profile */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              playClick();
              setCommandPaletteOpen(true);
            }}
            aria-label="Open global command palette"
            className="hidden md:inline-flex items-center gap-1.5 h-9 px-2.5 rounded-xl border border-slate-200 dark:border-white/[0.10] bg-slate-50 dark:bg-[#111114] text-xs font-semibold text-slate-600 dark:text-slate-300 hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors whitespace-nowrap shrink-0"
          >
            <Command className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
            <kbd className="font-mono text-[10px]">⌘K</kbd>
          </button>

          <button
            type="button"
            onClick={() => {
              playClick();
              setZenMode(true);
            }}
            aria-label="Enter 1-click Zen Study Mode"
            title="1-Click Zen Study Mode"
            className="hidden sm:inline-flex items-center gap-1.5 h-9 px-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-semibold hover:bg-emerald-500/20 transition-colors whitespace-nowrap shrink-0"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Zen</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playClick();
              setCopilotOpen(true);
            }}
            className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-semibold border border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/20 transition-colors whitespace-nowrap shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Copilot</span>
          </button>

          <button
            type="button"
            onClick={handleToggleSound}
            aria-label={soundOn ? 'Mute UI sound effects' : 'Enable UI sound effects'}
            title={soundOn ? 'Sound effects on' : 'Sound effects muted'}
            className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 dark:border-white/[0.10] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors shrink-0"
          >
            {soundOn ? (
              <Volume2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
          </button>

          <ThemeToggle />

          {!firebaseUser && (
            <button
              type="button"
              onClick={() => {
                playClick();
                openOnboardingModal();
              }}
              className="hidden xl:inline-flex items-center justify-center h-9 px-3 text-xs font-semibold rounded-xl border border-slate-200 dark:border-white/[0.10] text-slate-700 dark:text-slate-200 hover:border-indigo-500 transition-colors whitespace-nowrap shrink-0"
            >
              Sign In
            </button>
          )}

          <Link
            to="/profile"
            onClick={() => playNav()}
            aria-label="Student Profile"
            className={`inline-flex items-center justify-center gap-1.5 h-9 px-2.5 sm:px-3.5 text-xs sm:text-sm font-semibold rounded-xl border transition-colors duration-150 whitespace-nowrap shrink-0 ${
              isRouteActive(location.pathname, '/profile')
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-[#0B1B3B] hover:bg-[#142B59] text-white border-[#0B1B3B] dark:bg-indigo-600 dark:text-white dark:border-indigo-500 dark:hover:bg-indigo-500'
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
            <span className="hidden sm:inline max-w-[104px] truncate">{displayFirstName}</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
