import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, X } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { OnboardingModal } from '../components/OnboardingModal';
import { useAuth } from '../context/AuthContext';

export interface PageLayoutProps {
  children: ReactNode;
  hideFooter?: boolean;
  /**
   * 'contained' centers content in a responsive max-w-7xl container;
   * 'full' lets pages manage custom full-bleed hero/exam sections themselves.
   */
  containerMode?: 'contained' | 'full';
  className?: string;
}

export function PageLayout({
  children,
  hideFooter = false,
  containerMode = 'full',
  className = '',
}: PageLayoutProps) {
  const { migrationNotice, dismissMigrationNotice } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] dark:bg-[#090E1A] text-slate-900 dark:text-slate-100 transition-colors duration-200 overflow-x-clip">
      <Navbar />

      {migrationNotice && (
        <div className="bg-emerald-50 dark:bg-emerald-950/60 border-b border-emerald-200 dark:border-emerald-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-4 text-xs sm:text-sm text-emerald-900 dark:text-emerald-200">
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
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className={`flex-1 w-full ${
          containerMode === 'contained' ? 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8' : ''
        } ${className}`}
      >
        {children}
      </motion.main>

      {!hideFooter && <Footer />}
      <OnboardingModal />
    </div>
  );
}
