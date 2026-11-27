import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Bot,
  Crown,
  Flame,
  GraduationCap,
  Play,
  RotateCcw,
  Shield,
  Swords,
  Timer,
  TrendingDown,
  TrendingUp,
  Trophy,
  User,
  Zap,
} from 'lucide-react';
import {
  APEX_RIVALS,
  DUEL_ROUND_LIMIT_MS,
  STARTING_DUEL_POINTS,
  calculatePointTrade,
  getApexRankTier,
  getDuelQuestionsForTrack,
  simulateAiOpponentTurn,
  type ApexDuelQuestion,
  type ApexRivalId,
  type ApexTrackId,
  type PointTradeResult,
} from '../../utils/apexArenaEngine';
import { KatexFormula } from '../math/KatexFormula';
import { usePrepskm2 } from '../../context/Prepskm2Context';
import { triggerComboConfetti } from './ArcadeStageShell';
import {
  playArcadeWrong,
  playClick,
  playComboChime,
  playSuccess,
} from '../../utils/soundEffects';

const TRACK_OPTIONS: Array<{ id: ApexTrackId; label: string; subtitle: string }> = [
  { id: 'quantum-clash', label: 'Quantum Clash', subtitle: 'Physics Speed Duel' },
  { id: 'synthesis-strike', label: 'Synthesis Strike', subtitle: 'Chemistry Reaction Duel' },
  { id: 'logic-labyrinth', label: 'Logic Labyrinth', subtitle: 'Maths & Bio Tactical Duel' },
];

interface RoundLogEntry {
  question: ApexDuelQuestion;
  playerCorrect: boolean;
  aiCorrect: boolean;
  playerTimeMs: number;
  aiTimeMs: number;
  deltaPlayer: number;
  headline: string;
}

