import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Award,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  ExternalLink,
  Globe,
  LineChart,
  Mail,
  Search,
  ShieldCheck,
  Target,
  UserCheck,
} from 'lucide-react';
import { PageLayout } from '../layouts/PageLayout';
import { ResponsiveContainer } from '../components/ResponsiveContainer';
import { ReusableCard } from '../components/ReusableCard';
import { ReusableButton } from '../components/ReusableButton';
import { BrandLogo } from '../components/BrandLogo';
import { SeoHead } from '../components/SeoHead';
import { BRAND_CONFIG } from '../assets/brand';
import { usePlatformData } from '../context/PlatformDataContext';
import { playClick } from '../utils/soundEffects';

const FAQS = [
  {
    q: 'Who created PREPSKM.IN and where can I follow official updates?',
    a: 'PREPSKM.IN is built by Sumit (@unfiltereddsumit) to give Class 9–12 Board, JEE Main, JEE Advanced, and NEET UG students a clean, distraction-free study portal. Follow @unfiltereddsumit across Instagram, YouTube, X (Twitter), Telegram, and GitHub.',
  },
  {
    q: 'Can I review my past CBT Mock Test analysis and full solutions anytime?',
    a: 'Yes! Open the Analytics or CBT Mocks page and click "Analysis & Solutions" on any past test attempt to inspect your Official Score, Exam IQ, Subject graphs, full Question-by-Question Solutions, and instant Gemini AI explanations.',
  },
  {
    q: 'How does the CBT Mock Test Room-Exit Warning work?',
    a: 'Switching tabs, minimizing the browser, or leaving the test window during a live CBT mock triggers an instant Room-Exit Warning alert with sound and logs focus integrity on your final scorecard.',
  },
  {
    q: 'Can I download chapter PDFs and video lecture notes?',
    a: 'Yes. All chapter PDFs, Short Notes, Formula Sheets, PYQs, and PDF attachments tagged underneath Concept Videos have direct Download PDF buttons. Videos stream smoothly in-app for focused viewing.',
  },
  {
    q: 'How does the Gemini AI IQ & Priority Coach help me?',
    a: 'Gemini AI reads your real mock accuracy, solving pace, weak chapters, and target class track to clearly tell you Kya Jaruri Hai (high-yield priorities), Kya Jaruri Nahi Hai (what to stop wasting time on), and a 7-day revision roadmap.',
  },
];

