import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarCheck,
  CalendarDays,
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
  Trash2,
  Upload,
  Video,
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
import { SeoHead } from '../components/SeoHead';
import { useAuth } from '../context/AuthContext';
import { usePlatformData } from '../context/PlatformDataContext';
import { PLATFORM_MODULES } from '../services/platformRegistry';
import { MANZIL_78_LECTURES, PLANNER_60_DAYS } from '../utils/plannerData';
import { computeManzilAndWeightageStats } from '../utils/plannerStats';
import {
  computeWeeklyScheduleStats,
  WEEK_DAY_LABELS,
  WEEK_DAYS,
} from '../utils/weeklySchedule';
import { playClick, playSuccess } from '../utils/soundEffects';
import type { PlannerDayTask, StudentCohortId, UserProgressData, WeeklyDay } from '../types';

const DIFFICULTY_COLORS: Record<string, string> = {
  Easy: '#10B981',
  Moderate: '#2563EB',
  Tough: '#F97316',
};

const MODULE_ICONS = {
  materials: BookOpen,
  lectures: Video,
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

export default function HomePage() {
  const {
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

  // Inline 2-step onboarding
  const [onboardingStep, setOnboardingStep] = useState<1 | 2>(1);
  const [pickedCohort, setPickedCohort] = useState<StudentCohortId>(cohortId);

  // Weekly Schedule state
  const [selectedDay, setSelectedDay] = useState<WeeklyDay | 'All'>('All');
  const [showAddSchedule, setShowAddSchedule] = useState(false);
  const [newTaskDay, setNewTaskDay] = useState<WeeklyDay>('Mon');
  const [newTaskTime, setNewTaskTime] = useState('19:00 – 20:30');
  const [newTaskSubject, setNewTaskSubject] = useState('Physics');
  const [newTaskTopic, setNewTaskTopic] = useState('');
  const [newTaskMinutes, setNewTaskMinutes] = useState(90);
  const [newTaskPriority, setNewTaskPriority] = useState<'High' | 'Normal'>('High');

  // 60-Day Study Planner filters
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
          setBackupNotice(
            `Completed a ${focusPresetMin}-minute focus sprint! Logged to your study totals.`
          );
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
    return showAllDays ? base : base.slice(0, 9);
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
      priority: newTaskPriority,
    });
    playSuccess();
    setNewTaskTopic('');
    setShowAddSchedule(false);
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
    setBackupNotice('Backup JSON exported successfully.');
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
        setBackupNotice('Backup restored cleanly. Weekly schedule and 60-Day Planner synced.');
      } catch {
        setBackupNotice('Invalid backup file. Please upload a valid PREPSKM JSON backup.');
      }
    };
    reader.readAsText(file);
  };

  const homeJsonLd = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebApplication',
          name: 'PREPSKM.IN',
          url: 'https://prepskm.in/',
          applicationCategory: 'EducationalApplication',
          operatingSystem: 'All',
          description:
            'Multi-class JEE Main, JEE Advanced, NEET UG, and Class 9–12 Board preparation portal featuring a Weekly Study Schedule, 60-Day Study Planner, Chapter Materials & Videos, NTA-Style CBT Mock Tests, DPPs, and Graphical Analytics.',
        },
        {
          '@type': 'FAQPage',
          mainEntity: [
            {
              '@type': 'Question',
              name: 'Who is PREPSKM.IN built for?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'PREPSKM.IN supports Class 9–10 Foundation, Class 11–12 Boards, JEE Main & Advanced, NEET UG, and JEE/NEET Dropper students.',
              },
            },
            {
              '@type': 'Question',
              name: 'Does PREPSKM.IN include a Weekly Schedule and NTA-style CBT Mock Tests?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'Yes. Students get an interactive Monday–Sunday Weekly Schedule, chapter-first PDFs & concept videos, and NTA-style CBT mock tests with exam-specific instructions, syllabus viewer, and room-exit warnings.',
              },
            },
          ],
        },
      ],
    }),
    []
  );

  const focusMins = Math.floor(focusSecondsLeft / 60);
  const focusSecs = focusSecondsLeft % 60;

  return (
    <PageLayout>
      <SeoHead
        title="PREPSKM.IN — JEE, NEET & Class 9–12 Board Study Platform"
        description="Master JEE Main, JEE Advanced, NEET UG, and Class 9–12 Boards with PREPSKM.IN weekly schedules, chapter notes, concept videos, NTA CBT mocks, DPPs, and graphical analytics."
        canonicalPath="/"
        keywords="PREPSKM, prepskm.in, JEE Main 2027, NEET UG, Class 11 JEE, Class 12 NEET, weekly study schedule, chapter notes, CBT mock tests, DPP"
        jsonLd={homeJsonLd}
      />

      {/* Hero Section */}
      <section className="border-b border-slate-200/80 dark:border-slate-800/80 bg-gradient-to-b from-white via-[#F8FAFC] to-[#F1F5F9]/60 dark:from-[#0C1324] dark:via-[#090E1A] dark:to-[#090E1A]">
        <ResponsiveContainer className="py-10 sm:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            <div className="lg:col-span-7 space-y-5">
              <p className="text-xs font-bold uppercase tracking-widest text-[#F97316]">
                PREPSKM.IN · JEE · NEET · Class 9–12 Boards Ecosystem
              </p>

              <h1 className="font-display text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold tracking-tight text-[#0B1B3B] dark:text-white leading-[1.12] text-balance">
                Structured weekly execution, chapter mastery, and exam-grade CBT mocks.
              </h1>

              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
                Plan your entire Monday–Sunday study routine, click into any chapter for curated
                PDFs &amp; concept videos, and take JEE or NEET CBT mocks with syllabus views,
                room-exit warnings, and graphical score diagnostics.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <ReusableButton variant="primary" size="lg" to="/cbt-mocks">
                  Launch CBT Mock Test
                  <ArrowRight className="w-4 h-4" />
                </ReusableButton>
                <ReusableButton variant="secondary" size="lg" to="/materials">
                  Browse Chapters
                </ReusableButton>
                <ReusableButton variant="ghost" size="md" to="/about">
                  <Info className="w-4 h-4" />
                  About PREPSKM
                </ReusableButton>
              </div>

              {/* Compact Real Progress Telemetry */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-200/70 dark:border-slate-800">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Weekly Schedule</p>
                  <p className="font-mono text-lg font-bold tabular-nums text-[#0B1B3B] dark:text-white">
                    {weeklyStats.completedTasks} / {weeklyStats.totalTasks}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Weekly Hours</p>
                  <p className="font-mono text-lg font-bold tabular-nums text-[#2563EB] dark:text-sky-400">
                    {weeklyStats.completedHours}h / {weeklyStats.plannedHours}h
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">60-Day Planner</p>
                  <p className="font-mono text-lg font-bold tabular-nums text-[#F97316]">
                    {progress.plannerCompletedDays.length} / 60
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Tests Completed</p>
                  <p className="font-mono text-lg font-bold tabular-nums text-[#10B981]">
                    {attempts.length}
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Official Emblem + Active Track Card */}
            <div className="lg:col-span-5 flex flex-col items-center lg:items-end">
              <div className="w-full max-w-sm space-y-4">
                <BrandLogo variant="hero" className="w-full" />
                {activeCohort && (
                  <div className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111A2E] p-4 shadow-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Active Track
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          playClick();
                          openOnboardingModal();
                        }}
                        className="text-xs font-semibold text-[#2563EB] dark:text-sky-400 hover:underline"
                      >
                        Change Class
                      </button>
                    </div>
                    <p className="mt-1 font-display text-base font-bold text-[#0B1B3B] dark:text-white">
                      {activeCohort.label}
                    </p>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {activeCohort.focusSummary}
                    </p>
                    <p className="mt-2 text-[11px] font-semibold text-[#10B981]">
                      {isGuest ? 'Guest Mode (Local Storage Active)' : 'Cloud Sync Active via Google'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ResponsiveContainer>
      </section>

      <ResponsiveContainer className="py-10 space-y-12">
        {/* Dynamic Class -> Sub-Class Selector (Click Class 11 -> Board / JEE / NEET) */}
        <section aria-labelledby="class-selector-heading" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#2563EB] dark:text-sky-400">
                Choose Your Class &amp; Sub-Class
              </p>
              <h2
                id="class-selector-heading"
                className="font-display text-2xl font-bold text-[#0B1B3B] dark:text-white mt-0.5"
              >
                Click Your Class to Reveal Board, JEE &amp; NEET Tracks
              </h2>
            </div>
            {!hasCompletedOnboarding && (
              <span className="text-xs font-semibold text-[#F97316]">
                Step {onboardingStep} of 2 · Instant Personalization
              </span>
            )}
          </div>

          <ReusableCard className="space-y-5">
            <ClassSubClassPicker
              selectedCohortId={hasCompletedOnboarding ? cohortId : pickedCohort}
              onSelect={(cid) => {
                setPickedCohort(cid);
                void selectCohort(cid);
              }}
            />

            {!hasCompletedOnboarding && (
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                  Save progress locally as Guest or sign in with Google to sync across devices.
                </p>
                <div className="flex flex-wrap gap-2.5">
                  <ReusableButton
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      playSuccess();
                      continueAsGuest(pickedCohort);
                      setOnboardingStep(2);
                    }}
                  >
                    Start as Guest
                  </ReusableButton>
                  <ReusableButton
                    variant="primary"
                    size="sm"
                    onClick={() => void signInWithGoogle(pickedCohort)}
                  >
                    Continue with Google
                  </ReusableButton>
                </div>
              </div>
            )}
          </ReusableCard>
        </section>

        {/* SECTION 1: INTERACTIVE WEEKLY SCHEDULE (Replaces 78 Manzil) */}
        <section aria-labelledby="weekly-schedule-heading" className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#F97316]">
                Monday to Sunday Routine
              </p>
              <h2
                id="weekly-schedule-heading"
                className="font-display text-2xl font-bold text-[#0B1B3B] dark:text-white mt-0.5 flex items-center gap-2"
              >
                <CalendarDays className="w-6 h-6 text-[#2563EB] dark:text-sky-400" />
                Weekly Study Schedule
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-32 h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-[#10B981] transition-all duration-300"
                    style={{ width: `${weeklyStats.completionPercent}%` }}
                  />
                </div>
                <span className="font-mono text-sm font-bold tabular-nums text-[#0B1B3B] dark:text-white">
                  {weeklyStats.completionPercent}% Done
                </span>
              </div>

              <ReusableButton
                variant="primary"
                size="sm"
                onClick={() => {
                  playClick();
                  setShowAddSchedule((v) => !v);
                }}
              >
                <Plus className="w-4 h-4" />
                Add Study Block
              </ReusableButton>
              <ReusableButton
                variant="ghost"
                size="sm"
                onClick={() => {
                  playClick();
                  resetWeeklySchedule();
                }}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Template
              </ReusableButton>
            </div>
          </div>

          {/* Add Weekly Task Form */}
          {showAddSchedule && (
            <ReusableCard padding="sm" className="border-[#2563EB]/40">
              <form
                onSubmit={handleAddWeeklySubmit}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end"
              >
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Day
                  </label>
                  <select
                    value={newTaskDay}
                    onChange={(e) => setNewTaskDay(e.target.value as WeeklyDay)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                  >
                    {WEEK_DAYS.map((d) => (
                      <option key={d} value={d}>
                        {WEEK_DAY_LABELS[d]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Time Slot
                  </label>
                  <input
                    type="text"
                    value={newTaskTime}
                    onChange={(e) => setNewTaskTime(e.target.value)}
                    placeholder="18:00 – 19:30"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Subject
                  </label>
                  <select
                    value={newTaskSubject}
                    onChange={(e) => setNewTaskSubject(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                  >
                    <option value="Physics">Physics</option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Biology">Biology</option>
                    <option value="CBT Mock">CBT Mock</option>
                    <option value="Revision">Revision</option>
                  </select>
                </div>

                <div className="lg:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Chapter / Target Topic
                  </label>
                  <input
                    type="text"
                    required
                    value={newTaskTopic}
                    onChange={(e) => setNewTaskTopic(e.target.value)}
                    placeholder="e.g., Modern Physics 25 PYQs + Formula Revision"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-20">
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Min
                    </label>
                    <input
                      type="number"
                      min={15}
                      max={360}
                      value={newTaskMinutes}
                      onChange={(e) => setNewTaskMinutes(Number(e.target.value))}
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-[#2563EB] hover:bg-blue-700 transition-colors"
                  >
                    Save
                  </button>
                </div>
              </form>
            </ReusableCard>
          )}

          {/* Day Filter Bar */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                playClick();
                setSelectedDay('All');
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                selectedDay === 'All'
                  ? 'bg-[#0B1B3B] text-white border-[#0B1B3B] dark:bg-[#2563EB] dark:border-[#2563EB]'
                  : 'bg-white dark:bg-[#111A2E] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-[#2563EB]'
              }`}
            >
              All Week ({weeklyStats.completedTasks}/{weeklyStats.totalTasks})
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
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                    active
                      ? 'bg-[#0B1B3B] text-white border-[#0B1B3B] dark:bg-[#2563EB] dark:border-[#2563EB]'
                      : 'bg-white dark:bg-[#111A2E] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-[#2563EB]'
                  }`}
                >
                  {day}{' '}
                  <span className="opacity-75 font-mono">
                    {c.completed}/{c.total}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Weekly Schedule Task Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {visibleWeeklyTasks.map((item) => (
              <div
                key={item.id}
                className={`rounded-2xl border p-4 flex flex-col justify-between gap-3 transition-all ${
                  item.completed
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                    : 'bg-white dark:bg-[#111A2E] border-slate-200/90 dark:border-slate-800 hover:border-[#2563EB]/50'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs font-semibold">
                    <span className="font-mono text-[#2563EB] dark:text-sky-400">
                      {WEEK_DAY_LABELS[item.day]} · {item.timeSlot}
                    </span>
                    <span className="text-[#F97316]">{item.subject}</span>
                  </div>
                  <h3
                    className={`font-display text-sm sm:text-base font-bold leading-snug ${
                      item.completed
                        ? 'line-through text-slate-500 dark:text-slate-400'
                        : 'text-[#0B1B3B] dark:text-white'
                    }`}
                  >
                    {item.topic}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    {item.durationMinutes} min · Priority: {item.priority}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      if (!item.completed) playSuccess();
                      else playClick();
                      toggleWeeklyTask(item.id);
                    }}
                    aria-pressed={item.completed}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      item.completed
                        ? 'bg-[#10B981] text-white border-[#10B981]'
                        : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-[#2563EB]'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {item.completed ? 'Completed' : 'Mark Done'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playClick();
                      deleteWeeklyTask(item.id);
                    }}
                    aria-label={`Remove ${item.topic}`}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 2: 60-DAY STUDY PLANNER */}
        <section aria-labelledby="planner-heading" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#2563EB] dark:text-sky-400">
                Long-Term Syllabus Sprint
              </p>
              <h2
                id="planner-heading"
                className="font-display text-2xl font-bold text-[#0B1B3B] dark:text-white mt-0.5 flex items-center gap-2"
              >
                <CalendarCheck className="w-6 h-6 text-[#F97316]" />
                60-Day Study Planner
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-36 h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-[#F97316] transition-all duration-300"
                  style={{ width: `${plannerPercent}%` }}
                />
              </div>
              <span className="font-mono text-sm font-bold tabular-nums text-[#0B1B3B] dark:text-white">
                {progress.plannerCompletedDays.length} / 60 days ({plannerPercent}%)
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {PHASES.map((p) => {
              const active = phaseFilter === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    playClick();
                    setPhaseFilter(p);
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                    active
                      ? 'bg-[#0B1B3B] text-white border-[#0B1B3B] dark:bg-[#2563EB] dark:border-[#2563EB]'
                      : 'bg-white dark:bg-[#111A2E] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80'
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredPlannerDays.map((task) => {
              const done = completedDaySet.has(task.day);
              return (
                <div
                  key={task.day}
                  className={`rounded-2xl border p-4 transition-colors ${
                    done
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                      : 'bg-white dark:bg-[#111A2E] border-slate-200/90 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="font-mono text-xs font-bold uppercase tracking-wide text-[#F97316]">
                        Day {task.day} · {task.targetHours}h Target
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {task.phase}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!done) playSuccess();
                        else playClick();
                        togglePlannerDay(task.day);
                      }}
                      aria-pressed={done}
                      aria-label={`Mark Day ${task.day} ${done ? 'incomplete' : 'complete'}`}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                        done
                          ? 'bg-[#10B981] text-white border-[#10B981]'
                          : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-[#2563EB]'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {done ? 'Done' : 'Complete'}
                    </button>
                  </div>

                  <dl className="mt-3 space-y-1.5 text-xs">
                    <div className="flex gap-2">
                      <dt className="font-semibold text-slate-500 dark:text-slate-400 w-10 shrink-0">
                        PHY
                      </dt>
                      <dd className="text-slate-800 dark:text-slate-200 truncate">
                        {task.physicsTopic}
                      </dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="font-semibold text-slate-500 dark:text-slate-400 w-10 shrink-0">
                        CHEM
                      </dt>
                      <dd className="text-slate-800 dark:text-slate-200 truncate">
                        {task.chemistryTopic}
                      </dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="font-semibold text-slate-500 dark:text-slate-400 w-10 shrink-0">
                        MATH
                      </dt>
                      <dd className="text-slate-800 dark:text-slate-200 truncate">
                        {task.mathsTopic}
                      </dd>
                    </div>
                  </dl>
                </div>
              );
            })}
          </div>

          <div className="flex justify-center">
            <ReusableButton
              variant="secondary"
              size="sm"
              onClick={() => {
                playClick();
                setShowAllDays((v) => !v);
              }}
            >
              {showAllDays ? 'Show Compact 9-Day View' : 'Show All 60 Study Days'}
            </ReusableButton>
          </div>
        </section>

        {/* SECTION 3: 300-Mark Weightage Matrix + Focus Timer & Backup */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <ReusableCard className="lg:col-span-7 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#2563EB] dark:text-sky-400">
                  Exam Marks Blueprint
                </p>
                <h2 className="font-display text-xl font-bold text-[#0B1B3B] dark:text-white">
                  300-Mark Weightage &amp; Difficulty Matrix
                </h2>
              </div>
              <span className="font-mono text-sm font-bold text-[#0B1B3B] dark:text-sky-300 tabular-nums">
                Total: {weightageSummary.totalMarks} Marks
              </span>
            </div>

            <div className="h-56 w-full">
              <RechartsContainer width="100%" height="100%">
                <BarChart
                  data={weightageSummary.byDifficulty}
                  margin={{ top: 8, right: 12, left: -12, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#94A3B8" opacity={0.25} />
                  <XAxis dataKey="difficulty" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(val) => [`${val} Marks`, 'Weightage']}
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid #CBD5E1',
                    }}
                  />
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

            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              {weightageSummary.bySubject.map((s) => (
                <div key={s.subject} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {s.subject}
                  </p>
                  <p className="mt-1 font-mono text-lg font-bold tabular-nums text-[#0B1B3B] dark:text-white">
                    {s.marks} Marks
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                    {s.chapterCount} key chapters
                  </p>
                </div>
              ))}
            </div>
          </ReusableCard>

          <ReusableCard className="lg:col-span-5 flex flex-col justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#F97316]">
                    Deep Work &amp; Continuity
                  </p>
                  <h2 className="font-display text-xl font-bold text-[#0B1B3B] dark:text-white flex items-center gap-2">
                    <Clock className="w-5 h-5 text-[#F97316]" />
                    Focus Timer &amp; Backup
                  </h2>
                </div>
                <span className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
                  {progress.focusSessionsMinutes} min logged
                </span>
              </div>

              <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-5 text-center space-y-4">
                <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden text-xs font-semibold">
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
                      className={`px-3.5 py-1.5 transition-colors ${
                        focusPresetMin === min
                          ? 'bg-[#0B1B3B] text-white dark:bg-[#2563EB]'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {min} Min Sprint
                    </button>
                  ))}
                </div>

                <p className="font-mono text-4xl font-bold tracking-tight tabular-nums text-[#0B1B3B] dark:text-white">
                  {String(focusMins).padStart(2, '0')}:{String(focusSecs).padStart(2, '0')}
                </p>

                <div className="flex items-center justify-center gap-2.5">
                  <ReusableButton
                    variant="primary"
                    size="sm"
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
                    size="sm"
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
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Portable Study Backup (Weekly Schedule, 60-Day Planner &amp; Bookmarks)
              </p>
              <div className="flex flex-wrap gap-2">
                <ReusableButton variant="secondary" size="sm" onClick={handleExportBackup}>
                  <Download className="w-4 h-4" />
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
                  <Upload className="w-4 h-4" />
                  Restore JSON
                </ReusableButton>
              </div>
              {backupNotice && (
                <p className="text-xs text-emerald-700 dark:text-emerald-400">{backupNotice}</p>
              )}
            </div>
          </ReusableCard>
        </section>

        {/* SECTION 4: Platform Modules Directory */}
        <section className="space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#2563EB] dark:text-sky-400">
              Platform Workspaces
            </p>
            <h2 className="font-display text-2xl font-bold text-[#0B1B3B] dark:text-white mt-0.5">
              Everything You Need Across JEE, NEET &amp; Boards
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {PLATFORM_MODULES.map((mod) => {
              const Icon = MODULE_ICONS[mod.id as keyof typeof MODULE_ICONS] ?? BookOpen;
              return (
                <Link
                  key={mod.id}
                  to={mod.route}
                  onClick={() => playClick()}
                  className="group block"
                >
                  <ReusableCard interactive className="h-full flex flex-col justify-between gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-slate-800/90 text-[#2563EB] dark:text-sky-400 flex items-center justify-center">
                          <Icon className="w-5 h-5" />
                        </span>
                        <span className="font-mono text-xs font-bold text-slate-400 dark:text-slate-500">
                          {mod.indexLabel}
                        </span>
                      </div>
                      <h3 className="font-display text-lg font-bold text-[#0B1B3B] dark:text-white group-hover:text-[#F97316] transition-colors">
                        {mod.title}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        {mod.summary}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#2563EB] dark:text-sky-400">
                      Open Module
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </ReusableCard>
                </Link>
              );
            })}
          </div>
        </section>
      </ResponsiveContainer>
    </PageLayout>
  );
}