export function ApexDuelBattle() {
  const { recordArenaGameResult, openLiveTeacher, progression } = usePrepskm2();

  const [trackId, setTrackId] = useState<ApexTrackId>('quantum-clash');
  const [rivalId, setRivalId] = useState<ApexRivalId>('helix');
  const [phase, setPhase] = useState<'lobby' | 'playing' | 'summary'>('lobby');

  const [roundIdx, setRoundIdx] = useState(0);
  const [playerPoints, setPlayerPoints] = useState(STARTING_DUEL_POINTS);
  const [aiPoints, setAiPoints] = useState(STARTING_DUEL_POINTS);
  const [playerStreak, setPlayerStreak] = useState(0);
  const [remainingMs, setRemainingMs] = useState(DUEL_ROUND_LIMIT_MS);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [roundOutcome, setRoundOutcome] = useState<PointTradeResult | null>(null);
  const [rankFlash, setRankFlash] = useState<string | null>(null);
  const [roundLog, setRoundLog] = useState<RoundLogEntry[]>([]);
  const [earnedXp, setEarnedXp] = useState(0);

  const roundStartRef = useRef<number>(0);
  const nextTimerRef = useRef<number | null>(null);

  const rival = useMemo(
    () => APEX_RIVALS.find((r) => r.id === rivalId) ?? APEX_RIVALS[1],
    [rivalId]
  );

  const duelQuestions = useMemo(() => getDuelQuestionsForTrack(trackId, 8), [trackId]);
  const currentQ = duelQuestions[roundIdx] ?? duelQuestions[0];

  const playerTier = useMemo(() => getApexRankTier(playerPoints), [playerPoints]);
  const aiTier = useMemo(() => getApexRankTier(aiPoints), [aiPoints]);

  const totalPool = Math.max(1, playerPoints + aiPoints);
  const playerSharePct = Math.round((playerPoints / totalPool) * 100);

  const clearNextTimer = useCallback(() => {
    if (nextTimerRef.current !== null) {
      window.clearTimeout(nextTimerRef.current);
      nextTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearNextTimer(), [clearNextTimer]);

  const startDuel = () => {
    clearNextTimer();
    playClick();
    setPhase('playing');
    setRoundIdx(0);
    setPlayerPoints(STARTING_DUEL_POINTS);
    setAiPoints(STARTING_DUEL_POINTS);
    setPlayerStreak(0);
    setRemainingMs(DUEL_ROUND_LIMIT_MS);
    setSelectedOption(null);
    setRoundOutcome(null);
    setRankFlash(null);
    setRoundLog([]);
    setEarnedXp(0);
    roundStartRef.current = performance.now();
  };

  const finishMatch = useCallback(
    (finalPlayerPts: number, finalAiPts: number, finalLog: RoundLogEntry[]) => {
      const won = finalPlayerPts >= finalAiPts;
      const correctCount = finalLog.filter((l) => l.playerCorrect).length;
      const accuracyRatio = correctCount / Math.max(1, finalLog.length);
      const subjectKey =
        trackId === 'quantum-clash'
          ? 'physics'
          : trackId === 'synthesis-strike'
            ? 'chemistry'
            : 'mathsBio';
      const xpGain = won ? 140 + correctCount * 15 : 55 + correctCount * 10;
      setEarnedXp(xpGain);
      recordArenaGameResult({
        gameName: `Apex 1v1 vs ${rival.name}`,
        subject: subjectKey,
        score: finalPlayerPts,
        accuracyRatio,
        maxCombo: Math.max(1, playerStreak),
        xpEarned: xpGain,
      });
      if (won) {
        playSuccess();
        triggerComboConfetti(5);
      }
      setPhase('summary');
    },
    [playerStreak, recordArenaGameResult, rival.name, trackId]
  );

  const resolveRound = useCallback(
    (pickedOptionIdx: number | null) => {
      if (phase !== 'playing' || roundOutcome !== null) return;
      const elapsedMs = Math.min(
        DUEL_ROUND_LIMIT_MS,
        Math.max(450, Math.round(performance.now() - roundStartRef.current))
      );
      const playerCorrect = pickedOptionIdx === currentQ.correctIndex;
      const { aiCorrect, aiTimeMs } = simulateAiOpponentTurn(rival, roundIdx);

      const prevTier = getApexRankTier(playerPoints);
      const trade = calculatePointTrade({
        playerPoints,
        aiPoints,
        playerCorrect,
        aiCorrect,
        playerTimeMs: pickedOptionIdx === null ? DUEL_ROUND_LIMIT_MS : elapsedMs,
        aiTimeMs,
        playerStreak,
        roundTimeLimitMs: DUEL_ROUND_LIMIT_MS,
      });

      const nextTier = getApexRankTier(trade.nextPlayerPoints);
      if (nextTier.rankIndex > prevTier.rankIndex) {
        setRankFlash(`RANK UP → ${nextTier.tierName}!`);
        triggerComboConfetti(4);
      } else if (nextTier.rankIndex < prevTier.rankIndex) {
        setRankFlash(`Rank Dropped → ${nextTier.tierName}`);
      } else {
        setRankFlash(null);
      }

      if (trade.deltaPlayer > 0) {
        playComboChime(Math.max(1, trade.nextPlayerStreak));
      } else if (trade.deltaPlayer < 0) {
        playArcadeWrong();
      } else {
        playClick();
      }

      setSelectedOption(pickedOptionIdx);
      setPlayerPoints(trade.nextPlayerPoints);
      setAiPoints(trade.nextAiPoints);
      setPlayerStreak(trade.nextPlayerStreak);
      setRoundOutcome(trade);

      const nextEntry: RoundLogEntry = {
        question: currentQ,
        playerCorrect,
        aiCorrect,
        playerTimeMs: pickedOptionIdx === null ? DUEL_ROUND_LIMIT_MS : elapsedMs,
        aiTimeMs,
        deltaPlayer: trade.deltaPlayer,
        headline: trade.headline,
      };
      const updatedLog = [...roundLog, nextEntry];
      setRoundLog(updatedLog);

      clearNextTimer();
      nextTimerRef.current = window.setTimeout(() => {
        if (roundIdx + 1 >= duelQuestions.length) {
          finishMatch(trade.nextPlayerPoints, trade.nextAiPoints, updatedLog);
        } else {
          setRoundIdx((i) => i + 1);
          setSelectedOption(null);
          setRoundOutcome(null);
          setRankFlash(null);
          setRemainingMs(DUEL_ROUND_LIMIT_MS);
          roundStartRef.current = performance.now();
        }
      }, 1550);
    },
    [
      aiPoints,
      clearNextTimer,
      currentQ,
      duelQuestions.length,
      finishMatch,
      phase,
      playerPoints,
      playerStreak,
      rival,
      roundIdx,
      roundLog,
      roundOutcome,
    ]
  );

  // Per-round live countdown timer
  useEffect(() => {
    if (phase !== 'playing' || roundOutcome !== null) return;
    const interval = window.setInterval(() => {
      const elapsed = performance.now() - roundStartRef.current;
      const left = Math.max(0, DUEL_ROUND_LIMIT_MS - elapsed);
      setRemainingMs(left);
      if (left <= 0) {
        window.clearInterval(interval);
        resolveRound(null);
      }
    }, 80);
    return () => window.clearInterval(interval);
  }, [phase, roundOutcome, roundIdx, resolveRound]);

  // 1-4 keyboard shortcut support during active duel
  useEffect(() => {
    if (phase !== 'playing' || roundOutcome !== null) return;
    const onKey = (e: KeyboardEvent) => {
      const idx = ['1', '2', '3', '4'].indexOf(e.key);
      if (idx >= 0) {
        e.preventDefault();
        resolveRound(idx);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, roundOutcome, resolveRound]);

  const missedLogs = roundLog.filter((entry) => !entry.playerCorrect);

  return (
    <div
      data-testid="apex-duel-battle"
      className="preps-glass-panel rounded-2xl p-5 sm:p-6 space-y-5 relative overflow-hidden"
    >
      {/* Header + Equal-Points Tug-of-War Scoreboard */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 dark:border-white/10 pb-4">
        <div>
          <p className="text-xs font-mono font-bold uppercase tracking-wider text-[#F27B13]">
            Apex Arena · 1v1 Live Point-Trading Duel
          </p>
          <h2 className="font-display text-xl sm:text-2xl font-extrabold text-[#0E234E] dark:text-white mt-0.5">
            {TRACK_OPTIONS.find((t) => t.id === trackId)?.label} vs {rival.name}
          </h2>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono tabular-nums">
          <span className="px-2.5 py-1 rounded-lg bg-[#00B4FF]/15 border border-[#00B4FF]/35 text-[#1D56C6] dark:text-[#00B4FF] font-bold">
            Arena Elo {progression.elo.speedArena}
          </span>
          {phase === 'playing' && (
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 font-bold">
              Round {roundIdx + 1}/{duelQuestions.length}
            </span>
          )}
        </div>
      </div>

      {/* LIVE TUG-OF-WAR POINT BAR (Visible in All Phases) */}
      <div className="rounded-2xl bg-slate-900/90 dark:bg-[#070B18]/85 border border-[#00B4FF]/25 p-4 space-y-3 text-white">
        <div className="grid grid-cols-2 gap-3 items-center">
          {/* Student Side */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00B4FF] to-[#1D56C6] flex items-center justify-center shrink-0 shadow-[0_0_16px_rgba(0,180,255,0.45)]">
              <User className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white truncate">You</span>
                {playerStreak >= 2 && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-mono font-bold text-[#F27B13]">
                    <Flame className="w-3 h-3" />
                    {playerStreak}x
                  </span>
                )}
              </div>
              <p
                data-testid="apex-player-points"
                className="font-mono text-xl sm:text-2xl font-extrabold text-[#00B4FF] tabular-nums leading-none mt-0.5"
              >
                {playerPoints.toLocaleString('en-IN')} <span className="text-xs font-semibold text-slate-400">pts</span>
              </p>
              <p className={`text-[11px] font-semibold mt-0.5 ${playerTier.accentClass}`}>
                {playerTier.tierName}
              </p>
            </div>
          </div>

          {/* AI Opponent Side */}
          <div className="flex items-center justify-end gap-2.5 min-w-0 text-right">
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-200 truncate block">{rival.name}</span>
              <p
                data-testid="apex-ai-points"
                className="font-mono text-xl sm:text-2xl font-extrabold text-[#F43F5E] tabular-nums leading-none mt-0.5"
              >
                {aiPoints.toLocaleString('en-IN')} <span className="text-xs font-semibold text-slate-400">pts</span>
              </p>
              <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                {aiTier.tierName} · Elo {rival.elo}
              </p>
            </div>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-white/20"
              style={{ backgroundColor: `${rival.accentColor}30` }}
            >
              <Bot className="w-5 h-5" style={{ color: rival.accentColor }} />
            </div>
          </div>
        </div>

        {/* Tug-of-War Dominance Progress Bar */}
        <div className="space-y-1">
          <div className="h-3 w-full rounded-full bg-rose-500/30 overflow-hidden flex border border-white/10">
            <motion.div
              animate={{ width: `${playerSharePct}%` }}
              transition={{ type: 'spring', stiffness: 220, damping: 24 }}
              className="h-full bg-gradient-to-r from-[#1D56C6] via-[#00B4FF] to-emerald-400"
            />
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 tabular-nums">
            <span>Dominance {playerSharePct}%</span>
            <span>Pool: {(playerPoints + aiPoints).toLocaleString('en-IN')} pts (Zero-Sum)</span>
            <span>AI {100 - playerSharePct}%</span>
          </div>
        </div>

        {/* Live Point-Trade & Rank-Update Banner */}
        <AnimatePresence mode="wait">
          {(roundOutcome || rankFlash) && (
            <motion.div
              key={roundOutcome?.headline ?? rankFlash}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className={`rounded-xl px-3.5 py-2 border flex flex-wrap items-center justify-between gap-2 text-xs font-bold ${
                (roundOutcome?.deltaPlayer ?? 0) > 0
                  ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
                  : (roundOutcome?.deltaPlayer ?? 0) < 0
                    ? 'bg-rose-500/20 border-rose-400/50 text-rose-200'
                    : 'bg-sky-500/15 border-sky-400/40 text-sky-200'
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                {(roundOutcome?.deltaPlayer ?? 0) >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-emerald-300" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-rose-300" />
                )}
                {roundOutcome?.headline}
              </span>
              {rankFlash && (
                <span className="inline-flex items-center gap-1 font-mono text-amber-300">
                  <Crown className="w-3.5 h-3.5" />
                  {rankFlash}
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* PHASE 1: DUEL LOBBY */}
      {phase === 'lobby' && (
        <div className="space-y-5">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              1. Choose Competitive Arena Track
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {TRACK_OPTIONS.map((tr) => {
                const active = trackId === tr.id;
                return (
                  <button
                    key={tr.id}
                    type="button"
                    onClick={() => {
                      playClick();
                      setTrackId(tr.id);
                    }}
                    className={`text-left p-3.5 rounded-xl border transition-all ${
                      active
                        ? 'bg-[#0E234E] dark:bg-[#1D56C6]/40 border-[#00B4FF] text-white shadow-[0_0_20px_rgba(0,180,255,0.22)]'
                        : 'bg-white/60 dark:bg-[#070B18]/65 border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-slate-200 hover:border-[#00B4FF]/50'
                    }`}
                  >
                    <p className="font-display text-sm font-extrabold">{tr.label}</p>
                    <p className={`text-xs mt-0.5 ${active ? 'text-sky-200' : 'text-slate-500 dark:text-slate-400'}`}>
                      {tr.subtitle}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              2. Select AI Rival (Both Start at 1,000 pts)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {APEX_RIVALS.map((bot) => {
                const active = rivalId === bot.id;
                return (
                  <button
                    key={bot.id}
                    type="button"
                    onClick={() => {
                      playClick();
                      setRivalId(bot.id);
                    }}
                    className={`text-left p-3.5 rounded-xl border transition-all ${
                      active
                        ? 'bg-gradient-to-br from-[#0E234E] to-[#1D56C6]/80 border-[#00B4FF] text-white'
                        : 'bg-white/60 dark:bg-[#070B18]/65 border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-slate-200 hover:border-[#00B4FF]/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-sm font-extrabold">{bot.name}</span>
                      <span className="font-mono text-[11px] font-bold text-[#00B4FF]">
                        Elo {bot.elo}
                      </span>
                    </div>
                    <p className={`text-[11px] font-semibold mt-0.5 ${active ? 'text-amber-300' : 'text-[#F27B13]'}`}>
                      {bot.title}
                    </p>
                    <p className={`text-[11px] mt-1 leading-snug ${active ? 'text-sky-100' : 'text-slate-500 dark:text-slate-400'}`}>
                      {bot.tagline}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <p className="text-xs text-slate-600 dark:text-slate-300">
              8 rapid-fire rounds · Faster accuracy steals +80 to +160 pts directly from AI · Keys 1–4 supported.
            </p>
            <button
              type="button"
              data-testid="start-apex-duel-btn"
              onClick={startDuel}
              className="preps-3d-btn inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00B4FF] hover:bg-sky-300 text-[#070A12] text-sm font-extrabold whitespace-nowrap"
            >
              <Swords className="w-4 h-4" />
              Enter 1v1 Duel vs {rival.name}
            </button>
          </div>
        </div>
      )}

      {/* PHASE 2: ACTIVE POINT-TRADING ROUND */}
      {phase === 'playing' && currentQ && (
        <div className="space-y-4">
          {/* Speed Timer Bar */}
          <div className="flex items-center justify-between gap-3 text-xs font-mono">
            <span className="font-bold text-[#1D56C6] dark:text-[#00B4FF]">
              {currentQ.subject} · {currentQ.chapter}
            </span>
            <span
              className={`inline-flex items-center gap-1 font-extrabold tabular-nums ${
                remainingMs < 4000 ? 'text-rose-500' : 'text-[#F27B13]'
              }`}
            >
              <Timer className="w-3.5 h-3.5" />
              {(remainingMs / 1000).toFixed(1)}s
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
            <div
              className={`h-full transition-all duration-75 ${
                remainingMs < 4000 ? 'bg-rose-500' : 'bg-gradient-to-r from-[#00B4FF] to-[#F27B13]'
              }`}
              style={{ width: `${Math.round((remainingMs / DUEL_ROUND_LIMIT_MS) * 100)}%` }}
            />
          </div>

          {/* Question Blueprint */}
          <div className="rounded-2xl bg-white/80 dark:bg-[#081022]/85 border border-slate-200/80 dark:border-white/10 p-4 sm:p-5 space-y-3">
            <p className="text-sm sm:text-base font-bold text-[#0E234E] dark:text-white leading-relaxed">
              {currentQ.prompt}
            </p>
            {currentQ.formulaLatex && (
              <div className="px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0D1730] border border-slate-200 dark:border-[#00B4FF]/25 overflow-x-auto">
                <KatexFormula
                  latex={currentQ.formulaLatex}
                  displayMode
                  className="text-sm sm:text-base font-bold text-[#1D56C6] dark:text-[#00B4FF]"
                />
              </div>
            )}
          </div>

          {/* 4 Tactile Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {currentQ.options.map((opt, idx) => {
              const isPicked = selectedOption === idx;
              const isCorrectOpt = idx === currentQ.correctIndex;
              const revealed = roundOutcome !== null;

              let btnClass =
                'bg-white/75 dark:bg-[#0B1328]/80 border-slate-200/90 dark:border-white/15 text-slate-800 dark:text-slate-100 hover:border-[#00B4FF]';
              if (revealed) {
                if (isCorrectOpt) {
                  btnClass = 'bg-emerald-500/20 border-emerald-400 text-emerald-900 dark:text-emerald-200';
                } else if (isPicked && !isCorrectOpt) {
                  btnClass = 'bg-rose-500/20 border-rose-400 text-rose-900 dark:text-rose-200';
                } else {
                  btnClass = 'bg-white/40 dark:bg-white/[0.03] border-white/10 opacity-60';
                }
              }

              return (
                <button
                  key={opt}
                  type="button"
                  disabled={revealed}
                  data-testid={`apex-option-${idx}`}
                  onClick={() => resolveRound(idx)}
                  className={`text-left px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all flex items-center gap-3 ${btnClass}`}
                >
                  <span className="h-6 w-6 rounded-lg bg-slate-900/10 dark:bg-white/10 font-mono text-xs font-extrabold inline-flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <span className="leading-snug">{opt}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* PHASE 3: MATCH SUMMARY & RANK UPDATE */}
      {phase === 'summary' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-gradient-to-br from-[#0E234E] via-[#122D66] to-[#0B142C] border border-[#00B4FF]/40 p-5 text-white flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-amber-300">
                <Trophy className="w-4 h-4" />
                {playerPoints >= aiPoints ? 'Victory — Apex Ladder Climbed!' : 'Match Complete — Rematch Ready'}
              </div>
              <h3 className="font-display text-2xl font-extrabold">
                Final Score: {playerPoints.toLocaleString('en-IN')} vs {aiPoints.toLocaleString('en-IN')} pts
              </h3>
              <p className="text-xs text-sky-200">
                Current Rank Tier: <strong>{playerTier.tierName}</strong> · +{earnedXp} Season XP earned
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={startDuel}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#00B4FF] hover:bg-sky-300 text-[#070A12] text-xs font-extrabold"
              >
                <RotateCcw className="w-4 h-4" />
                Rematch {rival.name}
              </button>
              <button
                type="button"
                onClick={() => {
                  playClick();
                  setPhase('lobby');
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold"
              >
                <Shield className="w-4 h-4" />
                Switch Rival
              </button>
            </div>
          </div>

          {missedLogs.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Missed Questions — Launch AI Live Tutor Whiteboard
              </p>
              <div className="space-y-2">
                {missedLogs.slice(0, 3).map((entry) => (
                  <div
                    key={entry.question.id}
                    className="p-3.5 rounded-xl bg-white/70 dark:bg-[#081022]/80 border border-rose-300/60 dark:border-rose-500/30 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-[#0E234E] dark:text-white">
                        {entry.question.prompt}
                      </p>
                      <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                        Correct: {entry.question.options[entry.question.correctIndex]} — {entry.question.explanation}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        openLiveTeacher({
                          subjectName: entry.question.subject,
                          chapterName: entry.question.chapter,
                          questionText: entry.question.prompt,
                          officialAnswer: entry.question.options[entry.question.correctIndex],
                          solutionText: entry.question.explanation,
                          source: 'preps-ai',
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00B4FF] text-[#070A12] text-xs font-extrabold whitespace-nowrap"
                    >
                      <GraduationCap className="w-3.5 h-3.5" />
                      Explain Like a Teacher
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Subtle Bottom Action Hint when in Lobby */}
      {phase === 'lobby' && (
        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500 dark:text-slate-400">
          <Zap className="w-3.5 h-3.5 text-[#00B4FF]" />
          <span>Every win boosts your Apex Arena Elo, Daily Trifecta Shield, and live Season Ladder rank.</span>
        </div>
      )}
    </div>
  );
}
