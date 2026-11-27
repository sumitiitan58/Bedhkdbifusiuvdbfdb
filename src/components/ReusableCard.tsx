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
      className={`bg-white/76 dark:bg-[#0D1324]/70 backdrop-blur-xl border border-white/80 dark:border-[#00B4FF]/20 shadow-[0_10px_30px_-14px_rgba(14,35,78,0.12),inset_0_1px_0_rgba(255,255,255,0.65)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_14px_34px_-16px_rgba(0,0,0,0.65)] rounded-2xl transition-all duration-200 ${
        interactive
          ? 'hover:border-sky-300/90 dark:hover:border-[#00B4FF]/45 hover:bg-white/88 dark:hover:bg-[#101830]/80 hover:shadow-[0_16px_38px_-14px_rgba(0,180,255,0.22)] hover:-translate-y-0.5'
          : ''
      } ${PADDING_CLASSES[padding]} ${className}`}
    >
      {children}
    </div>
  );
}
