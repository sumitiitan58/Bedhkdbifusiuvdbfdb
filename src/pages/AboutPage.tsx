import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Award,
  BookOpen,
  ChevronDown,
  ClipboardCheck,
  Compass,
  ExternalLink,
  FileSpreadsheet,
  LineChart,
  Mail,
  ShieldCheck,
  Sparkles,
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
import { ABOUT_FAQS } from '../data/seoContent';

export { ABOUT_FAQS };

const STUDY_METHODOLOGY = [
  {
    step: '01',
    icon: BookOpen,
    title: 'Master High-Yield Chapters First',
    description:
      'Start every chapter with concise NCERT-aligned short notes, formula sheets, and mind maps structured cleanly by class track and subject.',
    route: '/materials',
    cta: 'Browse Notes',
  },
  {
    step: '02',
    icon: FileSpreadsheet,
    title: 'Lock In Speed with Chapter DPPs',
    description:
      'Build problem-solving reflexes through timed Daily Practice Problems covering Single MCQ, Multi-Correct, and Integer numerical patterns.',
    route: '/dpp',
    cta: 'Solve DPPs',
  },
  {
    step: '03',
    icon: ClipboardCheck,
    title: 'Simulate Real NTA Exam Pressure',
    description:
      'Attempt full-length JEE Main (300 marks) and NEET UG (720 marks) CBT mocks with +4/-1 marking, live question palette, and focus integrity alerts.',
    route: '/cbt-mocks',
    cta: 'Start CBT Mock',
  },
  {
    step: '04',
    icon: Sparkles,
    title: 'Eliminate Repeat Mistakes with Preps AI',
    description:
      'Turn wrong and skipped questions into an automated Mistake Notebook, inspect time-per-question analytics, and get step-by-step fixes from Preps AI.',
    route: '/preps-ai',
    cta: 'Ask Preps AI',
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
          name: 'About Prepskm (@unfiltereddsumit)',
          url: 'https://prepskm.in/about',
          description:
            'Meet Sumit (@unfiltereddsumit) and discover how PREPSKM.IN helps JEE, NEET & Class 9-12 students master NCERT notes, DPPs, and NTA CBT mocks.',
        },
        {
          '@type': 'FAQPage',
          mainEntity: ABOUT_FAQS.map((item) => ({
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
        title="About Prepskm (@unfiltereddsumit) | JEE & NEET Hub"
        description="Meet Sumit (@unfiltereddsumit) and discover how PREPSKM.IN helps JEE, NEET & Class 9-12 students master NCERT notes, DPPs, and NTA CBT mocks."
        canonicalPath="/about"
        keywords="About Prepskm, prepskm.in, unfiltereddsumit, JEE Main preparation, NEET UG CBT mock tests, Class 9-12 board notes"
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
              PREPSKM.IN brings together chapter-wise concise notes and formula sheets, timed
              Daily Practice Problems (DPPs), authentic NTA-pattern CBT mock tests, automated
              Mistake Notebooks, and Preps AI mentoring — all in one fast, distraction-free study
              workspace.
            </p>
            <div className="flex flex-wrap gap-2.5 pt-1">
              <ReusableButton variant="primary" size="sm" to="/materials">
                Explore Study Materials
              </ReusableButton>
              <ReusableButton variant="secondary" size="sm" to="/cbt-mocks">
                Try NTA CBT Mock
              </ReusableButton>
              <ReusableButton variant="ghost" size="sm" to="/preps-ai">
                Ask Preps AI
              </ReusableButton>
            </div>
          </div>

          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <BrandLogo variant="hero" className="w-full max-w-xs sm:max-w-sm" />
          </div>
        </motion.section>

        {/* How PREPSKM.IN Helps You Crack JEE, NEET & Boards */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.25 }}
          aria-labelledby="methodology-heading"
          className="space-y-4"
        >
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-[#2563EB] dark:text-sky-400 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5" />
              Proven 4-Step Study Methodology
            </p>
            <h2
              id="methodology-heading"
              className="font-display text-xl sm:text-2xl font-bold text-[#0B1B3B] dark:text-white"
            >
              How PREPSKM.IN Helps You Crack JEE, NEET &amp; Boards
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-3xl">
              Instead of scattering your preparation across disconnected PDFs and random video
              playlists, follow one structured loop from concept revision to exam-day mastery.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {STUDY_METHODOLOGY.map((item) => {
              const Icon = item.icon;
              return (
                <ReusableCard
                  key={item.step}
                  padding="sm"
                  className="flex flex-col justify-between gap-4 border-slate-200/90 dark:border-slate-800"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[#2563EB] dark:text-sky-400 inline-flex items-center justify-center">
                        <Icon className="w-4 h-4" />
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-400 dark:text-slate-500 tabular-nums">
                        STEP {item.step}
                      </span>
                    </div>
                    <h3 className="font-display text-sm sm:text-base font-bold text-[#0B1B3B] dark:text-white leading-snug">
                      {item.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <ReusableButton variant="ghost" size="sm" to={item.route} className="px-0">
                      {item.cta} →
                    </ReusableButton>
                  </div>
                </ReusableCard>
              );
            })}
          </div>
        </motion.section>

        {/* Compact Core Numbers */}
        <section aria-label="Platform highlights" className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <ReusableCard padding="sm" className="space-y-1.5">
            <Target className="w-4 h-4 text-[#2563EB]" />
            <h2 className="font-display text-base font-bold text-[#0B1B3B] dark:text-white tabular-nums">
              {allCohorts.length}+ Class Tracks
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Class 9–12 Boards, JEE Main &amp; Advanced, NEET UG &amp; Droppers.
            </p>
          </ReusableCard>

          <ReusableCard padding="sm" className="space-y-1.5">
            <BookOpen className="w-4 h-4 text-[#F97316]" />
            <h2 className="font-display text-base font-bold text-[#0B1B3B] dark:text-white tabular-nums">
              {chapters.length}+ Chapters
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              NCERT-aligned short notes, formula sheets, mind maps &amp; PYQs.
            </p>
          </ReusableCard>

          <ReusableCard padding="sm" className="space-y-1.5">
            <ClipboardCheck className="w-4 h-4 text-[#10B981]" />
            <h2 className="font-display text-base font-bold text-[#0B1B3B] dark:text-white tabular-nums">
              {mockTests.length}+ CBT Mocks &amp; DPPs
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              NTA interface with syllabus preview, +4/-1 marking &amp; instant solutions.
            </p>
          </ReusableCard>

          <ReusableCard padding="sm" className="space-y-1.5">
            <LineChart className="w-4 h-4 text-indigo-500" />
            <h2 className="font-display text-base font-bold text-[#0B1B3B] dark:text-white">
              Preps AI &amp; Analytics
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Pacing diagnosis, mistake fixing &amp; personalized 7-day study plans.
            </p>
          </ReusableCard>
        </section>

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
                    Official Creator &amp; Community Channels
                  </p>
                  <h2 className="font-display text-base sm:text-lg font-bold text-[#0B1B3B] dark:text-white">
                    Connect with {BRAND_CONFIG.creatorHandle}
                  </h2>
                </div>
              </div>
              <span className="font-mono text-xs font-bold text-[#0B1B3B] dark:text-sky-300">
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

        {/* FAQs + Privacy & Contact */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <ReusableCard padding="sm" className="lg:col-span-7 space-y-3">
            <div className="flex items-center gap-2 text-[#2563EB] dark:text-sky-400">
              <Award className="w-4 h-4" />
              <h2 className="font-display text-base sm:text-lg font-bold text-[#0B1B3B] dark:text-white">
                Frequently Asked Questions
              </h2>
            </div>

            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {ABOUT_FAQS.map((item, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div key={item.q} className="py-3">
                    <button
                      type="button"
                      onClick={() => {
                        playClick();
                        setOpenFaq(isOpen ? null : idx);
                      }}
                      aria-expanded={isOpen}
                      className="w-full flex items-center justify-between gap-3 text-left font-display text-xs sm:text-sm font-bold text-[#0B1B3B] dark:text-white"
                    >
                      <span>{item.q}</span>
                      <ChevronDown
                        className={`w-4 h-4 shrink-0 text-slate-500 transition-transform ${
                          isOpen ? 'rotate-180 text-[#F97316]' : ''
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
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
                Your CBT attempts, Mistake Notebook, weekly routine, and profile preferences stay
                private to your account via Firebase Authentication and owner-scoped cloud sync.
                Study without popups or distracting interruptions during live mock tests.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#2563EB] dark:text-sky-400">
                Student Support &amp; Feedback
              </p>
              <p className="text-xs sm:text-sm font-semibold text-[#0B1B3B] dark:text-white flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#F97316]" />
                <a href={`mailto:${BRAND_CONFIG.supportEmail}`} className="hover:underline">
                  {BRAND_CONFIG.supportEmail}
                </a>
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Built by{' '}
                <strong className="font-mono text-[#F97316]">{BRAND_CONFIG.creatorHandle}</strong>{' '}
                for Indian JEE, NEET &amp; Board aspirants.
              </p>
            </div>
          </ReusableCard>
        </section>
      </ResponsiveContainer>
    </PageLayout>
  );
}
