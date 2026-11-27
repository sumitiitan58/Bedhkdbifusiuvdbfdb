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
import { ThemeToggle } from './ThemeToggle';
import { PUBLIC_NAV_ROUTES, isRouteActive } from '../utils/navigation';
import { useAuth } from '../context/AuthContext';
import { usePrepskm2 } from '../context/Prepskm2Context';
import { useLanguage } from '../context/LanguageContext';
import { useExam, type ExamTrackId } from '../context/ExamContext';
import { playClick, playNav } from '../utils/soundEffects';

interface NavbarProps {
  onOpenSidebar?: () => void;
  hideSidebarToggle?: boolean;
}

const NAV_LANG_KEYS: Record<string, string> = {
  '/': 'nav.home',
  '/learn': 'nav.learn',
  '/cbt-mocks': 'nav.mocks',
  '/community': 'nav.community',
  '/mentors': 'nav.mentors',
};

const TRACK_OPTIONS: Array<{ id: ExamTrackId; shortLabel: string; fullLabel: string }> = [
  { id: 'jee', shortLabel: 'JEE', fullLabel: 'JEE Main/Adv' },
  { id: 'neet', shortLabel: 'NEET', fullLabel: 'NEET UG' },
  { id: 'boards', shortLabel: '9–12', fullLabel: 'Class 9–12' },
];

