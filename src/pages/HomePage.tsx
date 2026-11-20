import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
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
import type { PlannerDayTask, StudentCohortId, UserProgressData, WeeklyDay } from '../types';

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
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.12 },
  transition: { duration: 0.3, ease: 'easeOut' as const },
};

export default function HomePage() {
  const {
    firebaseUser,
    profile,
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

  // Weekly Schedule state
  const [selectedDay, setSelectedDay] = useState<WeeklyDay | 'All'>('Mon');
  const [showAddSchedule, setShowAddSchedule] = useState(false);
  const [newTaskDay, setNewTaskDay] = useState<WeeklyDay>('Mon');
  const [newTaskTime, setNewTaskTime] = useState('19:00 – 20:30');
  const [newTaskSubject, setNewTaskSubject] = useState('Physics');
  const [newTaskTopic, setNewTaskTopic] = useState('');
  const [newTaskMinutes, setNewTaskMinutes] = useState(90);

  // Collapsible 60-Day Study Planner & Weightage Matrix (keeps Home airy & unbulky)
  const [plannerOpen, setPlannerOpen] = useState(false);
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

  const weeklyStats = useMemo(
    () => computeWeeklyScheduleStats(progress.weeklySchedule ?? []),
    [progress.weeklySchedule]
  );

  const visibleWeeklyTasks = useMemo(() => {
    const items = progress.weeklySchedule ?? [];
    if (selectedDay === 'All') return items;
    return items.filter((t) => t.day === selectedDay);
  }, [progress.weeklySchedule, selectedDay]);

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
    return showAllDays ? base : base.slice(0, 6);
  }, [phaseFilter, showAllDays]);

  const plannerPercent = Math.round((progress.plannerCompletedDays.length / 60) * 100);

  const handleAddWeeklySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTopic.trim()) return;
    addWeeklyTask({
      day: newTaskDay,
      timeSlot: newTaskTime.trim() || '18:00 – 19:30',
      subject: newTaskSubject.trim() || 'Physics',
      topic: newTaskTopic.trim(),
      durationMinutes: Math.max(15, Math.min(360, Number(newTaskMinutes) || 60)),
      completed: false,
      priority: 'High',
    });
    playSuccess();
    setNewTaskTopic('');
    setShowAddSchedule(false);
    setSelectedDay(newTaskDay);
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

  return (
    <PageLayout>
      <SeoHead
        title="PREPSKM.IN — JEE, NEET & Class 9–12 Study Platform by @unfiltereddsumit"
        description="Official PREPSKM.IN by @unfiltereddsumit — Free JEE Main, JEE Advanced, NEET UG & Class 9–12 Board chapter notes, concept videos, NTA CBT mock tests, DPPs & Gemini AI IQ analytics."
        canonicalPath="/"
        keywords="PREPSKM, prepskm.in, unfiltereddsumit, JEE Main 2027, NEET UG, Class 11 JEE, Class 12 NEET, weekly study schedule, chapter notes, CBT mock tests, DPP"
      />

      {/* Sleek Compact Hero Section */}
      <section className="border-b border-slate-200/80 dark:border-slate-800/80 bg-gradient-to-b from-white via-[#F8FAFC] to-[#F1F5F9]/60 dark:from-[#0C1324] dark:via-[#090E1A] dark:to-[#090E1A]">
        <ResponsiveContainer className="py-6 sm:py-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-center">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28 }}
              className="lg:col-span-7 space-y-3.5"
            >
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#F97316]">
                PREPSKM.IN · JEE · NEET · Class 9–12 Boards
              </p>

              <h1 className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight text-[#0B1B3B] dark:text-white leading-[1.15] text-balance">
                Smart weekly study plans, chapter notes &amp; NTA-grade CBT mocks.
              </h1>

              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
                Pick your class track, study chapter PDFs &amp; videos, attempt proctored JEE/NEET
                mocks, review past solutions, and let Gemini AI guide your Exam IQ.
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <ReusableButton variant="primary" size="md" to="/cbt-mocks">
                  Start CBT Mock
                  <ArrowRight className="w-4 h-4" />
                </ReusableButton>
                <ReusableButton variant="secondary" size="md" to="/materials">
                  Chapters &amp; PDFs
                </ReusableButton>
                <ReusableButton variant="ghost" size="sm" to="/about">
                  <Info className="w-4 h-4" />
                  About
                </ReusableButton>
              </div>

              {/* Compact 4-Stat Strip */}
              <div className="grid grid-cols-4 gap-2 pt-3 border-t border-slate-200/70 dark:border-slate-800">
                <div className="p-2 rounded-xl bg-white/80 dark:bg-[#111A2E]/80 border border-slate-200/70 dark:border-slate-800">
                  <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                    Weekly
                  </p>
                  <p className="font-mono text-sm sm:text-base font-bold tabular-nums text-[#0B1B3B] dark:text-white">
                    {weeklyStats.completedTasks}/{weeklyStats.totalTasks}
                  </p>
                </div>
                <div className="p-2 rounded-xl bg-white/80 dark:bg-[#111A2E]/80 border border-slate-200/70 dark:border-slate-800">
                  <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                    Hours
                  </p>
                  <p className="font-mono text-sm sm:text-base font-bold tabular-nums text-[#2563EB] dark:text-sky-400">
                    {weeklyStats.completedHours}h
                  </p>
                </div>
                <div className="p-2 rounded-xl bg-white/80 dark:bg-[#111A2E]/80 border border-slate-200/70 dark:border-slate-800">
                  <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                    60-Day
                  </p>
                  <p className="font-mono text-sm sm:text-base font-bold tabular-nums text-[#F97316]">
                    {progress.plannerCompletedDays.length}/60
                  </p>
                </div>
                <div className="p-2 rounded-xl bg-white/80 dark:bg-[#111A2E]/80 border border-slate-200/70 dark:border-slate-800">
                  <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                    Tests
                  </p>
                  <p className="font-mono text-sm sm:text-base font-bold tabular-nums text-[#10B981]">
                    {attempts.length}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Compact Right Card: Emblem + Active Class Track */}
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.06 }}
              className="lg:col-span-5 flex flex-col items-center lg:items-end"
            >
              <div className="w-full max-w-sm space-y-3">
                <BrandLogo variant="hero" className="w-full" />
                {activeCohort && (
                  <div className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111A2E] p-3 shadow-xs flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Active Track · {isGuest ? 'Guest Mode' : 'Google Synced'}
                      </p>
                      <p className="font-display text-sm font-bold text-[#0B1B3B] dark:text-white truncate">
                        {activeCohort.label}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        playClick();
                        openOnboardingModal();
                      }}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-sky-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors shrink-0"
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

      <ResponsiveContainer className="py-6 sm:py-8 space-y-7 sm:space-y-9">
        {/* Compact Class -> Sub-Class Selector */}
        <motion.section {...REVEAL_PROPS} aria-labelledby="class-selector-heading" className="space-y-2.5">
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

          <ReusableCard padding="sm" className="space-y-3">
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
                  Save progress locally or sync via Google.
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

        {/* Compact Weekly Study Schedule */}
        <motion.section {...REVEAL_PROPS} aria-labelledby="weekly-schedule-heading" className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2.5">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#F97316]">
                Monday – Sunday Routine
              </p>
              <h2
                id="weekly-schedule-heading"
                className="font-display text-lg sm:text-xl font-bold text-[#0B1B3B] dark:text-white flex items-center gap-1.5"
              >
                <CalendarDays className="w-5 h-5 text-[#2563EB] dark:text-sky-400" />
                Weekly Study Schedule
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold tabular-nums text-[#10B981]">
                {weeklyStats.completionPercent}% Done
              </span>
              <ReusableButton
                variant="primary"
                size="sm"
                onClick={() => {
                  playClick();
                  setShowAddSchedule((v) => !v);
                }}
              >
                <Plus className="w-3.5 h-3.5" />
                Add Block
              </ReusableButton>
              <button
                type="button"
                aria-label="Reset weekly schedule template"
                onClick={() => {
                  playClick();
                  resetWeeklySchedule();
                }}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-[#0B1B3B] dark:hover:text-white"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {showAddSchedule && (
            <ReusableCard padding="sm" className="border-[#2563EB]/40">
              <form
                onSubmit={handleAddWeeklySubmit}
                className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 items-end"
              >
                <select
                  aria-label="Day of week"
                  value={newTaskDay}
                  onChange={(e) => setNewTaskDay(e.target.value as WeeklyDay)}
                  className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                >
                  {WEEK_DAYS.map((d) => (
                    <option key={d} value={d}>
                      {WEEK_DAY_LABELS[d]}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  aria-label="Time slot"
                  value={newTaskTime}
                  onChange={(e) => setNewTaskTime(e.target.value)}
                  placeholder="18:00–19:30"
                  className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
                <select
                  aria-label="Subject"
                  value={newTaskSubject}
                  onChange={(e) => setNewTaskSubject(e.target.value)}
                  className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                >
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Biology">Biology</option>
                  <option value="CBT Mock">CBT Mock</option>
                  <option value="Revision">Revision</option>
                </select>
                <input
                  type="text"
                  required
                  aria-label="Study topic"
                  value={newTaskTopic}
                  onChange={(e) => setNewTaskTopic(e.target.value)}
                  placeholder="Topic (e.g. Modern Physics PYQs)"
                  className="col-span-2 px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
                <div className="flex gap-1.5 col-span-2 sm:col-span-1">
                  <input
                    type="number"
                    min={15}
                    max={360}
                    aria-label="Minutes"
                    value={newTaskMinutes}
                    onChange={(e) => setNewTaskMinutes(Number(e.target.value))}
                    className="w-16 px-2 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                  />
                  <button
                    type="submit"
                    className="flex-1 px-3 py-2 rounded-xl text-xs font-semibold text-white bg-[#2563EB] hover:bg-blue-700"
                  >
                    Save
                  </button>
                </div>
              </form>
            </ReusableCard>
          )}

          {/* Compact Day Chips */}
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => {
                playClick();
                setSelectedDay('All');
              }}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                selectedDay === 'All'
                  ? 'bg-[#0B1B3B] text-white border-[#0B1B3B] dark:bg-[#2563EB] dark:border-[#2563EB]'
                  : 'bg-white dark:bg-[#111A2E] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
              }`}
            >
              All ({weeklyStats.completedTasks}/{weeklyStats.totalTasks})
            </button>
            {WEEK_DAYS.map((day) => {
              const c = weeklyStats.byDayCounts[day];
              const active = selectedDay === day;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => {
                    playClick();
                    setSelectedDay(day);
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    active
                      ? 'bg-[#0B1B3B] text-white border-[#0B1B3B] dark:bg-[#2563EB] dark:border-[#2563EB]'
                      : 'bg-white dark:bg-[#111A2E] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {day} <span className="opacity-70 font-mono text-[11px]">{c.completed}/{c.total}</span>
                </button>
              );
            })}
          </div>

          {/* Compact Schedule Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {visibleWeeklyTasks.map((item) => (
              <div
                key={item.id}
                className={`rounded-xl border p-3 flex flex-col justify-between gap-2 transition-all ${
                  item.completed
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                    : 'bg-white dark:bg-[#111A2E] border-slate-200/90 dark:border-slate-800 hover:border-[#2563EB]/50'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-[11px] font-semibold">
                    <span className="font-mono text-[#2563EB] dark:text-sky-400">
                      {item.day} · {item.timeSlot}
                    </span>
                    <span className="text-[#F97316]">{item.subject}</span>
                  </div>
                  <h3
                    className={`font-display text-xs sm:text-sm font-bold leading-snug ${
                      item.completed
                        ? 'line-through text-slate-500 dark:text-slate-400'
                        : 'text-[#0B1B3B] dark:text-white'
                    }`}
                  >
                    {item.topic}
                  </h3>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      if (!item.completed) playSuccess();
                      else playClick();
                      toggleWeeklyTask(item.id);
                    }}
                    aria-pressed={item.completed}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                      item.completed
                        ? 'bg-[#10B981] text-white border-[#10B981]'
                        : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    {item.completed ? 'Done' : 'Mark Done'}
                  </button>
                  <span className="text-[11px] font-mono text-slate-400">{item.durationMinutes}m</span>
                  <button
                    type="button"
                    onClick={() => {
                      playClick();
                      deleteWeeklyTask(item.id);
                    }}
                    aria-label={`Remove ${item.topic}`}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Compact Workspaces Grid (2-col on mobile!) */}
        <motion.section {...REVEAL_PROPS} className="space-y-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#2563EB] dark:text-sky-400">
              Platform Modules
            </p>
            <h2 className="font-display text-lg sm:text-xl font-bold text-[#0B1B3B] dark:text-white">
              Quick Access Workspaces
            </h2>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3.5">
            {PLATFORM_MODULES.map((mod) => {
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
                    className="h-full flex flex-col justify-between gap-2.5"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-[#0B1B3B] dark:text-sky-400 inline-flex items-center justify-center group-hover:bg-[#2563EB] group-hover:text-white transition-colors">
                          <Icon className="w-4 h-4" />
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#F97316] group-hover:translate-x-0.5 transition-all" />
                      </div>
                      <h3 className="font-display text-xs sm:text-sm font-bold text-[#0B1B3B] dark:text-white leading-snug">
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

        {/* Compact Focus Timer + Weightage + Expandable 60-Day Planner */}
        <motion.section {...REVEAL_PROPS} className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <ReusableCard padding="sm" className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#2563EB] dark:text-sky-400">
                  Exam Marks Blueprint
                </p>
                <h2 className="font-display text-base sm:text-lg font-bold text-[#0B1B3B] dark:text-white">
                  300-Mark Difficulty Matrix
                </h2>
              </div>
              <span className="font-mono text-xs font-bold text-[#0B1B3B] dark:text-sky-300 tabular-nums">
                {weightageSummary.totalMarks} Marks
              </span>
            </div>

            <div className="h-44 w-full">
              <RechartsContainer width="100%" height="100%">
                <BarChart
                  data={weightageSummary.byDifficulty}
                  margin={{ top: 6, right: 10, left: -16, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#94A3B8" opacity={0.25} />
                  <XAxis dataKey="difficulty" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(val) => [`${val} Marks`, 'Weightage']} />
                  <Bar dataKey="marks" radius={[6, 6, 0, 0]}>
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

            {/* Expandable 60-Day Study Planner Drawer */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <button
                type="button"
                onClick={() => {
                  playClick();
                  setPlannerOpen((v) => !v);
                }}
                aria-expanded={plannerOpen}
                className="w-full flex items-center justify-between gap-2 text-left"
              >
                <span className="font-display text-xs sm:text-sm font-bold text-[#0B1B3B] dark:text-white flex items-center gap-1.5">
                  <CalendarCheck className="w-4 h-4 text-[#F97316]" />
                  60-Day Syllabus Sprint ({progress.plannerCompletedDays.length}/60 · {plannerPercent}%)
                </span>
                {plannerOpen ? (
                  <ChevronUp className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                )}
              </button>

              {plannerOpen && (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {PHASES.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          playClick();
                          setPhaseFilter(p);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
                          phaseFilter === p
                            ? 'bg-[#0B1B3B] text-white border-[#0B1B3B] dark:bg-[#2563EB]'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {p === 'All' ? 'All' : p.split(':')[0]}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {filteredPlannerDays.map((task) => {
                      const done = completedDaySet.has(task.day);
                      return (
                        <div
                          key={task.day}
                          className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                            done
                              ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                              : 'bg-slate-50/70 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="font-mono font-bold text-[#F97316]">Day {task.day}</p>
                            <p className="text-[11px] text-slate-700 dark:text-slate-300 truncate">
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
                            className={`px-2 py-1 rounded-lg text-[11px] font-semibold shrink-0 ${
                              done
                                ? 'bg-[#10B981] text-white'
                                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {done ? 'Done' : 'Check'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAllDays((v) => !v)}
                    className="text-xs font-semibold text-[#2563EB] hover:underline"
                  >
                    {showAllDays ? 'Show 6 Days' : 'Show All 60 Days'}
                  </button>
                </div>
              )}
            </div>
          </ReusableCard>

          <ReusableCard padding="sm" className="lg:col-span-5 flex flex-col justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base font-bold text-[#0B1B3B] dark:text-white flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#F97316]" />
                  Focus Timer
                </h2>
                <span className="font-mono text-xs text-slate-500">
                  {progress.focusSessionsMinutes}m logged
                </span>
              </div>

              <div className="rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-3.5 text-center space-y-2.5">
                <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden text-xs font-semibold">
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
                      className={`px-3 py-1 transition-colors ${
                        focusPresetMin === min
                          ? 'bg-[#0B1B3B] text-white dark:bg-[#2563EB]'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {min}m
                    </button>
                  ))}
                </div>

                <p className="font-mono text-3xl font-bold tabular-nums text-[#0B1B3B] dark:text-white">
                  {String(focusMins).padStart(2, '0')}:{String(focusSecs).padStart(2, '0')}
                </p>

                <div className="flex items-center justify-center gap-2">
                  <ReusableButton
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      playClick();
                      setFocusRunning((r) => !r);
                    }}
                  >
                    {focusRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    {focusRunning ? 'Pause' : 'Start'}
                  </ReusableButton>
                  <ReusableButton
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      playClick();
                      setFocusRunning(false);
                      setFocusSecondsLeft(focusPresetMin * 60);
                    }}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </ReusableButton>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-slate-500">JSON Backup</span>
              <div className="flex gap-1.5">
                <ReusableButton variant="secondary" size="sm" onClick={handleExportBackup}>
                  <Download className="w-3.5 h-3.5" />
                  Export
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
              {backupNotice && (
                <p className="w-full text-[11px] text-emerald-700 dark:text-emerald-400">
                  {backupNotice}
                </p>
              )}
            </div>
          </ReusableCard>
        </motion.section>
      </ResponsiveContainer>
    </PageLayout>
  );
}