export default function AboutPage() {
  const { allCohorts, chapters, mockTests } = usePlatformData();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const aboutJsonLd = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'AboutPage',
          name: 'About PREPSKM.IN — Created by @unfiltereddsumit',
          url: 'https://prepskm.in/about',
          description:
            'Official About page for PREPSKM.IN by @unfiltereddsumit — India’s structured JEE Main, JEE Advanced, NEET UG, and Class 9–12 Board preparation ecosystem.',
        },
        {
          '@type': 'FAQPage',
          mainEntity: FAQS.map((item) => ({
            '@type': 'Question',
            name: item.q,
            acceptedAnswer: {
              '@type': 'Answer',
              text: item.a,
            },
          })),
        },
      ],
    }),
    []
  );

  return (
    <PageLayout>
      <SeoHead
        title="About PREPSKM.IN (@unfiltereddsumit) — JEE, NEET & Board Study Hub"
        description="Official PREPSKM.IN by @unfiltereddsumit — Explore our mission, official @unfiltereddsumit social accounts, Google Search sitelinks, NTA CBT mocks, and FAQs."
        canonicalPath="/about"
        keywords="About PREPSKM, prepskm.in, unfiltereddsumit, JEE preparation platform, NEET UG CBT mock tests, CBSE board study materials"
        jsonLd={aboutJsonLd}
      />

      <ResponsiveContainer className="py-6 sm:py-10 space-y-8">
        {/* Hero / Mission */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center"
        >
          <div className="lg:col-span-7 space-y-3.5">
            <p className="text-xs font-bold uppercase tracking-widest text-[#F97316]">
              About {BRAND_CONFIG.name} · Created by {BRAND_CONFIG.creatorHandle}
            </p>
            <h1 className="font-display text-2xl sm:text-4xl font-extrabold text-[#0B1B3B] dark:text-white leading-tight">
              Built to turn daily consistency into top JEE, NEET &amp; Board ranks.
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              PREPSKM.IN brings together Monday–Sunday weekly schedules, chapter-wise PDFs &amp; concept
              videos with attached notes, NTA-style CBT exam rooms with room-exit warnings, past test
              solution archives, and Gemini AI IQ coaching — all in one fast, distraction-free portal.
            </p>
            <div className="flex flex-wrap gap-2.5 pt-1">
              <ReusableButton variant="primary" size="sm" to="/materials">
                Explore Chapters
              </ReusableButton>
              <ReusableButton variant="secondary" size="sm" to="/cbt-mocks">
                Try CBT Mock
              </ReusableButton>
            </div>
          </div>

          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <BrandLogo variant="hero" className="w-full max-w-xs sm:max-w-sm" />
          </div>
        </motion.section>

        {/* Official Creator & All @unfiltereddsumit Accounts */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.25 }}
        >
          <ReusableCard padding="sm" className="space-y-4 border-[#F97316]/30">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="h-9 w-9 rounded-xl bg-orange-50 dark:bg-orange-950/50 text-[#F97316] inline-flex items-center justify-center shrink-0">
                  <UserCheck className="w-5 h-5" />
                </span>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#F97316]">
                    Official Creator &amp; Community Links
                  </p>
                  <h2 className="font-display text-base sm:text-lg font-bold text-[#0B1B3B] dark:text-white">
                    Follow {BRAND_CONFIG.creatorHandle} Everywhere
                  </h2>
                </div>
              </div>
              <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-[#0B1B3B] text-white dark:bg-[#2563EB]">
                {BRAND_CONFIG.creatorHandle}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {BRAND_CONFIG.socials.map((social) => (
                <a
                  key={social.id}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => playClick()}
                  className="group p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 hover:border-[#2563EB] dark:hover:border-sky-400 transition-all flex flex-col justify-between gap-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display text-xs sm:text-sm font-bold text-[#0B1B3B] dark:text-white group-hover:text-[#2563EB] dark:group-hover:text-sky-400">
                      {social.label}
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#2563EB]" />
                  </div>
                  <p className="font-mono text-[11px] font-semibold text-[#F97316] truncate">
                    {social.handle}
                  </p>
                </a>
              ))}
            </div>
          </ReusableCard>
        </motion.section>

        {/* Google Search Rich Result & Sitelinks Live Preview */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.25 }}
          className="space-y-3"
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#2563EB] dark:text-sky-400 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" />
              Google Search SEO &amp; Sitelinks Architecture
            </p>
            <h2 className="font-display text-lg sm:text-xl font-bold text-[#0B1B3B] dark:text-white mt-0.5">
              How PREPSKM.IN Appears on Google Search
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Configured with Schema.org WebSite, EducationalOrganization, SiteNavigationElement, XML Sitemap, and square brand favicon so Google displays your emblem, clean student description, and clickable sub-options.
            </p>
          </div>

          <ReusableCard padding="sm" className="bg-white dark:bg-[#14171F] border-slate-200 dark:border-slate-800 space-y-4">
            {/* Simulated Google Search Bar */}
            <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 max-w-md">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-100">
                prepskm.in
              </span>
            </div>

            {/* Main SERP Snippet */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <span className="h-7 w-7 rounded-full bg-white border border-slate-200 flex items-center justify-center p-1 shrink-0">
                  <img
                    src={BRAND_CONFIG.logoPath}
                    alt={BRAND_CONFIG.logoAlt}
                    className="w-full h-full object-contain"
                  />
                </span>
                <div className="leading-tight">
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    PREPSKM.IN
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    https://prepskm.in
                  </p>
                </div>
              </div>

              <Link
                to="/"
                className="block text-base sm:text-lg font-semibold text-[#1a0dab] dark:text-[#8ab4f8] hover:underline leading-snug"
              >
                PREPSKM.IN — JEE, NEET &amp; Class 9–12 Study Platform by @unfiltereddsumit
              </Link>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed">
                Official PREPSKM.IN by @unfiltereddsumit — Free JEE Main, JEE Advanced, NEET UG &amp;
                Class 9–12 Board chapter notes, concept videos, NTA CBT mock tests, DPPs &amp; Gemini
                AI IQ analytics.
              </p>
            </div>

            {/* Google Sitelinks Options Below Main Result */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              {BRAND_CONFIG.googleSitelinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => playClick()}
                  className="p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors space-y-0.5"
                >
                  <p className="text-sm font-semibold text-[#1a0dab] dark:text-[#8ab4f8] hover:underline">
                    {link.title}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-snug">
                    {link.description}
                  </p>
                </Link>
              ))}
            </div>

            {/* Active SEO Technical Signals */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> sitemap.xml + robots.txt
              </span>
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> WebSite + SiteNavigationElement JSON-LD
              </span>
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> 192×192 Emblem Favicon
              </span>
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> @unfiltereddsumit Knowledge Graph sameAs
              </span>
            </div>
          </ReusableCard>
        </motion.section>

        {/* Compact Core Pillars */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <ReusableCard padding="sm" className="space-y-1.5">
            <Target className="w-4 h-4 text-[#2563EB]" />
            <h2 className="font-display text-sm font-bold text-[#0B1B3B] dark:text-white">
              {allCohorts.length}+ Class Tracks
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Class 9–12 Boards, JEE, NEET &amp; Droppers.
            </p>
          </ReusableCard>

          <ReusableCard padding="sm" className="space-y-1.5">
            <BookOpen className="w-4 h-4 text-[#F97316]" />
            <h2 className="font-display text-sm font-bold text-[#0B1B3B] dark:text-white">
              {chapters.length}+ Chapters
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Downloadable PDFs &amp; Concept Videos with notes.
            </p>
          </ReusableCard>

          <ReusableCard padding="sm" className="space-y-1.5">
            <ClipboardCheck className="w-4 h-4 text-[#10B981]" />
            <h2 className="font-display text-sm font-bold text-[#0B1B3B] dark:text-white">
              {mockTests.length}+ CBT &amp; DPPs
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Syllabus viewer, Room-Exit warnings &amp; past solutions.
            </p>
          </ReusableCard>

          <ReusableCard padding="sm" className="space-y-1.5">
            <LineChart className="w-4 h-4 text-indigo-500" />
            <h2 className="font-display text-sm font-bold text-[#0B1B3B] dark:text-white">
              Gemini AI IQ Coach
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Tells you Kya Jaruri Hai &amp; what to skip.
            </p>
          </ReusableCard>
        </section>

        {/* FAQs + Contact */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <ReusableCard padding="sm" className="lg:col-span-7 space-y-3">
            <div className="flex items-center gap-2 text-[#2563EB] dark:text-sky-400">
              <Award className="w-4 h-4" />
              <h2 className="font-display text-base sm:text-lg font-bold text-[#0B1B3B] dark:text-white">
                Frequently Asked Questions
              </h2>
            </div>

            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {FAQS.map((item, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div key={item.q} className="py-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        playClick();
                        setOpenFaq(isOpen ? null : idx);
                      }}
                      aria-expanded={isOpen}
                      className="w-full flex items-center justify-between gap-2 text-left font-display text-xs sm:text-sm font-bold text-[#0B1B3B] dark:text-white"
                    >
                      <span>{item.q}</span>
                      <ChevronDown
                        className={`w-4 h-4 shrink-0 text-slate-500 transition-transform ${
                          isOpen ? 'rotate-180 text-[#F97316]' : ''
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        {item.a}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </ReusableCard>

          <ReusableCard padding="sm" className="lg:col-span-5 space-y-4 flex flex-col justify-between">
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-[#F97316]">
                <ShieldCheck className="w-4 h-4" />
                <h2 className="font-display text-base sm:text-lg font-bold text-[#0B1B3B] dark:text-white">
                  Privacy &amp; Student Trust
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Your CBT attempts, weekly routine, and profile data are safeguarded by owner-scoped
                Firebase Auth &amp; Firestore rules. Zero distracting ads during exam or study sessions.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#2563EB] dark:text-sky-400">
                Contact &amp; Official Desk
              </p>
              <p className="text-xs sm:text-sm font-semibold text-[#0B1B3B] dark:text-white flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#F97316]" />
                <a href={`mailto:${BRAND_CONFIG.supportEmail}`} className="hover:underline">
                  {BRAND_CONFIG.supportEmail}
                </a>
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Creator Handle:{' '}
                <strong className="font-mono text-[#F97316]">{BRAND_CONFIG.creatorHandle}</strong>
              </p>
            </div>
          </ReusableCard>
        </section>
      </ResponsiveContainer>
    </PageLayout>
  );
}
