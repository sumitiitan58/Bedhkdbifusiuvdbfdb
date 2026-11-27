import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  ArrowRight,
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Flame,
  Gauge,
  Layers,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import prepsbotMascotImg from '../assets/images/prepsbot_3d_transparent.png';
import { PageLayout } from '../layouts/PageLayout';
import { ResponsiveContainer } from '../components/ResponsiveContainer';
import { SeoHead } from '../components/SeoHead';
import { DailyTrifectaBar } from '../components/dashboard/DailyTrifectaBar';
import { SundayBlitzCard } from '../components/dashboard/SundayBlitzCard';
import { DAILY_FORMULA_CHECKS, MASTERY_CHAPTERS_48, type MasteryStageKey } from '../data/prepskm2Data';
import { predictExamPercentile } from '../utils/percentilePredictor';
import { useLanguage } from '../context/LanguageContext';
import { useExam } from '../context/ExamContext';
import { usePrepskm2 } from '../context/Prepskm2Context';
import { usePlatformData } from '../context/PlatformDataContext';
import { useAuth } from '../context/AuthContext';
import { playClick, playNav, playSuccess } from '../utils/soundEffects';

type StudyDeckTab = 'practice' | 'focus' | 'mastery' | 'predictor';

const MASTERY_STAGES: Array<{ key: MasteryStageKey; label: string }> = [
  { key: 'theory', label: 'Theory' },
  { key: 'dpp', label: 'DPP' },
  { key: 'pyqs', label: 'PYQs' },
  { key: 'rev1', label: 'Rev 1' },
  { key: 'rev2', label: 'Rev 2' },
];

