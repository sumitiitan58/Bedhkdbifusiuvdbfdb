import { useMemo, useState } from 'react';
import {
  Award,
  BookOpen,
  ChevronDown,
  ClipboardCheck,
  LineChart,
  Mail,
  ShieldCheck,
  Target,
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
    q: 'Which classes and entrance exams does PREPSKM.IN cover?',
    a: 'PREPSKM.IN supports Class 9 & Class 10 Foundation, Class 11 & Class 12 Board, JEE Main & Advanced, NEET UG, and JEE/NEET Droppers — all dynamically configurable with dedicated chapters, notes, videos, DPPs, and CBT mocks.',
  },
  {
    q: 'How does the CBT Mock Test Room-Exit Warning work?',
    a: 'To build authentic NTA exam discipline, switching tabs, minimizing the browser, or attempting to exit during a live CBT mock triggers an instant Room-Exit Warning alert with sound and logs focus integrity on your final scorecard.',
  },
  {
    q: 'Can I view a CBT mock test syllabus before starting the exam?',
    a: 'Yes! Every CBT mock card includes a dedicated "View Syllabus" button showing exact Physics, Chemistry, Mathematics, and Biology chapters covered, plus exam-specific instructions for JEE Main, JEE Advanced, NEET UG, or Board Exams.',
  },
  {
    q: 'Are study materials and video lectures organized chapter-by-chapter?',
    a: 'Yes. On the Materials page, select your class and click any chapter to explore all admin-curated sections (Short Notes, Formula Sheets, Concept Videos with thumbnails, PYQs, and NCERT Diagram Banks) inside one clean workspace.',
  },
  {
    q: 'Is my weekly schedule and test history saved across devices?',
    a: 'You can start immediately in Guest Mode with local browser persistence, or sign in with Google anytime to sync your Weekly Schedule, 60-Day Study Planner, Profile Photo, Bookmarks, and CBT Analytics across mobile and desktop.',
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
          name: 'About PREPSKM.IN — JEE, NEET & Board Learning Platform',
          url: 'https://prepskm.in/about',
          description:
            'Learn about PREPSKM.IN, our mission for Indian Class 9–12 Board, JEE Main, JEE Advanced, and NEET UG students, and how our weekly schedules, chapter resources, and NTA CBT mocks work.',
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
        title="About PREPSKM.IN — Mission, JEE/NEET Methodology & FAQs"
        description="Discover PREPSKM.IN: India's structured preparation ecosystem for Class 9–12 Boards, JEE Main & Advanced, NEET UG, and Droppers with weekly study schedules, chapter materials, and NTA CBT mocks."
        canonicalPath="/about"
        keywords="About PREPSKM, prepskm.in mission, JEE preparation platform, NEET UG CBT mock tests, CBSE board study materials, weekly study schedule"
        jsonLd={aboutJsonLd}
      />

      <ResponsiveContainer className="py-10 sm:py-14 space-y-12">
        {/* Hero / Mission */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-[#F97316]">
              About {BRAND_CONFIG.name}
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-[#0B1B3B] dark:text-white leading-tight">
              Built to turn daily consistency into top JEE, NEET &amp; Board ranks.
            </h1>
            <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              PREPSKM.IN eliminates scattered PDFs, confusing playlists, and uncalibrated mock tests.
              We bring together structured Monday–Sunday weekly schedules, chapter-first study hubs
              with PDFs and concept videos, NTA-grade CBT exam rooms with anti-distraction warnings,
              and honest pacing diagnostics in one fast, distraction-free web portal.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <ReusableButton variant="primary" to="/materials">
                Explore Chapter Materials
              </ReusableButton>
              <ReusableButton variant="secondary" to="/cbt-mocks">
                Try NTA CBT Mock Test
              </ReusableButton>
            </div>
          </div>

          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <BrandLogo variant="hero" className="w-full max-w-sm" />
          </div>
        </section>

        {/* Core Pillars */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ReusableCard padding="sm" className="space-y-2.5">
            <span className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-sky-400 inline-flex items-center justify-center">
              <Target className="w-5 h-5" />
            </span>
            <h2 className="font-display text-base font-bold text-[#0B1B3B] dark:text-white">
              {allCohorts.length}+ Focused Tracks
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Dedicated paths for Class 9–10 Foundation, Class 11–12 Board, JEE Main/Adv, NEET UG, and Droppers.
            </p>
          </ReusableCard>

          <ReusableCard padding="sm" className="space-y-2.5">
            <span className="h-10 w-10 rounded-xl bg-orange-50 dark:bg-orange-950/50 text-[#F97316] inline-flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </span>
            <h2 className="font-display text-base font-bold text-[#0B1B3B] dark:text-white">
              {chapters.length}+ Chapter Workspaces
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Open any chapter to access faculty-curated Short Notes, Formula Sheets, PYQs, and Concept Videos.
            </p>
          </ReusableCard>

          <ReusableCard padding="sm" className="space-y-2.5">
            <span className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-[#10B981] inline-flex items-center justify-center">
              <ClipboardCheck className="w-5 h-5" />
            </span>
            <h2 className="font-display text-base font-bold text-[#0B1B3B] dark:text-white">
              {mockTests.length}+ CBT Mocks &amp; DPPs
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Exam-specific instructions, Syllabus viewer, Room-Exit warnings, and instant step-by-step solutions.
            </p>
          </ReusableCard>

          <ReusableCard padding="sm" className="space-y-2.5">
            <span className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 inline-flex items-center justify-center">
              <LineChart className="w-5 h-5" />
            </span>
            <h2 className="font-display text-base font-bold text-[#0B1B3B] dark:text-white">
              Graphical Exam Diagnostics
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Subject mastery radar, per-question pacing charts, and Exam IQ calibrated to eliminate careless rushing.
            </p>
          </ReusableCard>
        </section>

        {/* Privacy, Academic Integrity & Contact */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <ReusableCard className="lg:col-span-7 space-y-4">
            <div className="flex items-center gap-2 text-[#2563EB] dark:text-sky-400">
              <Award className="w-5 h-5" />
              <h2 className="font-display text-xl font-bold text-[#0B1B3B] dark:text-white">
                Frequently Asked Questions
              </h2>
            </div>

            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {FAQS.map((item, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div key={item.q} className="py-3.5">
                    <button
                      type="button"
                      onClick={() => {
                        playClick();
                        setOpenFaq(isOpen ? null : idx);
                      }}
                      aria-expanded={isOpen}
                      className="w-full flex items-center justify-between gap-3 text-left font-display text-sm sm:text-base font-bold text-[#0B1B3B] dark:text-white"
                    >
                      <span>{item.q}</span>
                      <ChevronDown
                        className={`w-4 h-4 shrink-0 text-slate-500 transition-transform ${
                          isOpen ? 'rotate-180 text-[#F97316]' : ''
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        {item.a}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </ReusableCard>

          <ReusableCard className="lg:col-span-5 space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[#F97316]">
                <ShieldCheck className="w-5 h-5" />
                <h2 className="font-display text-xl font-bold text-[#0B1B3B] dark:text-white">
                  Privacy &amp; Student Trust
                </h2>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Student test attempts, weekly study schedules, and profile records are protected by
                owner-scoped Firebase Authentication &amp; Firestore security rules. We never display
                distracting third-party ads during study or CBT sessions.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-[#2563EB] dark:text-sky-400">
                Contact &amp; Academic Desk
              </p>
              <p className="text-sm font-semibold text-[#0B1B3B] dark:text-white flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#F97316]" />
                <a href={`mailto:${BRAND_CONFIG.supportEmail}`} className="hover:underline">
                  {BRAND_CONFIG.supportEmail}
                </a>
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Official Website: {BRAND_CONFIG.websiteUrl}
              </p>
            </div>
          </ReusableCard>
        </section>
      </ResponsiveContainer>
    </PageLayout>
  );
}
