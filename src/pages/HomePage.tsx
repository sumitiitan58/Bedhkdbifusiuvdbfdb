import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarCheck,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Download,
  FileSpreadsheet,
  Info,
  Pause,
  Play,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  UserCircle2,
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
import { BrandLogo } from '../components/BrandLogo';
import { ReusableButton } from '../components/ReusableButton';
import { ReusableCard } from '../components/ReusableCard';
import { ClassSubClassPicker } from '../components/ClassSubClassPicker';
import { GeminiMentorPanel } from '../components/ai/GeminiMentorPanel';
import { SeoHead } from '../components/SeoHead';
import { useAuth } from '../context/AuthContext';
import { usePlatformData } from '../context/PlatformDataContext';
import { PLATFORM_MODULES } from '../services/platformRegistry';
import { MANZIL_78_LECTURES, PLANNER_60_DAYS } from '../utils/plannerData';
import { computeManzilAndWeightageStats } from '../utils/plannerStats';
import { computeCumulativeAnalytics } from '../utils/scoringEngine';
import {
  computeWeeklyScheduleStats,
  WEEK_DAY_LABELS,
  WEEK_DAYS,
} from '../utils/weeklySchedule';
import { playClick, playNav, playSuccess } from '../utils/soundEffects';
import type {
  PlannerDayTask,
  StudentCohortId,
  UserProgressData,
  WeeklyDay,
} from '../types';

const DIFFICULTY_COLORS: Record<string, string> = {
  Easy: '#10B981',
  Moderate: '#2563EB',
  Tough: '#F97316',
};

const MODULE_ICONS = {
  materials: BookOpen,
  profile: UserCircle2,
  'cbt-mocks': ClipboardCheck,
  dpp: FileSpreadsheet,
  analytics: BarChart3,
  admin: ShieldCheck,
};

const PHASES: ('All' | PlannerDayTask['phase'])[] = [
  'All',
  'Phase 1: Foundation & High-Yield',
  'Phase 2: Core Mastery',
  'Phase 3: Full Revision & CBT',
];

const REVEAL_PROPS = {
  initial: { opacity: 0, y: 14 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.12 },
  transition: { duration: 0.28, ease: 'easeOut' as const },
};

