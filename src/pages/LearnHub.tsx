import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowRight,
  BookmarkCheck,
  BookmarkPlus,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Filter,
  Languages,
  Layers,
  Sparkles,
  Target,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer as RechartsContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PageLayout } from '../layouts/PageLayout';
import { ResponsiveContainer } from '../components/ResponsiveContainer';
import { SeoHead } from '../components/SeoHead';
import { RichMathText } from '../components/math/KatexFormula';
import {
  CONCEPT_PYQ_BANK,
  NCERT_TO_PYQ_HIGHLIGHTS,
  PREDICTOR_2027_CHAPTERS,
  type ConceptPyqQuestion,
  type PyqExamType,
  type PyqQuestionType,
  type PyqSubject,
} from '../data/prepskm2UpgradeData';
import { useLanguage } from '../context/LanguageContext';
import { useExam } from '../context/ExamContext';
import { usePrepskm2 } from '../context/Prepskm2Context';
import { playClick, playSuccess } from '../utils/soundEffects';

type LearnSubTab = 'pyqs' | 'predictor' | 'ncert';

const MISTAKE_BOOKMARKS_KEY = 'prepskm_learn_mistake_bookmarks_v1';

interface ConceptGroup {
  conceptId: string;
  conceptTitle: string;
  conceptTitleHi: string;
  subject: PyqSubject;
  chapter: string;
  yieldLabel: ConceptPyqQuestion['yieldLabel'];
  questions: ConceptPyqQuestion[];
}

