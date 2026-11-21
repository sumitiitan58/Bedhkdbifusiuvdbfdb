import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { BRAND_CONFIG } from '../assets/brand';
import { PUBLIC_NAV_ROUTES } from '../utils/navigation';
import { usePlatformData } from '../context/PlatformDataContext';

export function Footer() {
  const { allCohorts } = usePlatformData();

  return (
    <footer className="bg-white dark:bg-[#0C1324] border-t border-slate-200 dark:border-slate-800 mt-10 pb-20 lg:pb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          <div className="md:col-span-5 space-y-2.5">
            <BrandLogo variant="footer" />
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-md">
              Official JEE Main, JEE Advanced, NEET UG &amp; Class 9–12 Board platform by{' '}
              <span className="font-semibold text-[#0B1B3B] dark:text-white">
                {BRAND_CONFIG.creatorHandle}
              </span>{' '}
              — uniting chapter-wise concise notes, PDFs &amp; concept videos, NTA CBT mock tests, DPPs, and Gemini AI IQ analytics.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {BRAND_CONFIG.socials.map((s) => (
                <a
                  key={s.id}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:border-[#2563EB] hover:text-[#2563EB] dark:hover:text-sky-400 transition-colors"
                >
                  <span>{s.label}</span>
                  <ExternalLink className="w-3 h-3 opacity-70" />
                </a>
              ))}
            </div>
          </div>

          <div className="md:col-span-3">
            <h3 className="font-display text-xs font-bold uppercase tracking-wider text-[#0B1B3B] dark:text-white">
              Quick Sitelinks
            </h3>
            <ul className="mt-2.5 grid grid-cols-2 md:grid-cols-1 gap-y-1.5 gap-x-4 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              {PUBLIC_NAV_ROUTES.filter((r) => r.path !== '/admin').map((route) => (
                <li key={route.path}>
                  <Link
                    to={route.path}
                    className="hover:text-[#2563EB] dark:hover:text-sky-400 transition-colors"
                  >
                    {route.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  to="/profile"
                  className="hover:text-[#2563EB] dark:hover:text-sky-400 transition-colors"
                >
                  Student Profile
                </Link>
              </li>
              <li>
                <Link
                  to="/about"
                  className="hover:text-[#2563EB] dark:hover:text-sky-400 transition-colors"
                >
                  About {BRAND_CONFIG.creatorHandle}
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-4 space-y-2.5">
            <h3 className="font-display text-xs font-bold uppercase tracking-wider text-[#0B1B3B] dark:text-white">
              Classes &amp; Streams
            </h3>
            <div className="flex flex-wrap gap-x-2 gap-y-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {allCohorts.map((c, idx) => (
                <span key={c.id} className="inline-flex items-center gap-2">
                  <Link
                    to={`/materials?track=${encodeURIComponent(c.id)}`}
                    className="hover:text-[#2563EB] dark:hover:text-sky-400 hover:underline transition-colors"
                  >
                    {c.shortLabel || c.label}
                  </Link>
                  {idx < allCohorts.length - 1 && (
                    <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                      ·
                    </span>
                  )}
                </span>
              ))}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 pt-1">
              Portal: <span className="font-mono">{BRAND_CONFIG.websiteUrl}</span> · Official Handle:{' '}
              <span className="font-mono font-semibold text-[#F97316]">
                {BRAND_CONFIG.creatorHandle}
              </span>
            </p>
          </div>
        </div>

        <div className="mt-7 pt-5 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <p>
            © {new Date().getFullYear()} {BRAND_CONFIG.name} · Built by {BRAND_CONFIG.creatorHandle}.
          </p>
          <p>JEE Main · JEE Advanced · NEET UG · Class 9–12 Boards</p>
        </div>
      </div>
    </footer>
  );
}
