import type { ReactNode } from 'react';

interface ResponsiveContainerProps {
  children: ReactNode;
  className?: string;
  size?: 'default' | 'narrow' | 'wide';
}

const SIZE_CLASSES: Record<NonNullable<ResponsiveContainerProps['size']>, string> = {
  narrow: 'max-w-5xl',
  default: 'max-w-7xl',
  wide: 'max-w-[1440px]',
};

export function ResponsiveContainer({
  children,
  className = '',
  size = 'default',
}: ResponsiveContainerProps) {
  return (
    <div className={`${SIZE_CLASSES[size]} mx-auto w-full px-4 sm:px-6 lg:px-8 ${className}`}>
      {children}
    </div>
  );
}
