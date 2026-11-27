import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Heart,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Zap,
} from 'lucide-react';
import {
  FORMULA_BLITZ_QUESTIONS,
  NCERT_LINE_TRAP_QUESTIONS,
  PAPER_SCANNER_QUESTIONS,
  REACTION_CHAIN_LEVELS,
} from '../../data/prepskm2Data';
import { KatexFormula } from '../math/KatexFormula';
import {
  ArcadeStageShell,
  getComboMultiplier,
  triggerComboConfetti,
  type FloatingXpBurst,
} from './ArcadeStageShell';
import { usePrepskm2 } from '../../context/Prepskm2Context';
import { usePlatformData } from '../../context/PlatformDataContext';
import { extractMistakeEntries } from '../../utils/testAnalysisEngine';
import {
  playArcadeWrong,
  playBossHit,
  playClick,
  playComboChime,
  playSwipeTick,
} from '../../utils/soundEffects';

// ============================================================================
// INLINE CUSTOM SVG ICONS (CHEMISTRY FLASK + CYBER BOSS AVATAR)
// ============================================================================
function ChemistryFlaskSvg({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M9 3h6M10 3v5.4L5.2 17.6A2.2 2.2 0 0 0 7.1 21h9.8a2.2 2.2 0 0 0 1.9-3.4L14 8.4V3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.5 15.5h9l1.6 3.1a1 1 0 0 1-.9 1.4H6.8a1 1 0 0 1-.9-1.4l1.6-3.1Z"
        fill="#00B4FF"
        fillOpacity="0.35"
      />
      <circle cx="10.5" cy="17.5" r="0.9" fill="#00B4FF" />
      <circle cx="13.8" cy="16.8" r="0.7" fill="#F27B13" />
    </svg>
  );
}

