import { useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, X } from 'lucide-react';
import { AppSidebar } from '../components/AppSidebar';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { MobileBottomNav } from '../components/MobileBottomNav';
import { OnboardingModal } from '../components/OnboardingModal';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';

export interface PageLayoutProps {
  children: ReactNode;
  hideFooter?: boolean;
  hideMobileNav?: boolean;
  hideSidebar?: boolean;
  containerMode?: 'contained' | 'full';
  className?: string;
}

const ORB_PALETTES = {
  nebula: ['rgba(0,180,255,0.28)', 'rgba(139,92,246,0.24)', 'rgba(242,123,19,0.2)'],
  emerald: ['rgba(16,185,129,0.28)', 'rgba(6,182,212,0.26)', 'rgba(59,130,246,0.22)'],
  solar: ['rgba(249,115,22,0.28)', 'rgba(236,72,153,0.25)', 'rgba(99,102,241,0.24)'],
  arctic: ['rgba(56,189,248,0.3)', 'rgba(129,140,248,0.26)', 'rgba(45,212,191,0.24)'],
} as const;

export function PageLayout({
  children,
  hideFooter = false,
  hideMobileNav = false,
  hideSidebar = false,
  containerMode = 'full',
  className = '',
}: PageLayoutProps) {
  const { migrationNotice, dismissMigrationNotice } = useAuth();
  const { backdropTheme } = useTheme();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const showBottomBar = !hideFooter && !hideMobileNav;
  const isExamRoom = hideFooter && hideSidebar && hideMobileNav;
  const orbs = ORB_PALETTES[backdropTheme] ?? ORB_PALETTES.nebula;

  return (
    <div
      className={`relative min-h-screen flex text-slate-900 dark:text-slate-100 transition-colors duration-300 overflow-x-clip ${
        isExamRoom ? 'bg-[#F3F4F6] dark:bg-[#070A12]' : 'bg-transparent'
      }`}
    >
      {/* Dynamic Colorful Aurora Canvas Backdrop (eliminates plain flat backgrounds everywhere) */}
      {!isExamRoom && (
        <div
          aria-hidden="true"
          data-testid="dynamic-ambient-backdrop"
          data-theme={backdropTheme}
          className="ambient-backdrop-layer"
        >
          <div
            className="ambient-orb-1 absolute -top-28 -left-24 w-[460px] h-[460px] rounded-full blur-[110px]"
            style={{ background: orbs[0] }}
          />
          <div
            className="ambient-orb-2 absolute top-[18%] -right-28 w-[480px] h-[480px] rounded-full blur-[120px]"
            style={{ background: orbs[1] }}
          />
          <div
            className="ambient-orb-1 absolute -bottom-32 left-[34%] w-[440px] h-[440px] rounded-full blur-[120px]"
            style={{ background: orbs[2] }}
          />
          <div className="ambient-mesh-grid absolute inset-0 opacity-70" />
        </div>
      )}

      {!hideSidebar && (
        <AppSidebar
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />
      )}

      <div className="relative z-10 flex-1 min-w-0 flex flex-col">
        <Navbar
          onOpenSidebar={() => setMobileSidebarOpen(true)}
          hideSidebarToggle={hideSidebar}
        />

        {migrationNotice && (
          <div className="bg-emerald-50/90 dark:bg-emerald-950/70 backdrop-blur-md border-b border-emerald-200 dark:border-emerald-800">
            <div className="w-full max-w-[1440px] mx-auto px-4 md:px-8 py-2.5 flex items-center justify-between gap-4 text-xs sm:text-sm text-emerald-900 dark:text-emerald-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>{migrationNotice}</span>
              </div>
              <button
                type="button"
                onClick={dismissMigrationNotice}
                aria-label="Dismiss migration notice"
                className="p-1 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/60"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <motion.main
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={`flex-1 w-full flex flex-col ${
            containerMode === 'contained' ? 'w-full max-w-[1440px] mx-auto px-4 md:px-8 py-6' : ''
          } ${showBottomBar ? 'pb-36 lg:pb-0' : ''} ${className}`}
        >
          {children}
        </motion.main>

        {!hideFooter && <Footer />}
      </div>

      {showBottomBar && <MobileBottomNav />}
      <OnboardingModal />
    </div>
  );
}
