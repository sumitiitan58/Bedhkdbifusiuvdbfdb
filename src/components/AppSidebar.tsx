import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  BarChart3,
  BookMarked,
  BookOpen,
  BookOpenCheck,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  CreditCard,
  FileSpreadsheet,
  Gamepad2,
  Home,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCircle2,
  Users,
  X,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { PUBLIC_NAV_ROUTES, isRouteActive } from '../utils/navigation';
import { useAuth } from '../context/AuthContext';
import { usePlatformData } from '../context/PlatformDataContext';
import { usePrepskm2 } from '../context/Prepskm2Context';
import { useLanguage } from '../context/LanguageContext';
import { useExam } from '../context/ExamContext';
import { extractMistakeEntries } from '../utils/testAnalysisEngine';
import { playClick, playNav } from '../utils/soundEffects';
import type { RoutePath } from '../types';

interface DeepToolLink {
  id: string;
  to: string;
  matchPath: RoutePath;
  matchTab?: string;
  labelKey: string;
  fallbackLabel: string;
  icon: typeof FileSpreadsheet;
  accent?: string;
}

const DEEP_TOOL_LINKS: DeepToolLink[] = [
  {
    id: 'materials',
    to: '/materials',
    matchPath: '/materials',
    labelKey: 'sidebar.materials',
    fallbackLabel: 'Study Materials & Notes',
    icon: BookOpen,
  },
  {
    id: 'dpp',
    to: '/dpp',
    matchPath: '/dpp',
    labelKey: 'sidebar.dpp',
    fallbackLabel: 'Chapter DPPs',
    icon: FileSpreadsheet,
  },
  {
    id: 'cbt-mocks',
    to: '/cbt-mocks',
    matchPath: '/cbt-mocks',
    labelKey: 'sidebar.mocks',
    fallbackLabel: 'CBT Mock Tests',
    icon: ClipboardCheck,
    accent: 'text-[#06B6D4]',
  },
  {
    id: 'ncert',
    to: '/learn?tab=ncert',
    matchPath: '/learn',
    matchTab: 'ncert',
    labelKey: 'sidebar.ncert',
    fallbackLabel: 'NCERT-to-PYQ',
    icon: BookOpenCheck,
    accent: 'text-[#F97316]',
  },
  {
    id: 'preps-ai',
    to: '/preps-ai',
    matchPath: '/preps-ai',
    labelKey: 'sidebar.ai',
    fallbackLabel: 'Preps AI Chat',
    icon: Sparkles,
  },
  {
    id: 'analysis',
    to: '/analytics',
    matchPath: '/analytics',
    labelKey: 'sidebar.analysis',
    fallbackLabel: 'Test Analysis',
    icon: BarChart3,
  },
  {
    id: 'mistakes',
    to: '/mistakes',
    matchPath: '/mistakes',
    labelKey: 'sidebar.mistakes',
    fallbackLabel: 'Mistake Notebook',
    icon: BookMarked,
  },
  {
    id: 'arena',
    to: '/arena',
    matchPath: '/arena',
    labelKey: 'sidebar.arena',
    fallbackLabel: 'Apex Arena',
    icon: Gamepad2,
    accent: 'text-[#F97316]',
  },
  {
    id: 'profile',
    to: '/profile',
    matchPath: '/profile',
    labelKey: 'sidebar.profile',
    fallbackLabel: 'Profile & Streaks',
    icon: UserCircle2,
  },
];

const PRIMARY_ICONS: Record<string, typeof Home> = {
  '/': Home,
  '/materials': BookOpen,
  '/dpp': FileSpreadsheet,
  '/cbt-mocks': ClipboardCheck,
  '/arena': Gamepad2,
};

interface AppSidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function AppSidebar({ mobileOpen, onCloseMobile }: AppSidebarProps) {
  const location = useLocation();
  const { isAdmin, openOnboardingModal } = useAuth();
  const { attempts, questions, resolvedMistakeIds } = usePlatformData();
  const { sidebarCollapsed, toggleSidebarCollapsed } = usePrepskm2();
  const { t } = useLanguage();
  const { trackConfig } = useExam();

  const currentTab = useMemo(() => new URLSearchParams(location.search).get('tab'), [location.search]);

  const unresolvedMistakeCount = useMemo(() => {
    if (attempts.length === 0) return 0;
    const resolvedSet = new Set(resolvedMistakeIds);
    return extractMistakeEntries(attempts, questions).filter(
      (m) => !resolvedSet.has(m.questionId)
    ).length;
  }, [attempts, questions, resolvedMistakeIds]);

