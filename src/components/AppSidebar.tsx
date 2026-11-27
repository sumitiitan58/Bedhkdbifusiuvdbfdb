import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  BarChart3,
  BookMarked,
  BookOpen,
  ClipboardCheck,
  FileSpreadsheet,
  Gamepad2,
  Info,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  Sparkles,
  UserCircle2,
  Users,
  X,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import {
  PUBLIC_NAV_ROUTES,
  SECONDARY_SIDEBAR_ROUTES,
  isRouteActive,
} from '../utils/navigation';
import { useAuth } from '../context/AuthContext';
import { usePlatformData } from '../context/PlatformDataContext';
import { usePrepskm2 } from '../context/Prepskm2Context';
import { extractMistakeEntries } from '../utils/testAnalysisEngine';
import { playClick, playNav } from '../utils/soundEffects';
import type { RoutePath } from '../types';

const ROUTE_ICONS: Record<string, typeof LayoutDashboard> = {
  '/': LayoutDashboard,
  '/arena': Gamepad2,
  '/cbt-mocks': ClipboardCheck,
  '/materials': BookOpen,
  '/mentors': Users,
  '/analytics': BarChart3,
  '/mistakes': BookMarked,
  '/preps-ai': Sparkles,
  '/dpp': FileSpreadsheet,
  '/profile': UserCircle2,
  '/about': Info,
  '/admin': ShieldCheck,
};

interface AppSidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function AppSidebar({ mobileOpen, onCloseMobile }: AppSidebarProps) {
  const location = useLocation();
  const { isAdmin, cohortId, openOnboardingModal } = useAuth();
  const { allCohorts, attempts, questions, resolvedMistakeIds } = usePlatformData();
  const { sidebarCollapsed, toggleSidebarCollapsed } = usePrepskm2();

  const activeCohortLabel = useMemo(
    () => allCohorts.find((c) => c.id === cohortId)?.label ?? 'Class 12 JEE',
    [allCohorts, cohortId]
  );

  const unresolvedMistakeCount = useMemo(() => {
    if (attempts.length === 0) return 0;
    const resolvedSet = new Set(resolvedMistakeIds);
    return extractMistakeEntries(attempts, questions).filter(
      (m) => !resolvedSet.has(m.questionId)
    ).length;
  }, [attempts, questions, resolvedMistakeIds]);