function BossOverlordAvatarSvg({ hit }: { hit: boolean }) {
  return (
    <motion.svg
      viewBox="0 0 72 72"
      className="w-16 h-16 shrink-0"
      animate={hit ? { x: [0, -7, 7, -4, 4, 0], scale: [1, 0.92, 1.04, 1] } : { y: [0, -3, 0] }}
      transition={hit ? { duration: 0.34 } : { duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="bossCore" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={hit ? '#F43F5E' : '#1D56C6'} />
          <stop offset="100%" stopColor="#0E234E" />
        </linearGradient>
      </defs>
      <rect x="10" y="14" width="52" height="46" rx="16" fill="url(#bossCore)" stroke={hit ? '#F43F5E' : '#00B4FF'} strokeWidth="2.5" />
      <path d="M16 14 L22 5 L28 14 M44 14 L50 5 L56 14" stroke="#F43F5E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="20" y="28" width="12" height="7" rx="3" fill={hit ? '#FFFFFF' : '#F43F5E'} />
      <rect x="40" y="28" width="12" height="7" rx="3" fill={hit ? '#FFFFFF' : '#F43F5E'} />
      <path d="M24 47 Q36 41 48 47" stroke="#F27B13" strokeWidth="3" strokeLinecap="round" fill="none" />
    </motion.svg>
  );
}

function extractConditionTag(reagent: string): { label: string; colorClass: string } {
  const lower = reagent.toLowerCase();
  if (lower.includes('0–5') || lower.includes('0-5')) {
    return { label: '0–5 °C', colorClass: 'bg-[#00B4FF]/15 text-[#00B4FF] border-[#00B4FF]/40' };
  }
  if (lower.includes('δ') || lower.includes('Δ') || lower.includes('heat') || lower.includes('443k')) {
    return { label: 'Δ Heat', colorClass: 'bg-[#F27B13]/15 text-[#F27B13] border-[#F27B13]/40' };
  }
  if (lower.includes('alcl')) {
    return { label: 'Anhyd. AlCl₃', colorClass: 'bg-purple-500/15 text-purple-300 border-purple-400/40' };
  }
  if (lower.includes('pcc') || lower.includes('nabh') || lower.includes('sn')) {
    return { label: 'Selective', colorClass: 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/40' };
  }
  return { label: 'Reagent', colorClass: 'bg-white/10 text-slate-300 border-white/15' };
}

// Complete single-expression KaTeX blueprints for Formula Blitz (never splits open braces)
interface FormulaBlitzLatexSpec {
  render: (slot: string) => string;
  optionsLatex: string[];
}

const FORMULA_BLITZ_LATEX: Record<string, FormulaBlitzLatexSpec> = {
  'fb-1': {
    render: (slot) => `E = \\frac{\\sigma}{${slot}}`,
    optionsLatex: ['2\\varepsilon_0', '\\varepsilon_0', '4\\pi\\varepsilon_0', '2\\pi\\varepsilon_0'],
  },
  'fb-2': {
    render: (slot) => `T = 2\\pi\\sqrt{${slot}}`,
    optionsLatex: ['\\dfrac{L}{g}', '\\dfrac{g}{L}', '\\dfrac{m}{k}', '\\dfrac{2L}{g}'],
  },
  'fb-3': {
    render: (slot) => `\\lim_{x\\to 0}(1+ax)^{b/x} = ${slot}`,
    optionsLatex: ['e^{ab}', 'e^{a/b}', 'ab', 'e^{a+b}'],
  },
  'fb-4': {
    render: (slot) => `\\lambda_{\\text{Å}} \\approx \\frac{${slot}}{\\sqrt{V}}`,
    optionsLatex: ['12.27', '6.63', '1.227', '12400'],
  },
  'fb-5': {
    render: (slot) => `\\eta = 1 - ${slot}`,
    optionsLatex: [
      '\\dfrac{T_{\\text{sink}}}{T_{\\text{source}}}',
      '\\dfrac{T_{\\text{source}}}{T_{\\text{sink}}}',
      '\\dfrac{Q_{\\text{source}}}{Q_{\\text{sink}}}',
      '\\dfrac{P_2}{P_1}',
    ],
  },
  'fb-6': {
    render: (slot) => `\\frac{1}{SP} + \\frac{1}{SQ} = ${slot}`,
    optionsLatex: ['\\dfrac{1}{a}', '\\dfrac{2}{a}', '4a', '\\dfrac{1}{2a}'],
  },
  'fb-7': {
    render: (slot) => `B_{\\text{center}} = \\frac{\\mu_0 I}{${slot}}`,
    optionsLatex: ['2R', '2\\pi R', '4\\pi R', 'R'],
  },
  'fb-8': {
    render: (slot) => `d = \\frac{|(\\vec{a}_2-\\vec{a}_1)\\cdot(\\vec{b}_1\\times\\vec{b}_2)|}{${slot}}`,
    optionsLatex: [
      '|\\vec{b}_1 \\times \\vec{b}_2|',
      '|\\vec{b}_1 \\cdot \\vec{b}_2|',
      '|\\vec{a}_2 - \\vec{a}_1|',
      '|\\vec{b}_1|\\,|\\vec{b}_2|',
    ],
  },
};

// ============================================================================
// GAME 1: FORMULA BLITZ (EQUATION BLUEPRINT + [?] SNAP + 3D BEVEL TILES + 1-4 KEYS)
// ============================================================================
export function FormulaBlitzGame() {
  const { progression, recordArenaGameResult } = usePrepskm2();
  const [idx, setIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(90);
  const [picked, setPicked] = useState<number | null>(null);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [score, setScore] = useState(0);
  const [avgMs, setAvgMs] = useState<number[]>([]);
  const [done, setDone] = useState(false);
  const [xpBurst, setXpBurst] = useState<FloatingXpBurst | null>(null);
  const [rippleKey, setRippleKey] = useState(0);
  const [shakeKey, setShakeKey] = useState(0);
  const [wrongFeedback, setWrongFeedback] = useState<string | null>(null);
  const startRef = useRef<number>(Date.now());

  const item = FORMULA_BLITZ_QUESTIONS[idx];
  const latexSpec = FORMULA_BLITZ_LATEX[item.id];

  useEffect(() => {
    if (done) return;
    const id = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setDone(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [done]);

  const handleTap = useCallback(
    (optIdx: number) => {
      if (picked !== null || done) return;
      const elapsedMs = Date.now() - startRef.current;
      setAvgMs((arr) => [...arr, elapsedMs]);
      setPicked(optIdx);

      if (optIdx === item.correctIndex) {
        const nextCombo = combo + 1;
        const mult = getComboMultiplier(nextCombo);
        const gainedXp = 20 * mult;
        setCombo(nextCombo);
        setMaxCombo((m) => Math.max(m, nextCombo));
        setCorrect((c) => c + 1);
        setScore((s) => s + 100 * mult);
        setWrongFeedback(null);
        setRippleKey((k) => k + 1);
        setXpBurst({ id: Date.now(), label: `+${gainedXp} XP` });
        playComboChime(nextCombo);
        triggerComboConfetti(nextCombo);
      } else {
        setCombo(0);
        setShakeKey((k) => k + 1);
        setWrongFeedback(item.explanation);
        playArcadeWrong();
      }
    },
    [picked, done, item, combo]
  );

  const handleNext = useCallback(() => {
    playClick();
    if (idx + 1 >= FORMULA_BLITZ_QUESTIONS.length) {
      setDone(true);
      const accuracy = correct / FORMULA_BLITZ_QUESTIONS.length;
      recordArenaGameResult({
        gameName: 'Formula Blitz (Physics & Maths)',
        subject: 'physics',
        score: score + timeLeft * 5,
        accuracyRatio: accuracy,
        maxCombo,
        xpEarned: 80 + correct * 20,
        difficultyRating: 1100,
      });
    } else {
      setIdx((i) => i + 1);
      setPicked(null);
      setWrongFeedback(null);
      startRef.current = Date.now();
    }
  }, [idx, correct, score, timeLeft, maxCombo, recordArenaGameResult]);

  // Keyboard 1-4 option selection & Enter for next
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (done) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const num = Number(e.key);
      if (num >= 1 && num <= 4 && picked === null) {
        e.preventDefault();
        handleTap(num - 1);
      } else if (e.key === 'Enter' && picked !== null) {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [done, picked, handleTap, handleNext]);

  const reset = () => {
    playClick();
    setIdx(0);
    setTimeLeft(90);
    setPicked(null);
    setCombo(0);
    setMaxCombo(0);
    setCorrect(0);
    setScore(0);
    setAvgMs([]);
    setDone(false);
    setWrongFeedback(null);
    startRef.current = Date.now();
  };

  const meanMs = avgMs.length ? Math.round(avgMs.reduce((a, b) => a + b, 0) / avgMs.length) : 0;
  const isPickedCorrect = picked === item.correctIndex;
  const fullBlueprintLatex = useMemo(() => {
    if (!latexSpec) return null;
    if (picked === null) {
      return latexSpec.render('\\color{#00B4FF}{\\boxed{\\;?\\;}}');
    }
    const chosenLatex = latexSpec.optionsLatex[picked] ?? item.options[picked];
    const colorHex = isPickedCorrect ? '#10B981' : '#F43F5E';
    return latexSpec.render(`\\color{${colorHex}}{\\boxed{\\;${chosenLatex}\\;}}`);
  }, [latexSpec, picked, isPickedCorrect, item.options]);

  return (
    <ArcadeStageShell
      badge="⚡ Formula Blitz · Keys 1–4 Supported"
      title="Equation Blueprint Rapid-Fire"
      subtitle={`${item.subject} · ${item.chapter} · Avg ${meanMs} ms`}
      timeLeft={timeLeft}
      totalTime={90}
      combo={combo}
      score={score}
      elo={progression.elo.physics}
      xpBurst={xpBurst}
      rippleKey={rippleKey}
      shakeKey={shakeKey}
      wrongFeedback={wrongFeedback}
    >
      {!done ? (
        <div className="space-y-5">
          {/* Glowing Equation Blueprint Card with KaTeX single-expression slot */}
          <div
            className="relative rounded-2xl p-6 sm:p-8 bg-[#070A12] border border-[#00B4FF]/35 shadow-[inset_0_0_40px_rgba(0,180,255,0.08)] overflow-hidden text-center space-y-4"
            style={{
              backgroundImage:
                'linear-gradient(rgba(0,180,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,180,255,0.06) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          >
            <div className="flex items-center justify-between text-[11px] font-mono text-[#00B4FF]">
              <span>BLUEPRINT #{idx + 1}/{FORMULA_BLITZ_QUESTIONS.length}</span>
              <span>{item.title}</span>
            </div>

            <div className="flex items-center justify-center min-h-[76px] py-2">
              {fullBlueprintLatex ? (
                <motion.div
                  key={`${item.id}-${picked ?? 'open'}`}
                  initial={{ scale: 0.94, opacity: 0.7 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 26 }}
                  className={`inline-flex items-center justify-center px-5 py-3 rounded-2xl border transition-colors ${
                    picked === null
                      ? 'border-[#00B4FF]/25 bg-[#0D1324]/70'
                      : isPickedCorrect
                        ? 'border-[#10B981]/50 bg-[#10B981]/10 shadow-[0_0_28px_rgba(16,185,129,0.2)]'
                        : 'border-[#F43F5E]/50 bg-[#F43F5E]/10 shadow-[0_0_24px_rgba(244,63,94,0.2)]'
                  }`}
                >
                  <KatexFormula
                    latex={fullBlueprintLatex}
                    displayMode
                    className="text-xl sm:text-2xl text-white"
                  />
                </motion.div>
              ) : (
                <span className="text-xl sm:text-2xl font-mono font-bold text-white">
                  {item.equationWithBlank}
                </span>
              )}
            </div>
          </div>

          {/* 4 3D-Bevelled Option Tiles with Keycaps 1–4 */}
          <div className="grid grid-cols-2 gap-3.5">
            {item.options.map((opt, oIdx) => {
              const revealed = picked !== null;
              const isCorrect = oIdx === item.correctIndex;
              const isChosen = oIdx === picked;
              const optLatex = latexSpec?.optionsLatex[oIdx];

              let tileClass =
                'bg-[#0E234E]/90 dark:bg-[#070A12] border-[#00B4FF]/30 border-b-[#00B4FF]/60 text-white hover:border-[#00B4FF] hover:bg-[#1D56C6]/25';
              if (revealed && isCorrect) {
                tileClass =
                  'bg-[#10B981]/20 border-[#10B981] border-b-[#059669] text-[#10B981] shadow-[0_0_20px_rgba(16,185,129,0.28)]';
              } else if (revealed && isChosen && !isCorrect) {
                tileClass = 'bg-[#F43F5E]/20 border-[#F43F5E] border-b-[#E11D48] text-[#F43F5E]';
              } else if (revealed) {
                tileClass = 'bg-[#070A12]/50 border-white/10 border-b-white/10 text-slate-500 opacity-55';
              }

              return (
                <button
                  key={opt}
                  type="button"
                  disabled={revealed}
                  onClick={() => handleTap(oIdx)}
                  className={`relative py-4 px-4 rounded-xl border-2 border-b-4 active:border-b-2 active:translate-y-[2px] font-mono text-base sm:text-lg font-extrabold transition-all flex items-center justify-between gap-2 ${tileClass}`}
                >
                  <kbd className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-white/10 text-[11px] font-mono text-[#00B4FF] shrink-0">
                    {oIdx + 1}
                  </kbd>
                  <span className="flex-1 flex items-center justify-center min-h-[28px]">
                    {optLatex ? <KatexFormula latex={optLatex} className="text-base sm:text-lg" /> : opt}
                  </span>
                  <span className="w-6 shrink-0" />
                </button>
              );
            })}
          </div>

          {picked !== null && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <p className="text-xs text-slate-600 dark:text-slate-300 flex-1 leading-relaxed">
                {isPickedCorrect && (
                  <span className="font-bold text-[#10B981] mr-1.5">Locked In!</span>
                )}
                {item.explanation}
              </p>
              <button
                type="button"
                onClick={handleNext}
                className="px-4 py-2.5 rounded-xl bg-[#00B4FF] hover:bg-[#33C4FF] text-[#070A12] text-xs font-extrabold shadow-[0_0_20px_rgba(0,180,255,0.35)] shrink-0"
              >
                {idx + 1 >= FORMULA_BLITZ_QUESTIONS.length ? 'Claim XP & Elo' : 'Next Blueprint (Enter) →'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="p-6 rounded-2xl bg-[#070A12] border border-[#00B4FF]/30 text-center space-y-3">
          <Zap className="w-9 h-9 text-[#F27B13] mx-auto" />
          <h3 className="font-display text-xl font-extrabold text-white">
            Formula Blitz Complete!
          </h3>
          <p className="font-mono text-sm text-slate-300 tabular-nums">
            Score: <strong className="text-[#00B4FF]">{score}</strong> · Accuracy:{' '}
            <strong className="text-[#10B981]">{correct}/{FORMULA_BLITZ_QUESTIONS.length}</strong> · Avg:{' '}
            <strong className="text-[#F27B13]">{meanMs} ms</strong>
          </p>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#00B4FF] text-[#070A12] text-xs font-extrabold"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Play Again
          </button>
        </div>
      )}
    </ArcadeStageShell>
  );
}

// ============================================================================
// GAME 2: REACTION CHAIN DUEL (NODE-GRAPH SYNTHESIS PIPELINE + SVG FLASKS)
// ============================================================================
export function ReactionChainDuelGame() {
  const { progression, recordArenaGameResult } = usePrepskm2();
  const [levelIdx, setLevelIdx] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [running, setRunning] = useState(false);
  const [combo, setCombo] = useState(0);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [eloGain, setEloGain] = useState<number | null>(null);
  const [xpBurst, setXpBurst] = useState<FloatingXpBurst | null>(null);
  const [rippleKey, setRippleKey] = useState(0);
  const [shakeKey, setShakeKey] = useState(0);
  const [wrongFeedback, setWrongFeedback] = useState<string | null>(null);

  const level = REACTION_CHAIN_LEVELS[levelIdx % REACTION_CHAIN_LEVELS.length];
  const step = level.steps[stepIdx];

  useEffect(() => {
    if (!running || completed) return;
    const id = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setRunning(false);
          setCompleted(true);
          playArcadeWrong();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running, completed]);

  const startFresh = (nextLevelIdx = levelIdx) => {
    playClick();
    setLevelIdx(nextLevelIdx);
    setStepIdx(0);
    setTimeLeft(60);
    setRunning(true);
    setCombo(0);
    setScore(0);
    setMistakes(0);
    setCompleted(false);
    setEloGain(null);
    setWrongFeedback(null);
  };

  const handlePickReagent = (reagent: string) => {
    if (!running) setRunning(true);
    if (completed) return;

    if (reagent === step.correctReagent) {
      const nextCombo = combo + 1;
      const mult = getComboMultiplier(nextCombo);
      setCombo(nextCombo);
      setScore((s) => s + 120 * mult);
      setWrongFeedback(null);
      setRippleKey((k) => k + 1);
      setXpBurst({ id: Date.now(), label: `+${30 * mult} XP` });
      playComboChime(nextCombo);
      triggerComboConfetti(nextCombo);

      if (stepIdx + 1 >= level.steps.length) {
        setCompleted(true);
        setRunning(false);
        const acc = Math.max(0.25, 1 - mistakes * 0.15);
        const res = recordArenaGameResult({
          gameName: `Reaction Chain: ${level.title}`,
          subject: 'chemistry',
          score: score + 120 * mult + timeLeft * 10,
          accuracyRatio: acc,
          maxCombo: nextCombo,
          xpEarned: 120 + timeLeft * 2,
          difficultyRating: 1120,
        });
        setEloGain(res.eloDelta);
      } else {
        setStepIdx((s) => s + 1);
      }
    } else {
      setCombo(0);
      setMistakes((m) => m + 1);
      setShakeKey((k) => k + 1);
      setWrongFeedback(`Not ${reagent}. Hint: ${step.hint}`);
      playArcadeWrong();
    }
  };

  return (
    <ArcadeStageShell
      badge={`🧪 Reaction Chain Duel · ${level.examTag}`}
      title={level.title}
      subtitle={`${level.chapter} · Node-Graph Organic Synthesis Pipeline`}
      timeLeft={timeLeft}
      totalTime={60}
      combo={combo}
      score={score}
      elo={progression.elo.chemistry}
      xpBurst={xpBurst}
      rippleKey={rippleKey}
      shakeKey={shakeKey}
      wrongFeedback={wrongFeedback}
      headerRightExtra={
        <button
          type="button"
          onClick={() => startFresh((levelIdx + 1) % REACTION_CHAIN_LEVELS.length)}
          className="px-2.5 py-1 rounded-lg border border-[#00B4FF]/30 bg-[#070A12] text-[11px] font-bold text-[#00B4FF] hover:bg-[#00B4FF]/15 transition-colors"
        >
          Chain {levelIdx + 1}/{REACTION_CHAIN_LEVELS.length} ↻
        </button>
      }
    >
      {/* Visual Horizontal Node-Graph Synthesis Pipeline */}
      <div className="p-4 rounded-2xl bg-[#070A12] border border-[#00B4FF]/20 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max py-2">
          {level.steps.map((st, idx) => {
            const solved = idx < stepIdx || (completed && timeLeft > 0);
            const active = idx === stepIdx && !completed;
            const cond = extractConditionTag(st.correctReagent);

            return (
              <div key={idx} className="flex items-center gap-2 shrink-0">
                {/* Compound Node (first step shows substrate, later steps show intermediate) */}
                {idx === 0 && (
                  <div className="px-3 py-2.5 rounded-xl bg-[#0D1324] border border-[#00B4FF]/35 shrink-0 w-[144px]">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-[#00B4FF]">
                      <ChemistryFlaskSvg className="w-3.5 h-3.5 shrink-0" />
                      Substrate
                    </div>
                    <p className="font-mono text-xs font-bold text-white mt-1 truncate" title={st.fromCompound}>
                      {st.fromCompound}
                    </p>
                  </div>
                )}

                {/* Animated Dashed SVG Arrow + Reagent Slot */}
                <div className="flex flex-col items-center justify-center px-1 shrink-0 w-[112px]">
                  <span
                    className={`px-2 py-0.5 rounded-md border text-[10px] font-mono font-bold mb-1 truncate max-w-[108px] ${
                      solved
                        ? 'bg-[#10B981]/20 border-[#10B981] text-[#10B981]'
                        : active
                          ? 'bg-[#00B4FF]/20 border-dashed border-[#00B4FF] text-[#00B4FF] animate-pulse'
                          : 'bg-white/5 border-white/10 text-slate-500'
                    }`}
                  >
                    {solved ? st.correctReagent : active ? '? Reagent' : 'Locked'}
                  </span>
                  <svg viewBox="0 0 80 14" className="w-full h-3.5 overflow-visible" aria-hidden="true">
                    <line
                      x1="0"
                      y1="7"
                      x2="70"
                      y2="7"
                      stroke={solved ? '#10B981' : active ? '#00B4FF' : '#334155'}
                      strokeWidth="2"
                      strokeDasharray="6 4"
                      className={active || solved ? 'arcade-dash-flow' : ''}
                    />
                    <polygon
                      points="70,3 79,7 70,11"
                      fill={solved ? '#10B981' : active ? '#00B4FF' : '#334155'}
                    />
                  </svg>
                  {solved && (
                    <span className={`mt-1 px-1.5 py-0.2 rounded border text-[9px] font-mono ${cond.colorClass}`}>
                      {cond.label}
                    </span>
                  )}
                </div>

                {/* Intermediate / Final Product Node */}
                <div
                  className={`px-3 py-2.5 rounded-xl border shrink-0 w-[144px] transition-all ${
                    solved
                      ? 'bg-[#10B981]/15 border-[#10B981]/60'
                      : active
                        ? 'bg-[#0D1324] border-[#00B4FF] shadow-[0_0_16px_rgba(0,180,255,0.22)]'
                        : 'bg-[#0D1324]/60 border-white/10 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-slate-400">
                    <ChemistryFlaskSvg className="w-3.5 h-3.5 text-[#F27B13] shrink-0" />
                    {idx === level.steps.length - 1 ? 'Product' : `Inter. ${idx + 1}`}
                  </div>
                  <p className="font-mono text-xs font-bold text-white mt-1 truncate" title={st.toCompound}>
                    {st.toCompound}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {!completed ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-mono font-bold text-[#00B4FF]">
              ACTIVE STEP {stepIdx + 1}/{level.steps.length}: {step.fromCompound} ──▶ {step.toCompound}
            </span>
            <span className="text-slate-400">Pick the exact reagent flask below</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {step.options.map((reagent) => {
              const tag = extractConditionTag(reagent);
              return (
                <button
                  key={reagent}
                  type="button"
                  onClick={() => handlePickReagent(reagent)}
                  className="group px-4 py-3.5 rounded-xl bg-[#070A12] border-2 border-[#00B4FF]/25 border-b-4 border-b-[#00B4FF]/50 hover:border-[#00B4FF] active:border-b-2 active:translate-y-[2px] text-left transition-all flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <ChemistryFlaskSvg className="w-5 h-5 text-[#00B4FF] group-hover:text-[#F27B13] transition-colors shrink-0" />
                    <span className="font-mono text-sm font-bold text-white truncate">
                      {reagent}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-md border text-[10px] font-mono font-bold shrink-0 ${tag.colorClass}`}
                  >
                    {tag.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-2xl bg-[#10B981]/10 border border-[#10B981]/40 text-center space-y-3">
          <CheckCircle2 className="w-9 h-9 text-[#10B981] mx-auto" />
          <p className="font-display text-xl font-extrabold text-white">
            {timeLeft > 0 ? '4-Step Synthesis Chain Synthesized!' : 'Timer Expired — Retry Synthesis'}
          </p>
          <p className="text-xs font-mono text-slate-300">
            Score: {score} · Time Left: {timeLeft}s · Mistakes: {mistakes}
            {eloGain !== null && ` · Chemistry Elo: ${eloGain >= 0 ? `+${eloGain}` : eloGain}`}
          </p>
          <button
            type="button"
            onClick={() => startFresh((levelIdx + 1) % REACTION_CHAIN_LEVELS.length)}
            className="px-5 py-2.5 rounded-xl bg-[#00B4FF] hover:bg-[#33C4FF] text-[#070A12] text-xs font-extrabold"
          >
            Launch Next Organic Chain →
          </button>
        </div>
      )}
    </ArcadeStageShell>
  );
}

// ============================================================================
// GAME 3: MISTAKE BOSS FIGHT (SEGMENTED CRIMSON HP + 3 HEARTS + CYAN BEAM PULSE)
// ============================================================================
export function MistakeBossFightGame() {
  const { progression, recordArenaGameResult, openCopilotWithPrompt } = usePrepskm2();
  const { attempts, questions, toggleMistakeResolved } = usePlatformData();

  const bossDeck = useMemo(() => {
    const mistakes = extractMistakeEntries(attempts, questions).slice(0, 10);
    if (mistakes.length > 0) {
      return mistakes.map((m) => ({
        id: m.questionId,
        subject: m.subjectName,
        chapter: m.chapterName,
        prompt:
          m.question?.questionText ||
          `Review ${m.subjectName} Q${m.question?.questionNumber ?? 1} (${m.chapterName})`,
        options:
          m.question?.optionTexts && m.question.optionTexts.length >= 2
            ? m.question.optionTexts
            : ['Option A', 'Option B', 'Option C', 'Option D'],
        correctIndex: m.question?.correctOptionIndices?.[0] ?? 0,
        explanation:
          m.question?.solutionText ||
          `Verify core concept in ${m.chapterName} to eliminate negative marking.`,
        fromNotebook: true,
      }));
    }
    return FORMULA_BLITZ_QUESTIONS.slice(0, 6).map((f) => ({
      id: f.id,
      subject: f.subject,
      chapter: f.chapter,
      prompt: `${f.title}: Complete ${f.equationWithBlank}`,
      options: f.options,
      correctIndex: f.correctIndex,
      explanation: f.explanation,
      fromNotebook: false,
    }));
  }, [attempts, questions]);

  const [bossHp, setBossHp] = useState(100);
  const [hearts, setHearts] = useState(3);
  const [timeLeft, setTimeLeft] = useState(120);
  const [idx, setIdx] = useState(0);
  const [combo, setCombo] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [bossHitPulse, setBossHitPulse] = useState(false);
  const [beamKey, setBeamKey] = useState(0);
  const [dmgFloat, setDmgFloat] = useState<{ id: number; text: string; heal?: boolean } | null>(null);
  const [xpBurst, setXpBurst] = useState<FloatingXpBurst | null>(null);
  const [rippleKey, setRippleKey] = useState(0);
  const [shakeKey, setShakeKey] = useState(0);
  const [wrongFeedback, setWrongFeedback] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<'playing' | 'victory' | 'defeat'>('playing');

  const current = bossDeck[idx % bossDeck.length];

  useEffect(() => {
    if (outcome !== 'playing') return;
    const id = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setOutcome('defeat');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [outcome]);

  const handleStrike = (optIdx: number) => {
    if (picked !== null || outcome !== 'playing') return;
    setPicked(optIdx);

    if (optIdx === current.correctIndex) {
      const nextCombo = combo + 1;
      const dmg = 25;
      const nextHp = Math.max(0, bossHp - dmg);
      setCombo(nextCombo);
      setBossHp(nextHp);
      setScore((s) => s + 150 * getComboMultiplier(nextCombo));
      setBossHitPulse(true);
      setBeamKey((k) => k + 1);
      setDmgFloat({ id: Date.now(), text: `-${dmg} HP!` });
      setXpBurst({ id: Date.now(), label: `+40 XP` });
      setRippleKey((k) => k + 1);
      setWrongFeedback(null);
      playBossHit();
      triggerComboConfetti(nextCombo);
      window.setTimeout(() => setBossHitPulse(false), 380);

      if (current.fromNotebook) {
        toggleMistakeResolved(current.id);
      }

      if (nextHp === 0) {
        setOutcome('victory');
        triggerComboConfetti(5);
        recordArenaGameResult({
          gameName: 'Mistake Boss Fight',
          subject: 'speedArena',
          score: score + 500,
          accuracyRatio: 0.92,
          maxCombo: nextCombo,
          xpEarned: 180,
          difficultyRating: 1180,
        });
      }
    } else {
      const nextHearts = Math.max(0, hearts - 1);
      const healedHp = Math.min(100, bossHp + 10);
      setCombo(0);
      setHearts(nextHearts);
      setBossHp(healedHp);
      setDmgFloat({ id: Date.now(), text: '+10 HP', heal: true });
      setShakeKey((k) => k + 1);
      setWrongFeedback(`Boss countered (-1 Heart, +10 Boss HP). Fix: ${current.explanation}`);
      playArcadeWrong();
      if (nextHearts === 0) {
        setOutcome('defeat');
      }
    }
  };

  const resetBattle = () => {
    playClick();
    setBossHp(100);
    setHearts(3);
    setTimeLeft(120);
    setIdx(0);
    setCombo(0);
    setScore(0);
    setPicked(null);
    setWrongFeedback(null);
    setOutcome('playing');
  };

  const hpSegments = 10;
  const filledSegments = Math.ceil((bossHp / 100) * hpSegments);

  return (
    <ArcadeStageShell
      badge={`👾 Mistake Boss Fight · ${current.fromNotebook ? 'Synced with Your Wrong Qs' : 'Exam Trap Training Boss'}`}
      title="Negative-Marking Overlord"
      subtitle="Correct hit fires cyan pulse (-25 HP) · Wrong costs 1 Heart & heals Boss +10 HP"
      timeLeft={timeLeft}
      totalTime={120}
      combo={combo}
      score={score}
      elo={progression.elo.speedArena}
      xpBurst={xpBurst}
      rippleKey={rippleKey}
      shakeKey={shakeKey}
      wrongFeedback={wrongFeedback}
    >
      {/* BOSS ARENA HUD: Player 3 Hearts vs Cyan Pulse Beam vs Boss Avatar + 10-Segment Crimson HP Bar */}
      <div className="relative rounded-2xl bg-[#070A12] border border-[#F43F5E]/30 p-4 sm:p-5 overflow-hidden">
        {/* Cyan Energy Pulse Beam firing left -> right into Boss */}
        <AnimatePresence>
          {beamKey > 0 && (
            <motion.div
              key={`beam-${beamKey}`}
              initial={{ scaleX: 0, opacity: 1 }}
              animate={{ scaleX: 1, opacity: [1, 1, 0] }}
              transition={{ duration: 0.42, ease: 'easeOut' }}
              style={{ transformOrigin: 'left center' }}
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-16 right-20 h-2 -translate-y-1/2 rounded-full bg-gradient-to-r from-[#00B4FF] via-white to-[#00B4FF] shadow-[0_0_24px_#00B4FF] z-20"
            />
          )}
        </AnimatePresence>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
          {/* Player Shield Bar (3 Hearts) */}
          <div className="w-full sm:w-auto flex sm:flex-col items-center sm:items-start justify-between gap-2">
            <span className="text-[11px] font-mono uppercase font-bold text-[#00B4FF]">
              Player Shield
            </span>
            <div className="flex items-center gap-1.5" aria-label={`${hearts} of 3 hearts remaining`}>
              {[0, 1, 2].map((hIdx) => {
                const alive = hIdx < hearts;
                return (
                  <motion.span
                    key={hIdx}
                    animate={alive ? { scale: 1 } : { scale: 0.78, opacity: 0.25 }}
                    className={`w-9 h-9 rounded-xl border flex items-center justify-center ${
                      alive
                        ? 'bg-[#F43F5E]/15 border-[#F43F5E]/50 text-[#F43F5E] shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                        : 'bg-white/5 border-white/10 text-slate-600'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${alive ? 'fill-[#F43F5E]' : ''}`} />
                  </motion.span>
                );
              })}
            </div>
          </div>

          {/* Boss Avatar + Segmented Crimson HP Bar */}
          <div className="flex items-center gap-3.5 w-full sm:w-[340px]">
            <div className="relative">
              <BossOverlordAvatarSvg hit={bossHitPulse} />
              <AnimatePresence>
                {dmgFloat && (
                  <motion.span
                    key={`dmg-${dmgFloat.id}`}
                    initial={{ opacity: 1, y: 0, scale: 0.9 }}
                    animate={{ opacity: 0, y: -28, scale: 1.15 }}
                    transition={{ duration: 0.65 }}
                    className={`pointer-events-none absolute -top-2 -right-3 px-2 py-0.5 rounded-md font-mono text-xs font-extrabold whitespace-nowrap ${
                      dmgFloat.heal
                        ? 'bg-[#F27B13] text-[#070A12]'
                        : 'bg-[#00B4FF] text-[#070A12] shadow-[0_0_14px_#00B4FF]'
                    }`}
                  >
                    {dmgFloat.text}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-bold text-[#F43F5E]">BOSS HP</span>
                <span className="font-extrabold text-white tabular-nums">{bossHp} / 100</span>
              </div>
              {/* 10 Segmented Crimson Bars */}
              <div className="grid grid-cols-10 gap-1" role="progressbar" aria-valuenow={bossHp} aria-valuemin={0} aria-valuemax={100}>
                {Array.from({ length: hpSegments }).map((_, sIdx) => {
                  const filled = sIdx < filledSegments;
                  return (
                    <div
                      key={sIdx}
                      className={`h-3 rounded-xs transition-all duration-300 ${
                        filled
                          ? 'bg-[#F43F5E] shadow-[0_0_8px_rgba(244,63,94,0.65)]'
                          : 'bg-white/10'
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {outcome === 'playing' ? (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#070A12] border border-slate-200 dark:border-white/10 space-y-1">
            <p className="text-[11px] font-mono font-bold text-[#00B4FF]">
              {current.subject} · {current.chapter}
            </p>
            <h3 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
              {current.prompt}
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {current.options.map((opt, oIdx) => {
              const revealed = picked !== null;
              const isCorrect = oIdx === current.correctIndex;
              const isChosen = oIdx === picked;
              return (
                <button
                  key={oIdx}
                  type="button"
                  disabled={revealed}
                  onClick={() => handleStrike(oIdx)}
                  className={`text-left px-4 py-3.5 rounded-xl border-2 border-b-4 active:border-b-2 active:translate-y-[2px] text-sm font-bold transition-all ${
                    revealed && isCorrect
                      ? 'border-[#10B981] bg-[#10B981]/20 text-[#10B981]'
                      : revealed && isChosen && !isCorrect
                        ? 'border-[#F43F5E] bg-[#F43F5E]/20 text-[#F43F5E]'
                        : 'border-[#00B4FF]/25 bg-[#070A12] hover:border-[#00B4FF] text-white'
                  }`}
                >
                  <span className="font-mono text-xs text-[#00B4FF] mr-2">
                    {['A', 'B', 'C', 'D'][oIdx]}.
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>

          {picked !== null && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={() =>
                  openCopilotWithPrompt(
                    `Explain this ${current.subject} (${current.chapter}) mistake step-by-step: ${current.prompt}`
                  )
                }
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00B4FF] hover:underline"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Ask PrepsBot for Shortcut
              </button>
              <button
                type="button"
                onClick={() => {
                  playClick();
                  setIdx((i) => i + 1);
                  setPicked(null);
                  setWrongFeedback(null);
                }}
                className="px-4 py-2.5 rounded-xl bg-[#00B4FF] hover:bg-[#33C4FF] text-[#070A12] text-xs font-extrabold"
              >
                Next Boss Attack →
              </button>
            </div>
          )}
        </div>
      ) : (
        <div
          className={`p-6 rounded-2xl border text-center space-y-3 ${
            outcome === 'victory'
              ? 'bg-[#10B981]/10 border-[#10B981]/40'
              : 'bg-[#F43F5E]/10 border-[#F43F5E]/40'
          }`}
        >
          <CheckCircle2
            className={`w-10 h-10 mx-auto ${
              outcome === 'victory' ? 'text-[#10B981]' : 'text-[#F43F5E]'
            }`}
          />
          <h3 className="font-display text-xl font-extrabold text-white">
            {outcome === 'victory'
              ? 'Boss Obliterated! +180 XP & Elo Boosted'
              : 'Shields Depleted — Regroup & Rematch'}
          </h3>
          <p className="font-mono text-xs text-slate-300">
            Final Score: {score} · Remaining Hearts: {hearts}/3 · Boss HP: {bossHp}
          </p>
          <button
            type="button"
            onClick={resetBattle}
            className="px-5 py-2.5 rounded-xl bg-[#00B4FF] text-[#070A12] text-xs font-extrabold"
          >
            Rematch Boss
          </button>
        </div>
      )}
    </ArcadeStageShell>
  );
}

// ============================================================================
// GAME 4: NCERT LINE-TRAP (TAPPABLE WORD TOKENS + 3D ROTATEX FLIP REVEAL)
// ============================================================================
export function NcertLineTrapGame() {
  const { progression, recordArenaGameResult } = usePrepskm2();
  const [idx, setIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [tappedIdx, setTappedIdx] = useState<number | null>(null);
  const [combo, setCombo] = useState(0);
  const [score, setScore] = useState(0);
  const [hits, setHits] = useState(0);
  const [finished, setFinished] = useState(false);
  const [xpBurst, setXpBurst] = useState<FloatingXpBurst | null>(null);
  const [rippleKey, setRippleKey] = useState(0);
  const [shakeKey, setShakeKey] = useState(0);
  const [wrongFeedback, setWrongFeedback] = useState<string | null>(null);

  const q = NCERT_LINE_TRAP_QUESTIONS[idx];

  useEffect(() => {
    if (tappedIdx !== null || finished) return;
    const id = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setTappedIdx(-1);
          setCombo(0);
          setShakeKey((k) => k + 1);
          setWrongFeedback(`Time up! "${q.tokens[q.wrongTokenIndex]}" should be "${q.correctReplacement}".`);
          playArcadeWrong();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [tappedIdx, finished, q]);

  const handleTapWord = (wIdx: number) => {
    if (tappedIdx !== null) return;
    setTappedIdx(wIdx);
    if (wIdx === q.wrongTokenIndex) {
      const nextCombo = combo + 1;
      const mult = getComboMultiplier(nextCombo);
      setCombo(nextCombo);
      setHits((h) => h + 1);
      setScore((s) => s + 150 * mult);
      setWrongFeedback(null);
      setRippleKey((k) => k + 1);
      setXpBurst({ id: Date.now(), label: `+${25 * mult} XP` });
      playComboChime(nextCombo);
      triggerComboConfetti(nextCombo);
    } else {
      setCombo(0);
      setShakeKey((k) => k + 1);
      setWrongFeedback(
        `Missed! The altered word was "${q.tokens[q.wrongTokenIndex]}" → "${q.correctReplacement}". ${q.explanation}`
      );
      playArcadeWrong();
    }
  };

  const handleNext = () => {
    playClick();
    if (idx + 1 >= NCERT_LINE_TRAP_QUESTIONS.length) {
      setFinished(true);
      recordArenaGameResult({
        gameName: 'NCERT Line-Trap (Bio & Chem)',
        subject: 'mathsBio',
        score,
        accuracyRatio: hits / NCERT_LINE_TRAP_QUESTIONS.length,
        maxCombo: hits,
        xpEarned: 75 + hits * 20,
        difficultyRating: 1120,
      });
    } else {
      setIdx((i) => i + 1);
      setTappedIdx(null);
      setTimeLeft(20);
      setWrongFeedback(null);
    }
  };

  return (
    <ArcadeStageShell
      badge={`🔍 NCERT Line-Trap · ${q.sourceRef}`}
      title={`Tap the Single Altered Word (${q.subject})`}
      subtitle={`Line ${idx + 1}/${NCERT_LINE_TRAP_QUESTIONS.length} · ${q.chapter} · 20s Rapid Scan`}
      timeLeft={timeLeft}
      totalTime={20}
      combo={combo}
      score={score}
      elo={progression.elo.mathsBio}
      xpBurst={xpBurst}
      rippleKey={rippleKey}
      shakeKey={shakeKey}
      wrongFeedback={wrongFeedback}
    >
      {!finished ? (
        <div className="space-y-4">
          {/* Authentic NCERT Highlighted Paragraph with Tappable Word Tokens */}
          <div className="p-5 sm:p-6 rounded-2xl bg-[#070A12] border-l-4 border-l-[#F27B13] border border-[#00B4FF]/20 space-y-3">
            <div className="flex items-center justify-between text-[11px] font-mono text-[#F27B13]">
              <span>NCERT TEXTBOOK EXCERPT</span>
              <span>TAP 1 SUSPECT WORD</span>
            </div>

            <div className="flex flex-wrap gap-2 leading-loose" style={{ perspective: '600px' }}>
              {q.tokens.map((tok, wIdx) => {
                const revealed = tappedIdx !== null;
                const isTrap = wIdx === q.wrongTokenIndex;
                const isChosen = wIdx === tappedIdx;
                const flipToCorrect = revealed && isTrap;

                return (
                  <motion.button
                    key={`${q.id}-${wIdx}`}
                    type="button"
                    disabled={revealed}
                    onClick={() => handleTapWord(wIdx)}
                    animate={
                      flipToCorrect
                        ? { rotateX: [0, 90, 0], scale: [1, 1.08, 1] }
                        : { rotateX: 0 }
                    }
                    transition={{ duration: 0.45, ease: 'easeOut' }}
                    className={`px-3 py-1.5 rounded-xl border text-base sm:text-lg font-semibold transition-all ${
                      flipToCorrect
                        ? 'bg-[#10B981]/25 border-[#10B981] text-[#10B981] shadow-[0_0_18px_rgba(16,185,129,0.4)]'
                        : revealed && isChosen && !isTrap
                          ? 'bg-[#F43F5E]/25 border-[#F43F5E] text-[#F43F5E]'
                          : 'bg-[#0D1324] border-white/15 hover:border-[#00B4FF] hover:-translate-y-0.5 text-slate-100'
                    }`}
                  >
                    {flipToCorrect ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="line-through text-rose-400 text-sm">{tok}</span>
                        <span className="font-extrabold text-[#10B981]">{q.correctReplacement}</span>
                      </span>
                    ) : (
                      tok
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {tappedIdx !== null && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <p className="text-xs text-slate-300 flex-1 leading-relaxed">
                <strong className="text-[#10B981]">NCERT Fact:</strong> {q.explanation}
              </p>
              <button
                type="button"
                onClick={handleNext}
                className="px-4 py-2.5 rounded-xl bg-[#00B4FF] hover:bg-[#33C4FF] text-[#070A12] text-xs font-extrabold shrink-0"
              >
                {idx + 1 >= NCERT_LINE_TRAP_QUESTIONS.length ? 'Finish Line-Trap' : 'Next NCERT Line →'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="p-6 rounded-2xl bg-[#10B981]/10 border border-[#10B981]/40 text-center space-y-3">
          <h3 className="font-display text-xl font-extrabold text-white">
            NCERT Line-Trap Cleared: {hits}/{NCERT_LINE_TRAP_QUESTIONS.length}
          </h3>
          <p className="font-mono text-xs text-slate-300">Total Score: {score}</p>
          <button
            type="button"
            onClick={() => {
              playClick();
              setIdx(0);
              setTappedIdx(null);
              setTimeLeft(20);
              setCombo(0);
              setScore(0);
              setHits(0);
              setFinished(false);
              setWrongFeedback(null);
            }}
            className="px-5 py-2.5 rounded-xl bg-[#00B4FF] text-[#070A12] text-xs font-extrabold"
          >
            Play Again
          </button>
        </div>
      )}
    </ArcadeStageShell>
  );
}

// ============================================================================
// GAME 5: 15-MINUTE PAPER SCANNER (SWIPEABLE FLASHCARD STACK + ARROW KEYS)
// ============================================================================
export function PaperScannerTrainerGame() {
  const { progression, recordArenaGameResult } = usePrepskm2();
  const [cardTimer, setCardTimer] = useState(15);
  const [qIdx, setQIdx] = useState(0);
  const [combo, setCombo] = useState(0);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [tags, setTags] = useState<Record<string, 'solve-now' | 'round-2' | 'skip-trap'>>({});
  const [swipeDir, setSwipeDir] = useState<'left' | 'down' | 'right'>('right');
  const [xpBurst, setXpBurst] = useState<FloatingXpBurst | null>(null);
  const [rippleKey, setRippleKey] = useState(0);
  const [shakeKey, setShakeKey] = useState(0);
  const [wrongFeedback, setWrongFeedback] = useState<string | null>(null);

  const deck = PAPER_SCANNER_QUESTIONS.slice(0, 12);
  const currentQ = deck[qIdx];

  const finishScanner = useCallback(
    (finalTags: Record<string, 'solve-now' | 'round-2' | 'skip-trap'>) => {
      setFinished(true);
      const matches = deck.filter((q) => finalTags[q.id] === q.optimalTag).length;
      recordArenaGameResult({
        gameName: '15-Min Paper Scanner',
        subject: 'speedArena',
        score: matches * 100,
        accuracyRatio: matches / deck.length,
        maxCombo: matches,
        xpEarned: 100 + matches * 10,
        difficultyRating: 1150,
      });
    },
    [deck, recordArenaGameResult]
  );

  const handleSort = useCallback(
    (tag: 'skip-trap' | 'round-2' | 'solve-now') => {
      if (finished || !currentQ) return;
      setSwipeDir(tag === 'skip-trap' ? 'left' : tag === 'round-2' ? 'down' : 'right');
      playSwipeTick(tag === 'skip-trap' ? 'skip' : tag === 'round-2' ? 'round2' : 'solve');

      const nextTags = { ...tags, [currentQ.id]: tag };
      setTags(nextTags);

      if (tag === currentQ.optimalTag) {
        const nextCombo = combo + 1;
        const mult = getComboMultiplier(nextCombo);
        setCombo(nextCombo);
        setScore((s) => s + 100 * mult);
        setWrongFeedback(null);
        setRippleKey((k) => k + 1);
        setXpBurst({ id: Date.now(), label: `+${20 * mult} XP` });
        triggerComboConfetti(nextCombo);
      } else {
        setCombo(0);
        setShakeKey((k) => k + 1);
        setWrongFeedback(`Optimal bucket was "${currentQ.optimalTag}": ${currentQ.strategyNote}`);
      }

      if (qIdx + 1 >= deck.length) {
        finishScanner(nextTags);
      } else {
        setQIdx((i) => i + 1);
        setCardTimer(15);
      }
    },
    [finished, currentQ, tags, combo, qIdx, deck.length, finishScanner]
  );

  // 15-second per-card countdown
  useEffect(() => {
    if (finished) return;
    const id = window.setInterval(() => {
      setCardTimer((t) => {
        if (t <= 1) {
          handleSort('round-2');
          return 15;
        }
        return t - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [finished, handleSort]);

  // Arrow key shortcuts: ← Skip Trap | ↓ Round 2 | → Solve Now
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (finished) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleSort('skip-trap');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleSort('round-2');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleSort('solve-now');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [finished, handleSort]);

  const exactMatches = deck.filter((q) => tags[q.id] === q.optimalTag).length;

  const exitVariant =
    swipeDir === 'left'
      ? { x: -220, rotate: -10, opacity: 0 }
      : swipeDir === 'down'
        ? { y: 120, scale: 0.9, opacity: 0 }
        : { x: 220, rotate: 10, opacity: 0 };

  return (
    <ArcadeStageShell
      badge="🎯 15-Minute Paper Scanner · Arrow Keys ← ↓ →"
      title="Rapid Flashcard Triage Stack"
      subtitle={`Card ${Math.min(qIdx + 1, deck.length)}/${deck.length} · Max 15s per question — sort without solving`}
      timeLeft={cardTimer}
      totalTime={15}
      combo={combo}
      score={score}
      elo={progression.elo.speedArena}
      xpBurst={xpBurst}
      rippleKey={rippleKey}
      shakeKey={shakeKey}
      wrongFeedback={wrongFeedback}
    >
      {!finished && currentQ ? (
        <div className="space-y-5">
          {/* Swipeable Flashcard Stack with depth deck behind */}
          <div className="relative min-h-[196px] flex items-center justify-center pt-2">
            {/* Stacked Deck Depth Cards */}
            <div
              aria-hidden="true"
              className="absolute inset-x-8 top-6 bottom-0 rounded-2xl bg-[#070A12]/60 border border-white/10 scale-[0.94] translate-y-2"
            />
            <div
              aria-hidden="true"
              className="absolute inset-x-4 top-4 bottom-0 rounded-2xl bg-[#070A12]/80 border border-[#00B4FF]/15 scale-[0.97] translate-y-1"
            />

            <AnimatePresence mode="wait">
              <motion.div
                key={currentQ.id}
                initial={{ opacity: 0, scale: 0.94, y: -12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={exitVariant}
                transition={{ duration: 0.24, ease: 'easeOut' }}
                className="relative z-10 w-full p-5 sm:p-6 rounded-2xl bg-[#070A12] border-2 border-[#00B4FF]/35 shadow-[0_18px_40px_-14px_rgba(0,0,0,0.8)] space-y-3"
              >
                <div className="flex items-center justify-between gap-2 text-xs font-mono">
                  <span className="px-2.5 py-0.5 rounded-md bg-[#00B4FF]/15 text-[#00B4FF] font-bold">
                    Q{currentQ.qNo} · {currentQ.subject}
                  </span>
                  <span className="text-slate-400">{currentQ.chapter}</span>
                </div>
                <p className="font-display text-base sm:text-lg font-bold text-white leading-relaxed">
                  {currentQ.snippet}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* 3 Glowing Triage Buckets: ← Skip Trap 🔴 | ↓ Round 2 🟡 | → Solve Now 🟢 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => handleSort('skip-trap')}
              className="group py-3.5 px-4 rounded-xl bg-[#F43F5E]/15 border-2 border-[#F43F5E]/50 border-b-4 border-b-[#F43F5E] hover:bg-[#F43F5E]/25 active:translate-y-[2px] text-[#F43F5E] font-bold text-sm transition-all flex flex-col items-center gap-1"
            >
              <span className="inline-flex items-center gap-1.5">
                <ArrowLeft className="w-4 h-4" />
                Skip Trap 🔴
              </span>
              <span className="text-[11px] font-mono opacity-80">Key ← · 4+ min trap</span>
            </button>

            <button
              type="button"
              onClick={() => handleSort('round-2')}
              className="group py-3.5 px-4 rounded-xl bg-[#F27B13]/15 border-2 border-[#F27B13]/50 border-b-4 border-b-[#F27B13] hover:bg-[#F27B13]/25 active:translate-y-[2px] text-[#F27B13] font-bold text-sm transition-all flex flex-col items-center gap-1"
            >
              <span className="inline-flex items-center gap-1.5">
                <ArrowDown className="w-4 h-4" />
                Round 2 🟡
              </span>
              <span className="text-[11px] font-mono opacity-80">Key ↓ · 2–3 min calc</span>
            </button>

            <button
              type="button"
              onClick={() => handleSort('solve-now')}
              className="group py-3.5 px-4 rounded-xl bg-[#10B981]/15 border-2 border-[#10B981]/50 border-b-4 border-b-[#10B981] hover:bg-[#10B981]/25 active:translate-y-[2px] text-[#10B981] font-bold text-sm transition-all flex flex-col items-center gap-1"
            >
              <span className="inline-flex items-center gap-1.5">
                Solve Now 🟢
                <ArrowRight className="w-4 h-4" />
              </span>
              <span className="text-[11px] font-mono opacity-80">Key → · &lt;90s +4</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-[#070A12] border border-[#10B981]/40 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-lg font-extrabold text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-[#10B981]" />
                Scanner Triage Report
              </h3>
              <p className="text-xs font-mono text-slate-300 mt-1 tabular-nums">
                Optimal Sorts: <strong className="text-[#10B981]">{exactMatches}/{deck.length}</strong> · Score:{' '}
                <strong className="text-[#00B4FF]">{score}</strong>
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                playClick();
                setQIdx(0);
                setCardTimer(15);
                setCombo(0);
                setScore(0);
                setTags({});
                setFinished(false);
                setWrongFeedback(null);
              }}
              className="px-4 py-2 rounded-xl bg-[#00B4FF] text-[#070A12] text-xs font-extrabold"
            >
              Scan Again
            </button>
          </div>
        </div>
      )}
    </ArcadeStageShell>
  );
}
