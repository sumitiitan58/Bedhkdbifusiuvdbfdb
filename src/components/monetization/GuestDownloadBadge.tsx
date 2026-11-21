import { Download, ShieldCheck } from 'lucide-react';
import { useDownloadGate } from '../../context/DownloadGateContext';

interface GuestDownloadBadgeProps {
  compact?: boolean;
  darkSurface?: boolean;
  className?: string;
}

/**
 * Subtle inline credit indicator placed near PDF download controls.
 * Displays remaining guest quota (`Free Guest Downloads Left: X`) or unlimited signed-in state.
 */
export function GuestDownloadBadge({
  compact = false,
  darkSurface = false,
  className = '',
}: GuestDownloadBadgeProps) {
  const { guestCredits, isUnlimited } = useDownloadGate();

  if (isUnlimited) {
    return (
      <span
        data-testid="guest-download-badge"
        className={`inline-flex items-center gap-1.5 text-xs font-medium tabular-nums whitespace-nowrap ${
          darkSurface
            ? 'text-emerald-300'
            : 'text-emerald-700 dark:text-emerald-400'
        } ${className}`}
      >
        <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
        <span>{compact ? 'Unlimited PDFs' : 'Signed In · Unlimited PDF Downloads'}</span>
      </span>
    );
  }

  return (
    <span
      data-testid="guest-download-badge"
      className={`inline-flex items-center gap-1.5 text-xs font-medium tabular-nums whitespace-nowrap ${
        guestCredits === 0
          ? darkSurface
            ? 'text-amber-300'
            : 'text-amber-700 dark:text-amber-400'
          : darkSurface
            ? 'text-cyan-300'
            : 'text-[#0B1B3B] dark:text-cyan-300'
      } ${className}`}
    >
      <Download className="w-3.5 h-3.5 shrink-0 opacity-80" />
      <span>
        {compact
          ? `Free Downloads Left: ${guestCredits}`
          : `Free Guest Downloads Left: ${guestCredits}`}
      </span>
    </span>
  );
}