  const renderSidebarInner = (isMobileDrawer: boolean) => {
    const collapsed = !isMobileDrawer && sidebarCollapsed;

    return (
      <div className="flex flex-col h-full bg-[#FFFFFF]/92 dark:bg-[#070B14]/95 backdrop-blur-xl border-r border-[#E2E8F0] dark:border-white/[0.08]">
        {/* Header / Chevron Rail Toggle */}
        <div
          className={`h-16 flex items-center border-b border-[#E2E8F0] dark:border-white/[0.08] shrink-0 ${
            collapsed ? 'px-2 justify-center' : 'px-4 justify-between'
          }`}
        >
          {isMobileDrawer ? (
            <>
              <Link
                to="/"
                onClick={() => {
                  playNav();
                  onCloseMobile();
                }}
                className="inline-flex items-center gap-1.5"
              >
                <BrandLogo variant="navbar" />
              </Link>
              <button
                type="button"
                onClick={() => {
                  playClick();
                  onCloseMobile();
                }}
                aria-label="Close navigation drawer"
                className="p-2 rounded-xl text-[#475569] dark:text-[#94A3B8] hover:bg-[#EEF4FF] dark:hover:bg-[#162033]"
              >
                <X className="w-5 h-5" />
              </button>
            </>
          ) : (
            <>
              {!collapsed && (
                <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#475569] dark:text-[#94A3B8]">
                  {t('sidebar.deepTools', 'Deep Tools')}
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  playClick();
                  toggleSidebarCollapsed();
                }}
                aria-label={collapsed ? 'Expand deep tools sidebar' : 'Collapse deep tools sidebar'}
                title={collapsed ? 'Expand Deep Tools (236px)' : 'Collapse to Icon Rail (68px)'}
                className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-[#E2E8F0] dark:border-white/[0.08] bg-[#F4F8FF] dark:bg-[#0F172A] text-[#0B1F3A] dark:text-[#F8FAFC] hover:border-[#06B6D4]/50 transition-colors shrink-0"
              >
                {collapsed ? (
                  <ChevronRight className="w-4 h-4 text-[#0284C7] dark:text-[#06B6D4]" />
                ) : (
                  <ChevronLeft className="w-4 h-4 text-[#0284C7] dark:text-[#06B6D4]" />
                )}
              </button>
            </>
          )}
        </div>

        {/* Navigation Sections */}
        <div className={`flex-1 overflow-y-auto py-4 space-y-5 ${collapsed ? 'px-2' : 'px-3'}`}>
          {/* Mobile Drawer shows the 5 Primary Spaces + Pricing as well */}
          {isMobileDrawer && (
            <nav aria-label="Primary spaces" className="space-y-1">
              <p className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#475569] dark:text-[#94A3B8]">
                Primary Spaces
              </p>
              {PUBLIC_NAV_ROUTES.map((item) => {
                const active = isRouteActive(location.pathname, item.path);
                const Icon = PRIMARY_ICONS[item.path] ?? Home;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => {
                      playNav();
                      onCloseMobile();
                    }}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                      active
                        ? 'bg-[#06B6D4] text-[#070B14]'
                        : 'text-[#0B1F3A] dark:text-[#F8FAFC] hover:bg-[#EEF4FF] dark:hover:bg-[#162033]'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
              <Link
                to="/pricing"
                onClick={() => {
                  playNav();
                  onCloseMobile();
                }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  isRouteActive(location.pathname, '/pricing')
                    ? 'bg-[#F97316] text-white'
                    : 'text-[#EA580C] dark:text-[#FB923C] hover:bg-[#F97316]/10'
                }`}
              >
                <CreditCard className="w-4 h-4 shrink-0" />
                <span className="truncate">{t('nav.pricing', 'Pricing')}</span>
              </Link>
            </nav>
          )}

          {/* Deep Tools Rail */}
          <nav aria-label="Deep study tools" className="space-y-1">
            {isMobileDrawer && (
              <p className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-[0.05em] text-[#475569] dark:text-[#94A3B8]">
                {t('sidebar.deepTools', 'Deep Tools')}
              </p>
            )}
            {DEEP_TOOL_LINKS.map((item) => {
              const Icon = item.icon;
              const isTabMatch = item.matchTab
                ? location.pathname === item.matchPath && currentTab === item.matchTab
                : isRouteActive(location.pathname, item.matchPath) &&
                  !(item.matchPath === '/learn' && (currentTab === 'ncert' || currentTab === 'predictor'));
              const label = t(item.labelKey, item.fallbackLabel);
              const showMistakeCount = item.id === 'mistakes' && unresolvedMistakeCount > 0;

              return (
                <Link
                  key={item.id}
                  to={item.to}
                  title={collapsed ? label : undefined}
                  onClick={() => {
                    playNav();
                    if (isMobileDrawer) onCloseMobile();
                  }}
                  aria-current={isTabMatch ? 'page' : undefined}
                  className={`group relative flex items-center ${
                    collapsed ? 'justify-center h-11 w-11 mx-auto' : 'justify-between gap-2.5 px-3 py-2.5'
                  } rounded-xl text-[13px] font-semibold transition-all duration-150 ${
                    isTabMatch
                      ? 'bg-[#EEF4FF] dark:bg-[#162033] text-[#0284C7] dark:text-[#22D3EE] border border-[#06B6D4]/35'
                      : 'text-[#475569] dark:text-[#94A3B8] hover:bg-[#EEF4FF] dark:hover:bg-[#162033] hover:text-[#0B1F3A] dark:hover:text-[#F8FAFC] border border-transparent'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-[18px] h-[18px] shrink-0 ${
                        isTabMatch
                          ? 'text-[#0284C7] dark:text-[#06B6D4]'
                          : item.accent ?? 'text-[#475569] dark:text-[#94A3B8] group-hover:text-[#0284C7] dark:group-hover:text-[#22D3EE]'
                      }`}
                    />
                    {!collapsed && <span className="truncate">{label}</span>}
                  </span>

                  {!collapsed && showMistakeCount && (
                    <span className="font-mono text-[11px] font-bold tabular-nums text-[#EF4444]">
                      {unresolvedMistakeCount}
                    </span>
                  )}

                  {/* Collapsed Hover Tooltip */}
                  {collapsed && (
                    <span
                      role="tooltip"
                      className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 absolute left-full ml-3 px-2.5 py-1.5 rounded-lg bg-[#0B1F3A] dark:bg-[#162033] text-white text-xs font-semibold whitespace-nowrap border border-white/10 shadow-lg z-50"
                    >
                      {label}
                    </span>
                  )}
                </Link>
              );
            })}

            {isAdmin && (
              <Link
                to="/admin"
                title={collapsed ? 'Admin Console' : undefined}
                onClick={() => {
                  playNav();
                  if (isMobileDrawer) onCloseMobile();
                }}
                className={`group flex items-center ${
                  collapsed ? 'justify-center h-11 w-11 mx-auto' : 'gap-2.5 px-3 py-2.5'
                } rounded-xl text-[13px] font-semibold text-[#F97316] hover:bg-[#F97316]/10 transition-colors`}
              >
                <ShieldCheck className="w-[18px] h-[18px] shrink-0" />
                {!collapsed && <span className="truncate">Admin Console</span>}
              </Link>
            )}
          </nav>
        </div>

        {/* Bottom Track Summary (Expanded Only) */}
        {!collapsed && (
          <div className="p-3 border-t border-[#E2E8F0] dark:border-white/[0.08] shrink-0">
            <div className="rounded-xl bg-[#F4F8FF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-white/[0.08] p-3 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#475569] dark:text-[#94A3B8]">
                  Active Track
                </span>
                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    if (isMobileDrawer) onCloseMobile();
                    openOnboardingModal();
                  }}
                  className="text-xs font-semibold text-[#0284C7] dark:text-[#06B6D4] hover:underline"
                >
                  Change
                </button>
              </div>
              <p className="font-display text-sm font-bold text-[#0B1F3A] dark:text-[#F8FAFC] truncate">
                {trackConfig.primaryExamName}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Desktop Collapsible Left Deep-Tools Sidebar: 68px icon rail -> 236px expanded */}
      <aside
        className={`hidden lg:block shrink-0 transition-[width] duration-200 ${
          sidebarCollapsed ? 'w-[68px]' : 'w-[236px]'
        }`}
      >
        <div
          className={`fixed top-0 left-0 bottom-0 z-40 transition-[width] duration-200 ${
            sidebarCollapsed ? 'w-[68px]' : 'w-[236px]'
          }`}
        >
          {renderSidebarInner(false)}
        </div>
      </aside>

      {/* Mobile Drawer (< 1024px) */}
      <AnimatePresence>
        {mobileOpen && (
          <div
            className="lg:hidden fixed inset-0 z-50 flex"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation drawer"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={onCloseMobile}
              className="fixed inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10"
            >
              {renderSidebarInner(true)}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
