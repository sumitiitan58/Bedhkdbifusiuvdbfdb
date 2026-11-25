import { useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, X } from 'lucide-react';
import { AppSidebar } from '../components/AppSidebar';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { MobileBottomNav } from '../components/MobileBottomNav';
import { OnboardingModal } from '../components/OnboardingModal';
import { useAuth } from '../context/AuthContext';

export interface PageLayoutProps {
  children: ReactNode;
  hideFooter?: boolean;
  hideMobileNav?: boolean;
  hideSidebar?: boolean;
  /**
   * 'contained' centers content in a full-width spacious 1440px container;
   * 'full' lets pages manage custom fluid sections themselves.
   */
  containerMode?: 'contained' | 'full';
  className?: string;
}

export function PageLayout({
  children,
  hideFooter = false,
  hideMobileNav = false,
  hideSidebar = false,
  containerMode = 'full',
  className = '',
}: PageLayoutProps) {
  const { migrationNotice, dismissMigrationNotice } = useAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const showBottomBar = !hideFooter && !hideMobileNav;

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] dark:bg-[#090E1A] text-slate-900 dark:text-slate-100 transition-colors duration-200 overflow-x-clip">
      {!hideSidebar && (
        <AppSidebar
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <Navbar
          onOpenSidebar={() => setMobileSidebarOpen(true)}
          hideSidebarToggle={hideSidebar}
        />

        {migrationNotice && (
          <div className="bg-emerald-50 dark:bg-emerald-950/60 border-b border-emerald-200 dark:border-emerald-800">
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
