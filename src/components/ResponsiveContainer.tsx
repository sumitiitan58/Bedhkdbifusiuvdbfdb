import type { ReactNode } from 'react';

interface ResponsiveContainerProps {
  children: ReactNode;
  className?: string;
  size?: 'default' | 'narrow' | 'wide';
}

const SIZE_CLASSES: Record<NonNullable<ResponsiveContainerProps['size']>, string> = {
  narrow: 'max-w-[1100px]',
  default: 'max-w-[1280px]',
  wide: 'max-w-[1440px]',
};

export function ResponsiveContainer({
  children,
  className = '',
  size = 'default',
}: ResponsiveContainerProps) {
  return (
    <div className={`w-full ${SIZE_CLASSES[size]} mx-auto px-4 md:px-6 ${className}`}>
      {children}
    </div>
  );
}
