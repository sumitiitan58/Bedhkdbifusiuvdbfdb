import { useState } from 'react';
import { BRAND_CONFIG } from '../assets/brand';

interface BrandLogoProps {
  variant?: 'navbar' | 'hero' | 'footer';
  className?: string;
}

export function BrandLogo({ variant = 'navbar', className = '' }: BrandLogoProps) {
  const [imgFailed, setImgFailed] = useState(false);

  if (variant === 'hero') {
    return (
      <div
        className={`inline-flex flex-col items-center justify-center gap-3 rounded-2xl bg-white dark:bg-[#111A2E] p-6 sm:p-8 border border-slate-200/90 dark:border-slate-700/80 shadow-md ${className}`}
      >
        {!imgFailed ? (
          <img
            src={BRAND_CONFIG.logoPath}
            alt={BRAND_CONFIG.logoAlt}
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="w-36 h-36 sm:w-44 sm:h-44 object-contain select-none drop-shadow-sm"
          />
        ) : (
          <span className="font-display text-3xl font-extrabold tracking-tight text-[#0B1B3B] dark:text-white">
            SKM
          </span>
        )}
        <div className="text-center">
          <span className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">
            <span className="text-[#0B1B3B] dark:text-white">{BRAND_CONFIG.wordmarkPrefix}</span>
            <span className="text-[#F97316]">{BRAND_CONFIG.wordmarkAccent}</span>
            <span className="text-[#0B1B3B] dark:text-white">{BRAND_CONFIG.wordmarkSuffix}</span>
          </span>
          <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            JEE · NEET · Class 9–12 Boards
          </p>
        </div>
      </div>
    );
  }

  if (variant === 'footer') {
    return (
      <div className={`inline-flex items-center gap-3 ${className}`}>
        <div className="h-12 w-12 rounded-xl bg-white/95 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 p-1.5 flex items-center justify-center shrink-0">
          {!imgFailed ? (
            <img
              src={BRAND_CONFIG.logoPath}
              alt={BRAND_CONFIG.logoAlt}
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className="w-full h-full object-contain"
            />
          ) : (
            <span className="font-display font-bold text-sm text-[#0B1B3B] dark:text-white">SKM</span>
          )}
        </div>
        <div className="leading-tight">
          <span className="block font-display text-xl font-extrabold tracking-tight whitespace-nowrap">
            <span className="text-[#0B1B3B] dark:text-white">{BRAND_CONFIG.wordmarkPrefix}</span>
            <span className="text-[#F97316]">{BRAND_CONFIG.wordmarkAccent}</span>
            <span className="text-[#0B1B3B] dark:text-white">{BRAND_CONFIG.wordmarkSuffix}</span>
          </span>
          <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
            JEE · NEET · Boards Ecosystem
          </span>
        </div>
      </div>
    );
  }

  // Navbar variant — crisp transparent emblem + legible brand wordmark
  return (
    <span className={`inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 ${className}`}>
      <span className="h-10 w-10 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-700/80 p-1 flex items-center justify-center shrink-0 shadow-xs">
        {!imgFailed ? (
          <img
            src={BRAND_CONFIG.logoPath}
            alt={BRAND_CONFIG.logoAlt}
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-contain"
          />
        ) : (
          <span className="font-display font-bold text-xs text-[#0B1B3B] dark:text-white">SKM</span>
        )}
      </span>
      <span className="font-display text-lg sm:text-xl font-extrabold tracking-tight leading-none">
        <span className="text-[#0B1B3B] dark:text-white">{BRAND_CONFIG.wordmarkPrefix}</span>
        <span className="text-[#F97316]">{BRAND_CONFIG.wordmarkAccent}</span>
        <span className="text-[#0B1B3B] dark:text-white">{BRAND_CONFIG.wordmarkSuffix}</span>
      </span>
    </span>
  );
}
