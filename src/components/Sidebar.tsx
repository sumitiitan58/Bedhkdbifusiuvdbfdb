import type { SidebarSectionItem } from '../types';

interface SidebarProps {
  title: string;
  subtitle?: string;
  items: SidebarSectionItem[];
  activeId: string;
  onSelect: (id: string) => void;
}

export function Sidebar({ title, subtitle, items, activeId, onSelect }: SidebarProps) {
  return (
    <aside className="w-full lg:w-64 shrink-0">
      <div className="bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 lg:sticky lg:top-20">
        <div className="px-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-display text-sm font-bold text-[#0F214D] dark:text-white">{title}</h2>
          {subtitle && (
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
          )}
        </div>

        <nav aria-label={title} className="mt-3 flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0">
          {items.map((item) => {
            const active = item.id === activeId;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`text-left px-3 py-2.5 rounded-xl text-sm transition-colors duration-150 whitespace-nowrap lg:whitespace-normal shrink-0 ${
                  active
                    ? 'bg-[#0F214D] text-white dark:bg-sky-500 dark:text-slate-950 font-semibold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                }`}
              >
                <span className="block leading-tight">{item.label}</span>
                {item.description && (
                  <span
                    className={`hidden lg:block mt-0.5 text-xs ${
                      active
                        ? 'text-slate-200 dark:text-slate-900/80'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {item.description}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
