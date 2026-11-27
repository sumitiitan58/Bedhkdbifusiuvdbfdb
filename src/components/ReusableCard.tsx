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
      className={`bg-white dark:bg-[#0D1324] border border-slate-200/90 dark:border-[#00B4FF]/[0.14] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] rounded-2xl transition-all duration-200 ${
        interactive
          ? 'hover:border-slate-300 dark:hover:border-[#00B4FF]/35 hover:shadow-md dark:hover:shadow-[0_10px_30px_-10px_rgba(0,180,255,0.18)] hover:-translate-y-0.5'
          : 'shadow-xs'
      } ${PADDING_CLASSES[padding]} ${className}`}
    >
      {children}
    </div>
  );
}
