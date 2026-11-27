import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Gamepad2,
  Layers,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Shield,
  SlidersHorizontal,
  Sparkles,
  XCircle,
  Zap,
} from 'lucide-react';
import { KatexFormula } from '../math/KatexFormula';
import { predictExamPercentile, type PredictorExamMode } from '../../utils/percentilePredictor';
import { getTrifectaProgress } from '../../utils/arenaProgression';
import { useAuth } from '../../context/AuthContext';
import { usePrepskm2 } from '../../context/Prepskm2Context';
import type { MasteryStageKey } from '../../data/prepskm2Data';
import {
  playClick,
  playComboChime,
  playNav,
  playSuccess,
  playArcadeWrong,
} from '../../utils/soundEffects';

interface HeroFormulaDuelItem {
  id: string;
  subject: string;
  chapter: string;
  latexBefore: string;
  latexAfter: string;
  options: Array<{ label: string; latex: string }>;
  correctIndex: number;
  note: string;
}

const HERO_FORMULA_DUELS: HeroFormulaDuelItem[] = [
  {
    id: 'hfd-1',
    subject: 'Physics',
    chapter: 'Gravitation',
    latexBefore: 'v_e = \\sqrt{\\frac{\\Box}{R}}',
    latexAfter: 'v_e = \\sqrt{\\frac{2GM}{R}}',
    options: [
      { label: '2GM', latex: '2GM' },
      { label: 'GM', latex: 'GM' },
      { label: 'GM/2', latex: '\\frac{GM}{2}' },
    ],
    correctIndex: 0,
    note: 'Escape velocity equals √2 times orbital velocity.',
  },
  {
    id: 'hfd-2',
    subject: 'Physics',
    chapter: 'Rotational Motion',
    latexBefore: 'I_{\\text{tangent}} = \\left(\\Box\\right)MR^2',
    latexAfter: 'I_{\\text{tangent}} = \\frac{7}{5}MR^2',
    options: [
      { label: '7/5', latex: '\\frac{7}{5}' },
      { label: '2/5', latex: '\\frac{2}{5}' },
      { label: '5/3', latex: '\\frac{5}{3}' },
    ],
    correctIndex: 0,
    note: 'Solid sphere about tangent: 2/5 MR² + MR² = 7/5 MR².',
  },
  {
    id: 'hfd-3',
    subject: 'Chemistry',
    chapter: 'Chemical Kinetics',
    latexBefore: 't_{1/2} = \\frac{\\Box}{k}',
    latexAfter: 't_{1/2} = \\frac{0.693}{k}',
    options: [
      { label: '0.693', latex: '0.693' },
      { label: '2.303', latex: '2.303' },
      { label: '[A]_0/2', latex: '\\frac{[A]_0}{2}' },
    ],
    correctIndex: 0,
    note: 'First-order half-life is independent of initial concentration.',
  },
  {
    id: 'hfd-4',
    subject: 'Maths',
    chapter: 'Definite Integrals',
    latexBefore: '\\int_0^{\\pi/2} \\frac{\\sin^n x}{\\sin^n x + \\cos^n x}\\,dx = \\Box',
    latexAfter: '\\int_0^{\\pi/2} \\frac{\\sin^n x}{\\sin^n x + \\cos^n x}\\,dx = \\frac{\\pi}{4}',
    options: [
      { label: 'π/4', latex: '\\frac{\\pi}{4}' },
      { label: 'π/2', latex: '\\frac{\\pi}{2}' },
      { label: 'π/8', latex: '\\frac{\\pi}{8}' },
    ],
    correctIndex: 0,
    note: 'King’s property turns 2I into ∫ 1 dx from 0 to π/2.',
  },
];

const MASTERY_STAGES: Array<{ key: MasteryStageKey; label: string }> = [
  { key: 'theory', label: 'Theory' },
  { key: 'dpp', label: 'DPP' },
  { key: 'pyqs', label: 'PYQs' },
  { key: 'rev1', label: 'Rev 1' },
  { key: 'rev2', label: 'Rev 2' },
];

