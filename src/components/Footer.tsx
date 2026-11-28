import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { BRAND_CONFIG } from '../assets/brand';
import { PUBLIC_NAV_ROUTES } from '../utils/navigation';
import { usePlatformData } from '../context/PlatformDataContext';

export function Footer() {
  const { allCohorts } = usePlatformData();

  return (
    <footer className="bg-[#060A14]/90 backdrop-blur-md border-t border-slate-400/[0.14] mt-12 pb-20 lg:pb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          <div className="md:col-span-5 space-y-3">
            <BrandLogo variant="footer" />
            <p className="text-sm text-[#94A3B8] leading-relaxed max-w-md">
              100% Free JEE Main, JEE Advanced, NEET UG &amp; Class 9–12 study desk crafted by{' '}
              <span className="font-bold text-[#F8FAFC]">Sumit Kumar</span>{' '}
              <span className="font-mono text-xs text-[#FF7A00]">({BRAND_CONFIG.creatorHandle})</span>{' '}
              — uniting handwritten notes, inline Chapter DPPs, authentic NTA CBT mocks, Apex Arena, and Preps AI whiteboard tutoring.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {BRAND_CONFIG.socials.map((s) => (
                <a
                  key={s.id}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#0B1120] border border-slate-400/[0.14] text-xs font-semibold text-[#94A3B8] hover:border-[#00D4FF]/50 hover:text-[#00D4FF] transition-colors"
                >
                  <span>{s.label}</span>
                  <ExternalLink className="w-3 h-3 opacity-70" />
                </a>
              ))}
            </div>
          </div>

          <div className="md:col-span-3">
            <h3 className="font-display text-sm font-bold tracking-wide text-[#F8FAFC]">
              Explore Prepskm
            </h3>
            <ul className="mt-3 grid grid-cols-2 md:grid-cols-1 gap-y-2 gap-x-4 text-sm text-[#94A3B8]">
              {PUBLIC_NAV_ROUTES.filter((r) => r.path !== '/admin').map((route) => (
                <li key={route.path}>
                  <Link
                    to={route.path}
                    className="hover:text-[#00D4FF] transition-colors"
                  >
                    {route.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  to="/workspace"
                  className="hover:text-[#00D4FF] transition-colors"
                >
                  Focus Workspace
                </Link>
              </li>
              <li>
                <Link
                  to="/about"
                  className="hover:text-[#00D4FF] transition-colors"
                >
                  About Prepskm
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-4 space-y-3">
            <h3 className="font-display text-sm font-bold tracking-wide text-[#F8FAFC]">
              Classes &amp; Streams
            </h3>
            <div className="flex flex-wrap gap-x-2 gap-y-1.5 text-sm text-[#94A3B8] leading-relaxed">
              {allCohorts.map((c, idx) => (
                <span key={c.id} className="inline-flex items-center gap-2">
                  <Link
                    to={`/materials?track=${encodeURIComponent(c.id)}`}
                    className="hover:text-[#FF7A00] hover:underline transition-colors"
                  >
                    {c.shortLabel || c.label}
                  </Link>
                  {idx < allCohorts.length - 1 && (
                    <span aria-hidden="true" className="text-slate-700">
                      ·
                    </span>
                  )}
                </span>
              ))}
            </div>
            <p className="text-xs text-[#94A3B8] pt-1">
              Portal: <span className="font-mono text-[#00D4FF]">{BRAND_CONFIG.websiteUrl}</span> · Creator:{' '}
              <span className="font-semibold text-[#FF7A00]">Sumit Kumar</span>
            </p>
          </div>
        </div>

        <div className="mt-8 pt-5 border-t border-slate-400/[0.12] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#94A3B8]">
          <p>
            © {new Date().getFullYear()} {BRAND_CONFIG.name} · Created by{' '}
            <span className="text-[#F8FAFC] font-semibold">Sumit Kumar</span> ({BRAND_CONFIG.creatorHandle}). 100% Free Forever.
          </p>
          <p>JEE Main · JEE Advanced · NEET UG · Class 9–12 Boards</p>
        </div>
      </div>
    </footer>
  );
}
