import type { ReactNode } from 'react';

interface ReusableCardProps {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const PADDING_CLASSES: Record<NonNullable<ReusableCardProps['padding']>, string> = {
  none: 'p-0',
  sm: 'p-5',
  md: 'p-6',
  lg: 'p-6 sm:p-8',
};

export function ReusableCard({
  children,
  className = '',
  interactive = false,
  padding = 'md',
}: ReusableCardProps) {
  return (
    <div
      className={`bg-white dark:bg-[#111114] border border-slate-200/90 dark:border-white/[0.08] rounded-2xl transition-all duration-200 ${
        interactive
          ? 'hover:border-slate-300 dark:hover:border-white/[0.16] hover:shadow-md dark:hover:shadow-black/40 hover:-translate-y-0.5'
          : 'shadow-xs dark:shadow-none'
      } ${PADDING_CLASSES[padding]} ${className}`}
    >
      {children}
    </div>
  );
}
