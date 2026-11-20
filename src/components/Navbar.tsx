import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Menu, ShieldCheck, UserCircle2, Volume2, VolumeX, X } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { ThemeToggle } from './ThemeToggle';
import { PUBLIC_NAV_ROUTES, isRouteActive } from '../utils/navigation';
import { useAuth } from '../context/AuthContext';
import {
  isSoundEnabled,
  playClick,
  playNav,
  playToggle,
  setSoundEnabled,
} from '../utils/soundEffects';

export function Navbar() {
  const location = useLocation();
  const { firebaseUser, profile, isAdmin, openOnboardingModal } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [soundOn, setSoundOn] = useState<boolean>(() => isSoundEnabled());

  const avatarSrc = profile?.photoURL || firebaseUser?.photoURL || '';
  const displayFirstName =
    profile?.displayName?.trim().split(' ')[0] ||
    firebaseUser?.displayName?.split(' ')[0] ||
    'Profile';

  const handleToggleSound = () => {
    const next = !soundOn;
    setSoundEnabled(next);
    setSoundOn(next);
    if (next) playToggle(true);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#090E1A]/95 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800/90">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2.5 lg:gap-5">
        {/* Zone 1: Brand Logo */}
        <Link
          to="/"
          onClick={() => {
            playNav();
            setMobileMenuOpen(false);
          }}
          aria-label="PREPSKM.IN Home"
          className="inline-flex items-center whitespace-nowrap shrink-0 focus-visible:rounded-xl"
        >
          <BrandLogo variant="navbar" />
        </Link>

        {/* Zone 2: Desktop Navigation Links (Home, Materials, CBT Mocks, DPP, Analytics, Admin) */}
        <nav
          aria-label="Primary navigation"
          className="hidden lg:flex items-center gap-6 text-sm font-medium"
        >
          {PUBLIC_NAV_ROUTES.map((item) => {
            const active = isRouteActive(location.pathname, item.path);
            const isAdminLink = item.path === '/admin';
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => playNav()}
                aria-current={active ? 'page' : undefined}
                className={`relative inline-flex items-center gap-1.5 py-2 whitespace-nowrap shrink-0 transition-colors duration-150 ${
                  active
                    ? isAdminLink
                      ? 'text-[#F97316] font-semibold'
                      : 'text-[#0B1B3B] dark:text-white font-semibold'
                    : isAdminLink
                      ? 'text-slate-700 dark:text-slate-200 hover:text-[#F97316]'
                      : 'text-slate-600 dark:text-slate-300 hover:text-[#0B1B3B] dark:hover:text-white'
                }`}
              >
                {isAdminLink && <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-[#F97316]" />}
                <span>{item.label}</span>
                {active && (
                  <motion.span
                    layoutId="navbar-active-indicator"
                    aria-hidden="true"
                    className="absolute left-0 right-0 -bottom-[1px] h-0.5 rounded-full bg-[#F97316]"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Zone 3: Sound Toggle + Theme Toggle + Prominent Profile Button + Mobile Menu */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
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

          <Link
            to="/profile"
            onClick={() => playNav()}
            aria-label="Student Profile"
            className={`inline-flex items-center justify-center gap-1.5 h-9 px-2 sm:px-3 text-xs sm:text-sm font-semibold rounded-xl border transition-colors duration-150 whitespace-nowrap shrink-0 ${
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
            <span className="hidden sm:inline max-w-[96px] truncate">{displayFirstName}</span>
          </Link>

          <button
            type="button"
            onClick={() => {
              playClick();
              setMobileMenuOpen((prev) => !prev);
            }}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            className="lg:hidden inline-flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Responsive Mobile Menu Drawer (Extra routes like DPP, Admin, About + Google Login) */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.nav
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.16 }}
            aria-label="Mobile menu navigation"
            className="lg:hidden overflow-hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#090E1A]"
          >
            <div className="px-3 py-2.5 space-y-1">
              <div className="grid grid-cols-2 gap-1.5">
                {PUBLIC_NAV_ROUTES.map((item) => {
                  const active = isRouteActive(location.pathname, item.path);
                  const isAdminLink = item.path === '/admin';
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => {
                        playNav();
                        setMobileMenuOpen(false);
                      }}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                        active
                          ? 'bg-[#0B1B3B] text-white dark:bg-[#2563EB]'
                          : isAdminLink
                            ? 'text-[#F97316] bg-orange-50/70 dark:bg-orange-950/30'
                            : 'text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-900/70'
                      }`}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        {isAdminLink && <ShieldCheck className="w-3.5 h-3.5" />}
                        {item.label}
                      </span>
                      {isAdminLink && isAdmin && <span className="text-[10px]">✓</span>}
                    </Link>
                  );
                })}
              </div>

              <div className="pt-2 mt-1.5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2">
                <Link
                  to="/about"
                  onClick={() => {
                    playNav();
                    setMobileMenuOpen(false);
                  }}
                  className="inline-flex items-center justify-center px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-xl"
                >
                  About &amp; @unfiltereddsumit
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    setMobileMenuOpen(false);
                    openOnboardingModal();
                  }}
                  className="inline-flex items-center justify-center px-3 py-2 text-xs font-semibold text-white bg-[#F97316] rounded-xl"
                >
                  {firebaseUser ? 'Switch Class' : 'Google Sign-In'}
                </button>
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
