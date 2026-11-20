import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';

type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface SharedButtonProps {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  to?: string;
}

type ReusableButtonProps = SharedButtonProps & ButtonHTMLAttributes<HTMLButtonElement>;

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-[#0B1B3B] text-white hover:bg-[#183270] dark:bg-[#2563EB] dark:text-white dark:hover:bg-blue-500',
  accent:
    'bg-[#F97316] text-white hover:bg-[#EA580C] dark:bg-[#F97316] dark:text-white dark:hover:bg-[#EA580C]',
  secondary:
    'bg-white text-slate-800 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 dark:hover:bg-slate-800',
  ghost:
    'bg-transparent text-slate-700 hover:bg-slate-100 hover:text-[#0B1B3B] dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-white',
  danger:
    'bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-600 dark:text-white dark:hover:bg-rose-500',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'px-3.5 py-2 text-xs',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-sm sm:text-base',
};

export function ReusableButton({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  to,
  type = 'button',
  ...rest
}: ReusableButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-colors duration-150 whitespace-nowrap shrink-0 disabled:opacity-50 disabled:cursor-not-allowed';
  const combined = `${base} ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`;

  if (to) {
    return (
      <Link to={to} className={combined}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={combined} {...rest}>
      {children}
    </button>
  );
}
