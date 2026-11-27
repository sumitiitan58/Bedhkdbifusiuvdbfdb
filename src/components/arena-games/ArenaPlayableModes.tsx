import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Flame,
  Heart,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Swords,
  Zap,
} from 'lucide-react';
import {
  FORMULA_BLITZ_QUESTIONS,
  NCERT_LINE_TRAP_QUESTIONS,
  PAPER_SCANNER_QUESTIONS,
  REACTION_CHAIN_LEVELS,
} from '../../data/prepskm2Data';
import { usePrepskm2 } from '../../context/Prepskm2Context';
import { usePlatformData } from '../../context/PlatformDataContext';
import { extractMistakeEntries } from '../../utils/testAnalysisEngine';
import { playClick, playSuccess, playWarning } from '../../utils/soundEffects';

// ============================================================================
// GAME 1: REACTION CHAIN DUEL (60s 4-STEP SYNTHESIS LADDER)
// ============================================================================
export function ReactionChainDuelGame() {
  const { recordArenaGameResult } = usePrepskm2();
  const [levelIdx, setLevelIdx] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [running, setRunning] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [eloGain, setEloGain] = useState<number | null>(null);

  const level = REACTION_CHAIN_LEVELS[levelIdx % REACTION_CHAIN_LEVELS.length];
  const step = level.steps[stepIdx];

  useEffect(() => {
    if (!running || completed) return;
    const id = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setRunning(false);
          setCompleted(true);
          playWarning();
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
    setFeedback(null);
    setMistakes(0);
    setCompleted(false);
    setEloGain(null);
  };

  const handlePickReagent = (reagent: string) => {
    if (!running) setRunning(true);
    if (completed) return;
    if (reagent === step.correctReagent) {
      playSuccess();
      setFeedback({ ok: true, text: `Correct! ${reagent} converts ${step.fromCompound} → ${step.toCompound}.` });
      if (stepIdx + 1 >= level.steps.length) {
        setCompleted(true);
        setRunning(false);
        const acc = Math.max(0.25, 1 - mistakes * 0.15);
        const res = recordArenaGameResult({
          gameName: `Reaction Chain: ${level.title}`,
          subject: 'chemistry',
          score: Math.round(400 + timeLeft * 10 - mistakes * 40),
          accuracyRatio: acc,
          maxCombo: Math.max(1, 4 - mistakes),
          xpEarned: 120 + timeLeft * 2,
          difficultyRating: 1120,
        });
        setEloGain(res.eloDelta);
      } else {
        setStepIdx((s) => s + 1);
      }
    } else {
      playWarning();
      setMistakes((m) => m + 1);
      setFeedback({ ok: false, text: `Not ${reagent}. Hint: ${step.hint}` });
    }
  };

  return (
    <div className="rounded-2xl bg-white dark:bg-[#111114] border border-slate-200 dark:border-white/[0.08] p-5 sm:p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            Reaction Chain Duel · {level.examTag}
          </p>
          <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
            {level.title}
          </h2>
        </div>
        <div className="flex items-center gap-3 font-mono text-sm tabular-nums">
          <span className={timeLeft <= 12 ? 'text-rose-500 font-bold' : 'text-indigo-500 font-bold'}>
            <Clock className="w-4 h-4 inline mr-1" />
            {timeLeft}s
          </span>
          <button
            type="button"
            onClick={() => startFresh((levelIdx + 1) % REACTION_CHAIN_LEVELS.length)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/[0.1] text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:border-indigo-500"
          >
            Switch Chain ({levelIdx + 1}/{REACTION_CHAIN_LEVELS.length})
          </button>
        </div>
      </div>

      {/* Visual 4-Step Synthesis Node Ladder */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
        {level.steps.map((st, idx) => {
          const done = idx < stepIdx || (completed && timeLeft > 0);
          const active = idx === stepIdx && !completed;
          return (
            <div
              key={idx}
              className={`p-3 rounded-xl border text-xs transition-all ${
                done
                  ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                  : active
                    ? 'border-indigo-500 bg-indigo-500/10 text-slate-900 dark:text-white'
                    : 'border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#09090B] text-slate-400 dark:text-zinc-500'
              }`}
            >
              <p className="font-mono text-[10px] font-bold">STEP {idx + 1}</p>
              <p className="font-semibold mt-1 truncate">{st.fromCompound}</p>
              <p className="text-[11px] font-mono my-0.5 opacity-80">
                ↓ {done ? st.correctReagent : active ? '[Pick Reagent]' : '???'}
              </p>
              <p className="font-semibold truncate">{st.toCompound}</p>
            </div>
          );
        })}
      </div>

      {!completed ? (
        <div className="space-y-4 pt-2">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-white/[0.08] flex flex-wrap items-center justify-center gap-3 text-sm sm:text-base font-mono font-bold text-slate-900 dark:text-white">
            <span>{step.fromCompound}</span>
            <ArrowRight className="w-4 h-4 text-indigo-500" />
            <span className="px-3 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/40 text-indigo-600 dark:text-indigo-300 text-xs">
              Select Reagent ?
            </span>
            <ArrowRight className="w-4 h-4 text-indigo-500" />
            <span>{step.toCompound}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {step.options.map((reagent) => (
              <button
                key={reagent}
                type="button"
                onClick={() => handlePickReagent(reagent)}
                className="px-4 py-3.5 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-white/[0.1] hover:border-indigo-500 text-sm font-mono font-semibold text-slate-900 dark:text-zinc-100 text-left transition-colors"
              >
                {reagent}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-3">
          <p className="font-display text-lg font-bold text-slate-900 dark:text-white">
            {timeLeft > 0 ? '4-Step Synthesis Chain Cleared!' : 'Time Expired — Retry Chain'}
          </p>
          <p className="text-xs font-mono text-slate-600 dark:text-zinc-300">
            Time Remaining: {timeLeft}s · Mistakes: {mistakes}
            {eloGain !== null && ` · Chemistry Elo: ${eloGain >= 0 ? `+${eloGain}` : eloGain}`}
          </p>
          <button
            type="button"
            onClick={() => startFresh((levelIdx + 1) % REACTION_CHAIN_LEVELS.length)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
          >
            Next Reaction Chain
          </button>
        </div>
      )}

      {feedback && (
        <p
          className={`text-xs font-medium ${
            feedback.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
          }`}
        >
          {feedback.text}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// GAME 2: FORMULA BLITZ (PHYSICS & MATHS · MS SPEED + COMBO STREAK)
// ============================================================================
export function FormulaBlitzGame() {
  const { recordArenaGameResult } = usePrepskm2();
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [avgMs, setAvgMs] = useState<number[]>([]);
  const [done, setDone] = useState(false);
  const startRef = useRef<number>(Date.now());

  const item = FORMULA_BLITZ_QUESTIONS[idx];

  const handleTap = (optIdx: number) => {
    if (picked !== null || done) return;
    const elapsedMs = Date.now() - startRef.current;
    setAvgMs((arr) => [...arr, elapsedMs]);
    setPicked(optIdx);
    if (optIdx === item.correctIndex) {
      playSuccess();
      const nextCombo = combo + 1;
      setCombo(nextCombo);
      setMaxCombo((m) => Math.max(m, nextCombo));
      setCorrect((c) => c + 1);
    } else {
      playWarning();
      setCombo(0);
    }
  };

  const handleNext = () => {
    playClick();
    if (idx + 1 >= FORMULA_BLITZ_QUESTIONS.length) {
      setDone(true);
      const accuracy = correct / FORMULA_BLITZ_QUESTIONS.length;
      recordArenaGameResult({
        gameName: 'Formula Blitz (Physics & Maths)',
        subject: 'physics',
        score: Math.round(correct * 120 + maxCombo * 40),
        accuracyRatio: accuracy,
        maxCombo,
        xpEarned: 80 + correct * 15,
        difficultyRating: 1080,
      });
    } else {
      setIdx((i) => i + 1);
      setPicked(null);
      startRef.current = Date.now();
    }
  };

  const reset = () => {
    playClick();
    setIdx(0);
    setPicked(null);
    setCombo(0);
    setMaxCombo(0);
    setCorrect(0);
    setAvgMs([]);
    setDone(false);
    startRef.current = Date.now();
  };

  const meanMs = avgMs.length ? Math.round(avgMs.reduce((a, b) => a + b, 0) / avgMs.length) : 0;

  return (
    <div className="rounded-2xl bg-white dark:bg-[#111114] border border-slate-200 dark:border-white/[0.08] p-5 sm:p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            Formula Blitz · Speed &amp; Recall
          </p>
          <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
            Missing Variable Rapid-Fire
          </h2>
        </div>
        <div className="flex items-center gap-4 font-mono text-xs tabular-nums">
          <span className="text-amber-500 font-bold">
            <Flame className="w-3.5 h-3.5 inline mr-1" />
            {combo}x Streak
          </span>
          <span className="text-slate-500 dark:text-zinc-400">
            Avg Speed: <strong className="text-slate-900 dark:text-white">{meanMs} ms</strong>
          </span>
          <span className="text-slate-500 dark:text-zinc-400">
            {idx + 1}/{FORMULA_BLITZ_QUESTIONS.length}
          </span>
        </div>
      </div>

      {!done ? (
        <div className="space-y-4">
          <div className="p-6 rounded-2xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-white/[0.08] text-center space-y-2">
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              {item.subject} · {item.chapter} — {item.title}
            </p>
            <p className="font-mono text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              {item.equationWithBlank}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {item.options.map((opt, oIdx) => {
              const revealed = picked !== null;
              const isCorrect = oIdx === item.correctIndex;
              const isChosen = oIdx === picked;
              return (
                <button
                  key={opt}
                  type="button"
                  disabled={revealed}
                  onClick={() => handleTap(oIdx)}
                  className={`py-4 px-4 rounded-xl border font-mono text-base font-bold transition-all ${
                    revealed && isCorrect
                      ? 'border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300'
                      : revealed && isChosen && !isCorrect
                        ? 'border-rose-500 bg-rose-500/15 text-rose-600 dark:text-rose-300'
                        : 'border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-[#09090B] hover:border-indigo-500 text-slate-900 dark:text-white'
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>

          {picked !== null && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-white/[0.06]">
              <p className="text-xs text-slate-600 dark:text-zinc-300 flex-1">{item.explanation}</p>
              <button
                type="button"
                onClick={handleNext}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shrink-0"
              >
                {idx + 1 >= FORMULA_BLITZ_QUESTIONS.length ? 'Finish Blitz' : 'Next Formula'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="p-6 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-center space-y-3">
          <Zap className="w-8 h-8 text-amber-500 mx-auto" />
          <h3 className="font-display text-xl font-bold text-slate-900 dark:text-white">
            Formula Blitz Complete!
          </h3>
          <p className="font-mono text-sm text-slate-600 dark:text-zinc-300 tabular-nums">
            Score: {correct}/{FORMULA_BLITZ_QUESTIONS.length} · Avg Reaction: {meanMs} ms · Max Combo: {maxCombo}x
          </p>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// GAME 3: NCERT LINE-TRAP (TAP THE SINGLE ALTERED WORD IN 20s)
// ============================================================================
export function NcertLineTrapGame() {
  const { recordArenaGameResult } = usePrepskm2();
  const [idx, setIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [tappedIdx, setTappedIdx] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const q = NCERT_LINE_TRAP_QUESTIONS[idx];

  useEffect(() => {
    if (tappedIdx !== null || finished) return;
    const id = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setTappedIdx(-1);
          playWarning();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [tappedIdx, finished]);

  const handleTapWord = (wIdx: number) => {
    if (tappedIdx !== null) return;
    setTappedIdx(wIdx);
    if (wIdx === q.wrongTokenIndex) {
      playSuccess();
      setScore((s) => s + 1);
    } else {
      playWarning();
    }
  };

  const handleNext = () => {
    playClick();
    if (idx + 1 >= NCERT_LINE_TRAP_QUESTIONS.length) {
      setFinished(true);
      recordArenaGameResult({
        gameName: 'NCERT Line-Trap (Bio & Chem)',
        subject: 'mathsBio',
        score: score * 150,
        accuracyRatio: score / NCERT_LINE_TRAP_QUESTIONS.length,
        maxCombo: score,
        xpEarned: 75 + score * 20,
        difficultyRating: 1120,
      });
    } else {
      setIdx((i) => i + 1);
      setTappedIdx(null);
      setTimeLeft(20);
    }
  };

  return (
    <div className="rounded-2xl bg-white dark:bg-[#111114] border border-slate-200 dark:border-white/[0.08] p-5 sm:p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
            NCERT Line-Trap · {q.sourceRef}
          </p>
          <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
            Tap the Exact Wrong Word ({q.subject})
          </h2>
        </div>
        <div className="flex items-center gap-3 font-mono text-xs tabular-nums">
          <span className={timeLeft <= 6 ? 'text-rose-500 font-bold' : 'text-indigo-500 font-bold'}>
            {timeLeft}s left
          </span>
          <span className="text-slate-500 dark:text-zinc-400">
            Line {idx + 1}/{NCERT_LINE_TRAP_QUESTIONS.length}
          </span>
        </div>
      </div>

      {!finished ? (
        <div className="space-y-4">
          <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-white/[0.08] flex flex-wrap gap-2 leading-loose">
            {q.tokens.map((tok, wIdx) => {
              const revealed = tappedIdx !== null;
              const isTrap = wIdx === q.wrongTokenIndex;
              const isChosen = wIdx === tappedIdx;
              return (
                <button
                  key={`${tok}-${wIdx}`}
                  type="button"
                  disabled={revealed}
                  onClick={() => handleTapWord(wIdx)}
                  className={`px-2.5 py-1 rounded-lg text-base sm:text-lg font-medium transition-all ${
                    revealed && isTrap
                      ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-600 dark:text-emerald-300 line-through'
                      : revealed && isChosen && !isTrap
                        ? 'bg-rose-500/20 border border-rose-500 text-rose-600 dark:text-rose-300'
                        : 'bg-white dark:bg-[#111114] border border-slate-200 dark:border-white/[0.1] hover:border-indigo-500 text-slate-900 dark:text-zinc-100'
                  }`}
                >
                  {tok}
                </button>
              );
            })}
          </div>

          {tappedIdx !== null && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-white/[0.08] space-y-2">
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {tappedIdx === q.wrongTokenIndex
                  ? `Trap Caught! "${q.tokens[q.wrongTokenIndex]}" → "${q.correctReplacement}"`
                  : `Missed Trap: The altered word was "${q.tokens[q.wrongTokenIndex]}" (should be "${q.correctReplacement}").`}
              </p>
              <p className="text-xs text-slate-600 dark:text-zinc-400">{q.explanation}</p>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                >
                  {idx + 1 >= NCERT_LINE_TRAP_QUESTIONS.length ? 'See Line-Trap Score' : 'Next NCERT Line'}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-6 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-3">
          <h3 className="font-display text-xl font-bold text-slate-900 dark:text-white">
            NCERT Line-Trap Cleared: {score}/{NCERT_LINE_TRAP_QUESTIONS.length}
          </h3>
          <button
            type="button"
            onClick={() => {
              setIdx(0);
              setTappedIdx(null);
              setTimeLeft(20);
              setScore(0);
              setFinished(false);
            }}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// GAME 4: MISTAKE BOSS FIGHT (BOSS HP = 100%, PERSONALIZED MISTAKE NOTEBOOK)
// ============================================================================
export function MistakeBossFightGame() {
  const { recordArenaGameResult, openCopilotWithPrompt } = usePrepskm2();
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
          `Re-verify core concept in ${m.chapterName} and avoid repeating this ${
            m.status === 'wrong' ? 'incorrect attempt' : 'skipped trap'
          }.`,
        fromNotebook: true,
      }));
    }
    return FORMULA_BLITZ_QUESTIONS.slice(0, 6).map((f) => ({
      id: f.id,
      subject: f.subject,
      chapter: f.chapter,
      prompt: `${f.title}: Fill the blank in ${f.equationWithBlank}`,
      options: f.options,
      correctIndex: f.correctIndex,
      explanation: f.explanation,
      fromNotebook: false,
    }));
  }, [attempts, questions]);

  const [bossHp, setBossHp] = useState(100);
  const [idx, setIdx] = useState(0);
  const [streak, setStreak] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [battleLog, setBattleLog] = useState('Boss spawned! Clear your mistakes to defeat the Exam Trap Boss.');
  const [victory, setVictory] = useState(false);

  const current = bossDeck[idx % bossDeck.length];

  const handleStrike = (optIdx: number) => {
    if (picked !== null || victory) return;
    setPicked(optIdx);
    if (optIdx === current.correctIndex) {
      const nextStreak = streak + 1;
      const dmg = 20 + Math.min(15, (nextStreak - 1) * 5);
      const nextHp = Math.max(0, bossHp - dmg);
      setStreak(nextStreak);
      setBossHp(nextHp);
      setBattleLog(`Critical Hit! -${dmg}% Boss HP (${nextStreak}x streak bonus).`);
      playSuccess();
      if (current.fromNotebook) {
        toggleMistakeResolved(current.id);
      }
      if (nextHp === 0) {
        setVictory(true);
        recordArenaGameResult({
          gameName: 'Mistake Boss Fight',
          subject: 'speedArena',
          score: 500 + nextStreak * 50,
          accuracyRatio: 0.9,
          maxCombo: nextStreak,
          xpEarned: 180,
          difficultyRating: 1180,
        });
      }
    } else {
      const healedHp = Math.min(100, bossHp + 10);
      setStreak(0);
      setBossHp(healedHp);
      setBattleLog(`Boss countered & healed +10% HP! Micro-fix: ${current.explanation}`);
      playWarning();
    }
  };

  return (
    <div className="rounded-2xl bg-white dark:bg-[#111114] border border-slate-200 dark:border-white/[0.08] p-5 sm:p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-rose-500">
            Mistake Boss Fight · {current.fromNotebook ? 'Synced with Your Mistake Notebook' : 'High-Yield Training Boss'}
          </p>
          <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Swords className="w-5 h-5 text-rose-500" />
            Negative-Marking Overlord
          </h2>
        </div>

        <div className="w-full sm:w-64 space-y-1">
          <div className="flex items-center justify-between text-xs font-mono tabular-nums">
            <span className="inline-flex items-center gap-1 text-rose-500 font-bold">
              <Heart className="w-3.5 h-3.5 fill-rose-500" />
              Boss HP
            </span>
            <span className="font-bold text-slate-900 dark:text-white">{bossHp}%</span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-white/[0.08] overflow-hidden">
            <div
              className="h-full bg-rose-500 transition-all duration-300"
              style={{ width: `${bossHp}%` }}
            />
          </div>
        </div>
      </div>

      <p className="text-xs font-mono px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-zinc-300">
        {battleLog}
      </p>

      {!victory ? (
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              {current.subject} · {current.chapter}
            </p>
            <h3 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white">
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
                  className={`text-left px-4 py-3 rounded-xl border text-sm font-semibold transition-all ${
                    revealed && isCorrect
                      ? 'border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300'
                      : revealed && isChosen && !isCorrect
                        ? 'border-rose-500 bg-rose-500/15 text-rose-600 dark:text-rose-300'
                        : 'border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-[#09090B] hover:border-indigo-500 text-slate-900 dark:text-zinc-100'
                  }`}
                >
                  {['A', 'B', 'C', 'D'][oIdx]}. {opt}
                </button>
              );
            })}
          </div>

          {picked !== null && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-white/[0.06]">
              <button
                type="button"
                onClick={() =>
                  openCopilotWithPrompt(
                    `Explain this ${current.subject} (${current.chapter}) mistake clearly and give me a shortcut: ${current.prompt}`
                  )
                }
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Ask AI Copilot Micro-Explanation
              </button>
              <button
                type="button"
                onClick={() => {
                  setIdx((i) => i + 1);
                  setPicked(null);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                Next Boss Attack
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="p-6 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-3">
          <CheckCircle2 className="w-9 h-9 text-emerald-500 mx-auto" />
          <h3 className="font-display text-xl font-bold text-slate-900 dark:text-white">
            Boss Defeated! +180 XP &amp; Speed Arena Elo Boosted
          </h3>
          <button
            type="button"
            onClick={() => {
              setBossHp(100);
              setIdx(0);
              setStreak(0);
              setPicked(null);
              setVictory(false);
              setBattleLog('Fresh Boss spawned! Strike with accuracy.');
            }}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
          >
            Rematch Boss
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// GAME 5: 15-MINUTE PAPER SCANNER TRAINER (30 MIXED QUESTIONS · RAPID TAGGING)
// ============================================================================
export function PaperScannerTrainerGame() {
  const { recordArenaGameResult } = usePrepskm2();
  const [durationSec, setDurationSec] = useState<180 | 900>(180);
  const [timeLeft, setTimeLeft] = useState(180);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [qIdx, setQIdx] = useState(0);
  const [tags, setTags] = useState<Record<string, 'solve-now' | 'round-2' | 'skip-trap'>>({});

  useEffect(() => {
    if (!started || finished) return;
    const id = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setFinished(true);
          setStarted(false);
          playWarning();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [started, finished]);

  const currentQ = PAPER_SCANNER_QUESTIONS[qIdx];

  const handleTag = (tag: 'solve-now' | 'round-2' | 'skip-trap') => {
    if (!started) setStarted(true);
    playClick();
    const nextTags = { ...tags, [currentQ.id]: tag };
    setTags(nextTags);
    if (qIdx + 1 >= PAPER_SCANNER_QUESTIONS.length) {
      finishScanner(nextTags);
    } else {
      setQIdx((i) => i + 1);
    }
  };

  const finishScanner = (finalTags = tags) => {
    setFinished(true);
    setStarted(false);
    const taggedCount = Object.keys(finalTags).length;
    const matches = PAPER_SCANNER_QUESTIONS.filter((q) => finalTags[q.id] === q.optimalTag).length;
    const acc = taggedCount > 0 ? matches / PAPER_SCANNER_QUESTIONS.length : 0;
    recordArenaGameResult({
      gameName: 'Paper Scanner Strategy Trainer',
      subject: 'speedArena',
      score: matches * 25,
      accuracyRatio: acc,
      maxCombo: matches,
      xpEarned: 100 + matches * 4,
      difficultyRating: 1150,
    });
  };

  const reset = (sec: 180 | 900 = durationSec) => {
    setDurationSec(sec);
    setTimeLeft(sec);
    setStarted(false);
    setFinished(false);
    setQIdx(0);
    setTags({});
  };

  const exactMatches = PAPER_SCANNER_QUESTIONS.filter((q) => tags[q.id] === q.optimalTag).length;
  const trapsAvoided = PAPER_SCANNER_QUESTIONS.filter(
    (q) => q.optimalTag === 'skip-trap' && tags[q.id] === 'skip-trap'
  ).length;
  const totalTraps = PAPER_SCANNER_QUESTIONS.filter((q) => q.optimalTag === 'skip-trap').length;

  return (
    <div className="rounded-2xl bg-white dark:bg-[#111114] border border-slate-200 dark:border-white/[0.08] p-5 sm:p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            Exam Strategy Game · Do NOT Solve — Rapidly Classify
          </p>
          <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
            15-Minute Paper Scanner Trainer (30 Mixed Qs)
          </h2>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs tabular-nums">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-[#09090B] border border-slate-200 dark:border-white/[0.08]">
            <button
              type="button"
              onClick={() => reset(180)}
              className={`px-2.5 py-1 rounded-md font-semibold ${
                durationSec === 180 ? 'bg-indigo-600 text-white' : 'text-slate-500 dark:text-zinc-400'
              }`}
            >
              3m Sprint
            </button>
            <button
              type="button"
              onClick={() => reset(900)}
              className={`px-2.5 py-1 rounded-md font-semibold ${
                durationSec === 900 ? 'bg-indigo-600 text-white' : 'text-slate-500 dark:text-zinc-400'
              }`}
            >
              15m Full
            </button>
          </div>
          <span className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-[#09090B] font-bold text-indigo-600 dark:text-indigo-400">
            {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
          </span>
        </div>
      </div>

      {!finished ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 font-mono tabular-nums">
            <span>
              Scanning Question {qIdx + 1} of {PAPER_SCANNER_QUESTIONS.length}
            </span>
            <button
              type="button"
              onClick={() => finishScanner()}
              className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
            >
              Finish &amp; Grade Now
            </button>
          </div>

          <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-white/[0.08] space-y-2">
            <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
              Q{currentQ.qNo} · {currentQ.subject} · {currentQ.chapter}
            </p>
            <p className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white leading-relaxed">
              {currentQ.snippet}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => handleTag('solve-now')}
              className="py-3.5 px-4 rounded-xl bg-emerald-500/15 border border-emerald-500/40 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 font-semibold text-sm transition-colors"
            >
              Solve Now (Green)
              <span className="block text-[11px] font-normal opacity-80 mt-0.5">
                &lt;90s guaranteed +4
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleTag('round-2')}
              className="py-3.5 px-4 rounded-xl bg-amber-500/15 border border-amber-500/40 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 font-semibold text-sm transition-colors"
            >
              Round 2 (Yellow)
              <span className="block text-[11px] font-normal opacity-80 mt-0.5">
                2–3 min calculation
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleTag('skip-trap')}
              className="py-3.5 px-4 rounded-xl bg-rose-500/15 border border-rose-500/40 hover:bg-rose-500/25 text-rose-700 dark:text-rose-300 font-semibold text-sm transition-colors"
            >
              Skip Trap (Red)
              <span className="block text-[11px] font-normal opacity-80 mt-0.5">
                4+ min ego trap
              </span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-5 rounded-xl bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-emerald-500" />
                Scanner Benchmark Report
              </h3>
              <p className="text-xs font-mono text-slate-600 dark:text-zinc-400 mt-1 tabular-nums">
                Optimal Matches: <strong>{exactMatches}/{PAPER_SCANNER_QUESTIONS.length}</strong> · Time-Sink Traps Dodged:{' '}
                <strong className="text-emerald-500">
                  {trapsAvoided}/{totalTraps}
                </strong>
              </p>
            </div>
            <button
              type="button"
              onClick={() => reset(durationSec)}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
            >
              Scan Again
            </button>
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-white/[0.06] border border-slate-200 dark:border-white/[0.08] rounded-xl">
            {PAPER_SCANNER_QUESTIONS.map((q) => {
              const userTag = tags[q.id];
              const hit = userTag === q.optimalTag;
              return (
                <div
                  key={q.id}
                  className="px-4 py-2.5 text-xs flex flex-wrap items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900 dark:text-white">
                      Q{q.qNo} · {q.chapter} ({q.estimatedMinutes}m est.)
                    </p>
                    <p className="text-slate-500 dark:text-zinc-400">{q.strategyNote}</p>
                  </div>
                  <div className="font-mono text-[11px] shrink-0">
                    <span className={hit ? 'text-emerald-500 font-bold' : 'text-amber-500 font-bold'}>
                      You: {userTag ?? 'untagged'} / Optimal: {q.optimalTag}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
