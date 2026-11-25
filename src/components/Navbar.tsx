import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, Sparkles, UserCircle2, Volume2, VolumeX } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { ThemeToggle } from './ThemeToggle';
import { ALL_APP_ROUTES, isRouteActive } from '../utils/navigation';
import { useAuth } from '../context/AuthContext';
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
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#090E1A]/95 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800/90">
      <div className="w-full max-w-[1440px] mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-3">
        {/* Left Zone: Mobile Sidebar Drawer Toggle + Mobile Brand Logo OR Desktop Workspace Title */}
        <div className="flex items-center gap-3 min-w-0">
          {!hideSidebarToggle && onOpenSidebar && (
            <button
              type="button"
              onClick={() => {
                playClick();
                onOpenSidebar();
              }}
              aria-label="Open workspace navigation"
              className="lg:hidden inline-flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
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
            <span className="font-display text-base font-bold text-[#0B1B3B] dark:text-white truncate">
              {currentRouteMeta.label}
            </span>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
              ·
            </span>
            <span className="text-sm text-slate-500 dark:text-slate-400 truncate">
              {currentRouteMeta.shortDescription}
            </span>
          </div>
        </div>

        {/* Right Zone: Preps AI Quick Link, Sound Toggle, Theme Toggle, Profile */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/preps-ai"
            onClick={() => playNav()}
            className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-semibold border border-blue-200 dark:border-blue-800/70 bg-blue-50/70 dark:bg-blue-950/40 text-[#2563EB] dark:text-sky-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Ask Preps AI
          </Link>

          <button
            type="button"
            onClick={handleToggleSound}
            aria-label={soundOn ? 'Mute UI sound effects' : 'Enable UI sound effects'}
            title={soundOn ? 'Sound effects on' : 'Sound effects muted'}
            className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {soundOn ? (
              <Volume2 className="w-4 h-4 text-[#2563EB] dark:text-sky-400" />
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
              className="hidden md:inline-flex items-center justify-center h-9 px-3 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-[#2563EB] transition-colors"
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
                ? 'bg-[#2563EB] text-white border-[#2563EB]'
                : 'bg-[#0B1B3B] hover:bg-[#142B59] text-white border-[#0B1B3B] dark:bg-sky-500 dark:text-slate-950 dark:border-sky-500 dark:hover:bg-sky-400'
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