export default function LearnHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { lang, setLang, t } = useLanguage();
  const { examTrack, setLastPracticed } = useExam();
  const { recordPyqSprintProgress, setMistakeErrorTag } = usePrepskm2();

  const initialTab = (searchParams.get('tab') as LearnSubTab | null) ?? 'pyqs';
  const [activeTab, setActiveTab] = useState<LearnSubTab>(
    initialTab === 'predictor' || initialTab === 'ncert' ? initialTab : 'pyqs'
  );

  // Sub-Tab A Filters
  const [examFilter, setExamFilter] = useState<'All' | PyqExamType>(() =>
    examTrack === 'neet' ? 'NEET UG' : 'All'
  );
  const [subjectFilter, setSubjectFilter] = useState<'All' | PyqSubject>('All');
  const [chapterFilter, setChapterFilter] = useState<string>(() => searchParams.get('chapter') ?? 'All');
  const [yearFilter, setYearFilter] = useState<'All' | number>('All');
  const [typeFilter, setTypeFilter] = useState<'All' | PyqQuestionType>('All');

  // Expanded Concept Cards & Interactive Solve State
  const [expandedConcepts, setExpandedConcepts] = useState<Record<string, boolean>>({});
  const [selectedOptions, setSelectedOptions] = useState<Record<string, number>>({});
  const [natInputs, setNatInputs] = useState<Record<string, string>>({});
  const [natChecked, setNatChecked] = useState<Record<string, boolean>>({});
  const [openSolutions, setOpenSolutions] = useState<Record<string, boolean>>({});
  const [mistakeIds, setMistakeIds] = useState<string[]>(() => {
    try {
      const raw = window.localStorage.getItem(MISTAKE_BOOKMARKS_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });
  const [sessionScore, setSessionScore] = useState({ correct: 0, wrong: 0, marks: 0 });

  // Sub-Tab B Predictor State
  const [predictorExam, setPredictorExam] = useState<'JEE Main 2027' | 'NEET UG 2027'>(() =>
    examTrack === 'neet' ? 'NEET UG 2027' : 'JEE Main 2027'
  );
  const [predictorSubject, setPredictorSubject] = useState<'All' | PyqSubject>('All');

  // Sub-Tab C NCERT-to-PYQ State
  const [ncertClass, setNcertClass] = useState<'All' | 'Class 11' | 'Class 12'>('All');
  const [ncertSubject, setNcertSubject] = useState<'All' | 'Biology' | 'Chemistry' | 'Physics'>('All');
  const [selectedNcertId, setSelectedNcertId] = useState<string>(NCERT_TO_PYQ_HIGHLIGHTS[0].id);
  const [ncertAnswers, setNcertAnswers] = useState<Record<string, number>>({});

  // Sync URL query params -> state
  useEffect(() => {
    const paramTab = searchParams.get('tab') as LearnSubTab | null;
    if (paramTab === 'pyqs' || paramTab === 'predictor' || paramTab === 'ncert') {
      setActiveTab(paramTab);
    }
    const paramChapter = searchParams.get('chapter');
    if (paramChapter) {
      setChapterFilter(paramChapter);
    }
  }, [searchParams]);

  // Sync Predictor exam with top-bar exam switcher when user changes examTrack
  useEffect(() => {
    if (examTrack === 'neet') {
      setPredictorExam('NEET UG 2027');
    } else if (examTrack === 'jee') {
      setPredictorExam('JEE Main 2027');
    }
  }, [examTrack]);

  const switchTab = (next: LearnSubTab) => {
    playClick();
    setActiveTab(next);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', next);
    setSearchParams(nextParams, { replace: true });
  };

  // Available chapters & years derived from PYQ bank
  const availableChapters = useMemo(() => {
    const set = new Set<string>();
    for (const q of CONCEPT_PYQ_BANK) {
      if (subjectFilter === 'All' || q.subject === subjectFilter) {
        set.add(q.chapter);
      }
    }
    return ['All', ...Array.from(set)];
  }, [subjectFilter]);

  const availableYears = useMemo(() => {
    const yrs = Array.from(new Set(CONCEPT_PYQ_BANK.map((q) => q.year))).sort((a, b) => b - a);
    return yrs;
  }, []);

  const filteredPyqs = useMemo(() => {
    return CONCEPT_PYQ_BANK.filter((q) => {
      if (examFilter !== 'All' && q.exam !== examFilter) return false;
      if (subjectFilter !== 'All' && q.subject !== subjectFilter) return false;
      if (chapterFilter !== 'All' && q.chapter !== chapterFilter) return false;
      if (yearFilter !== 'All' && q.year !== yearFilter) return false;
      if (typeFilter !== 'All' && q.questionType !== typeFilter) return false;
      return true;
    });
  }, [examFilter, subjectFilter, chapterFilter, yearFilter, typeFilter]);

  const conceptGroups = useMemo<ConceptGroup[]>(() => {
    const map = new Map<string, ConceptGroup>();
    for (const q of filteredPyqs) {
      const existing = map.get(q.conceptId);
      if (existing) {
        existing.questions.push(q);
      } else {
        map.set(q.conceptId, {
          conceptId: q.conceptId,
          conceptTitle: q.conceptTitle,
          conceptTitleHi: q.conceptTitleHi,
          subject: q.subject,
          chapter: q.chapter,
          yieldLabel: q.yieldLabel,
          questions: [q],
        });
      }
    }
    return Array.from(map.values());
  }, [filteredPyqs]);

  // Expand first concept group automatically when groups change
  useEffect(() => {
    if (conceptGroups.length > 0) {
      setExpandedConcepts((prev) => {
        const firstId = conceptGroups[0].conceptId;
        if (Object.keys(prev).length === 0 || !conceptGroups.some((g) => prev[g.conceptId])) {
          return { ...prev, [firstId]: true };
        }
        return prev;
      });
    }
  }, [conceptGroups]);

  const handleSelectMcq = (q: ConceptPyqQuestion, optionIdx: number) => {
    if (selectedOptions[q.id] !== undefined) return;
    setSelectedOptions((prev) => ({ ...prev, [q.id]: optionIdx }));
    const isCorrect = optionIdx === q.correctOptionIndex;
    if (isCorrect) {
      playSuccess();
      setSessionScore((s) => ({ correct: s.correct + 1, wrong: s.wrong, marks: s.marks + 4 }));
    } else {
      playClick();
      setSessionScore((s) => ({ correct: s.correct, wrong: s.wrong + 1, marks: s.marks - 1 }));
    }
    recordPyqSprintProgress(1);
    setLastPracticed({
      subject: q.subject,
      chapter: `${q.chapter} — ${q.conceptTitle}`,
      progressPercent: 72,
      route: `/learn?tab=pyqs&chapter=${encodeURIComponent(q.chapter)}`,
    });
  };

  const handleCheckNat = (q: ConceptPyqQuestion) => {
    const raw = (natInputs[q.id] ?? '').trim();
    if (!raw || natChecked[q.id]) return;
    setNatChecked((prev) => ({ ...prev, [q.id]: true }));
    const isCorrect = Number(raw) === Number(q.natAnswer);
    if (isCorrect) {
      playSuccess();
      setSessionScore((s) => ({ correct: s.correct + 1, wrong: s.wrong, marks: s.marks + 4 }));
    } else {
      playClick();
      setSessionScore((s) => ({ correct: s.correct, wrong: s.wrong + 1, marks: s.marks }));
    }
    recordPyqSprintProgress(1);
    setLastPracticed({
      subject: q.subject,
      chapter: `${q.chapter} — ${q.conceptTitle}`,
      progressPercent: 76,
      route: `/learn?tab=pyqs&chapter=${encodeURIComponent(q.chapter)}`,
    });
  };

  const toggleMistakeBookmark = (q: ConceptPyqQuestion) => {
    playClick();
    setMistakeIds((prev) => {
      const exists = prev.includes(q.id);
      const next = exists ? prev.filter((id) => id !== q.id) : [q.id, ...prev];
      try {
        window.localStorage.setItem(MISTAKE_BOOKMARKS_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      setMistakeErrorTag(q.id, exists ? null : 'weak-concept');
      return next;
    });
  };

  // Sub-Tab B Predictor computed lists
  const predictorSubjects: Array<'All' | PyqSubject> =
    predictorExam === 'JEE Main 2027'
      ? ['All', 'Physics', 'Chemistry', 'Mathematics']
      : ['All', 'Biology', 'Chemistry', 'Physics'];

  const predictorChapters = useMemo(() => {
    return PREDICTOR_2027_CHAPTERS.filter(
      (item) =>
        item.exam === predictorExam &&
        (predictorSubject === 'All' || item.subject === predictorSubject)
    ).sort((a, b) => b.weightagePct - a.weightagePct);
  }, [predictorExam, predictorSubject]);

  const top10ChartData = useMemo(
    () =>
      predictorChapters.slice(0, 10).map((item) => ({
        name: item.chapter.length > 20 ? `${item.chapter.slice(0, 18)}…` : item.chapter,
        fullName: item.chapter,
        weightage: item.weightagePct,
        expectedQuestions: item.expectedQuestions,
        tier: item.priorityTier,
        risingTrend: item.risingTrend,
        subject: item.subject,
      })),
    [predictorChapters]
  );

  const jumpToPracticeChapter = (chapter: string, subject: PyqSubject) => {
    playClick();
    setExamFilter('All');
    setSubjectFilter(subject);
    const hasExactChapter = CONCEPT_PYQ_BANK.some((q) => q.chapter === chapter);
    setChapterFilter(hasExactChapter ? chapter : 'All');
    setYearFilter('All');
    setTypeFilter('All');
    setActiveTab('pyqs');
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', 'pyqs');
    if (hasExactChapter) nextParams.set('chapter', chapter);
    else nextParams.delete('chapter');
    setSearchParams(nextParams, { replace: true });
  };

  // Sub-Tab C NCERT-to-PYQ computed list
  const filteredNcertLines = useMemo(() => {
    return NCERT_TO_PYQ_HIGHLIGHTS.filter((line) => {
      if (ncertClass !== 'All' && line.classLevel !== ncertClass) return false;
      if (ncertSubject !== 'All' && line.subject !== ncertSubject) return false;
      return true;
    });
  }, [ncertClass, ncertSubject]);

  const activeNcertLine = useMemo(
    () =>
      filteredNcertLines.find((l) => l.id === selectedNcertId) ??
      filteredNcertLines[0] ??
      NCERT_TO_PYQ_HIGHLIGHTS[0],
    [filteredNcertLines, selectedNcertId]
  );

  return (
    <PageLayout>
      <SeoHead
        title="Learn & PYQs Hub — Concept-Mapped PYQs, 2027 Predictor & NCERT Mapper | Prepskm 2.0"
        description="Practice bilingual Concept-Mapped JEE & NEET PYQs with KaTeX solutions, analyze 2027 high-yield chapter weightage, and master NCERT line-by-line PYQ mapping."
        canonicalPath="/learn"
      />

      <ResponsiveContainer className="py-6 sm:py-8 space-y-6">
        {/* Clean Header + 3 Sub-Tabs Switcher */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="space-y-1.5">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-[#0284C7] dark:text-[#06B6D4]">
              PREPSKM 2.0 · LEARN &amp; PYQ WORKSPACE
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#0B1F3A] dark:text-[#F8FAFC]">
              {t('learn.title')}
            </h1>
            <p className="text-sm text-[#475569] dark:text-[#94A3B8] max-w-2xl">
              Drill recurring NTA concepts with instant +4/-1 scoring, inspect 2027 weightage forecasts, or trace exact NCERT sentences to past JEE &amp; NEET questions.
            </p>
          </div>

          {/* 3 Sub-Tabs Pill Bar */}
          <div
            role="tablist"
            aria-label="Learn Hub sections"
            className="inline-flex flex-wrap items-center gap-1 p-1 rounded-2xl bg-[#EEF4FF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-white/[0.08]"
          >
            {(
              [
                { id: 'pyqs', label: t('learn.tabPyq'), icon: Layers },
                { id: 'predictor', label: t('learn.tabPredictor'), icon: TrendingUp },
                { id: 'ncert', label: t('learn.tabNcert'), icon: BookOpen },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => switchTab(tab.id)}
                  className={`relative px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 transition-colors ${
                    active
                      ? 'text-[#0B1F3A] dark:text-[#F8FAFC]'
                      : 'text-[#475569] dark:text-[#94A3B8] hover:text-[#0B1F3A] dark:hover:text-[#F8FAFC]'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="learnSubTabPill"
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      className="absolute inset-0 rounded-xl bg-[#FFFFFF] dark:bg-[#162033] border border-[#E2E8F0] dark:border-white/10 shadow-sm"
                    />
                  )}
                  <Icon className="relative z-10 w-4 h-4 text-[#0284C7] dark:text-[#06B6D4]" />
                  <span className="relative z-10 whitespace-nowrap">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* =================================================================
            SUB-TAB A: CONCEPT-MAPPED PYQ BANK
           ================================================================= */}
        {activeTab === 'pyqs' && (
          <section className="space-y-5" aria-label="Concept-Mapped PYQ Bank">
            {/* Filter Bar + Bilingual Toggle + Session Score */}
            <div className="rounded-2xl bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-white/[0.08] p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#475569] dark:text-[#94A3B8]">
                  <Filter className="w-4 h-4 text-[#0284C7] dark:text-[#06B6D4]" />
                  <span>Filter PYQs by Exam, Subject, Chapter, Year &amp; Format</span>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Live Session Score (+4/-1) */}
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F4F8FF] dark:bg-[#162033] border border-[#E2E8F0] dark:border-white/[0.08] font-mono text-xs tabular-nums">
                    <span className="text-[#15803D] dark:text-[#22C55E] font-bold">
                      +{sessionScore.correct}
                    </span>
                    <span className="text-[#94A3B8]">/</span>
                    <span className="text-[#DC2626] dark:text-[#EF4444] font-bold">
                      -{sessionScore.wrong}
                    </span>
                    <span className="text-[#94A3B8]">·</span>
                    <span className="font-bold text-[#0B1F3A] dark:text-[#F8FAFC]">
                      {sessionScore.marks} pts
                    </span>
                  </div>

                  {/* Bilingual EN / हिं Toggle */}
                  <div className="inline-flex items-center p-0.5 rounded-xl bg-[#EEF4FF] dark:bg-[#162033] border border-[#E2E8F0] dark:border-white/[0.08]">
                    <button
                      type="button"
                      onClick={() => {
                        playClick();
                        setLang('en');
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-colors ${
                        lang === 'en'
                          ? 'bg-[#0284C7] dark:bg-[#06B6D4] text-white dark:text-[#070B14]'
                          : 'text-[#475569] dark:text-[#94A3B8]'
                      }`}
                    >
                      <Languages className="w-3.5 h-3.5" />
                      EN
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        playClick();
                        setLang('hi');
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                        lang === 'hi'
                          ? 'bg-[#0284C7] dark:bg-[#06B6D4] text-white dark:text-[#070B14]'
                          : 'text-[#475569] dark:text-[#94A3B8]'
                      }`}
                    >
                      हिं
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                <select
                  aria-label="Filter by Exam"
                  value={examFilter}
                  onChange={(e) => {
                    playClick();
                    setExamFilter(e.target.value as 'All' | PyqExamType);
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-[#F4F8FF] dark:bg-[#162033] border border-[#E2E8F0] dark:border-white/[0.08] text-[#0B1F3A] dark:text-[#F8FAFC]"
                >
                  <option value="All">All Exams</option>
                  <option value="JEE Main">JEE Main</option>
                  <option value="JEE Adv">JEE Advanced</option>
                  <option value="NEET UG">NEET UG</option>
                </select>

                <select
                  aria-label="Filter by Subject"
                  value={subjectFilter}
                  onChange={(e) => {
                    playClick();
                    setSubjectFilter(e.target.value as 'All' | PyqSubject);
                    setChapterFilter('All');
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-[#F4F8FF] dark:bg-[#162033] border border-[#E2E8F0] dark:border-white/[0.08] text-[#0B1F3A] dark:text-[#F8FAFC]"
                >
                  <option value="All">All Subjects</option>
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Biology">Biology</option>
                </select>

                <select
                  aria-label="Filter by Chapter"
                  value={chapterFilter}
                  onChange={(e) => {
                    playClick();
                    setChapterFilter(e.target.value);
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-[#F4F8FF] dark:bg-[#162033] border border-[#E2E8F0] dark:border-white/[0.08] text-[#0B1F3A] dark:text-[#F8FAFC]"
                >
                  {availableChapters.map((ch) => (
                    <option key={ch} value={ch}>
                      {ch === 'All' ? 'All Chapters' : ch}
                    </option>
                  ))}
                </select>

                <select
                  aria-label="Filter by Year"
                  value={String(yearFilter)}
                  onChange={(e) => {
                    playClick();
                    setYearFilter(e.target.value === 'All' ? 'All' : Number(e.target.value));
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-[#F4F8FF] dark:bg-[#162033] border border-[#E2E8F0] dark:border-white/[0.08] text-[#0B1F3A] dark:text-[#F8FAFC]"
                >
                  <option value="All">Years: 2019–2026</option>
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr} PYQs
                    </option>
                  ))}
                </select>

                <select
                  aria-label="Filter by Question Format"
                  value={typeFilter}
                  onChange={(e) => {
                    playClick();
                    setTypeFilter(e.target.value as 'All' | PyqQuestionType);
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-[#F4F8FF] dark:bg-[#162033] border border-[#E2E8F0] dark:border-white/[0.08] text-[#0B1F3A] dark:text-[#F8FAFC]"
                >
                  <option value="All">MCQ &amp; NAT</option>
                  <option value="MCQ">MCQ Only</option>
                  <option value="NAT">Numerical (NAT)</option>
                </select>
              </div>
            </div>

            {/* Concept-Grouped PYQ Cards */}
            {conceptGroups.length === 0 ? (
              <div className="rounded-2xl bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-white/[0.08] p-8 text-center space-y-3">
                <p className="text-sm font-semibold text-[#0B1F3A] dark:text-[#F8FAFC]">
                  No concept PYQs match those exact filters.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setExamFilter('All');
                    setSubjectFilter('All');
                    setChapterFilter('All');
                    setYearFilter('All');
                    setTypeFilter('All');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#0284C7] dark:bg-[#06B6D4] text-white dark:text-[#070B14]"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {conceptGroups.map((group) => {
                  const isOpen = !!expandedConcepts[group.conceptId];
                  return (
                    <div
                      key={group.conceptId}
                      className="rounded-2xl bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-white/[0.08] overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          playClick();
                          setExpandedConcepts((prev) => ({
                            ...prev,
                            [group.conceptId]: !prev[group.conceptId],
                          }));
                        }}
                        className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left hover:bg-[#F4F8FF] dark:hover:bg-[#162033]/70 transition-colors"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                            <span className="text-[#0284C7] dark:text-[#06B6D4]">
                              {group.subject}
                            </span>
                            <span className="text-[#94A3B8]">·</span>
                            <span className="text-[#475569] dark:text-[#94A3B8]">
                              {group.chapter}
                            </span>
                            <span className="text-[#94A3B8]">·</span>
                            <span
                              className={`font-mono text-[11px] font-bold ${
                                group.yieldLabel === 'High Yield'
                                  ? 'text-[#15803D] dark:text-[#22C55E]'
                                  : 'text-[#EA580C] dark:text-[#F97316]'
                              }`}
                            >
                              {group.yieldLabel}
                            </span>
                          </div>
                          <h2 className="font-display text-base sm:text-lg font-semibold text-[#0B1F3A] dark:text-[#F8FAFC]">
                            {lang === 'hi' ? group.conceptTitleHi : group.conceptTitle}
                          </h2>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-mono text-xs font-semibold text-[#475569] dark:text-[#94A3B8] tabular-nums">
                            {group.questions.length} PYQ{group.questions.length > 1 ? 's' : ''}
                          </span>
                          {isOpen ? (
                            <ChevronUp className="w-5 h-5 text-[#475569] dark:text-[#94A3B8]" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-[#475569] dark:text-[#94A3B8]" />
                          )}
                        </div>
                      </button>

                      {isOpen && (
                        <div className="border-t border-[#E2E8F0] dark:border-white/[0.08] divide-y divide-[#E2E8F0] dark:divide-white/[0.08]">
                          {group.questions.map((q) => {
                            const picked = selectedOptions[q.id];
                            const isAnsweredMcq = picked !== undefined;
                            const isCorrectMcq = isAnsweredMcq && picked === q.correctOptionIndex;
                            const isCheckedNat = !!natChecked[q.id];
                            const isCorrectNat =
                              isCheckedNat && Number((natInputs[q.id] ?? '').trim()) === Number(q.natAnswer);
                            const isSavedMistake = mistakeIds.includes(q.id);
                            const solutionVisible = !!openSolutions[q.id];
                            const options = lang === 'hi' ? q.optionsHi ?? q.optionsEn : q.optionsEn;
                            const steps = lang === 'hi' ? q.solutionStepsHi : q.solutionStepsEn;

                            return (
                              <div key={q.id} className="p-5 space-y-4">
                                {/* Question Meta Row */}
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                                    <span className="px-2.5 py-0.5 rounded-lg bg-[#0284C7]/10 dark:bg-[#06B6D4]/15 text-[#0284C7] dark:text-[#22D3EE] font-bold">
                                      {q.exam}
                                    </span>
                                    <span className="text-[#475569] dark:text-[#94A3B8] font-semibold">
                                      {q.shiftBadge}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-lg bg-[#EEF4FF] dark:bg-[#162033] text-[#475569] dark:text-[#94A3B8] font-semibold">
                                      {q.questionType}
                                    </span>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => toggleMistakeBookmark(q)}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                                      isSavedMistake
                                        ? 'bg-[#F97316]/12 border-[#F97316]/40 text-[#EA580C] dark:text-[#F97316]'
                                        : 'bg-[#F4F8FF] dark:bg-[#162033] border-[#E2E8F0] dark:border-white/[0.08] text-[#475569] dark:text-[#94A3B8] hover:border-[#0284C7] dark:hover:border-[#06B6D4]'
                                    }`}
                                  >
                                    {isSavedMistake ? (
                                      <>
                                        <BookmarkCheck className="w-3.5 h-3.5" />
                                        In Mistake Notebook
                                      </>
                                    ) : (
                                      <>
                                        <BookmarkPlus className="w-3.5 h-3.5" />
                                        Add to Mistake Notebook
                                      </>
                                    )}
                                  </button>
                                </div>

                                {/* Question Prompt (KaTeX rendered) */}
                                <div className="text-sm sm:text-[15px] leading-relaxed text-[#0B1F3A] dark:text-[#F8FAFC] font-medium">
                                  <RichMathText text={lang === 'hi' ? q.questionHi : q.questionEn} />
                                </div>

                                {/* MCQ Options or NAT Numerical Input */}
                                {q.questionType === 'MCQ' && options ? (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    {options.map((opt, idx) => {
                                      const isSelected = picked === idx;
                                      const isRight = idx === q.correctOptionIndex;
                                      let styleClass =
                                        'bg-[#F4F8FF] dark:bg-[#162033] border-[#E2E8F0] dark:border-white/[0.08] text-[#0B1F3A] dark:text-[#F8FAFC] hover:border-[#0284C7] dark:hover:border-[#06B6D4]';

                                      if (isAnsweredMcq) {
                                        if (isRight) {
                                          styleClass =
                                            'bg-[#22C55E]/15 border-[#22C55E] text-[#15803D] dark:text-[#22C55E]';
                                        } else if (isSelected && !isRight) {
                                          styleClass =
                                            'bg-[#EF4444]/15 border-[#EF4444] text-[#DC2626] dark:text-[#EF4444]';
                                        } else {
                                          styleClass =
                                            'bg-[#F4F8FF]/60 dark:bg-[#162033]/50 border-[#E2E8F0] dark:border-white/[0.06] text-[#475569] dark:text-[#94A3B8] opacity-75';
                                        }
                                      }

                                      return (
                                        <button
                                          key={idx}
                                          type="button"
                                          disabled={isAnsweredMcq}
                                          onClick={() => handleSelectMcq(q, idx)}
                                          className={`text-left px-4 py-3 rounded-xl border text-sm font-medium flex items-center justify-between gap-2 transition-all ${styleClass}`}
                                        >
                                          <div className="flex items-start gap-2.5 min-w-0">
                                            <span className="font-mono text-xs font-bold shrink-0 mt-0.5">
                                              ({String.fromCharCode(65 + idx)})
                                            </span>
                                            <span className="min-w-0">
                                              <RichMathText text={opt} />
                                            </span>
                                          </div>
                                          {isAnsweredMcq && isRight && (
                                            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#22C55E]" />
                                          )}
                                          {isAnsweredMcq && isSelected && !isRight && (
                                            <XCircle className="w-4 h-4 shrink-0 text-[#EF4444]" />
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div className="flex flex-wrap items-center gap-2.5">
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      disabled={isCheckedNat}
                                      value={natInputs[q.id] ?? ''}
                                      onChange={(e) =>
                                        setNatInputs((prev) => ({ ...prev, [q.id]: e.target.value }))
                                      }
                                      placeholder="Enter integer / numerical answer..."
                                      className="w-64 max-w-full px-3.5 py-2.5 rounded-xl text-sm font-mono bg-[#F4F8FF] dark:bg-[#162033] border border-[#E2E8F0] dark:border-white/[0.08] text-[#0B1F3A] dark:text-[#F8FAFC]"
                                    />
                                    <button
                                      type="button"
                                      disabled={isCheckedNat}
                                      onClick={() => handleCheckNat(q)}
                                      className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#0284C7] dark:bg-[#06B6D4] text-white dark:text-[#070B14] disabled:opacity-50"
                                    >
                                      Verify Answer
                                    </button>
                                  </div>
                                )}

                                {/* Instant +4 / -1 Feedback + Solution Toggle */}
                                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                                  <div className="text-xs font-semibold">
                                    {isAnsweredMcq && (
                                      <span
                                        className={
                                          isCorrectMcq
                                            ? 'text-[#15803D] dark:text-[#22C55E] font-mono'
                                            : 'text-[#DC2626] dark:text-[#EF4444] font-mono'
                                        }
                                      >
                                        {isCorrectMcq
                                          ? 'Correct! +4 Marks · +5 Season XP'
                                          : 'Incorrect (-1 Mark) · Review step-by-step solution'}
                                      </span>
                                    )}
                                    {isCheckedNat && (
                                      <span
                                        className={
                                          isCorrectNat
                                            ? 'text-[#15803D] dark:text-[#22C55E] font-mono'
                                            : 'text-[#DC2626] dark:text-[#EF4444] font-mono'
                                        }
                                      >
                                        {isCorrectNat
                                          ? `Exact Match (${q.natAnswer})! +4 Marks`
                                          : `Expected Answer: ${q.natAnswer} (0 Marks)`}
                                      </span>
                                    )}
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      playClick();
                                      setOpenSolutions((prev) => ({
                                        ...prev,
                                        [q.id]: !prev[q.id],
                                      }));
                                    }}
                                    className="text-xs font-bold text-[#0284C7] dark:text-[#22D3EE] hover:underline inline-flex items-center gap-1"
                                  >
                                    {solutionVisible ? 'Hide Solution' : 'View Step-by-Step Solution'}
                                    {solutionVisible ? (
                                      <ChevronUp className="w-3.5 h-3.5" />
                                    ) : (
                                      <ChevronDown className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>

                                {solutionVisible && (
                                  <div className="rounded-xl bg-[#F4F8FF] dark:bg-[#162033] border border-[#E2E8F0] dark:border-white/[0.08] p-4 space-y-2.5">
                                    <p className="text-xs font-bold uppercase tracking-wider text-[#0284C7] dark:text-[#06B6D4]">
                                      Step-by-Step Derivation
                                    </p>
                                    <ol className="list-decimal list-inside space-y-1.5 text-sm text-[#0B1F3A] dark:text-[#F8FAFC]">
                                      {steps.map((step, sIdx) => (
                                        <li key={sIdx} className="leading-relaxed">
                                          <RichMathText text={step} />
                                        </li>
                                      ))}
                                    </ol>
                                    <div className="pt-2 border-t border-[#E2E8F0] dark:border-white/[0.08] text-xs text-[#475569] dark:text-[#94A3B8]">
                                      <span className="font-bold text-[#EA580C] dark:text-[#F97316]">
                                        Exam Shortcut:{' '}
                                      </span>
                                      <RichMathText text={q.examTipEn} />
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* =================================================================
            SUB-TAB B: 2027 HIGH-YIELD PREDICTOR
           ================================================================= */}
        {activeTab === 'predictor' && (
          <section className="space-y-6" aria-label="2027 High-Yield Predictor">
            {/* Exam Toggle & Subject Filter */}
            <div className="rounded-2xl bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-white/[0.08] p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-center p-1 rounded-xl bg-[#EEF4FF] dark:bg-[#162033] border border-[#E2E8F0] dark:border-white/[0.08]">
                {(['JEE Main 2027', 'NEET UG 2027'] as const).map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => {
                      playClick();
                      setPredictorExam(ex);
                      setPredictorSubject('All');
                    }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      predictorExam === ex
                        ? 'bg-[#0284C7] dark:bg-[#06B6D4] text-white dark:text-[#070B14]'
                        : 'text-[#475569] dark:text-[#94A3B8] hover:text-[#0B1F3A] dark:hover:text-[#F8FAFC]'
                    }`}
                  >
                    {ex}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {predictorSubjects.map((subj) => (
                  <button
                    key={subj}
                    type="button"
                    onClick={() => {
                      playClick();
                      setPredictorSubject(subj);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                      predictorSubject === subj
                        ? 'bg-[#0B1F3A] dark:bg-[#22D3EE] text-white dark:text-[#070B14] border-transparent'
                        : 'bg-[#F4F8FF] dark:bg-[#162033] border-[#E2E8F0] dark:border-white/[0.08] text-[#475569] dark:text-[#94A3B8]'
                    }`}
                  >
                    {subj}
                  </button>
                ))}
              </div>
            </div>

            {/* Recharts Horizontal Bar Chart — Top 10 Chapters */}
            <div className="rounded-2xl bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-white/[0.08] p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-bold text-[#0B1F3A] dark:text-[#F8FAFC]">
                    Top 10 Highest-Weightage Chapters ({predictorExam})
                  </h2>
                  <p className="text-xs text-[#475569] dark:text-[#94A3B8]">
                    Calibrated from 2019–2026 NTA shift trends · Click any chapter below to drill its Concept PYQs.
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs font-semibold">
                  <span className="inline-flex items-center gap-1.5 text-[#475569] dark:text-[#94A3B8]">
                    <span className="h-2.5 w-2.5 rounded-sm bg-[#06B6D4]" />
                    Tier 1 Anchor
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[#475569] dark:text-[#94A3B8]">
                    <span className="h-2.5 w-2.5 rounded-sm bg-[#F97316]" />
                    Rising 2027 Trend
                  </span>
                </div>
              </div>

              <div className="h-[340px] w-full">
                <RechartsContainer width="100%" height="100%">
                  <BarChart
                    data={top10ChartData}
                    layout="vertical"
                    margin={{ top: 4, right: 24, left: 10, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" horizontal={false} />
                    <XAxis
                      type="number"
                      unit="%"
                      tick={{ fill: '#94A3B8', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={138}
                      tick={{ fill: '#94A3B8', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(6, 182, 212, 0.08)' }}
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        borderColor: 'rgba(255,255,255,0.12)',
                        borderRadius: '12px',
                        color: '#F8FAFC',
                        fontSize: '12px',
                      }}
                      formatter={(value: unknown, _name: unknown, props: { payload?: { expectedQuestions?: number; subject?: string } }) => [
                        `${value}% weightage (~${props.payload?.expectedQuestions ?? 2} Qs · ${props.payload?.subject ?? ''})`,
                        '2027 Forecast',
                      ]}
                    />
                    <Bar dataKey="weightage" radius={[0, 8, 8, 0]} barSize={20}>
                      {top10ChartData.map((entry, idx) => (
                        <Cell
                          key={idx}
                          fill={entry.risingTrend ? '#F97316' : entry.tier === 1 ? '#06B6D4' : '#64748B'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </RechartsContainer>
              </div>
            </div>

            {/* 3-Column Priority Tiers Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {(
                [
                  {
                    tier: 1 as const,
                    title: 'Tier 1 — Must-Do High Yield',
                    subtitle: 'Covers ~55% of paper · Master first',
                    accent: 'text-[#0284C7] dark:text-[#06B6D4]',
                    border: 'border-[#06B6D4]/30',
                  },
                  {
                    tier: 2 as const,
                    title: 'Tier 2 — High-ROI Boosters',
                    subtitle: 'Consistent 2–4 Qs · Fast score jump',
                    accent: 'text-[#EA580C] dark:text-[#F97316]',
                    border: 'border-[#F97316]/30',
                  },
                  {
                    tier: 3 as const,
                    title: 'Tier 3 — Selective Polish',
                    subtitle: '1–2 Qs · Formula & NCERT quick scan',
                    accent: 'text-[#475569] dark:text-[#94A3B8]',
                    border: 'border-[#E2E8F0] dark:border-white/[0.08]',
                  },
                ] as const
              ).map((col) => {
                const items = predictorChapters.filter((c) => c.priorityTier === col.tier);
                return (
                  <div
                    key={col.tier}
                    className={`rounded-2xl bg-[#FFFFFF] dark:bg-[#0F172A] border ${col.border} p-5 flex flex-col gap-4`}
                  >
                    <div>
                      <p className={`font-mono text-xs font-bold uppercase tracking-wider ${col.accent}`}>
                        Priority Tier {col.tier}
                      </p>
                      <h3 className="font-display text-base font-bold text-[#0B1F3A] dark:text-[#F8FAFC] mt-0.5">
                        {col.title}
                      </h3>
                      <p className="text-xs text-[#475569] dark:text-[#94A3B8]">{col.subtitle}</p>
                    </div>

                    <div className="space-y-3 flex-1">
                      {items.length === 0 ? (
                        <p className="text-xs text-[#475569] dark:text-[#94A3B8] py-4">
                          No chapters in this tier for the selected subject filter.
                        </p>
                      ) : (
                        items.map((ch) => (
                          <div
                            key={ch.id}
                            className="rounded-xl bg-[#F4F8FF] dark:bg-[#162033] border border-[#E2E8F0] dark:border-white/[0.08] p-3.5 space-y-2.5"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-bold text-[#0B1F3A] dark:text-[#F8FAFC]">
                                  {ch.chapter}
                                </p>
                                <p className="text-[11px] font-semibold text-[#475569] dark:text-[#94A3B8]">
                                  {ch.subject} · Expected {ch.expectedQuestions} Qs ({ch.weightagePct}%)
                                </p>
                              </div>
                              {ch.risingTrend && (
                                <span className="font-mono text-[10px] font-bold text-[#EA580C] dark:text-[#F97316] shrink-0">
                                  ↑ Rising
                                </span>
                              )}
                            </div>

                            <ul className="space-y-1 text-xs text-[#475569] dark:text-[#94A3B8]">
                              {ch.topSubTopics.map((topic) => (
                                <li key={topic} className="flex items-center gap-1.5">
                                  <Target className="w-3 h-3 text-[#0284C7] dark:text-[#06B6D4] shrink-0" />
                                  <span>{topic}</span>
                                </li>
                              ))}
                            </ul>

                            <button
                              type="button"
                              onClick={() => jumpToPracticeChapter(ch.chapter, ch.subject)}
                              className="w-full mt-1 py-2 px-3 rounded-lg text-xs font-bold bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-white/10 text-[#0284C7] dark:text-[#22D3EE] hover:border-[#0284C7] dark:hover:border-[#06B6D4] inline-flex items-center justify-center gap-1.5 transition-colors"
                            >
                              Practice Concept PYQs
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* =================================================================
            SUB-TAB C: NCERT-TO-PYQ MAPPER (50/50 DESKTOP SPLIT-PANE)
           ================================================================= */}
        {activeTab === 'ncert' && (
          <section className="space-y-4" aria-label="NCERT to PYQ Mapper">
            {/* Class & Subject Selector */}
            <div className="rounded-2xl bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-white/[0.08] p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {(['All', 'Class 11', 'Class 12'] as const).map((cls) => (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => {
                      playClick();
                      setNcertClass(cls);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                      ncertClass === cls
                        ? 'bg-[#0284C7] dark:bg-[#06B6D4] text-white dark:text-[#070B14]'
                        : 'bg-[#F4F8FF] dark:bg-[#162033] text-[#475569] dark:text-[#94A3B8] border border-[#E2E8F0] dark:border-white/[0.08]'
                    }`}
                  >
                    {cls === 'All' ? 'Class 11 & 12' : cls}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {(['All', 'Biology', 'Chemistry', 'Physics'] as const).map((subj) => (
                  <button
                    key={subj}
                    type="button"
                    onClick={() => {
                      playClick();
                      setNcertSubject(subj);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                      ncertSubject === subj
                        ? 'bg-[#0B1F3A] dark:bg-[#22D3EE] text-white dark:text-[#070B14] border-transparent'
                        : 'bg-[#F4F8FF] dark:bg-[#162033] border-[#E2E8F0] dark:border-white/[0.08] text-[#475569] dark:text-[#94A3B8]'
                    }`}
                  >
                    {subj}
                  </button>
                ))}
              </div>
            </div>

            {/* 50% / 50% Split Pane */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
              {/* Left Pane: Highlighted High-Yield NCERT Sentences */}
              <div className="space-y-3">
                <p className="font-mono text-xs font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8]">
                  NCERT High-Yield Passages ({filteredNcertLines.length}) · Click to inspect PYQs
                </p>

                {filteredNcertLines.map((line) => {
                  const selected = activeNcertLine.id === line.id;
                  return (
                    <button
                      key={line.id}
                      type="button"
                      onClick={() => {
                        playClick();
                        setSelectedNcertId(line.id);
                      }}
                      className={`w-full text-left rounded-2xl p-5 border transition-all space-y-2.5 ${
                        selected
                          ? 'bg-[#FFFFFF] dark:bg-[#0F172A] border-[#0284C7] dark:border-[#06B6D4] ring-1 ring-[#0284C7]/30 dark:ring-[#06B6D4]/30'
                          : 'bg-[#FFFFFF] dark:bg-[#0F172A] border-[#E2E8F0] dark:border-white/[0.08] hover:border-[#0284C7]/50 dark:hover:border-[#06B6D4]/50'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-mono font-bold text-[#0284C7] dark:text-[#22D3EE]">
                          {line.pageRef}
                        </span>
                        <span className="font-mono text-[11px] font-semibold text-[#15803D] dark:text-[#22C55E]">
                          {line.linkedPyqs.length} Linked PYQ{line.linkedPyqs.length > 1 ? 's' : ''}
                        </span>
                      </div>

                      <h3 className="font-display text-sm sm:text-base font-bold text-[#0B1F3A] dark:text-[#F8FAFC]">
                        {line.sectionHeading}
                      </h3>

                      <p className="text-xs sm:text-sm leading-relaxed text-[#475569] dark:text-[#94A3B8]">
                        {line.contextBefore}{' '}
                        <mark className="px-1 py-0.5 rounded bg-[#06B6D4]/18 dark:bg-[#06B6D4]/25 text-[#0B1F3A] dark:text-[#F8FAFC] font-semibold">
                          {line.highlightedSentence}
                        </mark>{' '}
                        {line.contextAfter}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Right Pane: Linked Past PYQs with Instant Solve Mode */}
              <div className="rounded-2xl bg-[#FFFFFF] dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-white/[0.08] p-5 space-y-5 lg:sticky lg:top-20">
                <div className="space-y-1 pb-3 border-b border-[#E2E8F0] dark:border-white/[0.08]">
                  <p className="font-mono text-xs font-bold text-[#EA580C] dark:text-[#F97316] inline-flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    EXACT PYQs LIFTED FROM THIS NCERT LINE
                  </p>
                  <h3 className="font-display text-base sm:text-lg font-bold text-[#0B1F3A] dark:text-[#F8FAFC]">
                    {activeNcertLine.chapter}
                  </h3>
                  <p className="text-xs text-[#475569] dark:text-[#94A3B8]">
                    {activeNcertLine.pageRef}
                  </p>
                </div>

                <div className="space-y-5">
                  {activeNcertLine.linkedPyqs.map((pyq) => {
                    const picked = ncertAnswers[pyq.id];
                    const answered = picked !== undefined;
                    const correct = answered && picked === pyq.correctIndex;
                    return (
                      <div
                        key={pyq.id}
                        className="rounded-xl bg-[#F4F8FF] dark:bg-[#162033] border border-[#E2E8F0] dark:border-white/[0.08] p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2.5 py-0.5 rounded-lg bg-[#0284C7]/12 dark:bg-[#06B6D4]/15 text-[#0284C7] dark:text-[#22D3EE] font-mono text-xs font-bold">
                            {pyq.examYear}
                          </span>
                          {answered && (
                            <span
                              className={`font-mono text-xs font-bold ${
                                correct
                                  ? 'text-[#15803D] dark:text-[#22C55E]'
                                  : 'text-[#DC2626] dark:text-[#EF4444]'
                              }`}
                            >
                              {correct ? '+4 Correct' : '-1 Incorrect'}
                            </span>
                          )}
                        </div>

                        <p className="text-sm font-semibold text-[#0B1F3A] dark:text-[#F8FAFC] leading-relaxed">
                          {pyq.question}
                        </p>

                        <div className="space-y-2">
                          {pyq.options.map((opt, oIdx) => {
                            const isSelected = picked === oIdx;
                            const isRight = oIdx === pyq.correctIndex;
                            let cls =
                              'bg-[#FFFFFF] dark:bg-[#0F172A] border-[#E2E8F0] dark:border-white/10 text-[#0B1F3A] dark:text-[#F8FAFC] hover:border-[#0284C7] dark:hover:border-[#06B6D4]';
                            if (answered) {
                              if (isRight) {
                                cls = 'bg-[#22C55E]/15 border-[#22C55E] text-[#15803D] dark:text-[#22C55E]';
                              } else if (isSelected) {
                                cls = 'bg-[#EF4444]/15 border-[#EF4444] text-[#DC2626] dark:text-[#EF4444]';
                              }
                            }
                            return (
                              <button
                                key={oIdx}
                                type="button"
                                disabled={answered}
                                onClick={() => {
                                  setNcertAnswers((prev) => ({ ...prev, [pyq.id]: oIdx }));
                                  if (oIdx === pyq.correctIndex) playSuccess();
                                  else playClick();
                                  recordPyqSprintProgress(1);
                                }}
                                className={`w-full text-left px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-medium transition-colors flex items-center justify-between gap-2 ${cls}`}
                              >
                                <span>
                                  <strong className="font-mono mr-1.5">
                                    ({String.fromCharCode(65 + oIdx)})
                                  </strong>
                                  {opt}
                                </span>
                                {answered && isRight && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                              </button>
                            );
                          })}
                        </div>

                        {answered && (
                          <p className="text-xs text-[#475569] dark:text-[#94A3B8] pt-2 border-t border-[#E2E8F0] dark:border-white/[0.08] leading-relaxed">
                            <strong className="text-[#0B1F3A] dark:text-[#F8FAFC]">NCERT Match: </strong>
                            {pyq.explanation}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        )}
      </ResponsiveContainer>
    </PageLayout>
  );
}
