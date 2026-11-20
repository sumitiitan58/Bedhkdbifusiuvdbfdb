import { BrandLogo } from './BrandLogo';

interface LoadingScreenProps {
  message?: string;
  fullScreen?: boolean;
}

export function LoadingScreen({
  message = 'Loading PREPSKM.IN workspace...',
  fullScreen = false,
}: LoadingScreenProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center gap-5 px-4 ${
        fullScreen ? 'min-h-screen bg-[#FAFBFD] dark:bg-[#0B1120]' : 'min-h-[45vh]'
      }`}
    >
      <BrandLogo variant="navbar" />
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="h-5 w-5 rounded-full border-2 border-slate-300 dark:border-slate-700 border-t-[#E86F0C] animate-spin"
        />
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{message}</p>
      </div>
    </div>
  );
}
