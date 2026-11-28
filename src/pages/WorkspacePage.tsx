import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Flame,
  Gauge,
  Layers,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { PageLayout } from '../layouts/PageLayout';
import { ResponsiveContainer } from '../components/ResponsiveContainer';
import { SeoHead } from '../components/SeoHead';
import { DAILY_FORMULA_CHECKS, MASTERY_CHAPTERS_48, type MasteryStageKey } from '../data/prepskm2Data';
import { predictExamPercentile } from '../utils/percentilePredictor';
import { useExam } from '../context/ExamContext';
import { usePrepskm2 } from '../context/Prepskm2Context';
import { usePlatformData } from '../context/PlatformDataContext';
import { playClick, playNav, playSuccess } from '../utils/soundEffects';
import { PENDING_TIMER_CMD_KEY } from '../utils/helloBuddyEngine';

export { PENDING_TIMER_CMD_KEY };

export type WorkspaceTab = 'practice' | 'focus' | 'mastery' | 'predictor';

const VALID_TABS: WorkspaceTab[] = ['practice', 'focus', 'mastery', 'predictor'];

const MASTERY_STAGES: Array<{ key: MasteryStageKey; label: string }> = [
  { key: 'theory', label: 'Theory' },
  { key: 'dpp', label: 'DPP' },
  { key: 'pyqs', label: 'PYQs' },
  { key: 'rev1', label: 'Rev 1' },
  { key: 'rev2', label: 'Rev 2' },
];

interface FocusTimerCommand {
  action: 'start' | 'pause' | 'reset';
  minutes?: number;
}

