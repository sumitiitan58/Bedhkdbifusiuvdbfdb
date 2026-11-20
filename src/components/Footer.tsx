import { Link } from 'react-router-dom';
import { BrandLogo } from './BrandLogo';
import { BRAND_CONFIG } from '../assets/brand';
import { PUBLIC_NAV_ROUTES } from '../utils/navigation';
import { usePlatformData } from '../context/PlatformDataContext';

export function Footer() {
  const { allCohorts } = usePlatformData();

  return (
    <footer className="bg-white dark:bg-[#0C1324] border-t border-slate-200 dark:border-slate-800 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          <div className="md:col-span-5 space-y-3">
            <BrandLogo variant="footer" />
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-md">
              Multi-class educational ecosystem for Class 9–10 Foundation, Class 11–12 Boards,
              JEE Main &amp; Advanced, NEET UG, and Droppers — uniting weekly study schedules,
              chapter-organized PDFs &amp; videos, NTA-style CBT mocks, DPPs, and deep performance graphs.
            </p>
          </div>

          <div className="md:col-span-3">
            <h3 className="font-display text-sm font-bold text-[#0B1B3B] dark:text-white">
              Platform Navigation
            </h3>
            <ul className="mt-3 grid grid-cols-2 md:grid-cols-1 gap-y-2 gap-x-4 text-sm text-slate-600 dark:text-slate-400">
              {PUBLIC_NAV_ROUTES.map((route) => (
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
                  About &amp; FAQs
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-4">
            <h3 className="font-display text-sm font-bold text-[#0B1B3B] dark:text-white">
              Active Classes &amp; Sub-Classes
            </h3>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {allCohorts.map((c) => c.shortLabel).join(' · ')}
            </p>
            <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
              Official Portal: <span className="font-mono">{BRAND_CONFIG.websiteUrl}</span>
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Academic Support: {BRAND_CONFIG.supportEmail}
            </p>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <p>© {new Date().getFullYear()} {BRAND_CONFIG.name}. All rights reserved.</p>
          <p>Engineered for focused preparation across JEE, NEET &amp; Boards.</p>
        </div>
      </div>
    </footer>
  );
}
