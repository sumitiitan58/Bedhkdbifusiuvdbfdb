import { Link, useLocation } from 'react-router-dom';
import { BookOpen, ClipboardCheck, Home, MessageSquare, Users } from 'lucide-react';
import { MOBILE_BOTTOM_TABS, isRouteActive } from '../utils/navigation';
import { useLanguage } from '../context/LanguageContext';
import { playNav } from '../utils/soundEffects';
import type { RoutePath } from '../types';

const TAB_ICONS: Record<string, typeof Home> = {
  '/': Home,
  '/learn': BookOpen,
  '/cbt-mocks': ClipboardCheck,
  '/community': MessageSquare,
  '/mentors': Users,
};

export function MobileBottomNav() {
  const location = useLocation();
  const { t } = useLanguage();

  return (
    <nav
      aria-label="Mobile bottom navigation"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 h-14 bg-[#F4F8FF]/95 dark:bg-[#070B14]/95 backdrop-blur-xl border-t border-[#E2E8F0] dark:border-white/[0.08]"
    >
      <div className="grid grid-cols-5 h-full max-w-lg mx-auto px-1">
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
                  ? 'text-[#0284C7] dark:text-[#06B6D4]'
                  : 'text-[#475569] dark:text-[#94A3B8] hover:text-[#0B1F3A] dark:hover:text-[#F8FAFC]'
              }`}
            >
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute top-0 inset-x-4 h-0.5 rounded-full bg-[#06B6D4]"
                />
              )}
              <Icon className={`w-4 h-4 ${active ? 'stroke-[2.4]' : 'stroke-[1.9]'}`} />
              <span className="truncate max-w-full px-0.5">{t(tab.langKey, tab.label)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