const JS_DAY_TO_WEEKDAY: WeeklyDay[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type ToolkitTab = 'focus' | 'sprint' | 'matrix';

function getStreamAbbrev(subjects: string[], streamLabel: string): string {
  const joined = subjects.join(' ').toLowerCase();
  if (joined.includes('physics') && joined.includes('chemistry') && joined.includes('math')) {
    return 'PCM';
  }
  if (joined.includes('physics') && joined.includes('chemistry') && joined.includes('biology')) {
    return 'PCB';
  }
  return streamLabel;
}

export default function HomePage() {
  const {
    firebaseUser,
    profile,
    isAdmin,
    cohortId,
    isGuest,
    hasCompletedOnboarding,
    selectCohort,
    continueAsGuest,
    signInWithGoogle,
    openOnboardingModal,
  } = useAuth();
  const {
    allCohorts,
    progress,
    attempts,
    togglePlannerDay,
    toggleWeeklyTask,
    addWeeklyTask,
    deleteWeeklyTask,
    resetWeeklySchedule,
    logFocusMinutes,
    importBackupProgress,
  } = usePlatformData();

  const [pickedCohort, setPickedCohort] = useState<StudentCohortId>(cohortId);

  // Weekly Schedule: default to Today's Focus weekday
  const todayDay: WeeklyDay = JS_DAY_TO_WEEKDAY[new Date().getDay()] ?? 'Mon';
  const [selectedDay, setSelectedDay] = useState<WeeklyDay | 'All'>(todayDay);
  const [addingTask, setAddingTask] = useState(false);
  const [newTaskDay, setNewTaskDay] = useState<WeeklyDay>(todayDay);
  const [newTaskSlot, setNewTaskSlot] = useState('19:00 – 20:30');
  const [newTaskSubject, setNewTaskSubject] = useState('Physics');
  const [newTaskTopic, setNewTaskTopic] = useState('');
  const [newTaskDuration, setNewTaskDuration] = useState(90);

  // Unified Tabbed Study Toolkit (Focus Timer | 60-Day Sprint | 300-Mark Matrix)
  const [activeToolkitTab, setActiveToolkitTab] = useState<ToolkitTab>('focus');
  const [phaseFilter, setPhaseFilter] = useState<'All' | PlannerDayTask['phase']>('All');
  const [showAllDays, setShowAllDays] = useState(false);

  // Focus Timer (25 / 50 min) + Backup/Restore
  const [focusPresetMin, setFocusPresetMin] = useState<25 | 50>(25);
  const [focusSecondsLeft, setFocusSecondsLeft] = useState(25 * 60);
  const [focusRunning, setFocusRunning] = useState(false);
  const [backupNotice, setBackupNotice] = useState<string | null>(null);
  const backupInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!focusRunning) return;
    const id = window.setInterval(() => {
      setFocusSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(id);
          setFocusRunning(false);
          logFocusMinutes(focusPresetMin);
          playSuccess();
          setBackupNotice(`Completed ${focusPresetMin}m focus sprint! Logged to your total.`);
          return focusPresetMin * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [focusRunning, focusPresetMin, logFocusMinutes]);

  const activeCohort = useMemo(
    () => allCohorts.find((c) => c.id === cohortId) ?? allCohorts[0],
    [allCohorts, cohortId]
  );

  const visibleModules = useMemo(
    () => PLATFORM_MODULES.filter((mod) => mod.id !== 'admin' || isAdmin),
    [isAdmin]
  );

  const weeklyItems = progress.weeklySchedule ?? [];
  const weeklyStats = useMemo(() => computeWeeklyScheduleStats(weeklyItems), [weeklyItems]);
  const visibleWeeklyItems = useMemo(
    () =>
      selectedDay === 'All'
        ? weeklyItems
        : weeklyItems.filter((item) => item.day === selectedDay),
    [selectedDay, weeklyItems]
  );

  const focusHours = useMemo(() => {
    const h = progress.focusSessionsMinutes / 60;
    return h === 0 ? '0' : Number.isInteger(h) ? String(h) : h.toFixed(1);
  }, [progress.focusSessionsMinutes]);

  const analyticsSummary = useMemo(() => computeCumulativeAnalytics(attempts), [attempts]);

  const paceTotals = useMemo(
    () =>
      attempts.reduce(
        (acc, att) => ({
          tooFast: acc.tooFast + att.paceSummary.tooFastCount,
          optimal: acc.optimal + att.paceSummary.optimalCount,
          tooSlow: acc.tooSlow + att.paceSummary.tooSlowCount,
          unattempted: acc.unattempted + att.paceSummary.unattemptedCount,
        }),
        { tooFast: 0, optimal: 0, tooSlow: 0, unattempted: 0 }
      ),
    [attempts]
  );

  const subjectPerfForAi = useMemo(() => {
    const map = new Map<string, { correct: number; incorrect: number; score: number; maxScore: number }>();
    for (const att of attempts) {
      for (const s of att.subjectScores) {
        const cur = map.get(s.subjectName) ?? { correct: 0, incorrect: 0, score: 0, maxScore: 0 };
        cur.correct += s.correct;
        cur.incorrect += s.incorrect;
        cur.score += s.score;
        cur.maxScore += s.maxScore;
        map.set(s.subjectName, cur);
      }
    }
    return Array.from(map.entries()).map(([subject, v]) => ({
      subject,
      accuracy: v.correct + v.incorrect > 0 ? Math.round((v.correct / (v.correct + v.incorrect)) * 100) : 0,
      scorePct: v.maxScore > 0 ? Math.max(0, Math.round((v.score / v.maxScore) * 100)) : 0,
    }));
  }, [attempts]);

  const weakChaptersForAi = useMemo(() => {
    const map = new Map<string, { chapterName: string; subjectName: string; correct: number; incorrect: number }>();
    for (const att of attempts) {
      for (const c of att.chapterScores) {
        const key = `${c.subjectName}::${c.chapterName}`;
        const cur = map.get(key) ?? { chapterName: c.chapterName, subjectName: c.subjectName, correct: 0, incorrect: 0 };
        cur.correct += c.correct;
        cur.incorrect += c.incorrect;
        map.set(key, cur);
      }
    }
    return Array.from(map.values())
      .map((c) => ({
        chapterName: c.chapterName,
        subjectName: c.subjectName,
        accuracy: c.correct + c.incorrect > 0 ? Math.round((c.correct / (c.correct + c.incorrect)) * 100) : 0,
      }))
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 5);
  }, [attempts]);

  const weightageSummary = useMemo(
    () => computeManzilAndWeightageStats(MANZIL_78_LECTURES, progress.manzilProgress).weightage,
    [progress.manzilProgress]
  );

  const completedDaySet = useMemo(
    () => new Set(progress.plannerCompletedDays),
    [progress.plannerCompletedDays]
  );

  const filteredPlannerDays = useMemo(() => {
    const base =
      phaseFilter === 'All'
        ? PLANNER_60_DAYS
        : PLANNER_60_DAYS.filter((d) => d.phase === phaseFilter);
    return showAllDays ? base : base.slice(0, 8);
  }, [phaseFilter, showAllDays]);

  const plannerPercent = Math.round((progress.plannerCompletedDays.length / 60) * 100);

  const scrollToSection = (sectionId: string, toolkitTab?: ToolkitTab) => {
    playClick();
    if (toolkitTab) setActiveToolkitTab(toolkitTab);
    window.requestAnimationFrame(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const handleAddWeeklyTask = () => {
    const topic = newTaskTopic.trim();
    if (!topic) return;
    playSuccess();
    addWeeklyTask({
      day: newTaskDay,
      timeSlot: newTaskSlot.trim() || '19:00 – 20:00',
      subject: newTaskSubject.trim() || 'Physics',
      topic,
      durationMinutes: Math.max(15, Number(newTaskDuration) || 60),
      completed: false,
      priority: 'High',
    });
    setSelectedDay(newTaskDay);
    setNewTaskTopic('');
    setAddingTask(false);
  };

  const handleExportBackup = () => {
    playClick();
    const payload = {
      platform: 'PREPSKM.IN',
      exportedAt: new Date().toISOString(),
      cohortId,
      progress,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prepskm-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setBackupNotice('Backup JSON exported.');
  };

  const handleImportBackup = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as {
          progress?: Partial<UserProgressData>;
        };
        const data = parsed.progress ?? (parsed as Partial<UserProgressData>);
        importBackupProgress(data);
        playSuccess();
        setBackupNotice('Backup restored cleanly.');
      } catch {
        setBackupNotice('Invalid JSON backup file.');
      }
    };
    reader.readAsText(file);
  };

  const focusMins = Math.floor(focusSecondsLeft / 60);
  const focusSecs = focusSecondsLeft % 60;
  const targetYear = profile?.targetYear || '2027';
  const streamPillText = activeCohort
    ? `${getStreamAbbrev(activeCohort.subjects, activeCohort.stream)} · ${targetYear} Target`
    : `PCM · ${targetYear} Target`;
  const guestSyncHint = isGuest
    ? 'Sign in to sync your progress across devices'
    : undefined;

  return (
    <PageLayout>
      <SeoHead
        title="Prepskm - Free JEE & NEET Study Material, CBT Mocks & AI Prep"
        description="Prepskm provides free chapter-wise notes, NCERT PYQs, daily practice problems (DPPs), and NTA-pattern CBT mock tests for JEE Main, JEE Advanced & NEET."
        canonicalPath="/"
        keywords="Prepskm, prepskm.in, prepskm mock test, unfiltereddsumit, JEE Main 2027, NEET UG, Class 11 JEE, Class 12 JEE, Class 12 NEET, concise chapter notes, NTA CBT mock tests, DPP"
      />

      {/* Clean Light Hero Section */}
      <section className="border-b border-slate-200/80 dark:border-slate-800/80 bg-gradient-to-b from-white via-[#F8FAFC] to-[#F1F5F9]/60 dark:from-[#0C1324] dark:via-[#090E1A] dark:to-[#090E1A]">
        <ResponsiveContainer className="py-6 sm:py-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28 }}
              className="lg:col-span-7 space-y-4"
            >
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#F97316]">
                PREPSKM.IN · JEE · NEET · Class 9–12 Boards
              </p>

              <h1 className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight text-[#0B1B3B] dark:text-white leading-[1.15] text-balance">
                Chapter-wise concise notes, DPPs &amp; NTA-grade CBT mocks.
              </h1>

              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
                Pick your class track, study verified chapter PDFs &amp; concise notes, attempt
                NTA-pattern JEE/NEET CBT mock tests, review solutions, and track Exam IQ.
              </p>

              <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
                <ReusableButton variant="primary" size="md" to="/cbt-mocks">
                  Start CBT Mock
                  <ArrowRight className="w-4 h-4" />
                </ReusableButton>
                <ReusableButton variant="secondary" size="md" to="/materials">
                  Chapters &amp; Notes
                </ReusableButton>
                <ReusableButton variant="ghost" size="sm" to="/about">
                  <Info className="w-4 h-4" />
                  About
                </ReusableButton>
              </div>

              {/* 4 Interactive Hero Stat Cards with Micro-Subtitles & Hover Lift */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3.5 border-t border-slate-200/80 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => scrollToSection('weekly-study-schedule')}
                  title={weeklyStats.completedTasks === 0 ? guestSyncHint : 'Jump to Weekly Study Schedule'}
                  className="group text-left p-3 rounded-2xl bg-white/90 dark:bg-[#111A2E]/90 border border-slate-200/80 dark:border-slate-800/80 hover:border-[#2563EB] dark:hover:border-sky-400 hover:-translate-y-0.5 hover:shadow-sm transition-all cursor-pointer"
                >
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between gap-1">
                    <span>Weekly</span>
                    <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 text-[#2563EB] transition-opacity" />
                  </p>
                  <p className="font-mono text-base sm:text-lg font-bold tabular-nums text-[#0B1B3B] dark:text-white mt-0.5">
                    {weeklyStats.completedTasks}/{weeklyStats.totalTasks}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Tasks Done
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => scrollToSection('study-toolkit', 'focus')}
                  title={progress.focusSessionsMinutes === 0 ? guestSyncHint : 'Jump to Focus Timer'}
                  className="group text-left p-3 rounded-2xl bg-white/90 dark:bg-[#111A2E]/90 border border-slate-200/80 dark:border-slate-800/80 hover:border-[#2563EB] dark:hover:border-sky-400 hover:-translate-y-0.5 hover:shadow-sm transition-all cursor-pointer"
                >
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between gap-1">
                    <span>Hours</span>
                    <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 text-[#2563EB] transition-opacity" />
                  </p>
                  <p className="font-mono text-base sm:text-lg font-bold tabular-nums text-[#2563EB] dark:text-sky-400 mt-0.5">
                    {focusHours}h
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Focus Logged
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => scrollToSection('study-toolkit', 'sprint')}
                  title={progress.plannerCompletedDays.length === 0 ? guestSyncHint : 'Jump to 60-Day Syllabus Sprint'}
                  className="group text-left p-3 rounded-2xl bg-white/90 dark:bg-[#111A2E]/90 border border-slate-200/80 dark:border-slate-800/80 hover:border-[#F97316] hover:-translate-y-0.5 hover:shadow-sm transition-all cursor-pointer"
                >
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between gap-1">
                    <span>60-Day</span>
                    <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 text-[#F97316] transition-opacity" />
                  </p>
                  <p className="font-mono text-base sm:text-lg font-bold tabular-nums text-[#F97316] mt-0.5">
                    {progress.plannerCompletedDays.length}/60
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Sprint Days
                  </p>
                </button>

                <Link
                  to="/cbt-mocks"
                  onClick={() => playNav()}
                  title={attempts.length === 0 ? guestSyncHint : 'Open CBT Mock Tests'}
                  className="group text-left p-3 rounded-2xl bg-white/90 dark:bg-[#111A2E]/90 border border-slate-200/80 dark:border-slate-800/80 hover:border-[#10B981] hover:-translate-y-0.5 hover:shadow-sm transition-all cursor-pointer block"
                >
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between gap-1">
                    <span>Tests</span>
                    <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 text-[#10B981] transition-opacity" />
                  </p>
                  <p className="font-mono text-base sm:text-lg font-bold tabular-nums text-[#10B981] mt-0.5">
                    {attempts.length}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Mocks Taken
                  </p>
                </Link>
              </div>
            </motion.div>

            {/* Compact Right Card: Emblem + Vertically Aligned Active Class Track */}
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.06 }}
              className="lg:col-span-5 flex flex-col items-center lg:items-end"
            >
              <div className="w-full max-w-sm space-y-3">
                <BrandLogo variant="hero" className="w-full" />
                {activeCohort && (
                  <div className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#111A2E] px-4 py-3.5 shadow-xs flex items-center justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Active Track · {isGuest ? 'Guest Mode' : 'Google Synced'}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-display text-sm sm:text-base font-bold text-[#0B1B3B] dark:text-white truncate">
                          {activeCohort.label}
                        </p>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700 shrink-0">
                          {streamPillText}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        playClick();
                        openOnboardingModal();
                      }}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-sky-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors shrink-0 self-center"
                    >
                      {firebaseUser ? 'Switch' : 'Sign In'}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </ResponsiveContainer>
      </section>

      <ResponsiveContainer className="py-7 sm:py-9 space-y-8 sm:space-y-10">
        {/* Class -> Sub-Class Selector */}
        <motion.section {...REVEAL_PROPS} aria-labelledby="class-selector-heading" className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#2563EB] dark:text-sky-400">
                Class &amp; Stream
              </p>
              <h2
                id="class-selector-heading"
                className="font-display text-lg sm:text-xl font-bold text-[#0B1B3B] dark:text-white"
              >
                Pick Your Class → Board, JEE or NEET
              </h2>
            </div>
            {!firebaseUser && (
              <button
                type="button"
                onClick={() => {
                  playClick();
                  openOnboardingModal();
                }}
                className="text-xs font-semibold text-[#F97316] hover:underline shrink-0"
              >
                Google Login
              </button>
            )}
          </div>

          <ReusableCard padding="sm" className="space-y-3 rounded-2xl border-slate-200/80 dark:border-slate-800/80">
            <ClassSubClassPicker
              selectedCohortId={hasCompletedOnboarding ? cohortId : pickedCohort}
              onSelect={(cid) => {
                setPickedCohort(cid);
                void selectCohort(cid);
              }}
              compact
            />

            {!hasCompletedOnboarding && (
              <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Save progress locally or sync via Google across devices.
                </p>
                <div className="flex gap-2">
                  <ReusableButton
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      playSuccess();
                      continueAsGuest(pickedCohort);
                    }}
                  >
                    Guest Mode
                  </ReusableButton>
                  <ReusableButton
                    variant="primary"
                    size="sm"
                    onClick={() => void signInWithGoogle(pickedCohort)}
                  >
                    Google Sign-In
                  </ReusableButton>
                </div>
              </div>
            )}
          </ReusableCard>
        </motion.section>

        {/* Quick Access Workspaces (Admin hidden unless admin is logged in) */}
        <motion.section {...REVEAL_PROPS} className="space-y-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#2563EB] dark:text-sky-400">
              Platform Modules
            </p>
            <h2 className="font-display text-lg sm:text-xl font-bold text-[#0B1B3B] dark:text-white">
              Quick Access Workspaces
            </h2>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {visibleModules.map((mod) => {
              const Icon = MODULE_ICONS[mod.id as keyof typeof MODULE_ICONS] ?? BookOpen;
              return (
                <Link
                  key={mod.id}
                  to={mod.route}
                  onClick={() => playNav()}
                  className="group block"
                >
                  <ReusableCard
                    interactive
                    padding="sm"
                    className="h-full rounded-2xl border-slate-200/80 dark:border-slate-800/80 flex flex-col justify-between gap-2.5 hover:-translate-y-0.5 transition-all"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-[#0B1B3B] dark:text-sky-400 inline-flex items-center justify-center group-hover:bg-[#2563EB] group-hover:text-white transition-colors">
                          <Icon className="w-4 h-4" />
                        </span>
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#F97316] group-hover:translate-x-0.5 transition-all" />
                      </div>
                      <h3 className="font-display text-sm font-bold text-[#0B1B3B] dark:text-white leading-snug">
                        {mod.title}
                      </h3>
                      <p className="hidden sm:block text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                        {mod.summary}
                      </p>
                    </div>
                  </ReusableCard>
                </Link>
              );
            })}
          </div>
        </motion.section>

        {/* Weekly Study Schedule — Auto-Highlights Today's Focus */}
        <motion.section
          {...REVEAL_PROPS}
          id="weekly-study-schedule"
          aria-labelledby="weekly-schedule-heading"
          className="scroll-mt-20 space-y-3"
        >
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#F97316] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                {selectedDay === todayDay
                  ? `Today's Focus · ${WEEK_DAY_LABELS[todayDay]}`
                  : selectedDay === 'All'
                  ? 'Full Weekly Timetable'
                  : `${WEEK_DAY_LABELS[selectedDay]} Schedule`}
              </p>
              <h2
                id="weekly-schedule-heading"
                className="font-display text-lg sm:text-xl font-bold text-[#0B1B3B] dark:text-white"
              >
                Weekly Study Schedule
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  playClick();
                  setAddingTask((v) => !v);
                  setNewTaskDay(selectedDay === 'All' ? todayDay : selectedDay);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#0B1B3B] dark:bg-[#2563EB] text-white hover:opacity-95 transition-opacity"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Task
              </button>
              <button
                type="button"
                onClick={() => {
                  playClick();
                  resetWeeklySchedule();
                }}
                title="Reset default weekly tasks"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-[#2563EB] transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            </div>
          </div>

          <ReusableCard
            padding="sm"
            className="space-y-4 rounded-2xl border-slate-200/80 dark:border-slate-800/80"
          >
            {/* Clean Day Filter Tabs (Zero trailing space inside parentheses) */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter schedule by day">
                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedDay === 'All'}
                  onClick={() => {
                    playClick();
                    setSelectedDay('All');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                    selectedDay === 'All'
                      ? 'bg-[#0B1B3B] text-white border-[#0B1B3B] dark:bg-[#2563EB] dark:border-[#2563EB]'
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-[#2563EB]'
                  }`}
                >
                  {`All (${weeklyStats.completedTasks}/${weeklyStats.totalTasks})`}
                </button>
                {WEEK_DAYS.map((day) => {
                  const counts = weeklyStats.byDayCounts[day];
                  const isToday = day === todayDay;
                  const active = selectedDay === day;
                  return (
                    <button
                      key={day}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => {
                        playClick();
                        setSelectedDay(day);
                      }}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors inline-flex items-center gap-1 ${
                        active
                          ? 'bg-[#0B1B3B] text-white border-[#0B1B3B] dark:bg-[#2563EB] dark:border-[#2563EB]'
                          : isToday
                          ? 'bg-orange-50/70 dark:bg-orange-950/30 border-[#F97316]/50 text-[#0B1B3B] dark:text-orange-200'
                          : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-[#2563EB]'
                      }`}
                    >
                      <span>{day}</span>
                      <span className="font-mono text-[10px] opacity-80">
                        {`(${counts.completed}/${counts.total})`}
                      </span>
                    </button>
                  );
                })}
              </div>

              <span className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
                {weeklyStats.completedHours}h / {weeklyStats.plannedHours}h ({weeklyStats.completionPercent}%)
              </span>
            </div>

            {/* Inline Quick-Add Form */}
            {addingTask && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                <select
                  value={newTaskDay}
                  onChange={(e) => setNewTaskDay(e.target.value as WeeklyDay)}
                  aria-label="Day of week"
                  className="sm:col-span-2 px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                >
                  {WEEK_DAYS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={newTaskSubject}
                  onChange={(e) => setNewTaskSubject(e.target.value)}
                  placeholder="Subject"
                  className="sm:col-span-2 px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
                <input
                  type="text"
                  value={newTaskSlot}
                  onChange={(e) => setNewTaskSlot(e.target.value)}
                  placeholder="07:00 – 08:30"
                  className="sm:col-span-2 px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
                <input
                  type="text"
                  value={newTaskTopic}
                  onChange={(e) => setNewTaskTopic(e.target.value)}
                  placeholder="Chapter or revision goal..."
                  className="sm:col-span-4 px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
                <div className="sm:col-span-2 flex gap-1.5">
                  <input
                    type="number"
                    min={15}
                    max={300}
                    step={15}
                    value={newTaskDuration}
                    onChange={(e) => setNewTaskDuration(Number(e.target.value))}
                    aria-label="Duration minutes"
                    className="w-16 px-2 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleAddWeeklyTask}
                    className="flex-1 px-2.5 py-2 rounded-lg bg-[#2563EB] text-white text-xs font-semibold hover:bg-[#1D4ED8]"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}

            {/* Schedule Items */}
            {visibleWeeklyItems.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                No study blocks scheduled for this day yet. Click <strong>Add Task</strong> or switch to{' '}
                <button
                  type="button"
                  onClick={() => setSelectedDay('All')}
                  className="text-[#2563EB] font-semibold hover:underline"
                >
                  All Days
                </button>
                .
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {visibleWeeklyItems.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                      item.completed
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/25 border-emerald-200 dark:border-emerald-900'
                        : 'bg-slate-50/60 dark:bg-slate-900/50 border-slate-200/80 dark:border-slate-800/80 hover:border-[#2563EB]/60'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (!item.completed) playSuccess();
                        else playClick();
                        toggleWeeklyTask(item.id);
                      }}
                      className="flex items-start gap-2.5 text-left min-w-0 flex-1"
                    >
                      <span
                        className={`mt-0.5 h-5 w-5 rounded-md border inline-flex items-center justify-center shrink-0 transition-colors ${
                          item.completed
                            ? 'bg-[#10B981] border-[#10B981] text-white'
                            : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        {item.completed && <Check className="w-3.5 h-3.5" />}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
                          <span className="text-[#2563EB] dark:text-sky-400">{item.subject}</span>
                          <span className="text-slate-300 dark:text-slate-700">·</span>
                          <span className="font-mono text-slate-500 dark:text-slate-400">
                            {item.day} · {item.timeSlot}
                          </span>
                          <span className="text-slate-300 dark:text-slate-700">·</span>
                          <span className="font-mono text-[#F97316]">{item.durationMinutes}m</span>
                        </div>
                        <p
                          className={`text-xs sm:text-sm font-semibold mt-0.5 leading-snug ${
                            item.completed
                              ? 'line-through text-slate-500 dark:text-slate-400'
                              : 'text-[#0B1B3B] dark:text-white'
                          }`}
                        >
                          {item.topic}
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      aria-label={`Remove task ${item.topic}`}
                      onClick={() => {
                        playClick();
                        deleteWeeklyTask(item.id);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </ReusableCard>
        </motion.section>

        {/* Gemini AI IQ & Priority Mentor */}
        <motion.section {...REVEAL_PROPS} aria-label="Gemini AI Study Mentor">
          <GeminiMentorPanel
            studentName={profile?.displayName ?? firebaseUser?.displayName ?? 'Student'}
            cohortLabel={activeCohort?.label ?? 'Class 12 JEE'}
            attemptsCount={attempts.length}
            averageAccuracy={analyticsSummary.overallAccuracy}
            averageIqScore={analyticsSummary.averageIqScore}
            latestIqScore={analyticsSummary.latestIqScore}
            paceSummary={paceTotals}
            subjectPerformance={subjectPerfForAi}
            weakChapters={weakChaptersForAi}
            weeklyCompletionPercent={weeklyStats.completionPercent}
            compact
          />
        </motion.section>

        {/* Unified Tabbed Study Toolkit: Focus Timer | 60-Day Sprint | 300-Mark Matrix */}
        <motion.section
          {...REVEAL_PROPS}
          id="study-toolkit"
          aria-labelledby="study-toolkit-heading"
          className="scroll-mt-20 space-y-3"
        >
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#2563EB] dark:text-sky-400">
                Productivity &amp; Blueprint
              </p>
              <h2
                id="study-toolkit-heading"
                className="font-display text-lg sm:text-xl font-bold text-[#0B1B3B] dark:text-white"
              >
                Study Toolkit
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <ReusableButton variant="secondary" size="sm" onClick={handleExportBackup}>
                <Download className="w-3.5 h-3.5" />
                Export JSON
              </ReusableButton>
              <input
                ref={backupInputRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => handleImportBackup(e.target.files?.[0])}
              />
              <ReusableButton
                variant="secondary"
                size="sm"
                onClick={() => backupInputRef.current?.click()}
              >
                <Upload className="w-3.5 h-3.5" />
                Restore
              </ReusableButton>
            </div>
          </div>

          <ReusableCard
            padding="sm"
            className="space-y-4 rounded-2xl border-slate-200/80 dark:border-slate-800/80"
          >
            {/* 3 Clean Pill Tabs */}
            <div
              className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800"
              role="tablist"
              aria-label="Study toolkit tabs"
            >
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeToolkitTab === 'focus'}
                  onClick={() => {
                    playClick();
                    setActiveToolkitTab('focus');
                  }}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                    activeToolkitTab === 'focus'
                      ? 'bg-[#0B1B3B] text-white border-[#0B1B3B] dark:bg-[#2563EB] dark:border-[#2563EB]'
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-[#2563EB]'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  Focus Timer
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeToolkitTab === 'sprint'}
                  onClick={() => {
                    playClick();
                    setActiveToolkitTab('sprint');
                  }}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                    activeToolkitTab === 'sprint'
                      ? 'bg-[#0B1B3B] text-white border-[#0B1B3B] dark:bg-[#2563EB] dark:border-[#2563EB]'
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-[#2563EB]'
                  }`}
                >
                  <CalendarCheck className="w-3.5 h-3.5" />
                  {`60-Day Sprint (${progress.plannerCompletedDays.length}/60)`}
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeToolkitTab === 'matrix'}
                  onClick={() => {
                    playClick();
                    setActiveToolkitTab('matrix');
                  }}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                    activeToolkitTab === 'matrix'
                      ? 'bg-[#0B1B3B] text-white border-[#0B1B3B] dark:bg-[#2563EB] dark:border-[#2563EB]'
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-[#2563EB]'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  300-Mark Matrix
                </button>
              </div>

              <span className="font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                {activeToolkitTab === 'focus'
                  ? `${progress.focusSessionsMinutes}m logged`
                  : activeToolkitTab === 'sprint'
                  ? `${plannerPercent}% complete`
                  : `${weightageSummary.totalMarks} Total Marks`}
              </span>
            </div>

            {backupNotice && (
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {backupNotice}
              </p>
            )}

            {/* TAB 1: FOCUS TIMER */}
            {activeToolkitTab === 'focus' && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                <div className="md:col-span-7 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 p-5 text-center space-y-3">
                  <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden text-xs font-semibold bg-white dark:bg-slate-900">
                    {([25, 50] as const).map((min) => (
                      <button
                        key={min}
                        type="button"
                        onClick={() => {
                          playClick();
                          setFocusRunning(false);
                          setFocusPresetMin(min);
                          setFocusSecondsLeft(min * 60);
                        }}
                        className={`px-4 py-1.5 transition-colors ${
                          focusPresetMin === min
                            ? 'bg-[#0B1B3B] text-white dark:bg-[#2563EB]'
                            : 'text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {min} min Sprint
                      </button>
                    ))}
                  </div>

                  <p className="font-mono text-4xl sm:text-5xl font-bold tabular-nums text-[#0B1B3B] dark:text-white tracking-tight">
                    {String(focusMins).padStart(2, '0')}:{String(focusSecs).padStart(2, '0')}
                  </p>

                  <div className="flex items-center justify-center gap-2.5">
                    <ReusableButton
                      variant="primary"
                      size="md"
                      onClick={() => {
                        playClick();
                        setFocusRunning((r) => !r);
                      }}
                    >
                      {focusRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      {focusRunning ? 'Pause' : 'Start Focus'}
                    </ReusableButton>
                    <ReusableButton
                      variant="secondary"
                      size="md"
                      onClick={() => {
                        playClick();
                        setFocusRunning(false);
                        setFocusSecondsLeft(focusPresetMin * 60);
                      }}
                    >
                      <RotateCcw className="w-4 h-4" />
                      Reset
                    </ReusableButton>
                  </div>
                </div>

                <div className="md:col-span-5 space-y-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                  <h3 className="font-display text-base font-bold text-[#0B1B3B] dark:text-white">
                    Distraction-Free Deep Study
                  </h3>
                  <p className="leading-relaxed">
                    Run 25-minute Pomodoro sprints for concise notes revision or 50-minute deep blocks for JEE/NEET numerical solving. Completed sprints automatically add to your logged hours.
                  </p>
                  <p className="font-mono text-xs font-semibold text-[#2563EB] dark:text-sky-400">
                    Total Logged: {focusHours}h ({progress.focusSessionsMinutes} minutes)
                  </p>
                </div>
              </div>
            )}

            {/* TAB 2: 60-DAY SYLLABUS SPRINT */}
            {activeToolkitTab === 'sprint' && (
              <div className="space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    {PHASES.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          playClick();
                          setPhaseFilter(p);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                          phaseFilter === p
                            ? 'bg-[#0B1B3B] text-white border-[#0B1B3B] dark:bg-[#2563EB] dark:border-[#2563EB]'
                            : 'border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-[#2563EB]'
                        }`}
                      >
                        {p === 'All' ? 'All Phases' : p.split(':')[0]}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAllDays((v) => !v)}
                    className="text-xs font-semibold text-[#2563EB] dark:text-sky-400 hover:underline"
                  >
                    {showAllDays ? 'Show 8 Days' : 'Show All 60 Days'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {filteredPlannerDays.map((task) => {
                    const done = completedDaySet.has(task.day);
                    return (
                      <div
                        key={task.day}
                        className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 transition-colors ${
                          done
                            ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                            : 'bg-slate-50/70 dark:bg-slate-900/50 border-slate-200/80 dark:border-slate-800'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="font-mono font-bold text-[#F97316]">Day {task.day}</p>
                          <p className="text-[11px] text-slate-700 dark:text-slate-300 truncate mt-0.5">
                            {task.physicsTopic} · {task.chemistryTopic}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (!done) playSuccess();
                            else playClick();
                            togglePlannerDay(task.day);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold shrink-0 transition-colors ${
                            done
                              ? 'bg-[#10B981] text-white'
                              : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-[#2563EB]'
                          }`}
                        >
                          {done ? 'Done' : 'Check'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: 300-MARK DIFFICULTY MATRIX */}
            {activeToolkitTab === 'matrix' && (
              <div className="space-y-3">
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                  JEE Main 300-mark weightage split by chapter difficulty — prioritize Easy and Moderate high-yield chapters first before Tough rank-booster topics.
                </p>
                <div className="h-52 w-full">
                  <RechartsContainer width="100%" height="100%">
                    <BarChart
                      data={weightageSummary.byDifficulty}
                      margin={{ top: 8, right: 12, left: -14, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#94A3B8" opacity={0.25} />
                      <XAxis dataKey="difficulty" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(val) => [`${val} Marks`, 'Weightage']} />
                      <Bar dataKey="marks" radius={[8, 8, 0, 0]}>
                        {weightageSummary.byDifficulty.map((entry) => (
                          <Cell
                            key={entry.difficulty}
                            fill={DIFFICULTY_COLORS[entry.difficulty] ?? '#2563EB'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </RechartsContainer>
                </div>
              </div>
            )}
          </ReusableCard>
        </motion.section>
      </ResponsiveContainer>
    </PageLayout>
  );
}
