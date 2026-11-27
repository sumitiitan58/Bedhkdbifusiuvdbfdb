import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Command,
  Flame,
  Gamepad2,
  Maximize2,
  RefreshCw,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Target,
  XCircle,
  Zap,
} from 'lucide-react';
import { DAILY_FORMULA_CHECKS } from '../../data/prepskm2Data';
import { predictExamPercentile, type PredictorExamMode } from '../../utils/percentilePredictor';
import { getTrifectaProgress } from '../../utils/arenaProgression';
import { usePrepskm2 } from '../../context/Prepskm2Context';
import { playClick, playNav, playSuccess, playWarning } from '../../utils/soundEffects';

export function Prepskm2HomeBento() {
  const {
    progression,
    setCommandPaletteOpen,
    setZenMode,
    setCopilotOpen,
    openCopilotWithPrompt,
    recordPyqSprintProgress,
    recordArenaGameResult,
  } = usePrepskm2();

  // Widget 1: Today's 1-Minute Formula Check
  const [formulaIdx, setFormulaIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [formulaStreak, setFormulaStreak] = useState(0);

  const activeFormula = DAILY_FORMULA_CHECKS[formulaIdx % DAILY_FORMULA_CHECKS.length];
  const answeredFormula = selectedOption !== null;
  const isFormulaCorrect = selectedOption === activeFormula.correctIndex;

  const handleFormulaPick = (idx: number) => {
    if (selectedOption !== null) return;
    setSelectedOption(idx);
    recordPyqSprintProgress(1);
    if (idx === activeFormula.correctIndex) {
      playSuccess();
      const nextStreak = formulaStreak + 1;
      setFormulaStreak(nextStreak);
      recordArenaGameResult({
        gameName: '1-Min Formula Check',
        subject: 'speedArena',
        score: 1,
        accuracyRatio: 1,
        maxCombo: nextStreak,
        xpEarned: 20,
      });
    } else {
      playWarning();
      setFormulaStreak(0);
    }
  };

  const handleNextFormula = () => {
    playClick();
    setSelectedOption(null);
    setFormulaIdx((i) => (i + 1) % DAILY_FORMULA_CHECKS.length);
  };

  // Widget 2: Live Percentile & Rank Predictor Slider
  const [predictorExam, setPredictorExam] = useState<PredictorExamMode>('jee-main');
  const [predictorScore, setPredictorScore] = useState<number>(165);

  const prediction = useMemo(
    () => predictExamPercentile(predictorExam, predictorScore),
    [predictorExam, predictorScore]
  );

  const handleSwitchPredictorExam = (exam: PredictorExamMode) => {
    playClick();
    setPredictorExam(exam);
    setPredictorScore(exam === 'jee-main' ? 165 : 640);
  };

  // Widget 3: Daily Trifecta Ring + Streak Shields + Elo
  const trifecta = useMemo(
    () => getTrifectaProgress(progression.trifecta),
    [progression.trifecta]
  );

  const ringRadius = 38;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - trifecta.percent / 100);

  return (
    <section
      aria-label="Prepskm 2.0 Adaptive Command Bento"
      className="space-y-4"
    >
      {/* Clean OS Command Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-500 dark:text-indigo-400">
            PREPSKM 2.0 · AI-NATIVE LEARNING OS
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white leading-tight">
            Interactive Exam Command Deck
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              playClick();
              setCommandPaletteOpen(true);
            }}
            className="inline-flex items-center gap-2 h-9 px-3 rounded-xl border border-slate-200 dark:border-white/[0.10] bg-white dark:bg-[#111114] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors whitespace-nowrap shrink-0"
          >
            <Command className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
            <span>Quick Jump</span>
            <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400">
              ⌘K
            </kbd>
          </button>

          <button
            type="button"
            onClick={() => {
              playClick();
              setZenMode(true);
            }}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-semibold hover:bg-emerald-500/20 transition-colors whitespace-nowrap shrink-0"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            Zen Study Mode
          </button>

          <button
            type="button"
            onClick={() => {
              playClick();
              setCopilotOpen(true);
            }}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Preps AI Copilot
          </button>
        </div>
      </div>

      {/* 3 Live "Poke-able" Home Bento Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* WIDGET 1: Today's 1-Minute Formula Check */}
        <article className="lg:col-span-5 rounded-2xl bg-white dark:bg-[#111114] border border-slate-200/90 dark:border-white/[0.08] p-5 flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="h-7 w-7 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 inline-flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <h2 className="font-display text-sm font-bold text-slate-950 dark:text-white truncate">
                    Today&apos;s 1-Minute Formula Check
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {activeFormula.subject} · {activeFormula.chapter}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {formulaStreak > 0 && (
                  <span className="font-mono text-[11px] font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                    {formulaStreak}x Streak
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleNextFormula}
                  aria-label="Load next formula question"
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-white/[0.08] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100 leading-relaxed">
                {activeFormula.prompt}
              </p>
              <div className="px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-200/80 dark:border-white/[0.08] font-mono text-sm sm:text-base font-bold text-indigo-600 dark:text-indigo-300 text-center tracking-wide">
                {activeFormula.formulaStem}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {activeFormula.options.map((opt, idx) => {
                const isPicked = selectedOption === idx;
                const isRightOption = idx === activeFormula.correctIndex;
                let style =
                  'border-slate-200 dark:border-white/[0.08] bg-slate-50/70 dark:bg-[#18181C] text-slate-800 dark:text-slate-200 hover:border-indigo-500/60';
                if (answeredFormula) {
                  if (isRightOption) {
                    style =
                      'border-emerald-500/70 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200';
                  } else if (isPicked && !isRightOption) {
                    style =
                      'border-rose-500/70 bg-rose-500/15 text-rose-800 dark:text-rose-200';
                  } else {
                    style =
                      'border-slate-200/60 dark:border-white/[0.05] opacity-60 text-slate-500 dark:text-slate-400';
                  }
                }

                return (
                  <button
                    key={opt}
                    type="button"
                    disabled={answeredFormula}
                    onClick={() => handleFormulaPick(idx)}
                    className={`px-3 py-2.5 rounded-xl border text-left text-xs font-mono font-semibold transition-all flex items-center justify-between gap-2 ${style}`}
                  >
                    <span className="truncate">{opt}</span>
                    {answeredFormula && isRightOption && (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                    )}
                    {answeredFormula && isPicked && !isRightOption && (
                      <XCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {answeredFormula ? (
            <div className="pt-3 border-t border-slate-100 dark:border-white/[0.07] space-y-2">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span
                  className={`font-bold ${
                    isFormulaCorrect
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {isFormulaCorrect ? 'Spot-on (+20 XP)' : 'Formula Trap Logged'}
                </span>
                <span className="font-mono text-[11px] text-indigo-600 dark:text-indigo-300 font-semibold">
                  {activeFormula.examTag}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {activeFormula.explanation}
              </p>
              <button
                type="button"
                onClick={handleNextFormula}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Next 1-Minute Formula
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>Tap an option for instant formula verification</span>
              <Link
                to="/arena"
                onClick={() => playNav()}
                className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap"
              >
                Formula Blitz →
              </Link>
            </div>
          )}
        </article>

        {/* WIDGET 2: Live Percentile & Rank Predictor Slider */}
        <article className="lg:col-span-4 rounded-2xl bg-white dark:bg-[#111114] border border-slate-200/90 dark:border-white/[0.08] p-5 flex flex-col justify-between gap-4">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="h-7 w-7 rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 inline-flex items-center justify-center shrink-0">
                  <SlidersHorizontal className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <h2 className="font-display text-sm font-bold text-slate-950 dark:text-white truncate">
                    Live Percentile Predictor
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    NTA 2025–26 calibrated curve
                  </p>
                </div>
              </div>

              <div className="inline-flex rounded-lg border border-slate-200 dark:border-white/[0.08] p-0.5 bg-slate-50 dark:bg-[#18181C] shrink-0">
                {(
                  [
                    { id: 'jee-main', label: 'JEE' },
                    { id: 'neet-ug', label: 'NEET' },
                  ] as const
                ).map((ex) => (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => handleSwitchPredictorExam(ex.id)}
                    className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors whitespace-nowrap ${
                      predictorExam === ex.id
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {ex.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Primary Score & Percentile Readout */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#18181C] border border-slate-200/70 dark:border-white/[0.06]">
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Target Score
                </p>
                <p className="font-mono text-xl font-bold tabular-nums text-slate-950 dark:text-white mt-0.5">
                  {prediction.marks}
                  <span className="text-xs font-normal text-slate-400">
                    /{prediction.maxMarks}
                  </span>
                </p>
              </div>
              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/25">
                <p className="text-[11px] font-medium text-indigo-600 dark:text-indigo-300">
                  Predicted %ile
                </p>
                <p className="font-mono text-xl font-bold tabular-nums text-indigo-600 dark:text-indigo-300 mt-0.5">
                  {prediction.percentile.toFixed(2)}%
                </p>
              </div>
            </div>

            {/* Interactive Range Slider */}
            <div className="space-y-1.5">
              <label htmlFor="live-percentile-slider" className="sr-only">
                Adjust mock test score to predict percentile and rank
              </label>
              <input
                id="live-percentile-slider"
                type="range"
                min={0}
                max={prediction.maxMarks}
                step={predictorExam === 'jee-main' ? 5 : 10}
                value={predictorScore}
                onChange={(e) => setPredictorScore(Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
              <div className="flex items-center justify-between font-mono text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">
                <span>0</span>
                <span>{predictorExam === 'jee-main' ? '165 = 99%ile' : '650 = 99.4%ile'}</span>
                <span>{prediction.maxMarks}</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-white/[0.07] space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Est. All-India Rank</span>
              <span className="font-mono font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                AIR ~{prediction.estimatedAir.toLocaleString('en-IN')} ({prediction.topPercentLabel})
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              {prediction.targetTier} · {prediction.collegeOutlook}
            </p>
          </div>
        </article>

        {/* WIDGET 3: Streak Shield & Daily Trifecta Meter */}
        <article className="lg:col-span-3 rounded-2xl bg-white dark:bg-[#111114] border border-slate-200/90 dark:border-white/[0.08] p-5 flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h2 className="font-display text-sm font-bold text-slate-950 dark:text-white truncate">
                Daily Trifecta &amp; Shield
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Season XP ·{' '}
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                  {progression.seasonXp}
                </span>
              </p>
            </div>
            <span
              title="Active Streak Shields"
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-mono text-xs font-bold tabular-nums shrink-0"
            >
              <Shield className="w-3.5 h-3.5" />
              {progression.streakShields}
            </span>
          </div>

          {/* SVG Progress Ring + 3 Pillars */}
          <div className="flex items-center gap-4">
            <div className="relative w-24 h-24 shrink-0">
              <svg viewBox="0 0 96 96" className="w-full h-full -rotate-90" aria-hidden="true">
                <circle
                  cx="48"
                  cy="48"
                  r={ringRadius}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-slate-200 dark:text-white/[0.08]"
                />
                <circle
                  cx="48"
                  cy="48"
                  r={ringRadius}
                  fill="none"
                  stroke="url(#trifectaGrad)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringOffset}
                  className="transition-all duration-500"
                />
                <defs>
                  <linearGradient id="trifectaGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#6366F1" />
                    <stop offset="100%" stopColor="#10B981" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono text-lg font-extrabold tabular-nums text-slate-950 dark:text-white">
                  {trifecta.completedCount}/3
                </span>
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                  Trifecta
                </span>
              </div>
            </div>

            <div className="flex-1 min-w-0 space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`truncate ${
                    progression.trifecta.focusBlockDone
                      ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  25m Focus
                </span>
                <span className="font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                  {progression.trifecta.focusMinutesToday}/25m
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`truncate ${
                    progression.trifecta.pyqsOrTestDone
                      ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  10 PYQs
                </span>
                <span className="font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                  {progression.trifecta.pyqsSolvedToday}/10
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`truncate ${
                    progression.trifecta.arenaOrMistakesDone
                      ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  1 Arena Game
                </span>
                <span className="font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                  {progression.trifecta.arenaWinsToday}/1
                </span>
              </div>
            </div>
          </div>

          {/* Elo Snapshot + Arena CTA */}
          <div className="pt-3 border-t border-slate-100 dark:border-white/[0.07] flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
              <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="font-mono font-bold tabular-nums">
                {progression.elo.speedArena} Elo
              </span>
            </div>
            <Link
              to="/arena"
              onClick={() => playNav()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors whitespace-nowrap"
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              Play Arena
            </Link>
          </div>
        </article>
      </div>

      {/* Compact 4-Tile Fast Jump Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Link
          to="/arena"
          onClick={() => playNav()}
          className="group p-3.5 rounded-2xl bg-white dark:bg-[#111114] border border-slate-200/90 dark:border-white/[0.08] hover:border-indigo-500/60 transition-all flex items-center justify-between gap-3"
        >
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
              AI Game Generator
            </p>
            <p className="font-display text-sm font-bold text-slate-950 dark:text-white truncate">
              Prepskm Arena
            </p>
          </div>
          <Flame className="w-4 h-4 text-amber-500 shrink-0 group-hover:scale-110 transition-transform" />
        </Link>

        <Link
          to="/cbt-mocks"
          onClick={() => playNav()}
          className="group p-3.5 rounded-2xl bg-white dark:bg-[#111114] border border-slate-200/90 dark:border-white/[0.08] hover:border-emerald-500/60 transition-all flex items-center justify-between gap-3"
        >
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              Auto NTA Light Mode
            </p>
            <p className="font-display text-sm font-bold text-slate-950 dark:text-white truncate">
              CBT Mock Engine
            </p>
          </div>
          <Target className="w-4 h-4 text-emerald-500 shrink-0 group-hover:scale-110 transition-transform" />
        </Link>

        <Link
          to="/mentors"
          onClick={() => playNav()}
          className="group p-3.5 rounded-2xl bg-white dark:bg-[#111114] border border-slate-200/90 dark:border-white/[0.08] hover:border-amber-500/60 transition-all flex items-center justify-between gap-3"
        >
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
              IIT &amp; AIIMS Toppers
            </p>
            <p className="font-display text-sm font-bold text-slate-950 dark:text-white truncate">
              1:1 Mentors &amp; Peers
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all shrink-0" />
        </Link>

        <button
          type="button"
          onClick={() => {
            playClick();
            openCopilotWithPrompt('Give me a 3-point high-ROI revision checklist for JEE/NEET today.');
          }}
          className="group p-3.5 rounded-2xl bg-white dark:bg-[#111114] border border-slate-200/90 dark:border-white/[0.08] hover:border-indigo-500/60 transition-all flex items-center justify-between gap-3 text-left"
        >
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
              Slide-Over Assistant
            </p>
            <p className="font-display text-sm font-bold text-slate-950 dark:text-white truncate">
              Ask Preps AI Doubt
            </p>
          </div>
          <Sparkles className="w-4 h-4 text-indigo-500 shrink-0 group-hover:scale-110 transition-transform" />
        </button>
      </div>
    </section>
  );
}
