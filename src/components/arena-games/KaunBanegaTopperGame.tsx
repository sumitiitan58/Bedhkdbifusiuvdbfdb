import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  BarChart3,
  Bot,
  Crown,
  LogOut,
  RefreshCw,
  RotateCcw,
  Shield,
  Split,
  Timer,
  Trophy,
} from 'lucide-react';
import {
  KBT_LADDER_XP,
  KBT_QUESTION_BANK,
  applyFiftyFifty,
  generatePeerPoll,
  getKbtSafeHavenXp,
  getKbtTierForStep,
  getKbtTimeLimitSeconds,
  type KbtQuestion,
} from '../../utils/apexArenaGamesEngine';
import { usePrepskm2 } from '../../context/Prepskm2Context';

interface KaunBanegaTopperGameProps {
  onBack: () => void;
}

function buildRunQuestions(): KbtQuestion[] {
  const t1 = KBT_QUESTION_BANK.filter((q) => q.tier === 1).slice(0, 5);
  const t2 = KBT_QUESTION_BANK.filter((q) => q.tier === 2).slice(0, 5);
  const t3 = KBT_QUESTION_BANK.filter((q) => q.tier === 3).slice(0, 5);
  return [...t1, ...t2, ...t3];
}

export function KaunBanegaTopperGame({ onBack }: KaunBanegaTopperGameProps) {
  const { recordArenaGameResult, triggerPrepsBotVictory } = usePrepskm2();

  const [questions, setQuestions] = useState<KbtQuestion[]>(() => buildRunQuestions());
  const [stepIndex, setStepIndex] = useState(0); // 0..14
  const [timeLeft, setTimeLeft] = useState<number | null>(() => getKbtTimeLimitSeconds(0));

  const [usedFifty, setUsedFifty] = useState(false);
  const [usedBuddy, setUsedBuddy] = useState(false);
  const [usedPoll, setUsedPoll] = useState(false);
  const [usedFlip, setUsedFlip] = useState(false);

  const [eliminatedOptions, setEliminatedOptions] = useState<number[]>([]);
  const [peerPoll, setPeerPoll] = useState<[number, number, number, number] | null>(null);
  const [buddyHintVisible, setBuddyHintVisible] = useState<string | null>(null);

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [feedbackState, setFeedbackState] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [runStatus, setRunStatus] = useState<'playing' | 'won' | 'walked' | 'eliminated'>('playing');
  const [finalXp, setFinalXp] = useState(0);
  const [rewarded, setRewarded] = useState(false);

  const currentQuestion = questions[stepIndex];
  const currentTier = getKbtTierForStep(stepIndex);

  const resetRun = useCallback(() => {
    setQuestions(buildRunQuestions());
    setStepIndex(0);
    setTimeLeft(getKbtTimeLimitSeconds(0));
    setUsedFifty(false);
    setUsedBuddy(false);
    setUsedPoll(false);
    setUsedFlip(false);
    setEliminatedOptions([]);
    setPeerPoll(null);
    setBuddyHintVisible(null);
    setSelectedIndex(null);
    setFeedbackState('idle');
    setRunStatus('playing');
    setFinalXp(0);
    setRewarded(false);
  }, []);

  // Countdown timer for Q1-Q10
  useEffect(() => {
    if (runStatus !== 'playing' || feedbackState !== 'idle') return;
    const limit = getKbtTimeLimitSeconds(stepIndex);
    setTimeLeft(limit);
    if (limit === null) return;

    const id = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          window.clearInterval(id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [stepIndex, runStatus, feedbackState]);

  // Timeout triggers safe-haven exit
  useEffect(() => {
    if (runStatus === 'playing' && feedbackState === 'idle' && timeLeft === 0) {
      const safe = getKbtSafeHavenXp(stepIndex);
      setFinalXp(safe);
      setRunStatus('eliminated');
    }
  }, [timeLeft, runStatus, feedbackState, stepIndex]);

  // Award XP once at end of run
  useEffect(() => {
    if (runStatus === 'playing' || rewarded) return;
    setRewarded(true);
    const awardedXp = Math.max(25, Math.min(2500, Math.round(finalXp / 20) || 25));
    recordArenaGameResult({
      gameName: 'Kaun Banega Topper',
      subject: 'speedArena',
      score: finalXp,
      accuracyRatio: runStatus === 'won' ? 1 : Math.min(0.9, stepIndex / 15),
      maxCombo: stepIndex + (runStatus === 'won' ? 1 : 0),
      xpEarned: awardedXp,
      difficultyRating: 1200,
    });
    if (runStatus === 'won' || finalXp >= 1000) {
      triggerPrepsBotVictory({
        title: runStatus === 'won' ? 'TOPPER CROWN WON!' : `Banked ${finalXp.toLocaleString('en-IN')} Ladder XP!`,
        subtitle:
          runStatus === 'won'
            ? 'All 15 Hot-Seat steps conquered — 50,000 XP Grand Prize!'
            : 'Safe Haven milestone cleared in Kaun Banega Topper!',
        badge: runStatus === 'won' ? 'TOPPER CROWN' : 'HOT-SEAT HERO',
      });
    }
  }, [runStatus, rewarded, finalXp, stepIndex, recordArenaGameResult, triggerPrepsBotVictory]);

  const handleLockAnswer = (idx: number) => {
    if (runStatus !== 'playing' || feedbackState !== 'idle' || eliminatedOptions.includes(idx)) return;
    setSelectedIndex(idx);

    if (idx === currentQuestion.correctIndex) {
      setFeedbackState('correct');
      window.setTimeout(() => {
        if (stepIndex === 14) {
          setFinalXp(KBT_LADDER_XP[14]);
          setRunStatus('won');
        } else {
          setStepIndex((s) => s + 1);
          setSelectedIndex(null);
          setFeedbackState('idle');
          setEliminatedOptions([]);
          setPeerPoll(null);
          setBuddyHintVisible(null);
        }
      }, 950);
    } else {
      setFeedbackState('wrong');
      window.setTimeout(() => {
        const safe = getKbtSafeHavenXp(stepIndex);
        setFinalXp(safe);
        setRunStatus('eliminated');
      }, 1200);
    }
  };

  const handleFiftyFifty = () => {
    if (usedFifty || feedbackState !== 'idle') return;
    setUsedFifty(true);
    setEliminatedOptions(applyFiftyFifty(currentQuestion.correctIndex));
  };

  const handleAskBuddy = () => {
    if (usedBuddy || feedbackState !== 'idle') return;
    setUsedBuddy(true);
    setBuddyHintVisible(currentQuestion.buddyHint);
    // Wake the corner Hello Buddy mascot directly to speak the conceptual hint aloud!
    window.dispatchEvent(
      new CustomEvent('buddy:ask-hint', {
        detail: { hint: currentQuestion.buddyHint },
      })
    );
  };

  const handlePeerPoll = () => {
    if (usedPoll || feedbackState !== 'idle') return;
    setUsedPoll(true);
    setPeerPoll(generatePeerPoll(currentQuestion.correctIndex, currentTier));
  };

  const handleFlipQuestion = () => {
    if (usedFlip || feedbackState !== 'idle') return;
    const backup = KBT_QUESTION_BANK.find(
      (q) => q.tier === currentTier && !questions.some((used) => used.id === q.id)
    );
    if (!backup) return;
    setUsedFlip(true);
    setQuestions((prev) => prev.map((q, i) => (i === stepIndex ? backup : q)));
    setEliminatedOptions([]);
    setPeerPoll(null);
    setBuddyHintVisible(null);
    setTimeLeft(getKbtTimeLimitSeconds(stepIndex));
  };

  const handleWalkAway = () => {
    if (stepIndex < 5 || runStatus !== 'playing') return;
    const banked = KBT_LADDER_XP[stepIndex - 1];
    setFinalXp(banked);
    setRunStatus('walked');
  };

  const tierLabel = useMemo(() => {
    if (currentTier === 1) return 'Tier 1 · NCERT Foundation (30s)';
    if (currentTier === 2) return 'Tier 2 · JEE Main / NEET Standard (45s)';
    return 'Tier 3 · Advanced Multi-Concept (Untimed)';
  }, [currentTier]);

  return (
    <div
      data-testid="kbt-stage"
      className="relative rounded-3xl border border-amber-400/25 bg-gradient-to-b from-[#070b18] via-[#0e1530] to-[#131b36] p-5 sm:p-6 shadow-2xl"
    >
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Arena Lobby
          </button>
          <div>
            <h2 className="text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-400" />
              Kaun Banega Topper
            </h2>
            <p className="text-xs text-slate-400">
              Question {stepIndex + 1} of 15 · {tierLabel}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {stepIndex >= 5 && runStatus === 'playing' && (
            <button
              type="button"
              onClick={handleWalkAway}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-400/15 hover:bg-emerald-400/25 border border-emerald-400/40 text-emerald-300 text-xs font-bold cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Walk Away ({KBT_LADDER_XP[stepIndex - 1].toLocaleString('en-IN')} XP)
            </button>
          )}
          <button
            type="button"
            onClick={resetRun}
            aria-label="Restart Kaun Banega Topper"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Hot-Seat Stage + Ladder */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-5">
        {/* Left/Center Spotlight Hot-Seat */}
        <div className="lg:col-span-8 flex flex-col justify-between gap-4">
          {runStatus === 'playing' && currentQuestion ? (
            <>
              {/* Lifelines Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <button
                  type="button"
                  disabled={usedFifty || feedbackState !== 'idle'}
                  onClick={handleFiftyFifty}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-cyan-400/30 bg-cyan-400/10 hover:bg-cyan-400/20 text-xs font-bold text-cyan-200 disabled:opacity-35 cursor-pointer"
                >
                  <Split className="w-3.5 h-3.5" /> 50:50
                </button>
                <button
                  type="button"
                  data-testid="kbt-ask-buddy-btn"
                  disabled={usedBuddy || feedbackState !== 'idle'}
                  onClick={handleAskBuddy}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-amber-400/40 bg-amber-400/15 hover:bg-amber-400/25 text-xs font-bold text-amber-200 disabled:opacity-35 cursor-pointer"
                >
                  <Bot className="w-3.5 h-3.5" /> Ask Buddy
                </button>
                <button
                  type="button"
                  disabled={usedPoll || feedbackState !== 'idle'}
                  onClick={handlePeerPoll}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-purple-400/35 bg-purple-400/10 hover:bg-purple-400/20 text-xs font-bold text-purple-200 disabled:opacity-35 cursor-pointer"
                >
                  <BarChart3 className="w-3.5 h-3.5" /> Peer Poll
                </button>
                <button
                  type="button"
                  disabled={usedFlip || feedbackState !== 'idle'}
                  onClick={handleFlipQuestion}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-emerald-400/35 bg-emerald-400/10 hover:bg-emerald-400/20 text-xs font-bold text-emerald-200 disabled:opacity-35 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Flip Question
                </button>
              </div>

              {/* Spotlight Question Card */}
              <div className="relative rounded-3xl border border-amber-400/30 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.14),rgba(15,23,42,0.92)_70%)] p-6">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <span className="px-3 py-1 rounded-xl bg-amber-400/15 border border-amber-400/35 text-amber-300 text-xs font-black">
                    Q{stepIndex + 1} · {KBT_LADDER_XP[stepIndex].toLocaleString('en-IN')} XP
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900/90 border border-white/15 text-xs font-bold text-cyan-300">
                    <Timer className="w-3.5 h-3.5" />
                    {timeLeft === null ? 'Untimed Grand Tier' : `${timeLeft}s`}
                  </span>
                </div>

                <h3 className="text-lg sm:text-xl font-extrabold text-white leading-snug">
                  {currentQuestion.question}
                </h3>

                {/* Ask Buddy Conceptual Voice Hint Banner */}
                <AnimatePresence>
                  {buddyHintVisible && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 rounded-2xl border border-cyan-400/40 bg-cyan-400/10 px-4 py-3"
                    >
                      <p className="text-[11px] font-black uppercase tracking-widest text-cyan-300 flex items-center gap-1.5">
                        <Bot className="w-3.5 h-3.5" /> Buddy&apos;s Conceptual Hint (Speaking Aloud)
                      </p>
                      <p className="font-handwritten text-base text-cyan-50 mt-1">{buddyHintVisible}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Peer Poll Bar Chart */}
                <AnimatePresence>
                  {peerPoll && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 rounded-2xl border border-purple-400/30 bg-slate-950/70 p-3.5"
                    >
                      <p className="text-[11px] font-bold uppercase tracking-widest text-purple-300 mb-2">
                        Live Topper Peer Poll
                      </p>
                      <div className="grid grid-cols-4 gap-3 items-end h-20">
                        {peerPoll.map((pct, i) => (
                          <div key={i} className="flex flex-col items-center gap-1 h-full justify-end">
                            <span className="text-[11px] font-bold text-slate-200">{pct}%</span>
                            <div
                              className="w-full max-w-[34px] rounded-t-md bg-gradient-to-t from-purple-500 to-cyan-400 transition-all"
                              style={{ height: `${Math.max(12, pct)}%` }}
                            />
                            <span className="text-[11px] font-black text-slate-400">
                              {String.fromCharCode(65 + i)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Options Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
                  {currentQuestion.options.map((opt, idx) => {
                    const isEliminated = eliminatedOptions.includes(idx);
                    const isSelected = selectedIndex === idx;
                    const isCorrect = idx === currentQuestion.correctIndex;
                    let tone = 'border-white/15 bg-slate-900/80 hover:border-amber-400/70 hover:bg-amber-400/10 text-slate-100';
                    if (feedbackState !== 'idle') {
                      if (isCorrect) {
                        tone = 'border-emerald-400 bg-emerald-500/25 text-emerald-100 shadow-[0_0_20px_rgba(52,211,153,0.35)]';
                      } else if (isSelected) {
                        tone = 'border-rose-400 bg-rose-500/25 text-rose-100';
                      }
                    }

                    return (
                      <button
                        key={opt}
                        type="button"
                        disabled={isEliminated || feedbackState !== 'idle'}
                        onClick={() => handleLockAnswer(idx)}
                        className={`text-left px-4 py-3.5 rounded-2xl border text-sm font-bold transition-all cursor-pointer disabled:cursor-not-allowed ${
                          isEliminated ? 'opacity-20 line-through border-white/5 bg-slate-950/40' : tone
                        }`}
                      >
                        <span className="inline-block w-6 text-amber-400 font-black">
                          {String.fromCharCode(65 + idx)}.
                        </span>
                        {opt}
                      </button>
                    );
                  })}
                </div>

                {feedbackState !== 'idle' && (
                  <p className="font-handwritten text-base text-slate-200 mt-4 bg-slate-950/60 rounded-xl px-3.5 py-2 border border-white/10">
                    {currentQuestion.explanation}
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="rounded-3xl border border-amber-400/35 bg-gradient-to-br from-amber-950/40 via-slate-900/90 to-cyan-950/40 p-7 text-center my-auto">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-400/15 border border-amber-400/40 text-amber-300 mb-3">
                {runStatus === 'won' ? <Crown className="w-8 h-8" /> : <Trophy className="w-8 h-8" />}
              </div>
              <h3 className="text-2xl font-black text-white">
                {runStatus === 'won'
                  ? 'Grand Topper Crown Achieved!'
                  : runStatus === 'walked'
                    ? 'Smart Walk-Away — XP Safely Banked!'
                    : 'Hot-Seat Run Ended'}
              </h3>
              <p className="text-base font-extrabold text-amber-300 mt-2">
                {finalXp.toLocaleString('en-IN')} Ladder XP Secured
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {runStatus === 'eliminated'
                  ? 'Safe Haven protection locked your last guaranteed checkpoint (Q5 or Q10).'
                  : 'Your Arena rank & Season XP have been updated.'}
              </p>
              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={resetRun}
                  className="px-5 py-2.5 rounded-xl bg-amber-400 text-slate-950 font-extrabold text-sm cursor-pointer"
                >
                  Enter Hot-Seat Again
                </button>
                <button
                  type="button"
                  onClick={onBack}
                  className="px-5 py-2.5 rounded-xl bg-white/10 text-white font-semibold text-sm cursor-pointer"
                >
                  Back to Arena Lobby
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right 15-Step Ladder */}
        <div className="lg:col-span-4 rounded-2xl border border-white/10 bg-slate-950/75 p-4">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-black uppercase tracking-widest text-amber-300">15-Step Prize Ladder</span>
            <span className="text-[11px] text-slate-400 inline-flex items-center gap-1">
              <Shield className="w-3 h-3 text-emerald-400" /> Safe: Q5 &amp; Q10
            </span>
          </div>
          <div className="space-y-1">
            {[...KBT_LADDER_XP].reverse().map((xp, revIdx) => {
              const qIdx = 14 - revIdx;
              const isCurrent = qIdx === stepIndex && runStatus === 'playing';
              const isCleared = qIdx < stepIndex || runStatus === 'won';
              const isSafe = qIdx === 4 || qIdx === 9 || qIdx === 14;
              return (
                <div
                  key={qIdx}
                  className={`flex items-center justify-between px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                    isCurrent
                      ? 'bg-amber-400 text-slate-950 shadow-[0_0_16px_rgba(251,191,36,0.5)]'
                      : isCleared
                        ? 'bg-emerald-400/15 text-emerald-300'
                        : isSafe
                          ? 'bg-white/5 text-amber-200 border border-amber-400/20'
                          : 'text-slate-400'
                  }`}
                >
                  <span>
                    Q{qIdx + 1} {qIdx === 14 ? '👑' : isSafe ? '★' : ''}
                  </span>
                  <span>{xp.toLocaleString('en-IN')} XP</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