export default function WorkspacePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { examTrack, trackConfig } = useExam();
  const { logFocusMinutes } = usePlatformData();
  const {
    masteryMap,
    toggleMasteryStage,
    backlogTasks,
    toggleBacklogTask,
    addBacklogTask,
    recordFocusBlockVerified,
    recordPyqSprintProgress,
  } = usePrepskm2();

  const initialTabParam = searchParams.get('tab') as WorkspaceTab | null;
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(
    initialTabParam && VALID_TABS.includes(initialTabParam) ? initialTabParam : 'practice'
  );

  // Sync URL query param -> tab
  useEffect(() => {
    const param = searchParams.get('tab') as WorkspaceTab | null;
    if (param && VALID_TABS.includes(param) && param !== activeTab) {
      setActiveTab(param);
    }
  }, [searchParams, activeTab]);

  const handleSelectTab = (tab: WorkspaceTab) => {
    playClick();
    setActiveTab(tab);
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    setSearchParams(next, { replace: true });
  };

  // TAB 1: Quick Practice (10s Formula Duels + Chapter PYQ Sprints)
  const [formulaIdx, setFormulaIdx] = useState(0);
  const [formulaPicked, setFormulaPicked] = useState<number | null>(null);
  const [formulaCountdown, setFormulaCountdown] = useState(10);
  const [formulaStreak, setFormulaStreak] = useState(0);

  const activeFormula = DAILY_FORMULA_CHECKS[formulaIdx % DAILY_FORMULA_CHECKS.length];

  useEffect(() => {
    if (activeTab !== 'practice' || formulaPicked !== null) return;
    const id = window.setInterval(() => {
      setFormulaCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [activeTab, formulaPicked, formulaIdx]);

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

  // TAB 2: Focus & Planner (25m / 50m Focus Timer + Priority Checklist)
  const [focusPreset, setFocusPreset] = useState<number>(25);
  const [focusSeconds, setFocusSeconds] = useState<number>(25 * 60);
  const [focusRunning, setFocusRunning] = useState(false);
  const [tabBreaks, setTabBreaks] = useState(0);
  const [focusStatusNote, setFocusStatusNote] = useState<string | null>(null);
  const [quickTaskTitle, setQuickTaskTitle] = useState('');

  // Execute voice-triggered focus timer commands (from Hello Buddy)
  const applyTimerCommand = (cmd: FocusTimerCommand) => {
    setActiveTab('focus');
    if (cmd.action === 'start') {
      const mins = cmd.minutes && cmd.minutes > 0 ? Math.min(180, Math.round(cmd.minutes)) : focusPreset;
      setFocusPreset(mins);
      setFocusSeconds(mins * 60);
      setTabBreaks(0);
      setFocusRunning(true);
      setFocusStatusNote(`Buddy started your ${mins}-minute Verified Focus Block!`);
    } else if (cmd.action === 'pause') {
      setFocusRunning(false);
      setFocusStatusNote('Focus timer paused.');
    } else if (cmd.action === 'reset') {
      setFocusRunning(false);
      setFocusSeconds(focusPreset * 60);
      setTabBreaks(0);
      setFocusStatusNote('Focus timer reset.');
    }
  };

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(PENDING_TIMER_CMD_KEY);
      if (raw) {
        window.sessionStorage.removeItem(PENDING_TIMER_CMD_KEY);
        const parsed = JSON.parse(raw) as FocusTimerCommand;
        if (parsed && parsed.action) {
          applyTimerCommand(parsed);
        }
      }
    } catch {
      // ignore storage errors
    }

    const onBuddyTimer = (event: Event) => {
      const detail = (event as CustomEvent<FocusTimerCommand>).detail;
      if (detail?.action) {
        applyTimerCommand(detail);
      }
    };
    window.addEventListener('buddy:focus-timer', onBuddyTimer);
    return () => window.removeEventListener('buddy:focus-timer', onBuddyTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusPreset]);

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

  const topTasks = useMemo(() => {
    const present = backlogTasks.filter((task) => task.bucket === 'present');
    return (present.length > 0 ? present : backlogTasks).slice(0, 6);
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

  // TAB 3: Mastery Tracker
  const [masterySubject, setMasterySubject] = useState<'Physics' | 'Chemistry' | 'Mathematics' | 'Biology'>(() =>
    examTrack === 'neet' ? 'Biology' : 'Physics'
  );

  const visibleMasteryChapters = useMemo(
    () => MASTERY_CHAPTERS_48.filter((c) => c.subject === masterySubject),
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

  // TAB 4: Percentile Predictor
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
        targetTier:
          pct >= 95
            ? 'CBSE 95%+ Merit Distinction'
            : pct >= 88
              ? 'Strong Honours Distinction'
              : 'Core Board Mastery Zone',
        collegeOutlook:
          pct >= 95
            ? 'CUET / Top DU Honours & Strong JEE/NEET Foundation'
            : 'Focus on NCERT Solved Examples + PYQ Writing Practice',
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
        title="Interactive Study Workspace — Practice, Focus Timer, Mastery & Predictor | Prepskm"
        description="Dedicated JEE, NEET & Class 9-12 Interactive Study Workspace with 10-second Formula Duels, Verified Pomodoro Focus Timer, 5-Stage Chapter Mastery Tracker, and Live Percentile Predictor."
        canonicalPath="/workspace"
      />

      <ResponsiveContainer className="py-8 sm:py-10 space-y-8">
        {/* Clean Header + 4-Tab Bar */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div className="space-y-1.5">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-sky-400">
              INTERACTIVE STUDY WORKSPACE · {trackConfig.shortLabel}
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Your Daily Prep Command Desk
            </h1>
            <p className="text-sm text-slate-400 max-w-2xl">
              Switch effortlessly between 10-second Formula Duels, verified Pomodoro blocks, 5-stage syllabus tracking, and calibrated rank predictions.
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Study workspace modules"
            className="inline-flex flex-wrap items-center gap-1 p-1.5 rounded-2xl bg-[rgba(30,41,59,0.5)] border border-[rgba(148,163,184,0.16)] backdrop-blur-md"
          >
            {(
              [
                { id: 'practice', label: 'Quick Practice', icon: Zap },
                { id: 'focus', label: 'Focus & Planner', icon: Clock },
                { id: 'mastery', label: 'Mastery Tracker', icon: Layers },
                { id: 'predictor', label: 'Percentile Predictor', icon: Gauge },
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
                  data-testid={`workspace-tab-${tab.id}`}
                  onClick={() => handleSelectTab(tab.id)}
                  className={`relative px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 transition-colors ${
                    active ? 'text-[#070B14]' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="workspaceActiveTabPill"
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      className="absolute inset-0 rounded-xl bg-sky-400 shadow-sm"
                    />
                  )}
                  <Icon className={`relative z-10 w-4 h-4 ${active ? 'text-[#070B14]' : 'text-sky-400'}`} />
                  <span className="relative z-10 whitespace-nowrap">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dedicated Lightweight Dark Gradient Surface */}
        <section
          data-testid="workspace-panel"
          className="rounded-3xl bg-[rgba(30,41,59,0.45)] backdrop-blur-md border border-[rgba(148,163,184,0.14)] p-6 sm:p-8 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)]"
        >
          {/* TAB 1: QUICK PRACTICE */}
          {activeTab === 'practice' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-7 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 text-xs font-mono">
                    <span className="px-2.5 py-1 rounded-lg bg-sky-400/15 border border-sky-400/25 text-sky-300 font-bold">
                      10s FORMULA DUEL
                    </span>
                    <span className="text-slate-300 font-semibold">
                      {activeFormula.subject} · {activeFormula.chapter}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 font-mono text-xs tabular-nums">
                    <span className="text-amber-400 font-bold inline-flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 fill-current" />
                      Streak {formulaStreak}
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded-lg font-bold ${
                        formulaCountdown <= 3
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-400/30'
                          : 'bg-slate-800/80 text-white border border-slate-400/15'
                      }`}
                    >
                      {formulaCountdown}s
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl bg-[#0b1120]/70 border border-slate-400/[0.14] p-5 space-y-2.5">
                  <p className="text-sm font-semibold text-slate-200">{activeFormula.prompt}</p>
                  <p className="font-handwritten text-2xl sm:text-3xl font-bold text-sky-300">
                    {activeFormula.formulaStem}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeFormula.options.map((opt, idx) => {
                    const answered = formulaPicked !== null;
                    const isRight = idx === activeFormula.correctIndex;
                    const isPicked = formulaPicked === idx;
                    let cls =
                      'bg-[#0b1120]/60 border-slate-400/[0.14] text-slate-100 hover:border-sky-400/60 hover:bg-slate-800/70';
                    if (answered) {
                      if (isRight) cls = 'bg-emerald-500/15 border-emerald-400 text-emerald-300';
                      else if (isPicked) cls = 'bg-rose-500/15 border-rose-400 text-rose-300';
                    }
                    return (
                      <button
                        key={opt}
                        type="button"
                        disabled={answered}
                        onClick={() => handleFormulaPick(idx)}
                        className={`px-4 py-3 rounded-xl border text-left font-mono text-sm font-bold transition-colors ${cls}`}
                      >
                        ({String.fromCharCode(65 + idx)}) {opt}
                      </button>
                    );
                  })}
                </div>

                {formulaPicked !== null && (
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-400/[0.12]">
                    <p className="font-handwritten text-base text-slate-300 flex-1">
                      <strong className="text-white">Note: </strong>
                      {activeFormula.explanation}
                    </p>
                    <button
                      type="button"
                      onClick={handleNextFormula}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-sky-400 hover:bg-sky-300 text-[#070B14] shrink-0"
                    >
                      Next Formula →
                    </button>
                  </div>
                )}
              </div>

              <div className="lg:col-span-5 space-y-3.5">
                <p className="font-mono text-xs font-bold uppercase tracking-wider text-slate-400">
                  Chapter PYQ Sprints ({trackConfig.shortLabel})
                </p>
                <div className="space-y-3">
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
                      className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-[#0b1120]/60 border border-slate-400/[0.14] hover:border-sky-400/50 transition-all hover:-translate-y-0.5 group"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-mono font-bold text-sky-400">{sprint.subj}</p>
                        <p className="font-handwritten text-xl font-bold text-white truncate">
                          {sprint.ch}
                        </p>
                        <p className="text-xs text-slate-400 truncate">{sprint.meta}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FOCUS & PLANNER */}
          {activeTab === 'focus' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-5 rounded-2xl bg-[#0b1120]/70 border border-slate-400/[0.14] p-6 space-y-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-sky-400">
                    VERIFIED FOCUS TIMER
                  </span>
                  <div className="inline-flex gap-1.5">
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
                        className={`px-3 py-1 rounded-lg font-mono text-xs font-bold transition-colors ${
                          focusPreset === m
                            ? 'bg-sky-400 text-[#070B14]'
                            : 'bg-slate-800/80 text-slate-300 hover:text-white'
                        }`}
                      >
                        {m}m
                      </button>
                    ))}
                  </div>
                </div>

                <p
                  data-testid="workspace-focus-clock"
                  className="font-mono text-5xl sm:text-6xl font-bold tabular-nums text-center text-white py-3 tracking-tight"
                >
                  {minsStr}:{secsStr}
                </p>

                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    data-testid="workspace-focus-toggle"
                    onClick={() => {
                      playClick();
                      setFocusStatusNote(null);
                      setFocusRunning((r) => !r);
                    }}
                    className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-sky-400 hover:bg-sky-300 text-[#070B14] inline-flex items-center gap-2 transition-colors"
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
                    className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-400/20 text-slate-300 hover:text-white transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>

                {tabBreaks > 0 && (
                  <div className="rounded-xl bg-amber-500/12 border border-amber-400/30 px-3.5 py-2.5 text-xs font-semibold text-amber-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Tab-switch breaks: {tabBreaks} (stay focused to claim full XP)</span>
                  </div>
                )}

                {focusStatusNote && (
                  <p className="text-xs font-semibold text-emerald-300 text-center">
                    {focusStatusNote}
                  </p>
                )}
              </div>

              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-display text-lg font-bold text-white">
                    Today&apos;s Priority Targets
                  </h2>
                  <span className="font-mono text-xs text-slate-400 tabular-nums">
                    {topTasks.filter((item) => item.completed).length}/{topTasks.length} completed
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
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm bg-[#0b1120]/70 border border-slate-400/[0.16] text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
                  />
                  <button
                    type="button"
                    onClick={handleAddQuickTask}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-sky-400 hover:bg-sky-300 text-[#070B14] inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                </div>

                <div className="space-y-2.5">
                  {topTasks.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => {
                        if (!task.completed) playSuccess();
                        else playClick();
                        toggleBacklogTask(task.id);
                      }}
                      className={`w-full text-left p-4 rounded-2xl border flex items-center gap-3.5 transition-colors ${
                        task.completed
                          ? 'bg-emerald-500/10 border-emerald-400/35'
                          : 'bg-[#0b1120]/60 border-slate-400/[0.14] hover:border-sky-400/50'
                      }`}
                    >
                      <span
                        className={`h-5 w-5 rounded-md border flex items-center justify-center shrink-0 ${
                          task.completed
                            ? 'bg-emerald-400 border-emerald-400 text-[#070B14]'
                            : 'border-slate-500 bg-slate-900'
                        }`}
                      >
                        {task.completed && <Check className="w-3.5 h-3.5" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm font-semibold truncate ${
                            task.completed ? 'line-through text-slate-400' : 'text-white'
                          }`}
                        >
                          {task.title}
                        </p>
                        <p className="font-mono text-[11px] text-sky-400">{task.subject}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: 5-STAGE MASTERY TRACKER */}
          {activeTab === 'mastery' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap gap-2">
                  {(['Physics', 'Chemistry', 'Mathematics', 'Biology'] as const).map((subj) => (
                    <button
                      key={subj}
                      type="button"
                      onClick={() => {
                        playClick();
                        setMasterySubject(subj);
                      }}
                      className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors ${
                        masterySubject === subj
                          ? 'bg-sky-400 text-[#070B14]'
                          : 'bg-[#0b1120]/60 text-slate-300 border border-slate-400/[0.14] hover:border-sky-400/50'
                      }`}
                    >
                      {subj}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3 min-w-[200px]">
                  <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-400 transition-all duration-300"
                      style={{ width: `${masteryCompletionPct}%` }}
                    />
                  </div>
                  <span className="font-mono text-xs font-bold text-emerald-300 tabular-nums whitespace-nowrap">
                    {masterySubject} Readiness: {masteryCompletionPct}%
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-slate-400/[0.14] text-slate-400">
                      <th className="py-3 pr-4 font-bold">Chapter &amp; Weightage</th>
                      {MASTERY_STAGES.map((stage) => (
                        <th key={stage.key} className="py-3 px-2.5 text-center font-mono text-xs font-bold">
                          {stage.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-400/[0.1]">
                    {visibleMasteryChapters.map((ch) => {
                      const rowState = masteryMap[ch.id];
                      return (
                        <tr key={ch.id} className="hover:bg-white/[0.02]">
                          <td className="py-3.5 pr-4">
                            <p className="font-semibold text-white">{ch.name}</p>
                            <p className="font-mono text-[11px] text-slate-400">
                              {ch.classLevel} · ~{ch.weightageMarks} Marks
                            </p>
                          </td>
                          {MASTERY_STAGES.map((stage) => {
                            const checked = !!rowState?.[stage.key];
                            return (
                              <td key={stage.key} className="py-3.5 px-2.5 text-center">
                                <button
                                  type="button"
                                  aria-label={`${ch.name} ${stage.label}`}
                                  onClick={() => {
                                    if (!checked) playSuccess();
                                    else playClick();
                                    toggleMasteryStage(ch.id, stage.key);
                                  }}
                                  className={`h-8 w-8 rounded-lg border inline-flex items-center justify-center transition-colors ${
                                    checked
                                      ? 'bg-emerald-400 border-emerald-400 text-[#070B14]'
                                      : 'bg-[#0b1120]/60 border-slate-400/20 hover:border-sky-400'
                                  }`}
                                >
                                  {checked && <Check className="w-4 h-4 stroke-[2.5]" />}
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
          {activeTab === 'predictor' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs font-bold text-sky-400">
                      {trackConfig.primaryExamName} CALIBRATED CURVE
                    </p>
                    <h2 className="font-display text-xl font-bold text-white mt-0.5">
                      Drag Your Expected Mock Score
                    </h2>
                  </div>
                  <span className="font-mono text-3xl font-bold tabular-nums text-white">
                    {sliderMarks}
                    <span className="text-base text-slate-400">/{predictorMax}</span>
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
                  className="w-full accent-sky-400 cursor-pointer h-2"
                />

                <div className="flex justify-between font-mono text-xs text-slate-400 tabular-nums">
                  <span>0</span>
                  <span>{Math.round(predictorMax * 0.5)}</span>
                  <span>{Math.round(predictorMax * 0.75)}</span>
                  <span>{predictorMax}</span>
                </div>

                <p className="text-sm text-slate-300 leading-relaxed">
                  <strong className="text-white">College &amp; Branch Outlook: </strong>
                  {prediction.collegeOutlook}
                </p>
              </div>

              <div className="lg:col-span-5 rounded-2xl bg-[#0b1120]/75 border border-slate-400/[0.16] p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-400">
                      {examTrack === 'boards' ? 'Predicted %' : 'Predicted %ile'}
                    </p>
                    <p className="font-mono text-3xl font-bold tabular-nums text-sky-300 mt-1">
                      {prediction.percentile}
                      {examTrack === 'boards' ? '%' : ''}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400">Estimated AIR</p>
                    <p className="font-mono text-3xl font-bold tabular-nums text-amber-400 mt-1">
                      {prediction.estimatedAir.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-400/[0.14] flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-emerald-300 inline-flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    {prediction.targetTier}
                  </span>
                  <Link
                    to="/community"
                    onClick={() => playNav()}
                    className="text-xs font-bold text-sky-400 hover:underline shrink-0"
                  >
                    Check Cut-offs →
                  </Link>
                </div>
              </div>
            </div>
          )}
        </section>
      </ResponsiveContainer>
    </PageLayout>
  );
}
