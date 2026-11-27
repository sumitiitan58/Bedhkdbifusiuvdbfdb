import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Minus,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { PageLayout } from '../layouts/PageLayout';
import { ResponsiveContainer } from '../components/ResponsiveContainer';
import { SeoHead } from '../components/SeoHead';
import { useLanguage } from '../context/LanguageContext';
import { playClick, playSuccess } from '../utils/soundEffects';

type BillingCycle = 'monthly' | 'yearly';

const COMPARISON_ROWS: Array<{
  feature: string;
  free: boolean | string;
  pro: boolean | string;
  mentorship: boolean | string;
}> = [
  { feature: 'Zero-Login Guest Mode & NTA CBT Mocks', free: true, pro: true, mentorship: true },
  { feature: 'Concept-Mapped PYQs (Bilingual EN/हिं)', free: true, pro: true, mentorship: true },
  { feature: 'NCERT-to-PYQ Line-by-Line Mapper', free: 'Core Chapters', pro: 'Full Class 11 & 12', mentorship: true },
  { feature: '2027 High-Yield Predictor & Weightage Analytics', free: true, pro: 'Full + PDF Export', mentorship: true },
  { feature: 'Mistake Notebook + SM-2 Spaced Revision', free: 'Up to 50 cards', pro: 'Unlimited + AI Drills', mentorship: true },
  { feature: 'PrepsBot AI Tutor & Live Whiteboard', free: 'Daily Free Quota', pro: 'Unlimited Priority', mentorship: 'Optional Add-on' },
  { feature: 'Apex Arena 1v1 AI Duels & Sunday All-India Blitz', free: true, pro: true, mentorship: true },
  { feature: '1:1 Live Video Call with Verified IIT/AIIMS Mentor', free: false, pro: '1 Free Pass / yr', mentorship: '₹129–₹149 / 15 min' },
];

const PRICING_FAQS = [
  {
    q: 'Can I prepare for JEE or NEET completely free on Prepskm 2.0?',
    a: 'Yes! Guest Mode, NTA CBT Custom Mock Builder, Concept-Mapped PYQs, Apex Arena 1v1 duels, Sunday All-India Blitz, and the Peer Community remain 100% free forever with zero paywalls.',
  },
  {
    q: 'Why does Prepskm Pro cost only ₹499/year?',
    a: 'Prepskm was built by a student for Indian aspirants. Pro simply covers our high-speed AI tutor GPU/API costs and unlimited spaced-repetition cloud sync without charging coaching-sized fees.',
  },
  {
    q: 'How do 1:1 IIT/AIIMS Mentorship Passes work?',
    a: 'You pay strictly per 15-minute session (₹129–₹149) with zero subscription lock-in. Pick a verified IIT Bombay/Delhi/Madras or AIIMS Delhi mentor from the Mentors directory to get a tailored backlog & test-strategy roadmap.',
  },
  {
    q: 'Does Guest Mode lose my progress if I upgrade later?',
    a: 'No. Your local Guest Mode mocks, Daily Trifecta streak, and Mistake Notebook cards automatically sync the moment you sign in with Google.',
  },
  {
    q: 'Can I switch between JEE Main/Adv, NEET UG, and Class 9–12 on the same account?',
    a: 'Yes! Use the instant exam track switcher in the top bar anytime — all tracks are included in both Free Forever and Prepskm Pro.',
  },
];

