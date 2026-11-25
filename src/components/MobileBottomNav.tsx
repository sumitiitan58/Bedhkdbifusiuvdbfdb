import { Link, useLocation } from 'react-router-dom';
import { BarChart3, BookMarked, BookOpen, ClipboardCheck, Home } from 'lucide-react';
import { MOBILE_BOTTOM_TABS, isRouteActive } from '../utils/navigation';
import { playNav } from '../utils/soundEffects';
import type { RoutePath } from '../types';

const TAB_ICONS: Record<string, typeof Home> = {
  '/': Home,
  '/cbt-mocks': ClipboardCheck,
  '/materials': BookOpen,
  '/analytics': BarChart3,
  '/mistakes': BookMarked,
};

export function MobileBottomNav() {
  const location = useLocation();

  return (
    <nav
      aria-label="Mobile bottom navigation"
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-[#0B1325]/95 backdrop-blur-md border-t border-slate-200/90 dark:border-slate-800/90 shadow-[0_-4px_20px_-6px_rgba(11,27,59,0.12)]"
    >
      <div className="grid grid-cols-5 h-16 max-w-lg mx-auto px-1">
        {MOBILE_BOTTOM_TABS.map((tab) => {
          const active = isRouteActive(location.pathname, tab.path as RoutePath);
          const Icon = TAB_ICONS[tab.path] ?? Home;
          return (
            <Link
              key={tab.path}
              to={tab.path}
              onClick={() => playNav()}
              aria-current={active ? 'page' : undefined}
              className={`relative flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors ${
                active
                  ? 'text-[#F97316]'
                  : 'text-slate-500 dark:text-slate-400 hover:text-[#0B1B3B] dark:hover:text-white'
              }`}
            >
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute top-0 inset-x-3 h-0.5 rounded-full bg-[#F97316]"
                />
              )}
              <Icon className={`w-5 h-5 ${active ? 'stroke-[2.4]' : 'stroke-[1.9]'}`} />
              <span className="truncate">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