  const renderNavContent = (isMobileDrawer: boolean) => {
    const collapsed = !isMobileDrawer && sidebarCollapsed;

    return (
      <div className="flex flex-col h-full bg-white dark:bg-[#070A12] border-r border-slate-200/90 dark:border-white/10">
        {/* Brand Header */}
        <div
          className={`h-16 flex items-center border-b border-slate-100 dark:border-white/10 shrink-0 ${
            collapsed ? 'px-2 justify-center' : 'px-4 justify-between'
          }`}
        >
          {!collapsed && (
            <Link
              to="/"
              onClick={() => {
                playNav();
                if (isMobileDrawer) onCloseMobile();
              }}
              aria-label="PREPSKM.IN Dashboard"
              className="inline-flex items-center focus-visible:rounded-xl min-w-0"
            >
              <BrandLogo variant="navbar" />
            </Link>
          )}

          {isMobileDrawer ? (
            <button
              type="button"
              onClick={() => {
                playClick();
                onCloseMobile();
              }}
              aria-label="Close navigation sidebar"
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06]"
            >
              <X className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                playClick();
                toggleSidebarCollapsed();
              }}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors shrink-0"
            >
              {collapsed ? (
                <PanelLeftOpen className="w-4 h-4" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        {/* Navigation Links */}
        <div className={`flex-1 overflow-y-auto py-5 space-y-6 ${collapsed ? 'px-2' : 'px-3.5'}`}>
          <nav aria-label="Main workspace navigation" className="space-y-1">
            {!collapsed && (
              <p className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                5-Space OS
              </p>
            )}
            {PUBLIC_NAV_ROUTES.map((item) => {
              const active = isRouteActive(location.pathname, item.path);
              const Icon = ROUTE_ICONS[item.path] ?? LayoutDashboard;
              const isArena = item.path === '/arena';
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  title={collapsed ? item.label : undefined}
                  onClick={() => {
                    playNav();
                    if (isMobileDrawer) onCloseMobile();
                  }}
                  aria-current={active ? 'page' : undefined}
                  className={`group flex items-center ${
                    collapsed ? 'justify-center px-2 py-2.5' : 'justify-between gap-3 px-3.5 py-2.5'
                  } rounded-xl text-sm font-semibold transition-all duration-150 ${
                    active
                      ? 'bg-[#0E234E] text-white dark:bg-[#1D56C6] dark:text-white shadow-[0_0_20px_rgba(0,180,255,0.2)] border border-[#00B4FF]/30'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#0D1324] hover:text-[#0E234E] dark:hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <Icon
                      className={`w-[18px] h-[18px] shrink-0 ${
                        active
                          ? 'text-[#00B4FF]'
                          : isArena
                            ? 'text-[#F27B13]'
                            : 'text-slate-500 dark:text-slate-400 group-hover:text-[#0E234E] dark:group-hover:text-[#00B4FF]'
                      }`}
                    />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </span>
                </Link>
              );
            })}
          </nav>

          <nav aria-label="Additional tools" className="space-y-1">
            {!collapsed && (
              <p className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Deep Tools
              </p>
            )}
            {SECONDARY_SIDEBAR_ROUTES.map((item) => {
              const active = isRouteActive(location.pathname, item.path);
              const Icon = ROUTE_ICONS[item.path] ?? FileSpreadsheet;
              const isMistakes = item.path === '/mistakes';
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  title={collapsed ? item.label : undefined}
                  onClick={() => {
                    playNav();
                    if (isMobileDrawer) onCloseMobile();
                  }}
                  aria-current={active ? 'page' : undefined}
                  className={`group flex items-center ${
                    collapsed ? 'justify-center px-2 py-2.5' : 'justify-between gap-3 px-3.5 py-2.5'
                  } rounded-xl text-sm font-medium transition-colors ${
                    active
                      ? 'bg-slate-100 dark:bg-white/[0.08] text-[#0B1B3B] dark:text-white font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-white/[0.05] hover:text-[#0B1B3B] dark:hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <Icon className="w-[18px] h-[18px] shrink-0 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </span>
                  {!collapsed && isMistakes && unresolvedMistakeCount > 0 && (
                    <span className="font-mono text-[11px] font-bold tabular-nums px-1.5 py-0.5 rounded-md bg-rose-500/15 text-rose-600 dark:text-rose-300">
                      {unresolvedMistakeCount}
                    </span>
                  )}
                </Link>
              );
            })}

            {isAdmin && (
              <Link
                to={'/admin' as RoutePath}
                title={collapsed ? 'Admin Console' : undefined}
                onClick={() => {
                  playNav();
                  if (isMobileDrawer) onCloseMobile();
                }}
                aria-current={isRouteActive(location.pathname, '/admin') ? 'page' : undefined}
                className={`group flex items-center ${
                  collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3.5 py-2.5'
                } rounded-xl text-sm font-semibold transition-colors ${
                  isRouteActive(location.pathname, '/admin')
                    ? 'bg-[#F97316] text-white'
                    : 'text-[#F97316] hover:bg-orange-50 dark:hover:bg-orange-950/40'
                }`}
              >
                <ShieldCheck className="w-[18px] h-[18px] shrink-0" />
                {!collapsed && <span className="truncate">Admin Console</span>}
              </Link>
            )}
          </nav>
        </div>

        {/* Active Cohort Track Footer */}
        {!collapsed && (
          <div className="p-4 border-t border-slate-100 dark:border-white/10 shrink-0">
            <div className="rounded-xl bg-slate-50 dark:bg-[#0D1324] border border-slate-200/80 dark:border-[#00B4FF]/[0.14] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] p-3.5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Active Track
                </span>
                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    if (isMobileDrawer) onCloseMobile();
                    openOnboardingModal();
                  }}
                  className="text-xs font-semibold text-[#1D56C6] dark:text-[#00B4FF] hover:underline"
                >
                  Switch
                </button>
              </div>
              <p className="font-display text-sm font-bold text-[#0E234E] dark:text-white truncate">
                {activeCohortLabel}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Desktop Persistent Collapsible Left Sidebar */}
      <aside
        className={`hidden lg:block shrink-0 transition-[width] duration-200 ${
          sidebarCollapsed ? 'w-[72px]' : 'w-64'
        }`}
      >
        <div
          className={`fixed top-0 left-0 bottom-0 z-30 transition-[width] duration-200 ${
            sidebarCollapsed ? 'w-[72px]' : 'w-64'
          }`}
        >
          {renderNavContent(false)}
        </div>
      </aside>

      {/* Mobile Collapsible Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div
            className="lg:hidden fixed inset-0 z-50 flex"
            role="dialog"
            aria-modal="true"
            aria-label="Workspace navigation drawer"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={onCloseMobile}
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10"
            >
              {renderNavContent(true)}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