export default function Pricing() {
  const { t } = useLanguage();
  const [billing, setBilling] = useState<BillingCycle>('yearly');
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);
  const [proModalOpen, setProModalOpen] = useState(false);
  const [proActivated, setProActivated] = useState(false);

  const proPrice = billing === 'yearly' ? '₹499' : '₹99';
  const proPeriod = billing === 'yearly' ? '/ year (₹41/mo)' : '/ month';

  return (
    <PageLayout>
      <SeoHead
        title="Pricing — Free Forever, Prepskm Pro & 1:1 IIT/AIIMS Mentorship | Prepskm 2.0"
        description="Start free forever with zero login wall. Upgrade to Prepskm Pro (₹499/yr) for unlimited AI & SM-2 tools or book pay-per-session 1:1 IIT/AIIMS Mentorship (₹129–₹149/15m)."
        canonicalPath="/pricing"
      />

      <ResponsiveContainer className="py-8 sm:py-12 space-y-12">
        {/* Centered Header + Monthly/Yearly Save 40% Toggle */}
        <section className="text-center max-w-2xl mx-auto space-y-4">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#0284C7] dark:text-[#06B6D4]">
            TRANSPARENT STUDENT-FIRST PRICING
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#0B1F3A] dark:text-[#F8FAFC] leading-tight">
            {t('pricing.title')}
          </h1>
          <p className="text-sm sm:text-base text-[#475569] dark:text-[#94A3B8]">
            {t('pricing.subtitle')}
          </p>

          {/* Billing Toggle */}
          <div className="pt-2 flex justify-center">
            <div
              role="tablist"
              aria-label="Billing cycle"
              className="inline-flex items-center p-1 rounded-2xl bg-[#EEF4FF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-white/[0.08]"
            >
              <button
                type="button"
                role="tab"
                aria-selected={billing === 'monthly'}
                onClick={() => {
                  playClick();
                  setBilling('monthly');
                }}
                className={`relative px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors ${
                  billing === 'monthly'
                    ? 'text-[#0B1F3A] dark:text-[#F8FAFC]'
                    : 'text-[#475569] dark:text-[#94A3B8]'
                }`}
              >
                {billing === 'monthly' && (
                  <motion.span
                    layoutId="billingTogglePill"
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="absolute inset-0 rounded-xl bg-[#FFFFFF] dark:bg-[#162033] border border-[#E2E8F0] dark:border-white/10 shadow-sm"
                  />
                )}
                <span className="relative z-10">Monthly</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={billing === 'yearly'}
                onClick={() => {
                  playClick();
                  setBilling('yearly');
                }}
                className={`relative px-4 py-2 rounded-xl text-xs sm:text-sm font-bold inline-flex items-center gap-2 transition-colors ${
                  billing === 'yearly'
                    ? 'text-[#0B1F3A] dark:text-[#F8FAFC]'
                    : 'text-[#475569] dark:text-[#94A3B8]'
                }`}
              >
                {billing === 'yearly' && (
                  <motion.span
                    layoutId="billingTogglePill"
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="absolute inset-0 rounded-xl bg-[#FFFFFF] dark:bg-[#162033] border border-[#E2E8F0] dark:border-white/10 shadow-sm"
                  />
                )}
                <span className="relative z-10">Yearly</span>
                <span className="relative z-10 px-2 py-0.5 rounded-full bg-[#22C55E]/15 text-[#15803D] dark:text-[#22C55E] font-mono text-[10px] font-bold">
                  Save 40%
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* 3-Column Pricing Cards */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {/* Card 1: Free Forever */}
          <div className="rounded-2xl bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-white/[0.08] p-6 flex flex-col justify-between gap-6">
            <div className="space-y-4">
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8]">
                  CORE PLATFORM
                </p>
                <h2 className="font-display text-xl font-bold text-[#0B1F3A] dark:text-[#F8FAFC] mt-1">
                  Free Forever
                </h2>
                <p className="text-xs text-[#475569] dark:text-[#94A3B8] mt-1">
                  Everything you need to practice daily without hitting a login wall.
                </p>
              </div>

              <div className="flex items-baseline gap-1.5">
                <span className="font-mono text-4xl font-bold tabular-nums text-[#0B1F3A] dark:text-[#F8FAFC]">
                  ₹0
                </span>
                <span className="text-xs font-semibold text-[#475569] dark:text-[#94A3B8]">
                  / forever
                </span>
              </div>

              <ul className="space-y-2.5 text-sm text-[#0B1F3A] dark:text-[#F8FAFC]">
                {[
                  'Zero-Login Guest Mode across all exams',
                  'Custom NTA CBT Mock Builder (+4/-1)',
                  'Concept-Mapped Bilingual PYQ Bank',
                  'Apex Arena 1v1 AI Duels & Sunday Blitz',
                  'Live Peer Community & JoSAA/MCC Cut-offs',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#22C55E] shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Link
              to="/cbt-mocks"
              onClick={() => playClick()}
              className="w-full py-3 px-4 rounded-xl text-sm font-bold bg-[#EEF4FF] dark:bg-[#162033] hover:bg-[#E2ECFF] dark:hover:bg-[#1E2B44] text-[#0B1F3A] dark:text-[#F8FAFC] border border-[#E2E8F0] dark:border-white/10 inline-flex items-center justify-center gap-2 transition-colors"
            >
              Start Free in Guest Mode
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Card 2: Prepskm Pro (Featured with #06B6D4 Glow) */}
          <div className="relative rounded-2xl bg-[#FFFFFF] dark:bg-[#0F172A] border-2 border-[#0284C7] dark:border-[#06B6D4] preps-featured-glow p-6 flex flex-col justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-xs font-bold uppercase tracking-wider text-[#0284C7] dark:text-[#06B6D4]">
                  SERIOUS RANKER
                </p>
                <span className="px-2.5 py-0.5 rounded-full bg-[#0284C7] dark:bg-[#06B6D4] text-white dark:text-[#070B14] font-mono text-[10px] font-bold tracking-wider">
                  MOST POPULAR
                </span>
              </div>

              <div>
                <h2 className="font-display text-xl font-bold text-[#0B1F3A] dark:text-[#F8FAFC]">
                  Prepskm Pro
                </h2>
                <p className="text-xs text-[#475569] dark:text-[#94A3B8] mt-1">
                  Unlimited AI explanations, full NCERT line-mapping &amp; deep SM-2 spaced revision.
                </p>
              </div>

              <div className="flex items-baseline gap-1.5">
                <span className="font-mono text-4xl font-bold tabular-nums text-[#0B1F3A] dark:text-[#F8FAFC]">
                  {proPrice}
                </span>
                <span className="text-xs font-semibold text-[#475569] dark:text-[#94A3B8]">
                  {proPeriod}
                </span>
              </div>

              <ul className="space-y-2.5 text-sm text-[#0B1F3A] dark:text-[#F8FAFC]">
                {[
                  'Everything in Free Forever',
                  'Unlimited PrepsBot AI Tutor & Live Whiteboard',
                  'Full Class 11 & 12 NCERT-to-PYQ Split Mapper',
                  'Unlimited Mistake Notebook + SM-2 Auto-Drills',
                  '2027 High-Yield Predictor PDF Roadmaps',
                  'Includes 1 Free 15-min IIT/AIIMS Mentor Pass (Yearly)',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#22C55E] shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="button"
              onClick={() => {
                playSuccess();
                setProModalOpen(true);
              }}
              className="w-full py-3 px-4 rounded-xl text-sm font-bold bg-[#0284C7] dark:bg-[#06B6D4] hover:opacity-95 text-white dark:text-[#070B14] inline-flex items-center justify-center gap-2 transition-opacity"
            >
              <Sparkles className="w-4 h-4" />
              {proActivated ? 'Prepskm Pro Active ✓' : `Upgrade to Pro (${proPrice})`}
            </button>
          </div>

          {/* Card 3: 1:1 IIT/AIIMS Human Mentorship */}
          <div className="rounded-2xl bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-white/[0.08] p-6 flex flex-col justify-between gap-6">
            <div className="space-y-4">
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-wider text-[#EA580C] dark:text-[#F97316]">
                  PAY PER SESSION · ZERO LOCK-IN
                </p>
                <h2 className="font-display text-xl font-bold text-[#0B1F3A] dark:text-[#F8FAFC] mt-1">
                  1:1 IIT/AIIMS Mentorship
                </h2>
                <p className="text-xs text-[#475569] dark:text-[#94A3B8] mt-1">
                  Direct human guidance from verified IITians &amp; AIIMS rankers whenever you feel stuck.
                </p>
              </div>

              <div className="flex items-baseline gap-1.5">
                <span className="font-mono text-3xl sm:text-4xl font-bold tabular-nums text-[#0B1F3A] dark:text-[#F8FAFC]">
                  ₹129–₹149
                </span>
                <span className="text-xs font-semibold text-[#475569] dark:text-[#94A3B8]">
                  / 15 min
                </span>
              </div>

              <ul className="space-y-2.5 text-sm text-[#0B1F3A] dark:text-[#F8FAFC]">
                {[
                  'Verified IIT Bombay, Delhi, Madras & AIIMS Mentors',
                  '15-minute live 1:1 strategy & backlog clearance call',
                  'Personal mock score & negative-marking audit',
                  'Custom 14-day chapter revision timetable',
                  'Instant UPI booking — zero monthly subscription',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#22C55E] shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Link
              to="/mentors"
              onClick={() => playClick()}
              className="w-full py-3 px-4 rounded-xl text-sm font-bold bg-[#F97316] hover:bg-[#FB923C] text-white inline-flex items-center justify-center gap-2 transition-colors"
            >
              <Users className="w-4 h-4" />
              Browse Verified Mentors
            </Link>
          </div>
        </section>

        {/* Compact Feature Comparison Table */}
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-[#0B1F3A] dark:text-[#F8FAFC]">
              Feature Comparison
            </h2>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#15803D] dark:text-[#22C55E]">
              <ShieldCheck className="w-4 h-4" />
              No hidden auto-renewals
            </span>
          </div>

          <div className="rounded-2xl bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-white/[0.08] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-[#F4F8FF] dark:bg-[#162033] border-b border-[#E2E8F0] dark:border-white/[0.08]">
                    <th className="py-3.5 px-4 font-bold text-[#0B1F3A] dark:text-[#F8FAFC]">
                      Capability
                    </th>
                    <th className="py-3.5 px-4 font-bold text-center text-[#0B1F3A] dark:text-[#F8FAFC]">
                      Free Forever
                    </th>
                    <th className="py-3.5 px-4 font-bold text-center text-[#0284C7] dark:text-[#22D3EE]">
                      Prepskm Pro
                    </th>
                    <th className="py-3.5 px-4 font-bold text-center text-[#EA580C] dark:text-[#F97316]">
                      1:1 Mentorship
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] dark:divide-white/[0.08]">
                  {COMPARISON_ROWS.map((row) => (
                    <tr key={row.feature}>
                      <td className="py-3 px-4 font-medium text-[#0B1F3A] dark:text-[#F8FAFC]">
                        {row.feature}
                      </td>
                      {[row.free, row.pro, row.mentorship].map((val, idx) => (
                        <td key={idx} className="py-3 px-4 text-center">
                          {val === true ? (
                            <Check className="w-4 h-4 text-[#22C55E] mx-auto" />
                          ) : val === false ? (
                            <Minus className="w-4 h-4 text-[#94A3B8] mx-auto" />
                          ) : (
                            <span className="font-mono text-xs font-semibold text-[#475569] dark:text-[#94A3B8]">
                              {val}
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* 5-Item Expandable FAQ Accordion */}
        <section className="max-w-3xl mx-auto space-y-4">
          <h2 className="font-display text-xl sm:text-2xl font-bold text-center text-[#0B1F3A] dark:text-[#F8FAFC]">
            Frequently Asked Questions
          </h2>

          <div className="space-y-2.5">
            {PRICING_FAQS.map((faq, idx) => {
              const open = openFaqIdx === idx;
              return (
                <div
                  key={faq.q}
                  className="rounded-2xl bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-white/[0.08] overflow-hidden"
                >
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => {
                      playClick();
                      setOpenFaqIdx(open ? null : idx);
                    }}
                    className="w-full px-5 py-4 flex items-center justify-between gap-3 text-left hover:bg-[#F4F8FF] dark:hover:bg-[#162033]/60 transition-colors"
                  >
                    <span className="font-display text-sm sm:text-base font-semibold text-[#0B1F3A] dark:text-[#F8FAFC]">
                      {faq.q}
                    </span>
                    {open ? (
                      <ChevronUp className="w-4 h-4 text-[#0284C7] dark:text-[#06B6D4] shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[#475569] dark:text-[#94A3B8] shrink-0" />
                    )}
                  </button>
                  {open && (
                    <div className="px-5 pb-4 text-sm text-[#475569] dark:text-[#94A3B8] leading-relaxed border-t border-[#E2E8F0] dark:border-white/[0.08] pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </ResponsiveContainer>

      {/* Prepskm Pro Activation Modal */}
      {proModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setProModalOpen(false)}
        >
          <div
            className="max-w-md w-full rounded-2xl bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-white/10 p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-xs font-bold text-[#0284C7] dark:text-[#06B6D4]">
                  PREPSKM PRO · {billing.toUpperCase()}
                </p>
                <h3 className="font-display text-lg font-bold text-[#0B1F3A] dark:text-[#F8FAFC] mt-0.5">
                  Confirm Student Pro Pass ({proPrice})
                </h3>
              </div>
              <button
                type="button"
                aria-label="Close modal"
                onClick={() => setProModalOpen(false)}
                className="p-1.5 rounded-lg text-[#475569] dark:text-[#94A3B8] hover:bg-[#EEF4FF] dark:hover:bg-[#162033]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {proActivated ? (
              <div className="rounded-xl bg-[#22C55E]/15 border border-[#22C55E]/35 p-4 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#22C55E] shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm text-[#0B1F3A] dark:text-[#F8FAFC]">
                  <p className="font-bold">Prepskm Pro Early-Access Preview Enabled!</p>
                  <p className="text-[#475569] dark:text-[#94A3B8] mt-1">
                    All Pro tools, unlimited AI explanations, and 2027 Predictor exports are now unlocked in your session.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs sm:text-sm text-[#475569] dark:text-[#94A3B8]">
                <p>
                  Unlock unlimited PrepsBot AI tutoring, full Class 11–12 NCERT-to-PYQ split view, and unlimited Mistake Notebook SM-2 revision packs.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    playSuccess();
                    setProActivated(true);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl text-sm font-bold bg-[#0284C7] dark:bg-[#06B6D4] text-white dark:text-[#070B14]"
                >
                  Activate Early-Access Pro Preview
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </PageLayout>
  );
}