export default function HomePage() {
  const { t } = useLanguage();
  const { examTrack, trackConfig, lastPracticed } = useExam();
  const { isGuest } = useAuth();
  const { logFocusMinutes } = usePlatformData();
  const {
    masteryMap,
    toggleMasteryStage,
    backlogTasks,
    toggleBacklogTask,
    addBacklogTask,
    recordFocusBlockVerified,
    recordPyqSprintProgress,
    setCopilotOpen,
  } = usePrepskm2();

  // 4-Tab Interactive Study Deck state
  const [deckTab, setDeckTab] = useState<StudyDeckTab>('practice');

  // Tab 1: 10-Second Formula Duel
  const [formulaIdx, setFormulaIdx] = useState(0);
  const [formulaPicked, setFormulaPicked] = useState<number | null>(null);
  const [formulaCountdown, setFormulaCountdown] = useState(10);
  const [formulaStreak, setFormulaStreak] = useState(0);

  const activeFormula = DAILY_FORMULA_CHECKS[formulaIdx % DAILY_FORMULA_CHECKS.length];

  useEffect(() => {
    if (deckTab !== 'practice' || formulaPicked !== null) return;
    const id = window.setInterval(() => {
      setFormulaCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [deckTab, formulaPicked, formulaIdx]);

  const handleFormulaPick = (idx: number) => {
    if (formulaPicked !== null) return;
    setFormulaPicked(idx);
    if (idx === activeFormula.correctIndex) {
      playSuccess();
      setFormulaStreak((s) => s + 1);
      recordPyqSprintProgress(1);
    } else {
      playClick();
      setFormulaStreak(0);
    }
  };

  const handleNextFormula = () => {
    playClick();
    setFormulaIdx((i) => (i + 1) % DAILY_FORMULA_CHECKS.length);
    setFormulaPicked(null);
    setFormulaCountdown(10);
  };

  // Tab 2: Focus & Planner (25m / 50m Focus Block + Tab-Switch Break Warning + Top 3 Tasks)
  const [focusPreset, setFocusPreset] = useState<25 | 50>(25);
  const [focusSeconds, setFocusSeconds] = useState(25 * 60);
  const [focusRunning, setFocusRunning] = useState(false);
  const [tabBreaks, setTabBreaks] = useState(0);
  const [focusStatusNote, setFocusStatusNote] = useState<string | null>(null);
  const [quickTaskTitle, setQuickTaskTitle] = useState('');

  useEffect(() => {
    if (!focusRunning) return;
    const id = window.setInterval(() => {
      setFocusSeconds((prev) => {
        if (prev <= 1) {
          window.clearInterval(id);
          setFocusRunning(false);
          logFocusMinutes(focusPreset);
          recordFocusBlockVerified(focusPreset, tabBreaks);
          playSuccess();
          setFocusStatusNote(`Verified ${focusPreset}m Focus Block logged (+${focusPreset * 2} XP)!`);
          return focusPreset * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [focusRunning, focusPreset, tabBreaks, logFocusMinutes, recordFocusBlockVerified]);

  useEffect(() => {
    if (!focusRunning) return;
    const onVisibilityChange = () => {
      if (document.hidden) {
        setTabBreaks((b) => b + 1);
        setFocusStatusNote('Tab switch detected during Focus Block! Stay on this tab to protect your XP bonus.');
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [focusRunning]);

  const top3Tasks = useMemo(() => {
    const present = backlogTasks.filter((task) => task.bucket === 'present');
    return (present.length > 0 ? present : backlogTasks).slice(0, 4);
  }, [backlogTasks]);

  const handleAddQuickTask = () => {
    const clean = quickTaskTitle.trim();
    if (!clean) return;
    playSuccess();
    addBacklogTask({
      title: clean,
      subject: examTrack === 'neet' ? 'Biology' : 'Physics',
      dueDateIso: new Date().toISOString().slice(0, 10),
      bucket: 'present',
    });
    setQuickTaskTitle('');
  };

  // Tab 3: 5-Stage Chapter Mastery Tracker
  const [masterySubject, setMasterySubject] = useState<'Physics' | 'Chemistry' | 'Mathematics' | 'Biology'>(() =>
    examTrack === 'neet' ? 'Biology' : 'Physics'
  );

  const visibleMasteryChapters = useMemo(
    () => MASTERY_CHAPTERS_48.filter((c) => c.subject === masterySubject).slice(0, 6),
    [masterySubject]
  );

  const masteryCompletionPct = useMemo(() => {
    const total = visibleMasteryChapters.length * 5;
    if (total === 0) return 0;
    let done = 0;
    for (const ch of visibleMasteryChapters) {
      const stages = masteryMap[ch.id];
      if (!stages) continue;
      for (const s of MASTERY_STAGES) {
        if (stages[s.key]) done += 1;
      }
    }
    return Math.round((done / total) * 100);
  }, [visibleMasteryChapters, masteryMap]);

  // Tab 4: Live Percentile Predictor (auto-adapts to JEE / NEET / Boards)
  const predictorMax = examTrack === 'neet' ? 720 : examTrack === 'boards' ? 500 : 300;
  const [sliderMarks, setSliderMarks] = useState<number>(() =>
    examTrack === 'neet' ? 625 : examTrack === 'boards' ? 440 : 172
  );

  useEffect(() => {
    setSliderMarks(examTrack === 'neet' ? 625 : examTrack === 'boards' ? 440 : 172);
  }, [examTrack]);

  const prediction = useMemo(() => {
    if (examTrack === 'boards') {
      const pct = Math.min(99.8, Number(((sliderMarks / 500) * 100).toFixed(1)));
      return {
        percentile: pct,
        estimatedAir: Math.max(120, Math.round((100 - pct) * 4200)),
        targetTier: pct >= 95 ? 'CBSE 95%+ Merit Distinction' : pct >= 88 ? 'Strong Honours Distinction' : 'Core Board Mastery Zone',
        collegeOutlook: pct >= 95 ? 'CUET / Top DU Honours & Strong JEE/NEET Foundation' : 'Focus on NCERT Solved Examples + PYQ Writing Practice',
        topPercentLabel: `${pct}% Aggregate`,
      };
    }
    return predictExamPercentile(examTrack === 'neet' ? 'neet-ug' : 'jee-main', sliderMarks);
  }, [examTrack, sliderMarks]);

  const minsStr = String(Math.floor(focusSeconds / 60)).padStart(2, '0');
  const secsStr = String(focusSeconds % 60).padStart(2, '0');

  return (
    <PageLayout>
      <SeoHead
        title="Prepskm 2.0 — Concept-Mapped PYQs, Real NTA CBT Mocks & 1:1 IIT/AIIMS Mentors"
        description="Master JEE Main/Adv, NEET UG, and Class 9–12 with zero-login Guest Mode, Concept-Mapped PYQs, 2027 High-Yield Predictor, NCERT-to-PYQ Mapper, and 1:1 IIT/AIIMS Mentors."
        canonicalPath="/"
      />

      {/* =================================================================
          SECTION 1: CLEAN HERO BANNER (12-COL SPLIT + PREPSBOT COMMAND CARD)
         ================================================================= */}
      <section className="relative border-b border-[#E2E8F0] dark:border-white/[0.08] bg-gradient-to-br from-[#F4F8FF] via-[#EEF4FF] to-[#E6F2FF] dark:bg-none dark:preps-hero-gradient overflow-x-clip">
        <ResponsiveContainer className="py-8 sm:py-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Left (7 cols): Headline, Metrics Strip, 2 Crisp CTAs */}
            <div className="lg:col-span-7 space-y-5">
              <div className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-[0.14em] text-[#0284C7] dark:text-[#22D3EE]">
                <span className="h-2 w-2 rounded-full bg-[#22C55E]" />
                {t('hero.eyebrow')}
              </div>

              <h1 className="font-display text-[28px] sm:text-[40px] font-bold tracking-tight leading-[1.15] text-[#0B1F3A] dark:text-[#F8FAFC] text-balance">
                {t('hero.title')}
              </h1>

              <p className="text-sm sm:text-base text-[#475569] dark:text-[#94A3B8] max-w-2xl leading-relaxed">
                {t('hero.subtitle')}
              </p>

              {/* 3 Live Key Metrics (Zero Pill Clutter — Crisp Dividers) */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:text-sm font-semibold text-[#0B1F3A] dark:text-[#F8FAFC] pt-1">
                <span className="inline-flex items-center gap-1.5">
                  <ClipboardCheck className="w-4 h-4 text-[#0284C7] dark:text-[#06B6D4]" />
                  {t('hero.metricCbt')}
                </span>
                <span className="text-[#94A3B8]" aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-[#15803D] dark:text-[#22C55E]" />
                  {t('hero.metricNcert')}
                </span>
                <span className="text-[#94A3B8]" aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-[#EA580C] dark:text-[#F97316]" />
                  {t('hero.metricMentor')}
                </span>
              </div>

              {/* 2 Crisp CTAs */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link
                  to="/cbt-mocks"
                  onClick={() => playNav()}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold bg-[#0284C7] dark:bg-[#06B6D4] hover:opacity-95 text-white dark:text-[#070B14] transition-opacity"
                >
                  <Zap className="w-4 h-4" />
                  {t('hero.ctaMock')}
                </Link>
                <Link
                  to="/mentors"
                  onClick={() => playNav()}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold bg-[#FFFFFF] dark:bg-[#0F172A] hover:bg-[#EEF4FF] dark:hover:bg-[#162033] text-[#0B1F3A] dark:text-[#F8FAFC] border border-[#E2E8F0] dark:border-white/[0.12] transition-colors"
                >
                  <Users className="w-4 h-4 text-[#EA580C] dark:text-[#F97316]" />
                  {t('hero.ctaMentor')}
                </Link>
              </div>
            </div>

            {/* Right (5 cols): PrepsBot Command Card + Daily Trifecta Compact + Quick Resume */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-white/[0.08] p-5 space-y-5 shadow-sm">
                {/* PrepsBot Header */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => {
                        playClick();
                        setCopilotOpen(true);
                      }}
                      className="h-14 w-14 rounded-2xl bg-[#EEF4FF] dark:bg-[#162033] border border-[#E2E8F0] dark:border-white/[0.08] flex items-center justify-center shrink-0 hover:scale-105 transition-transform"
                      title="Ask PrepsBot AI Tutor"
                    >
                      <img
                        src={prepsbotMascotImg}
                        alt="PrepsBot 3D AI Mascot"
                        className="h-12 w-12 object-contain"
                      />
                    </button>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="font-display text-sm font-bold text-[#0B1F3A] dark:text-[#F8FAFC] truncate">
                          PrepsBot Command Deck
                        </h2>
                        <span className="px-2 py-0.5 rounded-md bg-[#0284C7]/12 dark:bg-[#06B6D4]/15 text-[#0284C7] dark:text-[#22D3EE] font-mono text-[10px] font-bold shrink-0">
                          {trackConfig.shortLabel}
                        </span>
                      </div>
                      <p className="text-xs text-[#475569] dark:text-[#94A3B8] mt-0.5 truncate">
                        {isGuest ? 'Guest Mode Active · Instant local save' : 'Synced Workspace Active'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      playClick();
                      setCopilotOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#EEF4FF] dark:bg-[#162033] text-[#0284C7] dark:text-[#22D3EE] border border-[#E2E8F0] dark:border-white/[0.08] hover:border-[#06B6D4] shrink-0"
                  >
                    Ask AI
                  </button>
                </div>

                {/* Daily Trifecta 3 Mini Progress Rings */}
                <DailyTrifectaBar compact />

                {/* Quick Resume Strip */}
                <div className="rounded-xl bg-[#F4F8FF] dark:bg-[#162033] border border-[#E2E8F0] dark:border-white/[0.08] p-3.5 flex items-center justify-between gap-3">
                  <div className="min-w-0 space-y-1 flex-1">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8]">
                      Quick Resume · {lastPracticed.subject}
                    </p>
                    <p className="text-xs font-bold text-[#0B1F3A] dark:text-[#F8FAFC] truncate">
                      {lastPracticed.chapter}
                    </p>
                    <div className="h-1.5 w-full rounded-full bg-[#E2E8F0] dark:bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#0284C7] dark:bg-[#06B6D4]"
                        style={{ width: `${lastPracticed.progressPercent}%` }}
                      />
                    </div>
                  </div>
                  <Link
                    to={lastPracticed.route}
                    onClick={() => playNav()}
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-[#0B1F3A] dark:bg-[#06B6D4] text-white dark:text-[#070B14] inline-flex items-center gap-1 shrink-0"
                  >
                    Resume
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </ResponsiveContainer>
      </section>

      <ResponsiveContainer className="py-8 sm:py-10 space-y-10">
        {/* =================================================================
            SECTION 2: 4-TAB INTERACTIVE STUDY DECK (layoutId="activeTabPill")
           ================================================================= */}
        <section className="space-y-5" aria-label="Interactive Study Deck">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#0284C7] dark:text-[#06B6D4]">
                ACTIVE STUDY OS
              </p>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-[#0B1F3A] dark:text-[#F8FAFC] mt-0.5">
                {t('deck.title')}
              </h2>
              <p className="text-xs sm:text-sm text-[#475569] dark:text-[#94A3B8] mt-1">
                {t('deck.subtitle')}
              </p>
            </div>

            {/* 4-Tab Pill Bar */}
            <div
              role="tablist"
              aria-label="Study deck modules"
              className="inline-flex flex-wrap items-center gap-1 p-1 rounded-2xl bg-[#EEF4FF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-white/[0.08]"
            >
              {(
                [
                  { id: 'practice', label: t('deck.tabPractice'), icon: Zap },
                  { id: 'focus', label: t('deck.tabFocus'), icon: Clock },
                  { id: 'mastery', label: t('deck.tabMastery'), icon: Layers },
                  { id: 'predictor', label: t('deck.tabPredictor'), icon: Gauge },
                ] as const
              ).map((tab) => {
                const Icon = tab.icon;
                const active = deckTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => {
                      playClick();
                      setDeckTab(tab.id);
                    }}
                    className={`relative px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 transition-colors ${
                      active
                        ? 'text-[#0B1F3A] dark:text-[#F8FAFC]'
                        : 'text-[#475569] dark:text-[#94A3B8] hover:text-[#0B1F3A] dark:hover:text-[#F8FAFC]'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="activeTabPill"
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="absolute inset-0 rounded-xl bg-[#FFFFFF] dark:bg-[#162033] border border-[#E2E8F0] dark:border-white/10 shadow-sm"
                      />
                    )}
                    <Icon className="relative z-10 w-3.5 h-3.5 text-[#0284C7] dark:text-[#06B6D4]" />
                    <span className="relative z-10 whitespace-nowrap">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Study Deck Content Surface */}
          <div className="rounded-2xl bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-white/[0.08] p-5 sm:p-6">
            {/* TAB 1: QUICK PRACTICE (10s Formula Duel + Chapter Sprint) */}
            {deckTab === 'practice' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-7 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="px-2.5 py-0.5 rounded-lg bg-[#0284C7]/12 dark:bg-[#06B6D4]/15 text-[#0284C7] dark:text-[#22D3EE] font-bold">
                        10s FORMULA DUEL
                      </span>
                      <span className="text-[#475569] dark:text-[#94A3B8] font-semibold">
                        {activeFormula.subject} · {activeFormula.chapter}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 font-mono text-xs tabular-nums">
                      <span className="text-[#EA580C] dark:text-[#F97316] font-bold inline-flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 fill-current" />
                        Streak {formulaStreak}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md font-bold ${
                          formulaCountdown <= 3
                            ? 'bg-[#EF4444]/15 text-[#EF4444]'
                            : 'bg-[#EEF4FF] dark:bg-[#162033] text-[#0B1F3A] dark:text-[#F8FAFC]'
                        }`}
                      >
                        {formulaCountdown}s
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl bg-[#F4F8FF] dark:bg-[#162033] border border-[#E2E8F0] dark:border-white/[0.08] p-4 space-y-2">
                    <p className="text-sm font-semibold text-[#0B1F3A] dark:text-[#F8FAFC]">
                      {activeFormula.prompt}
                    </p>
                    <p className="font-mono text-base sm:text-lg font-bold text-[#0284C7] dark:text-[#22D3EE]">
                      {activeFormula.formulaStem}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    {activeFormula.options.map((opt, idx) => {
                      const answered = formulaPicked !== null;
                      const isRight = idx === activeFormula.correctIndex;
                      const isPicked = formulaPicked === idx;
                      let cls =
                        'bg-[#F4F8FF] dark:bg-[#162033] border-[#E2E8F0] dark:border-white/[0.08] text-[#0B1F3A] dark:text-[#F8FAFC] hover:border-[#0284C7] dark:hover:border-[#06B6D4]';
                      if (answered) {
                        if (isRight) cls = 'bg-[#22C55E]/15 border-[#22C55E] text-[#15803D] dark:text-[#22C55E]';
                        else if (isPicked) cls = 'bg-[#EF4444]/15 border-[#EF4444] text-[#DC2626] dark:text-[#EF4444]';
                      }
                      return (
                        <button
                          key={opt}
                          type="button"
                          disabled={answered}
                          onClick={() => handleFormulaPick(idx)}
                          className={`px-3.5 py-2.5 rounded-xl border text-left font-mono text-xs sm:text-sm font-bold transition-colors ${cls}`}
                        >
                          ({String.fromCharCode(65 + idx)}) {opt}
                        </button>
                      );
                    })}
                  </div>

                  {formulaPicked !== null && (
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <p className="text-xs text-[#475569] dark:text-[#94A3B8] flex-1">
                        <strong className="text-[#0B1F3A] dark:text-[#F8FAFC]">Note: </strong>
                        {activeFormula.explanation}
                      </p>
                      <button
                        type="button"
                        onClick={handleNextFormula}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-[#0284C7] dark:bg-[#06B6D4] text-white dark:text-[#070B14] shrink-0"
                      >
                        Next Formula →
                      </button>
                    </div>
                  )}
                </div>

                {/* Right: Quick Chapter PYQ Sprint Cards */}
                <div className="lg:col-span-5 space-y-3">
                  <p className="font-mono text-xs font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8]">
                    Quick Chapter PYQ Sprints ({trackConfig.shortLabel})
                  </p>
                  <div className="space-y-2.5">
                    {(examTrack === 'neet'
                      ? [
                          { subj: 'Biology', ch: 'Human Physiology', meta: '10 High-Yield PYQs · Bohr Shift' },
                          { subj: 'Biology', ch: 'Genetics', meta: '11 High-Yield PYQs · Lac Operon' },
                          { subj: 'Physics', ch: 'Ray Optics', meta: 'Lens Maker & Immersion PYQs' },
                        ]
                      : [
                          { subj: 'Physics', ch: 'Electrostatics', meta: "Gauss's Law & Symmetric Shells" },
                          { subj: 'Chemistry', ch: 'Chemical Bonding', meta: 'VSEPR Geometry & Lone Pairs' },
                          { subj: 'Mathematics', ch: 'Definite Integration', meta: "King's Property Symmetry NATs" },
                        ]
                    ).map((sprint) => (
                      <Link
                        key={sprint.ch}
                        to={`/learn?tab=pyqs&chapter=${encodeURIComponent(sprint.ch)}`}
                        onClick={() => playNav()}
                        className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-[#F4F8FF] dark:bg-[#162033] border border-[#E2E8F0] dark:border-white/[0.08] hover:border-[#0284C7] dark:hover:border-[#06B6D4] transition-colors group"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-mono font-bold text-[#0284C7] dark:text-[#22D3EE]">
                            {sprint.subj}
                          </p>
                          <p className="text-sm font-bold text-[#0B1F3A] dark:text-[#F8FAFC] truncate">
                            {sprint.ch}
                          </p>
                          <p className="text-xs text-[#475569] dark:text-[#94A3B8] truncate">
                            {sprint.meta}
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-[#94A3B8] group-hover:text-[#06B6D4] group-hover:translate-x-0.5 transition-all shrink-0" />
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: FOCUS & PLANNER */}
            {deckTab === 'focus' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left: 25m / 50m Focus Timer */}
                <div className="lg:col-span-5 rounded-2xl bg-[#F4F8FF] dark:bg-[#162033] border border-[#E2E8F0] dark:border-white/[0.08] p-5 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#0284C7] dark:text-[#22D3EE]">
                      VERIFIED FOCUS BLOCK
                    </span>
                    <div className="inline-flex gap-1">
                      {([25, 50] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => {
                            playClick();
                            setFocusRunning(false);
                            setFocusPreset(m);
                            setFocusSeconds(m * 60);
                            setTabBreaks(0);
                          }}
                          className={`px-2.5 py-1 rounded-lg font-mono text-xs font-bold ${
                            focusPreset === m
                              ? 'bg-[#0284C7] dark:bg-[#06B6D4] text-white dark:text-[#070B14]'
                              : 'bg-[#FFFFFF] dark:bg-[#0F172A] text-[#475569] dark:text-[#94A3B8]'
                          }`}
                        >
                          {m}m
                        </button>
                      ))}
                    </div>
                  </div>

                  <p className="font-mono text-5xl font-bold tabular-nums text-center text-[#0B1F3A] dark:text-[#F8FAFC] py-2">
                    {minsStr}:{secsStr}
                  </p>

                  <div className="flex items-center justify-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        playClick();
                        setFocusStatusNote(null);
                        setFocusRunning((r) => !r);
                      }}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#0284C7] dark:bg-[#06B6D4] text-white dark:text-[#070B14] inline-flex items-center gap-1.5"
                    >
                      {focusRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      {focusRunning ? 'Pause Block' : 'Start Focus Block'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        playClick();
                        setFocusRunning(false);
                        setFocusSeconds(focusPreset * 60);
                        setTabBreaks(0);
                        setFocusStatusNote(null);
                      }}
                      aria-label="Reset timer"
                      className="p-2.5 rounded-xl bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-white/10 text-[#475569] dark:text-[#94A3B8]"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>

                  {tabBreaks > 0 && (
                    <div className="rounded-xl bg-[#F97316]/12 border border-[#F97316]/35 px-3 py-2 text-xs font-semibold text-[#EA580C] dark:text-[#F97316] flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>Tab-switch breaks: {tabBreaks} (stay focused to claim full XP)</span>
                    </div>
                  )}

                  {focusStatusNote && (
                    <p className="text-xs font-semibold text-[#15803D] dark:text-[#22C55E] text-center">
                      {focusStatusNote}
                    </p>
                  )}
                </div>

                {/* Right: Today's Top Tasks */}
                <div className="lg:col-span-7 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display text-base font-bold text-[#0B1F3A] dark:text-[#F8FAFC]">
                      Today&apos;s Priority Targets
                    </h3>
                    <span className="font-mono text-xs text-[#475569] dark:text-[#94A3B8] tabular-nums">
                      {top3Tasks.filter((item) => item.completed).length}/{top3Tasks.length} completed
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={quickTaskTitle}
                      onChange={(e) => setQuickTaskTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddQuickTask();
                      }}
                      placeholder="Add today's revision target (e.g. 20 Ray Optics PYQs)..."
                      className="flex-1 px-3.5 py-2 rounded-xl text-xs sm:text-sm bg-[#F4F8FF] dark:bg-[#162033] border border-[#E2E8F0] dark:border-white/[0.08] text-[#0B1F3A] dark:text-[#F8FAFC]"
                    />
                    <button
                      type="button"
                      onClick={handleAddQuickTask}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#0B1F3A] dark:bg-[#06B6D4] text-white dark:text-[#070B14] inline-flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add
                    </button>
                  </div>

                  <div className="space-y-2">
                    {top3Tasks.map((task) => (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => {
                          if (!task.completed) playSuccess();
                          else playClick();
                          toggleBacklogTask(task.id);
                        }}
                        className={`w-full text-left p-3.5 rounded-xl border flex items-center gap-3 transition-colors ${
                          task.completed
                            ? 'bg-[#22C55E]/10 border-[#22C55E]/35'
                            : 'bg-[#F4F8FF] dark:bg-[#162033] border-[#E2E8F0] dark:border-white/[0.08] hover:border-[#0284C7] dark:hover:border-[#06B6D4]'
                        }`}
                      >
                        <span
                          className={`h-5 w-5 rounded-md border flex items-center justify-center shrink-0 ${
                            task.completed
                              ? 'bg-[#22C55E] border-[#22C55E] text-white'
                              : 'border-[#94A3B8] bg-[#FFFFFF] dark:bg-[#0F172A]'
                          }`}
                        >
                          {task.completed && <Check className="w-3.5 h-3.5" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm font-semibold truncate ${
                              task.completed
                                ? 'line-through text-[#475569] dark:text-[#94A3B8]'
                                : 'text-[#0B1F3A] dark:text-[#F8FAFC]'
                            }`}
                          >
                            {task.title}
                          </p>
                          <p className="font-mono text-[11px] text-[#0284C7] dark:text-[#22D3EE]">
                            {task.subject}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: 5-STAGE CHAPTER MASTERY TRACKER */}
            {deckTab === 'mastery' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-1.5">
                    {(['Physics', 'Chemistry', 'Mathematics', 'Biology'] as const).map((subj) => (
                      <button
                        key={subj}
                        type="button"
                        onClick={() => {
                          playClick();
                          setMasterySubject(subj);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                          masterySubject === subj
                            ? 'bg-[#0284C7] dark:bg-[#06B6D4] text-white dark:text-[#070B14]'
                            : 'bg-[#F4F8FF] dark:bg-[#162033] text-[#475569] dark:text-[#94A3B8] border border-[#E2E8F0] dark:border-white/[0.08]'
                        }`}
                      >
                        {subj}
                      </button>
                    ))}
                  </div>

                  <span className="font-mono text-xs font-bold text-[#15803D] dark:text-[#22C55E] tabular-nums">
                    {masterySubject} Readiness: {masteryCompletionPct}%
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-[#E2E8F0] dark:border-white/[0.08] text-[#475569] dark:text-[#94A3B8]">
                        <th className="py-2.5 pr-4 font-bold">High-Yield Chapter</th>
                        {MASTERY_STAGES.map((stage) => (
                          <th key={stage.key} className="py-2.5 px-2 text-center font-mono text-xs font-bold">
                            {stage.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0] dark:divide-white/[0.08]">
                      {visibleMasteryChapters.map((ch) => {
                        const rowState = masteryMap[ch.id];
                        return (
                          <tr key={ch.id}>
                            <td className="py-3 pr-4">
                              <p className="font-semibold text-[#0B1F3A] dark:text-[#F8FAFC]">
                                {ch.name}
                              </p>
                              <p className="font-mono text-[11px] text-[#475569] dark:text-[#94A3B8]">
                                {ch.classLevel} · ~{ch.weightageMarks} Marks
                              </p>
                            </td>
                            {MASTERY_STAGES.map((stage) => {
                              const checked = !!rowState?.[stage.key];
                              return (
                                <td key={stage.key} className="py-3 px-2 text-center">
                                  <button
                                    type="button"
                                    aria-label={`${ch.name} ${stage.label}`}
                                    onClick={() => {
                                      if (!checked) playSuccess();
                                      else playClick();
                                      toggleMasteryStage(ch.id, stage.key);
                                    }}
                                    className={`h-7 w-7 rounded-lg border inline-flex items-center justify-center transition-colors ${
                                      checked
                                        ? 'bg-[#22C55E] border-[#22C55E] text-white'
                                        : 'bg-[#F4F8FF] dark:bg-[#162033] border-[#E2E8F0] dark:border-white/10 hover:border-[#06B6D4]'
                                    }`}
                                  >
                                    {checked && <Check className="w-4 h-4" />}
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 4: LIVE PERCENTILE PREDICTOR */}
            {deckTab === 'predictor' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                <div className="lg:col-span-7 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-mono text-xs font-bold text-[#0284C7] dark:text-[#22D3EE]">
                        {trackConfig.primaryExamName} CALIBRATED CURVE
                      </p>
                      <h3 className="font-display text-lg font-bold text-[#0B1F3A] dark:text-[#F8FAFC]">
                        Drag Your Expected Mock Score
                      </h3>
                    </div>
                    <span className="font-mono text-2xl font-bold tabular-nums text-[#0B1F3A] dark:text-[#F8FAFC]">
                      {sliderMarks}
                      <span className="text-sm text-[#475569] dark:text-[#94A3B8]">
                        /{predictorMax}
                      </span>
                    </span>
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={predictorMax}
                    step={examTrack === 'neet' ? 5 : 1}
                    value={sliderMarks}
                    onChange={(e) => setSliderMarks(Number(e.target.value))}
                    aria-label="Expected mock score slider"
                    className="w-full accent-[#06B6D4] cursor-pointer"
                  />

                  <div className="flex justify-between font-mono text-[11px] text-[#475569] dark:text-[#94A3B8] tabular-nums">
                    <span>0</span>
                    <span>{Math.round(predictorMax * 0.5)}</span>
                    <span>{Math.round(predictorMax * 0.75)}</span>
                    <span>{predictorMax}</span>
                  </div>

                  <p className="text-xs text-[#475569] dark:text-[#94A3B8] leading-relaxed">
                    <strong className="text-[#0B1F3A] dark:text-[#F8FAFC]">College Outlook: </strong>
                    {prediction.collegeOutlook}
                  </p>
                </div>

                <div className="lg:col-span-5 rounded-2xl bg-[#F4F8FF] dark:bg-[#162033] border border-[#E2E8F0] dark:border-white/[0.08] p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[11px] font-semibold text-[#475569] dark:text-[#94A3B8]">
                        {examTrack === 'boards' ? 'Predicted %' : 'Predicted %ile'}
                      </p>
                      <p className="font-mono text-2xl sm:text-3xl font-bold tabular-nums text-[#0284C7] dark:text-[#22D3EE]">
                        {prediction.percentile}
                        {examTrack === 'boards' ? '%' : ''}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-[#475569] dark:text-[#94A3B8]">
                        Estimated AIR
                      </p>
                      <p className="font-mono text-2xl sm:text-3xl font-bold tabular-nums text-[#EA580C] dark:text-[#F97316]">
                        {prediction.estimatedAir.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#E2E8F0] dark:border-white/[0.08] flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#15803D] dark:text-[#22C55E] inline-flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      {prediction.targetTier}
                    </span>
                    <Link
                      to="/community"
                      onClick={() => playNav()}
                      className="text-xs font-bold text-[#0284C7] dark:text-[#22D3EE] hover:underline shrink-0"
                    >
                      Check Cut-offs →
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* =================================================================
            SECTION 3: 5-SPACE QUICK LAUNCH BENTO GRID (6 CRISP CARDS)
           ================================================================= */}
        <section className="space-y-4" aria-label="5-Space Quick Launch">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#0284C7] dark:text-[#06B6D4]">
              QUICK LAUNCH
            </p>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-[#0B1F3A] dark:text-[#F8FAFC] mt-0.5">
              {t('bento.title')}
            </h2>
            <p className="text-xs sm:text-sm text-[#475569] dark:text-[#94A3B8] mt-1">
              {t('bento.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                title: 'Concept-Mapped PYQ Hub',
                desc: 'Group 2019–2026 JEE & NEET PYQs by exact NTA concept with bilingual EN/हिं KaTeX solutions.',
                to: '/learn?tab=pyqs',
                icon: Layers,
                accent: 'text-[#0284C7] dark:text-[#06B6D4]',
              },
              {
                title: 'NCERT-to-PYQ Mapper',
                desc: '50/50 split view tracing highlighted Class 11 & 12 NCERT lines directly to past exam questions.',
                to: '/learn?tab=ncert',
                icon: BookOpen,
                accent: 'text-[#15803D] dark:text-[#22C55E]',
              },
              {
                title: '2027 High-Yield Predictor',
                desc: 'Recharts weightage chart & Tier 1–3 priority roadmap showing the highest-ROI chapters first.',
                to: '/learn?tab=predictor',
                icon: TrendingUp,
                accent: 'text-[#EA580C] dark:text-[#F97316]',
              },
              {
                title: 'NTA Custom CBT Mock Builder',
                desc: 'Build 10, 25, or 45-question authentic +4/-1 NTA tests with instant Tilt & Mistake diagnostics.',
                to: '/cbt-mocks',
                icon: ClipboardCheck,
                accent: 'text-[#0284C7] dark:text-[#22D3EE]',
              },
              {
                title: 'Live Peer Community & Cut-offs',
                desc: 'Join 6 active exam rooms, ask KaTeX doubts verified by mentors, and check JoSAA/MCC ranks.',
                to: '/community',
                icon: Users,
                accent: 'text-[#15803D] dark:text-[#22C55E]',
              },
              {
                title: '1:1 IIT/AIIMS Human Mentorship',
                desc: 'Book 15-minute strategy sessions (₹129–₹149) with verified IIT Bombay, Delhi & AIIMS rankers.',
                to: '/mentors',
                icon: Target,
                accent: 'text-[#EA580C] dark:text-[#F97316]',
              },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <Link
                  key={card.title}
                  to={card.to}
                  onClick={() => playNav()}
                  className="group rounded-2xl bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-white/[0.08] hover:border-[#0284C7] dark:hover:border-[#06B6D4] p-5 flex flex-col justify-between gap-4 transition-all hover:-translate-y-0.5"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="h-10 w-10 rounded-xl bg-[#EEF4FF] dark:bg-[#162033] border border-[#E2E8F0] dark:border-white/[0.08] inline-flex items-center justify-center">
                        <Icon className={`w-5 h-5 ${card.accent}`} />
                      </span>
                      <ArrowRight className="w-4 h-4 text-[#94A3B8] group-hover:text-[#06B6D4] group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <h3 className="font-display text-base font-bold text-[#0B1F3A] dark:text-[#F8FAFC]">
                      {card.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#475569] dark:text-[#94A3B8] leading-relaxed">
                      {card.desc}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* =================================================================
            SECTION 4: SUNDAY ALL-INDIA BLITZ RETENTION CARD
           ================================================================= */}
        <section aria-label="Sunday All-India Blitz">
          <SundayBlitzCard />
        </section>
      </ResponsiveContainer>
    </PageLayout>
  );
}
