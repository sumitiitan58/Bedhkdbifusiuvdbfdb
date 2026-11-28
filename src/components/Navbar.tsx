import { Link, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Command,
  Maximize2,
  Menu,
  Search,
  UserCircle2,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { PUBLIC_NAV_ROUTES, isRouteActive } from '../utils/navigation';
import { useAuth } from '../context/AuthContext';
import { usePrepskm2 } from '../context/Prepskm2Context';
import { useLanguage } from '../context/LanguageContext';
import { playClick, playNav } from '../utils/soundEffects';

interface NavbarProps {
  onOpenSidebar?: () => void;
  hideSidebarToggle?: boolean;
}

const NAV_LANG_KEYS: Record<string, string> = {
  '/': 'nav.home',
  '/materials': 'nav.materials',
  '/dpp': 'nav.dpp',
  '/cbt-mocks': 'nav.mocks',
  '/arena': 'nav.arena',
};

export function Navbar({ onOpenSidebar, hideSidebarToggle = false }: NavbarProps) {
  const location = useLocation();
  const { firebaseUser, profile, isGuest, openOnboardingModal } = useAuth();
  const { progression, setCommandPaletteOpen, setZenMode } = usePrepskm2();
  const { t } = useLanguage();

  const avatarSrc = profile?.photoURL || firebaseUser?.photoURL || '';
  const rawDisplayName = profile?.displayName?.trim() || firebaseUser?.displayName?.trim() || '';
  const hasCustomName =
    Boolean(rawDisplayName) && rawDisplayName.toLowerCase() !== 'prepskm student';
  const displayFirstName = rawDisplayName ? rawDisplayName.split(' ')[0] : 'Profile';

  return (
    <header
      data-testid="top-navbar"
      className="sticky top-0 z-30 h-16 bg-[#060A14]/82 backdrop-blur-xl border-b border-slate-400/[0.14]"
    >
      <div className="w-full max-w-[1440px] mx-auto px-3 sm:px-5 md:px-6 h-full flex items-center justify-between gap-3">
        {/* Left: Mobile Drawer Trigger + Brand Logo */}
        <div className="flex items-center gap-2 shrink-0">
          {!hideSidebarToggle && onOpenSidebar && (
            <button
              type="button"
              onClick={() => {
                playClick();
                onOpenSidebar();
              }}
              aria-label="Open navigation menu"
              className="lg:hidden inline-flex items-center justify-center h-9 w-9 rounded-xl border border-slate-400/20 text-[#F8FAFC] hover:bg-white/[0.06] transition-colors shrink-0"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}

          <Link
            to="/"
            onClick={() => playNav()}
            aria-label="Prepskm Home"
            className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 focus-visible:rounded-xl"
          >
            <BrandLogo variant="navbar" />
          </Link>
        </div>

        {/* Center: Clean Streamlined Navigation Links (Desktop) */}
        <nav
          aria-label="Primary student navigation"
          className="hidden xl:flex items-center gap-1 p-1 rounded-full bg-[#0B1120]/90 border border-slate-400/[0.14] shrink-0"
        >
          {PUBLIC_NAV_ROUTES.map((item) => {
            const active = isRouteActive(location.pathname, item.path);
            const label = t(NAV_LANG_KEYS[item.path] ?? '', item.label);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => playNav()}
                aria-current={active ? 'page' : undefined}
                className={`relative px-4 py-1.5 rounded-full text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'text-white'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="topNavActivePill"
                    transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                    className="absolute inset-0 rounded-full bg-gradient-to-r from-[#2563EB] to-[#00D4FF]/80 shadow-[0_0_20px_rgba(0,212,255,0.35)]"
                  />
                )}
                <span className="relative z-10">{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right: Search + Zen + Vibrant Prep Orange Start Free CTA */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              playClick();
              setCommandPaletteOpen(true);
            }}
            aria-label="Open global search command palette"
            title="Search chapters, PYQs, mocks (⌘K)"
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-slate-400/[0.14] bg-[#0B1120]/85 text-xs font-semibold text-[#94A3B8] hover:border-[#00D4FF]/50 hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            <Search className="w-3.5 h-3.5 text-[#00D4FF] shrink-0" />
            <kbd className="hidden md:inline-flex items-center gap-0.5 font-mono text-[10px] font-bold text-[#94A3B8]">
              <Command className="w-2.5 h-2.5" />K
            </kbd>
          </button>

          <button
            type="button"
            onClick={() => {
              playClick();
              setZenMode(true);
            }}
            aria-label="Toggle Zen Focus Mode"
            title="Zen Focus Mode"
            className="hidden md:inline-flex items-center gap-1.5 h-9 px-2.5 rounded-xl border border-[#00D4FF]/25 bg-[#00D4FF]/10 text-[#00D4FF] text-xs font-bold hover:bg-[#00D4FF]/20 transition-colors whitespace-nowrap shrink-0"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>{t('top.zen', 'Zen')}</span>
          </button>

          {firebaseUser || hasCustomName ? (
            <Link
              to="/profile"
              onClick={() => playNav()}
              data-testid="navbar-user-pill"
              aria-label="Student Profile and Season XP"
              className="inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-[#FF7A00] hover:bg-[#F97316] text-white text-xs font-bold transition-all whitespace-nowrap shrink-0 shadow-[0_8px_22px_-6px_rgba(255,122,0,0.55)]"
            >
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={profile?.displayName ?? 'Profile'}
                  referrerPolicy="no-referrer"
                  className="w-5 h-5 rounded-full object-cover shrink-0"
                />
              ) : (
                <UserCircle2 className="w-4 h-4 text-white shrink-0" />
              )}
              <span className="max-w-[96px] truncate">{displayFirstName}</span>
              <span className="font-mono text-[11px] font-bold tabular-nums text-white/90">
                {progression.seasonXp.toLocaleString('en-IN')} XP
              </span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => {
                playClick();
                openOnboardingModal();
              }}
              data-testid="navbar-user-pill"
              aria-label="Start Free on Prepskm"
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-[#FF7A00] hover:bg-[#F97316] text-xs sm:text-sm font-bold text-white transition-all whitespace-nowrap shrink-0 shadow-[0_8px_24px_-6px_rgba(255,122,0,0.6)]"
            >
              <span>{isGuest ? 'Start Free →' : t('top.signIn', 'Start Free →')}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