export function Navbar({ onOpenSidebar, hideSidebarToggle = false }: NavbarProps) {
  const location = useLocation();
  const { firebaseUser, profile, isGuest, openOnboardingModal } = useAuth();
  const { progression, setCommandPaletteOpen, setZenMode } = usePrepskm2();
  const { lang, setLang, t } = useLanguage();
  const { examTrack, setExamTrack } = useExam();

  const avatarSrc = profile?.photoURL || firebaseUser?.photoURL || '';
  const displayFirstName =
    profile?.displayName?.trim().split(' ')[0] ||
    firebaseUser?.displayName?.split(' ')[0] ||
    'Profile';

  return (
    <header className="sticky top-0 z-30 h-16 bg-[#F4F8FF]/85 dark:bg-[#070B14]/80 backdrop-blur-xl border-b border-[#E2E8F0] dark:border-white/[0.08]">
      <div className="w-full max-w-[1440px] mx-auto px-3 sm:px-4 md:px-6 h-full flex items-center justify-between gap-2 sm:gap-3">
        {/* Left: Mobile Drawer Trigger + Prepskm Logo + 2.0 Cyan Badge */}
        <div className="flex items-center gap-2 shrink-0">
          {!hideSidebarToggle && onOpenSidebar && (
            <button
              type="button"
              onClick={() => {
                playClick();
                onOpenSidebar();
              }}
              aria-label="Open navigation menu"
              className="lg:hidden inline-flex items-center justify-center h-9 w-9 rounded-xl border border-[#E2E8F0] dark:border-white/10 text-[#0B1F3A] dark:text-[#F8FAFC] hover:bg-[#EEF4FF] dark:hover:bg-[#162033] transition-colors shrink-0"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}

          <Link
            to="/"
            onClick={() => playNav()}
            aria-label="Prepskm 2.0 Home"
            className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 focus-visible:rounded-xl"
          >
            <BrandLogo variant="navbar" />
            <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-[#06B6D4]/15 text-[#0284C7] dark:text-[#06B6D4] border border-[#06B6D4]/30 leading-none">
              2.0
            </span>
          </Link>
        </div>

        {/* Center: 5 Primary Spaces Horizontal Pill Nav + Highlighted Pricing Link (Desktop) */}
        <nav
          aria-label="Primary 5-space navigation"
          className="hidden xl:flex items-center gap-1 p-1 rounded-full bg-[#EEF4FF]/90 dark:bg-[#0F172A]/90 border border-[#E2E8F0] dark:border-white/[0.08] shrink-0"
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
                className={`relative px-3 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'text-[#070B14] dark:text-[#070B14]'
                    : 'text-[#475569] dark:text-[#94A3B8] hover:text-[#0B1F3A] dark:hover:text-[#F8FAFC]'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="topNavActivePill"
                    transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                    className="absolute inset-0 rounded-full bg-[#06B6D4]"
                  />
                )}
                <span className="relative z-10">{label}</span>
              </Link>
            );
          })}

          <Link
            to="/pricing"
            onClick={() => playNav()}
            aria-current={isRouteActive(location.pathname, '/pricing') ? 'page' : undefined}
            className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              isRouteActive(location.pathname, '/pricing')
                ? 'bg-[#F97316] text-white'
                : 'text-[#EA580C] dark:text-[#FB923C] hover:bg-[#F97316]/10'
            }`}
          >
            <span
              aria-hidden="true"
              className={`w-1.5 h-1.5 rounded-full ${
                isRouteActive(location.pathname, '/pricing') ? 'bg-white' : 'bg-[#F97316]'
              }`}
            />
            <span>{t('nav.pricing', 'Pricing')}</span>
          </Link>
        </nav>

        {/* Right Utility Cluster (Compact, gap-2) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* 1. Exam Track Pill Switcher */}
          <div
            role="tablist"
            aria-label="Exam track switcher"
            className="hidden sm:inline-flex items-center p-0.5 rounded-full bg-[#EEF4FF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-white/[0.08] shrink-0"
          >
            {TRACK_OPTIONS.map((opt) => {
              const active = examTrack === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  title={opt.fullLabel}
                  onClick={() => {
                    playClick();
                    setExamTrack(opt.id);
                  }}
                  className={`relative px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'text-white dark:text-[#070B14]'
                      : 'text-[#475569] dark:text-[#94A3B8] hover:text-[#0B1F3A] dark:hover:text-[#F8FAFC]'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="examTrackPill"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      className="absolute inset-0 rounded-full bg-[#0284C7] dark:bg-[#06B6D4]"
                    />
                  )}
                  <span className="relative z-10">{opt.shortLabel}</span>
                </button>
              );
            })}
          </div>

          {/* 2. Instant EN / हिं Language Toggle */}
          <div
            role="group"
            aria-label="Language toggle"
            className="inline-flex items-center p-0.5 rounded-full bg-[#EEF4FF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-white/[0.08] shrink-0"
          >
            <button
              type="button"
              onClick={() => {
                playClick();
                setLang('en');
              }}
              aria-pressed={lang === 'en'}
              className={`px-2 py-1 rounded-full text-[11px] font-bold transition-colors whitespace-nowrap ${
                lang === 'en'
                  ? 'bg-[#0B1F3A] text-white dark:bg-[#162033] dark:text-[#22D3EE]'
                  : 'text-[#475569] dark:text-[#94A3B8] hover:text-[#0B1F3A] dark:hover:text-white'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => {
                playClick();
                setLang('hi');
              }}
              aria-pressed={lang === 'hi'}
              className={`px-2 py-1 rounded-full text-[11px] font-bold transition-colors whitespace-nowrap ${
                lang === 'hi'
                  ? 'bg-[#F97316] text-white'
                  : 'text-[#475569] dark:text-[#94A3B8] hover:text-[#0B1F3A] dark:hover:text-white'
              }`}
            >
              हिं
            </button>
          </div>

          {/* 3. ⌘K Search Button */}
          <button
            type="button"
            onClick={() => {
              playClick();
              setCommandPaletteOpen(true);
            }}
            aria-label="Open global search command palette"
            title="Search chapters, PYQs, mocks, mentors (⌘K)"
            className="inline-flex items-center gap-1.5 h-9 px-2.5 rounded-xl border border-[#E2E8F0] dark:border-white/[0.08] bg-white dark:bg-[#0F172A] text-xs font-medium text-[#475569] dark:text-[#94A3B8] hover:border-[#06B6D4]/50 hover:text-[#0B1F3A] dark:hover:text-[#F8FAFC] transition-colors whitespace-nowrap shrink-0"
          >
            <Search className="w-3.5 h-3.5 text-[#0284C7] dark:text-[#06B6D4] shrink-0" />
            <kbd className="hidden md:inline-flex items-center gap-0.5 font-mono text-[10px] font-bold text-[#475569] dark:text-[#94A3B8]">
              <Command className="w-2.5 h-2.5" />K
            </kbd>
          </button>

          {/* 4. Theme & Zen Controls */}
          <ThemeToggle />

          <button
            type="button"
            onClick={() => {
              playClick();
              setZenMode(true);
            }}
            aria-label="Toggle Zen Focus Mode"
            title="Zen Focus Mode"
            className="hidden md:inline-flex items-center gap-1 h-9 px-2.5 rounded-xl border border-[#22C55E]/30 bg-[#22C55E]/10 text-[#15803D] dark:text-[#22C55E] text-xs font-semibold hover:bg-[#22C55E]/20 transition-colors whitespace-nowrap shrink-0"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>{t('top.zen', 'Zen')}</span>
          </button>

          {/* 5. User / Guest Pill */}
          {firebaseUser ? (
            <Link
              to="/profile"
              onClick={() => playNav()}
              aria-label="Student Profile and Season XP"
              className="inline-flex items-center gap-1.5 h-9 px-2.5 rounded-full border border-[#06B6D4]/30 bg-white dark:bg-[#0F172A] text-xs font-semibold text-[#0B1F3A] dark:text-[#F8FAFC] hover:border-[#06B6D4] transition-colors whitespace-nowrap shrink-0"
            >
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={profile?.displayName ?? 'Profile'}
                  referrerPolicy="no-referrer"
                  className="w-5 h-5 rounded-full object-cover shrink-0"
                />
              ) : (
                <UserCircle2 className="w-4 h-4 text-[#06B6D4] shrink-0" />
              )}
              <span className="hidden sm:inline max-w-[72px] truncate">{displayFirstName}</span>
              <span className="font-mono text-[11px] font-bold tabular-nums text-[#0284C7] dark:text-[#06B6D4]">
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
              aria-label="Guest Mode — click to Sign In"
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-[#E2E8F0] dark:border-white/10 bg-white dark:bg-[#0F172A] hover:border-[#06B6D4]/50 text-xs font-semibold text-[#0B1F3A] dark:text-[#F8FAFC] transition-colors whitespace-nowrap shrink-0"
            >
              <span className="hidden sm:inline text-[#475569] dark:text-[#94A3B8]">
                {isGuest ? t('top.guest', 'Guest') : 'Guest'}
              </span>
              <span className="text-[#0284C7] dark:text-[#06B6D4] font-bold">
                {t('top.signIn', 'Sign In')}
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