const HERO_MASTERY_CHAPTERS = [
  { id: 'm-phy-5', name: 'Rotational Motion', subject: 'Physics · 12 Marks' },
  { id: 'm-chem-11', name: 'Aldehydes & Ketones', subject: 'Chemistry · 12 Marks' },
  { id: 'm-math-9', name: 'Definite Integration', subject: 'Maths · 12 Marks' },
];

const FOCUS_TOTAL_SECONDS = 25 * 60;

export function Prepskm2HomeBento() {
  const { cohortId, continueAsGuest, hasCompletedOnboarding } = useAuth();
  const {
    progression,
    masteryMap,
    toggleMasteryStage,
    recordPyqSprintProgress,
    recordFocusBlockVerified,
    recordArenaGameResult,
    setCopilotOpen,
  } = usePrepskm2();

  // ── WIDGET 1: 10-Second Formula Duel Card ──
  const [duelIdx, setDuelIdx] = useState(0);
  const [pickedOption, setPickedOption] = useState<number | null>(null);
  const [duelTimer, setDuelTimer] = useState(10);
  const [duelCombo, setDuelCombo] = useState(0);

  const duel = HERO_FORMULA_DUELS[duelIdx % HERO_FORMULA_DUELS.length];
  const duelAnswered = pickedOption !== null;
  const duelCorrect = pickedOption === duel.correctIndex;

  useEffect(() => {
    if (duelAnswered) return;
    const id = window.setInterval(() => {
      setDuelTimer((prev) => (prev <= 1 ? 10 : prev - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [duelAnswered, duelIdx]);

  const handleFormulaChip = (optIdx: number) => {
    if (pickedOption !== null) return;
    setPickedOption(optIdx);
    recordPyqSprintProgress(1);
    if (optIdx === duel.correctIndex) {
      const nextCombo = duelCombo + 1;
      setDuelCombo(nextCombo);
      playComboChime(nextCombo);
      recordArenaGameResult({
        gameName: 'Hero Formula Duel',
        subject: 'speedArena',
        score: 100 * nextCombo,
        accuracyRatio: 1,
        maxCombo: nextCombo,
        xpEarned: 20,
      });
    } else {
      setDuelCombo(0);
      playArcadeWrong();
    }
  };

  const handleNextDuel = () => {
    playClick();
    setPickedOption(null);
    setDuelTimer(10);
    setDuelIdx((i) => (i + 1) % HERO_FORMULA_DUELS.length);
  };

  // ── WIDGET 2: Focus Block Timer Widget (25m / 50m circular SVG ring) ──
  const [focusPresetMin, setFocusPresetMin] = useState<25 | 50>(25);
  const focusTotalSeconds = focusPresetMin * 60;
  const [focusSecLeft, setFocusSecLeft] = useState(FOCUS_TOTAL_SECONDS);
  const [focusRunning, setFocusRunning] = useState(false);
  const [focusLoggedToast, setFocusLoggedToast] = useState(false);

  useEffect(() => {
    if (!focusRunning) return;
    const id = window.setInterval(() => {
      setFocusSecLeft((prev) => {
        if (prev <= 1) {
          setFocusRunning(false);
          playSuccess();
          recordFocusBlockVerified(focusPresetMin, 0);
          setFocusLoggedToast(true);
          return focusPresetMin * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [focusRunning, focusPresetMin, recordFocusBlockVerified]);

  const handleSelectFocusPreset = (mins: 25 | 50) => {
    playClick();
    setFocusRunning(false);
    setFocusLoggedToast(false);
    setFocusPresetMin(mins);
    setFocusSecLeft(mins * 60);
  };

  const focusProgress = 1 - focusSecLeft / focusTotalSeconds;
  const focusRadius = 34;
  const focusCircumference = 2 * Math.PI * focusRadius;
  const focusDashOffset = focusCircumference * (1 - focusProgress);
  const focusMinStr = String(Math.floor(focusSecLeft / 60)).padStart(2, '0');
  const focusSecStr = String(focusSecLeft % 60).padStart(2, '0');

  // ── WIDGET 3: 5-Stage Chapter Mastery Bar ──
  const [masteryChapterIdx, setMasteryChapterIdx] = useState(0);
  const activeMasteryChapter = HERO_MASTERY_CHAPTERS[masteryChapterIdx % HERO_MASTERY_CHAPTERS.length];
  const activeStageMap = masteryMap[activeMasteryChapter.id] ?? {
    theory: true,
    dpp: true,
    pyqs: false,
    rev1: false,
    rev2: false,
  };
  const completedStagesCount = MASTERY_STAGES.filter((s) => Boolean(activeStageMap[s.key])).length;

  // ── WIDGET 4: Live Percentile Predictor ──
  const [predictorExam, setPredictorExam] = useState<PredictorExamMode>('jee-main');
  const [predictorScore, setPredictorScore] = useState<number>(175);
  const prediction = useMemo(
    () => predictExamPercentile(predictorExam, predictorScore),
    [predictorExam, predictorScore]
  );

  const trifecta = useMemo(
    () => getTrifectaProgress(progression.trifecta),
    [progression.trifecta]
  );

  const handleStartGuest = () => {
    playSuccess();
    if (!hasCompletedOnboarding) {
      continueAsGuest(cohortId);
    }
    document.getElementById('weekly-study-schedule')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section
      aria-label="Prepskm 2.0 Interactive Hero Command Deck"
      className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch"
    >
      {/* LEFT 5 COLS: High-Impact Headline, CTAs & Daily Trifecta Pulse */}
      <div className="lg:col-span-5 flex flex-col justify-between gap-6 py-1">
        <div className="space-y-5">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#1D56C6] dark:text-[#00B4FF]">
            <span className="h-2 w-2 rounded-full bg-[#00B4FF] shadow-[0_0_10px_#00B4FF]" />
            PREPSKM 2.0 · JEE · NEET · CLASS 9–12 OS
          </div>

          <div className="space-y-3">
            <h1 className="font-display text-3xl sm:text-4xl xl:text-[44px] font-extrabold tracking-tight text-[#0E234E] dark:text-white leading-[1.08] text-balance">
              10 Tabs Band Karo.{' '}
              <span className="text-[#1D56C6] dark:text-[#00B4FF]">Ek Jagah Padho.</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-md">
              NCERT notes, NTA exam-day CBT mocks, 5-stage chapter mastery, 3D PrepsBot AI doubt solver, and 60-second arcade drills — unified in one distraction-free study OS.
            </p>
          </div>

          {/* Primary Physical 3D Glowing Cyan CTA + Secondary Launch Arcade CTA */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleStartGuest}
              className="preps-3d-btn inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#00B4FF] hover:bg-[#2EC2FF] text-[#070A12] font-display text-sm font-extrabold shadow-[0_0_25px_rgba(0,180,255,0.35)] hover:shadow-[0_0_32px_rgba(0,180,255,0.55)]"
            >
              <Sparkles className="w-4 h-4" />
              Start Free (Guest Mode)
            </button>

            <Link
              to="/arena"
              onClick={() => playNav()}
              className="preps-3d-card inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#0E234E] dark:bg-[#0D1324] border border-[#00B4FF]/30 hover:border-[#00B4FF] text-white font-display text-sm font-bold"
            >
              <Gamepad2 className="w-4 h-4 text-[#F27B13]" />
              Launch Arcade
              <ArrowRight className="w-4 h-4 text-[#00B4FF]" />
            </Link>
          </div>
        </div>

        {/* Compact Daily Trifecta & PrepsBot Trigger Card */}
        <div className="preps-3d-card rounded-2xl bg-white dark:bg-[#0D1324] border border-slate-200/90 dark:border-[#00B4FF]/[0.16] p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Shield className="w-4 h-4 text-[#10B981] shrink-0" />
              <span className="font-display text-xs font-bold text-[#0E234E] dark:text-white leading-tight">
                Daily Trifecta Shield ({trifecta.completedCount}/3)
              </span>
            </div>
            <span className="font-mono text-xs font-bold text-[#F27B13] tabular-nums shrink-0">
              {progression.elo.speedArena} Arena Elo
            </span>
          </div>

          <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-[#070A12] overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(8, trifecta.percent)}%` }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="h-full rounded-full bg-gradient-to-r from-[#00B4FF] to-[#10B981]"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-500 dark:text-slate-400">
            <span>
              PYQs {progression.trifecta.pyqsSolvedToday}/15 · Focus {progression.trifecta.focusMinutesToday}m · Arena {progression.trifecta.arenaWinsToday}/1
            </span>
            <button
              type="button"
              onClick={() => {
                playClick();
                setCopilotOpen(true);
              }}
              className="font-sans font-bold text-[#1D56C6] dark:text-[#00B4FF] hover:underline"
            >
              Ask PrepsBot →
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT 7 COLS: 2×2 Grid of 4 Live "Poke-able" Mini-Widgets */}
      <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* MINI-WIDGET 1: 10-Second Formula Duel Card */}
        <article className="preps-3d-card rounded-2xl bg-white dark:bg-[#0D1324] border border-slate-200/90 dark:border-[#00B4FF]/[0.16] p-4 flex flex-col justify-between gap-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="h-7 w-7 rounded-lg bg-[#00B4FF]/15 text-[#00B4FF] inline-flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <h2 className="font-display text-[13px] font-bold text-[#0E234E] dark:text-white leading-snug">
                  10-Second Formula Duel
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                  {duel.subject} · {duel.chapter}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span
                className={`font-mono text-[11px] font-bold tabular-nums px-1.5 py-0.5 rounded-md ${
                  duelTimer <= 3
                    ? 'bg-[#F43F5E]/15 text-[#F43F5E]'
                    : 'bg-[#00B4FF]/15 text-[#1D56C6] dark:text-[#00B4FF]'
                }`}
              >
                {duelTimer}s
              </span>
              <button
                type="button"
                onClick={handleNextDuel}
                aria-label="Next formula duel"
                className="p-1 rounded-lg border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-[#00B4FF] transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Blueprint KaTeX Equation Box */}
          <div className="px-3 py-3 rounded-xl bg-slate-50 dark:bg-[#070A12] border border-dashed border-[#00B4FF]/35 flex items-center justify-center min-h-[62px]">
            <KatexFormula
              latex={duelAnswered && duelCorrect ? duel.latexAfter : duel.latexBefore}
              className="text-sm sm:text-base font-bold text-[#0E234E] dark:text-[#00B4FF]"
            />
          </div>

          {/* 3 Clickable Option Chips */}
          <div className="grid grid-cols-3 gap-1.5">
            {duel.options.map((opt, idx) => {
              const isPicked = pickedOption === idx;
              const isRight = idx === duel.correctIndex;
              let chipStyle =
                'bg-slate-50 dark:bg-[#070A12] border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100 hover:border-[#00B4FF]';
              if (duelAnswered) {
                if (isRight) {
                  chipStyle = 'bg-[#10B981]/20 border-[#10B981] text-[#10B981]';
                } else if (isPicked && !isRight) {
                  chipStyle = 'bg-[#F43F5E]/20 border-[#F43F5E] text-[#F43F5E]';
                } else {
                  chipStyle = 'bg-slate-50/40 dark:bg-[#070A12]/50 border-white/5 opacity-50';
                }
              }

              return (
                <button
                  key={opt.label}
                  type="button"
                  disabled={duelAnswered}
                  onClick={() => handleFormulaChip(idx)}
                  className={`py-2 px-2 rounded-xl border text-xs font-mono font-bold transition-all active:scale-95 flex items-center justify-center gap-1 ${chipStyle}`}
                >
                  <KatexFormula latex={opt.latex} className="text-xs" />
                  {duelAnswered && isRight && <CheckCircle2 className="w-3 h-3 shrink-0" />}
                  {duelAnswered && isPicked && !isRight && <XCircle className="w-3 h-3 shrink-0" />}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-2 text-[11px] min-h-[18px]">
            {duelAnswered ? (
              <>
                <span className={duelCorrect ? 'font-bold text-[#10B981]' : 'font-bold text-[#F43F5E]'}>
                  {duelCorrect ? `+20 XP (${duelCombo}x)` : 'Missed!'}
                </span>
                <button
                  type="button"
                  onClick={handleNextDuel}
                  className="font-semibold text-[#1D56C6] dark:text-[#00B4FF] hover:underline"
                >
                  Next →
                </button>
              </>
            ) : (
              <span className="text-slate-500 dark:text-slate-400 truncate">
                Tap the missing variable chip
              </span>
            )}
          </div>
        </article>

        {/* MINI-WIDGET 2: Focus Block Timer Widget (25m / 50m circular SVG ring) */}
        <article className="preps-3d-card rounded-2xl bg-white dark:bg-[#0D1324] border border-slate-200/90 dark:border-[#00B4FF]/[0.16] p-4 flex flex-col justify-between gap-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="h-7 w-7 rounded-lg bg-[#F27B13]/15 text-[#F27B13] inline-flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <h2 className="font-display text-[13px] font-bold text-[#0E234E] dark:text-white leading-snug">
                  Focus Block Timer
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                  {focusPresetMin}m deep sprint · +{focusPresetMin * 2} XP
                </p>
              </div>
            </div>
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-white/10 p-0.5 bg-slate-50 dark:bg-[#070A12] shrink-0">
              {([25, 50] as const).map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => handleSelectFocusPreset(mins)}
                  className={`px-1.5 py-0.5 rounded-md font-mono text-[10px] font-bold transition-colors ${
                    focusPresetMin === mins
                      ? 'bg-[#F27B13] text-[#070A12]'
                      : 'text-slate-500 dark:text-slate-400 hover:text-white'
                  }`}
                >
                  {mins}m
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 py-1">
            {/* Circular SVG Progress Ring */}
            <div className="relative w-20 h-20 shrink-0">
              <svg viewBox="0 0 84 84" className="w-full h-full -rotate-90" aria-hidden="true">
                <circle
                  cx="42"
                  cy="42"
                  r={focusRadius}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="6"
                  className="text-slate-200 dark:text-white/10"
                />
                <circle
                  cx="42"
                  cy="42"
                  r={focusRadius}
                  fill="none"
                  stroke="#00B4FF"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={focusCircumference}
                  strokeDashoffset={focusDashOffset}
                  className="transition-[stroke-dashoffset] duration-700 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-mono text-sm font-extrabold tabular-nums text-[#0E234E] dark:text-white">
                  {focusMinStr}:{focusSecStr}
                </span>
              </div>
            </div>

            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    setFocusLoggedToast(false);
                    setFocusRunning((r) => !r);
                  }}
                  aria-label={focusRunning ? 'Pause focus timer' : 'Start focus timer'}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                    focusRunning
                      ? 'bg-[#F27B13] text-white'
                      : 'bg-[#00B4FF] text-[#070A12] shadow-[0_0_16px_rgba(0,180,255,0.3)]'
                  }`}
                >
                  {focusRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  {focusRunning ? 'Pause' : 'Start'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    setFocusRunning(false);
                    setFocusSecLeft(focusTotalSeconds);
                  }}
                  aria-label="Reset focus timer"
                  className="p-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-white"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                {focusLoggedToast
                  ? `${focusPresetMin}m verified & logged to Trifecta!`
                  : focusRunning
                    ? 'Focus lock active — stay in tab'
                    : `${progression.trifecta.focusMinutesToday}m logged today · Hit Start`}
              </p>
            </div>
          </div>
        </article>

        {/* MINI-WIDGET 3: 5-Stage Chapter Mastery Bar */}
        <article className="preps-3d-card rounded-2xl bg-white dark:bg-[#0D1324] border border-slate-200/90 dark:border-[#00B4FF]/[0.16] p-4 flex flex-col justify-between gap-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="h-7 w-7 rounded-lg bg-[#10B981]/15 text-[#10B981] inline-flex items-center justify-center shrink-0">
                <Layers className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <h2 className="font-display text-[13px] font-bold text-[#0E234E] dark:text-white leading-snug">
                  {activeMasteryChapter.name}
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                  {activeMasteryChapter.subject}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                playClick();
                setMasteryChapterIdx((i) => (i + 1) % HERO_MASTERY_CHAPTERS.length);
              }}
              aria-label="Switch example chapter"
              className="text-[11px] font-mono font-bold text-[#00B4FF] hover:underline shrink-0"
            >
              {completedStagesCount}/5 ↻
            </button>
          </div>

          {/* 5 Clickable Stage Pills: Theory -> DPP -> PYQs -> Rev 1 -> Rev 2 */}
          <div className="grid grid-cols-5 gap-1">
            {MASTERY_STAGES.map((stage) => {
              const done = Boolean(activeStageMap[stage.key]);
              return (
                <button
                  key={stage.key}
                  type="button"
                  aria-pressed={done}
                  onClick={() => {
                    if (!done) playSuccess();
                    else playClick();
                    toggleMasteryStage(activeMasteryChapter.id, stage.key);
                  }}
                  className={`py-2 px-1 rounded-lg border text-[10px] font-bold transition-all flex flex-col items-center gap-1 ${
                    done
                      ? 'bg-[#10B981]/20 border-[#10B981] text-[#10B981]'
                      : 'bg-slate-50 dark:bg-[#070A12] border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:border-[#00B4FF]'
                  }`}
                >
                  <span
                    className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${
                      done ? 'bg-[#10B981] text-[#070A12]' : 'border border-slate-400/50'
                    }`}
                  >
                    {done && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </span>
                  <span className="truncate w-full text-center">{stage.label}</span>
                </button>
              );
            })}
          </div>

          {/* Mastery Progress Bar */}
          <div className="space-y-1">
            <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-[#070A12] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#00B4FF] to-[#10B981] transition-all duration-300"
                style={{ width: `${(completedStagesCount / 5) * 100}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Tap stages to track Theory → Rev 2 mastery
            </p>
          </div>
        </article>

        {/* MINI-WIDGET 4: Live Percentile Predictor */}
        <article className="preps-3d-card rounded-2xl bg-white dark:bg-[#0D1324] border border-slate-200/90 dark:border-[#00B4FF]/[0.16] p-4 flex flex-col justify-between gap-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="h-7 w-7 rounded-lg bg-[#1D56C6]/20 text-[#00B4FF] inline-flex items-center justify-center shrink-0">
                <SlidersHorizontal className="w-4 h-4" />
              </span>
              <h2 className="font-display text-[13px] font-bold text-[#0E234E] dark:text-white leading-snug">
                Live Percentile Predictor
              </h2>
            </div>

            <div className="inline-flex rounded-lg border border-slate-200 dark:border-white/10 p-0.5 bg-slate-50 dark:bg-[#070A12] shrink-0">
              {(
                [
                  { id: 'jee-main', label: 'JEE' },
                  { id: 'neet-ug', label: 'NEET' },
                ] as const
              ).map((ex) => (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => {
                    playClick();
                    setPredictorExam(ex.id);
                    setPredictorScore(ex.id === 'jee-main' ? 175 : 645);
                  }}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors ${
                    predictorExam === ex.id
                      ? 'bg-[#00B4FF] text-[#070A12]'
                      : 'text-slate-500 dark:text-slate-400 hover:text-white'
                  }`}
                >
                  {ex.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-baseline justify-between gap-2 font-mono tabular-nums">
            <div>
              <span className="text-xl font-extrabold text-[#0E234E] dark:text-white">
                {prediction.marks}
              </span>
              <span className="text-xs text-slate-400">/{prediction.maxMarks}</span>
            </div>
            <div className="text-right">
              <span className="text-lg font-extrabold text-[#1D56C6] dark:text-[#00B4FF]">
                {prediction.percentile.toFixed(2)}%ile
              </span>
              <span className="block text-[10px] font-bold text-[#10B981]">
                AIR ~{prediction.estimatedAir.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="hero-percentile-slider" className="sr-only">
              Adjust target score to predict percentile and All-India Rank
            </label>
            <input
              id="hero-percentile-slider"
              type="range"
              min={0}
              max={prediction.maxMarks}
              step={predictorExam === 'jee-main' ? 5 : 10}
              value={predictorScore}
              onChange={(e) => setPredictorScore(Number(e.target.value))}
              className="w-full accent-[#00B4FF] cursor-pointer"
            />
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400">
              <span>0</span>
              <span className="truncate px-1 text-[#F27B13] font-semibold">
                {prediction.targetTier}
              </span>
              <span>{prediction.maxMarks}</span>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
