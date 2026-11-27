import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Focus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import {
  MASTERY_CHAPTERS_48,
  type MasteryStageKey,
} from '../../data/prepskm2Data';
import { usePrepskm2 } from '../../context/Prepskm2Context';
import { usePlatformData } from '../../context/PlatformDataContext';
import { computeExamCountdown } from '../../utils/streakTracker';
import { playClick, playSuccess, playWarning } from '../../utils/soundEffects';

const STAGES: Array<{ key: MasteryStageKey; label: string }> = [
  { key: 'theory', label: 'Theory' },
  { key: 'dpp', label: 'DPP' },
  { key: 'pyqs', label: 'PYQs' },
  { key: 'rev1', label: 'Rev 1' },
  { key: 'rev2', label: 'Rev 2' },
];

const SUBJECTS = ['Physics', 'Chemistry', 'Mathematics', 'Biology'] as const;

export function ChapterMasteryAndBacklogHub() {
  const {
    masteryMap,
    toggleMasteryStage,
    backlogTasks,
    addBacklogTask,
    toggleBacklogTask,
    rescheduleBacklogToPresent,
    deleteBacklogTask,
    recordFocusBlockVerified,
    setZenMode,
  } = usePrepskm2();
  const { targetExamDate, targetExamLabel, logFocusMinutes } = usePlatformData();

  const [activeTab, setActiveTab] = useState<'mastery' | 'focus' | 'backlog'>('mastery');
  const [subjectFilter, setSubjectFilter] = useState<(typeof SUBJECTS)[number]>('Physics');

  // Focus Mode Timer state
  const [focusPreset, setFocusPreset] = useState<25 | 50 | 90>(25);
  const [focusSubject, setFocusSubject] = useState<(typeof SUBJECTS)[number]>('Physics');
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [focusBreaks, setFocusBreaks] = useState(0);
  const [focusToast, setFocusToast] = useState('');
  const runningRef = useRef(timerRunning);
  runningRef.current = timerRunning;

  // Backlog form state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskSubject, setNewTaskSubject] = useState<(typeof SUBJECTS)[number]>('Physics');
  const [newTaskBucket, setNewTaskBucket] = useState<'present' | 'backlog'>('present');

  const countdown = useMemo(() => computeExamCountdown(targetExamDate), [targetExamDate]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && runningRef.current) {
        setFocusBreaks((b) => b + 1);
        playWarning();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    if (!timerRunning) return;
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setTimerRunning(false);
          playSuccess();
          logFocusMinutes(focusPreset);
          recordFocusBlockVerified(focusPreset, focusBreaks);
          setFocusToast(`Verified ${focusPreset}m ${focusSubject} session logged!`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [timerRunning, focusPreset, focusSubject, focusBreaks, logFocusMinutes, recordFocusBlockVerified]);

  const filteredChapters = useMemo(
    () => MASTERY_CHAPTERS_48.filter((c) => c.subject === subjectFilter),
    [subjectFilter]
  );

  const masteryStats = useMemo(() => {
    const totalStages = MASTERY_CHAPTERS_48.length * 5;
    let completedStages = 0;
    for (const ch of MASTERY_CHAPTERS_48) {
      const rec = masteryMap[ch.id];
      if (!rec) continue;
      for (const st of STAGES) {
        if (rec[st.key]) completedStages += 1;
      }
    }
    const remainingStages = Math.max(0, totalStages - completedStages);
    const daysLeft = Math.max(1, countdown.daysRemaining);
    const stagesPerDay = Number((remainingStages / daysLeft).toFixed(1));
    return {
      totalStages,
      completedStages,
      remainingStages,
      percent: Math.round((completedStages / totalStages) * 100),
      stagesPerDay,
    };
  }, [masteryMap, countdown.daysRemaining]);

  const presentTasks = backlogTasks.filter((t) => t.bucket === 'present');
  const backlogOnly = backlogTasks.filter((t) => t.bucket === 'backlog');

  return (
    <div className="rounded-2xl bg-white dark:bg-[#111114] border border-slate-200 dark:border-white/[0.08] p-5 sm:p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-white/[0.08] pb-4">
        <div>
          <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            Study Planner, Focus Mode &amp; Backlog Hub
          </p>
          <h2 className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
            48-Chapter 5-Stage Mastery &amp; Deep Work OS
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-[#09090B] border border-slate-200 dark:border-white/[0.08]">
          {[
            { id: 'mastery', label: `5-Stage Mastery (${masteryStats.percent}%)` },
            { id: 'focus', label: 'Focus Mode Timer' },
            { id: 'backlog', label: `Schedule & Backlog (${backlogOnly.filter((b) => !b.completed).length})` },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                playClick();
                setActiveTab(t.id as typeof activeTab);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                activeTab === t.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: 5-STAGE CHAPTER MASTERY PLANNER */}
      {activeTab === 'mastery' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-white/[0.08] text-xs font-mono tabular-nums">
            <span>
              Auto-Distribution ({targetExamLabel} · {countdown.daysRemaining}d left):{' '}
              <strong className="text-indigo-500">{masteryStats.stagesPerDay} stages/day</strong>{' '}
              to master all {MASTERY_CHAPTERS_48.length} chapters
            </span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
              {masteryStats.completedStages}/{masteryStats.totalStages} stages done
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {SUBJECTS.map((sub) => (
              <button
                key={sub}
                type="button"
                onClick={() => setSubjectFilter(sub)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  subjectFilter === sub
                    ? 'bg-indigo-600 border-indigo-500 text-white'
                    : 'border-slate-200 dark:border-white/[0.1] text-slate-600 dark:text-zinc-400 hover:border-indigo-500/50'
                }`}
              >
                {sub} ({MASTERY_CHAPTERS_48.filter((c) => c.subject === sub).length})
              </button>
            ))}
          </div>

          <div className="overflow-x-auto border border-slate-200 dark:border-white/[0.08] rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-[#09090B] border-b border-slate-200 dark:border-white/[0.08] text-slate-500 dark:text-zinc-400">
                  <th className="py-2.5 px-3 font-semibold">Chapter ({subjectFilter})</th>
                  <th className="py-2.5 px-2 font-semibold text-center">Marks</th>
                  {STAGES.map((st) => (
                    <th key={st.key} className="py-2.5 px-2 font-semibold text-center">
                      {st.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                {filteredChapters.map((ch) => {
                  const state = masteryMap[ch.id] ?? {
                    theory: false,
                    dpp: false,
                    pyqs: false,
                    rev1: false,
                    rev2: false,
                  };
                  return (
                    <tr key={ch.id} className="hover:bg-slate-50/70 dark:hover:bg-white/[0.02]">
                      <td className="py-2.5 px-3">
                        <p className="font-semibold text-slate-900 dark:text-white">{ch.name}</p>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-500">
                          {ch.classLevel} · {ch.exams.join(', ')}
                        </p>
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono text-slate-600 dark:text-zinc-300 tabular-nums">
                        {ch.weightageMarks}m
                      </td>
                      {STAGES.map((st) => {
                        const checked = Boolean(state[st.key]);
                        return (
                          <td key={st.key} className="py-2.5 px-2 text-center">
                            <button
                              type="button"
                              aria-label={`${ch.name} ${st.label}`}
                              aria-pressed={checked}
                              onClick={() => {
                                playClick();
                                toggleMasteryStage(ch.id, st.key);
                              }}
                              className={`w-7 h-7 rounded-lg inline-flex items-center justify-center border transition-colors ${
                                checked
                                  ? 'bg-emerald-600 border-emerald-500 text-white'
                                  : 'bg-white dark:bg-[#09090B] border-slate-200 dark:border-white/[0.1] text-transparent hover:border-indigo-500'
                              }`}
                            >
                              <CheckCircle2 className="w-4 h-4" />
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

      {/* TAB 2: FOCUS MODE TIMER (POMODORO / DEEP WORK WITH TAB-SWITCH DETECTOR) */}
      {activeTab === 'focus' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
          <div className="md:col-span-7 p-6 rounded-2xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-white/[0.08] text-center space-y-4">
            <div className="flex flex-wrap items-center justify-center gap-2">
              {([25, 50, 90] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setFocusPreset(m);
                    setSecondsLeft(m * 60);
                    setTimerRunning(false);
                  }}
                  className={`px-3 py-1.5 rounded-lg font-mono text-xs font-semibold border ${
                    focusPreset === m
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'border-slate-200 dark:border-white/[0.1] text-slate-600 dark:text-zinc-400'
                  }`}
                >
                  {m}m Deep Work
                </button>
              ))}
              <select
                aria-label="Focus subject"
                value={focusSubject}
                onChange={(e) => setFocusSubject(e.target.value as (typeof SUBJECTS)[number])}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#111114] border border-slate-200 dark:border-white/[0.1] text-xs font-semibold"
              >
                {SUBJECTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <p className="font-mono text-5xl sm:text-6xl font-bold text-slate-900 dark:text-white tabular-nums">
              {String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:
              {String(secondsLeft % 60).padStart(2, '0')}
            </p>

            <p className="text-xs font-mono text-slate-500 dark:text-zinc-400">
              Tab-Switch Focus Breaks:{' '}
              <strong className={focusBreaks > 0 ? 'text-amber-500' : 'text-emerald-500'}>
                {focusBreaks}
              </strong>
            </p>

            <div className="flex flex-wrap justify-center gap-2.5">
              <button
                type="button"
                onClick={() => setTimerRunning((r) => !r)}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                {timerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {timerRunning ? 'Pause' : 'Start Focus'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setTimerRunning(false);
                  setSecondsLeft(focusPreset * 60);
                  setFocusBreaks(0);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.1] text-xs font-semibold text-slate-700 dark:text-zinc-300"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
              <button
                type="button"
                onClick={() => {
                  playSuccess();
                  logFocusMinutes(focusPreset);
                  recordFocusBlockVerified(focusPreset, focusBreaks);
                  setFocusToast(`Logged ${focusPreset}m ${focusSubject} block (+Trifecta Pillar #2)!`);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Log Block
              </button>
            </div>
            {focusToast && <p className="text-xs text-emerald-500 font-semibold">{focusToast}</p>}
          </div>

          <div className="md:col-span-5 space-y-3 text-xs text-slate-600 dark:text-zinc-400">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Distraction-Free Verification
            </h3>
            <p className="leading-relaxed">
              Prepskm monitors browser tab visibility while your Focus Timer runs. Completing a 25+ minute block logs verified hours and automatically unlocks Daily Trifecta Pillar #2.
            </p>
            {focusBreaks > 0 && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{focusBreaks} tab switch detected during active focus.</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                playClick();
                setZenMode(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-semibold text-xs"
            >
              <Focus className="w-4 h-4" />
              Enter 1-Click Full-Screen Zen Mode
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: WEEKLY SCHEDULE & BACKLOG HUB */}
      {activeTab === 'backlog' && (
        <div className="space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newTaskTitle.trim()) return;
              addBacklogTask({
                title: newTaskTitle.trim(),
                subject: newTaskSubject,
                dueDateIso: new Date().toISOString().slice(0, 10),
                bucket: newTaskBucket,
              });
              setNewTaskTitle('');
              playSuccess();
            }}
            className="flex flex-wrap gap-2"
          >
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Add chapter target or backlog clearance item..."
              className="flex-1 min-w-[200px] px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-white/[0.1] text-xs"
            />
            <select
              aria-label="Task subject"
              value={newTaskSubject}
              onChange={(e) => setNewTaskSubject(e.target.value as (typeof SUBJECTS)[number])}
              className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-white/[0.1] text-xs"
            >
              {SUBJECTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              aria-label="Bucket"
              value={newTaskBucket}
              onChange={(e) => setNewTaskBucket(e.target.value as 'present' | 'backlog')}
              className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-white/[0.1] text-xs"
            >
              <option value="present">Present Target</option>
              <option value="backlog">Backlog Clearance</option>
            </select>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </button>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Present Targets */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-white/[0.08] space-y-2.5">
              <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-emerald-500" />
                Present Targets ({presentTasks.length})
              </h3>
              <div className="space-y-2">
                {presentTasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-2.5 rounded-lg bg-white dark:bg-[#111114] border border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between gap-2 text-xs"
                  >
                    <button
                      type="button"
                      onClick={() => toggleBacklogTask(t.id)}
                      className="flex items-center gap-2 text-left min-w-0 flex-1"
                    >
                      <CheckCircle2
                        className={`w-4 h-4 shrink-0 ${
                          t.completed ? 'text-emerald-500' : 'text-slate-300 dark:text-zinc-600'
                        }`}
                      />
                      <span
                        className={`truncate ${
                          t.completed
                            ? 'line-through text-slate-400'
                            : 'text-slate-900 dark:text-zinc-100 font-medium'
                        }`}
                      >
                        {t.title}
                      </span>
                    </button>
                    <span className="text-[10px] font-mono text-slate-400 shrink-0">{t.subject}</span>
                    <button
                      type="button"
                      onClick={() => deleteBacklogTask(t.id)}
                      aria-label="Delete task"
                      className="text-slate-400 hover:text-rose-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Backlog Clearance with 1-Click Reschedule */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-white/[0.08] space-y-2.5">
              <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Backlog Clearance ({backlogOnly.length})
              </h3>
              <div className="space-y-2">
                {backlogOnly.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-zinc-400 py-4 text-center">
                    Zero backlog remaining — great pace!
                  </p>
                ) : (
                  backlogOnly.map((t) => (
                    <div
                      key={t.id}
                      className="p-2.5 rounded-lg bg-white dark:bg-[#111114] border border-slate-200/80 dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-900 dark:text-zinc-100 truncate">
                          {t.title}
                        </p>
                        <p className="text-[10px] font-mono text-slate-400">{t.subject}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          playSuccess();
                          rescheduleBacklogToPresent(t.id);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-600/15 text-indigo-600 dark:text-indigo-300 font-semibold text-[11px] hover:bg-indigo-600 hover:text-white transition-colors shrink-0"
                      >
                        Reschedule Today
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
