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
  const isExamRoom = hideFooter && hideSidebar && hideMobileNav;

  return (
    <div
      className={`relative min-h-screen flex transition-colors duration-200 overflow-x-clip ${
        isExamRoom
          ? 'bg-[#F4F8FF] dark:bg-[#070B14] text-[#0B1F3A] dark:text-[#F8FAFC]'
          : 'bg-[#F4F8FF] dark:bg-[#070B14] text-[#0B1F3A] dark:text-[#F8FAFC]'
      }`}
    >
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
          <div className="bg-[#22C55E]/10 border-b border-[#22C55E]/30">
            <div className="w-full max-w-[1280px] mx-auto px-4 md:px-6 py-2.5 flex items-center justify-between gap-4 text-xs sm:text-sm text-[#15803D] dark:text-[#86EFAC]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-[#22C55E]" />
                <span>{migrationNotice}</span>
              </div>
              <button
                type="button"
                onClick={dismissMigrationNotice}
                aria-label="Dismiss migration notice"
                className="p-1 rounded-lg hover:bg-[#22C55E]/15"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <motion.main
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className={`flex-1 w-full flex flex-col ${
            containerMode === 'contained' ? 'w-full max-w-[1280px] mx-auto px-4 md:px-6 py-8' : ''
          } ${showBottomBar ? 'pb-20 md:pb-0' : ''} ${className}`}
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
