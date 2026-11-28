import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Flame,
  Heart,
  RotateCcw,
  Shield,
  Sparkles,
  Swords,
  Timer,
  Trophy,
  Zap,
} from 'lucide-react';
import {
  FORMULA_CLASH_DECK,
  RARE_UNLOCKABLE_CARDS,
  SUBJECT_THEME,
  nextTurnEnergy,
  resolveFormulaClashCard,
  shuffleCards,
  type FormulaClashCard,
} from '../../utils/apexArenaGamesEngine';
import { usePrepskm2 } from '../../context/Prepskm2Context';

const RARE_CARDS_STORAGE_KEY = 'prepskm_formula_clash_rare_v1';

function loadUnlockedRareIds(): string[] {
  try {
    const raw = window.localStorage.getItem(RARE_CARDS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveUnlockedRareId(id: string): string[] {
  const existing = loadUnlockedRareIds();
  if (existing.includes(id)) return existing;
  const next = [...existing, id];
  try {
    window.localStorage.setItem(RARE_CARDS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore storage errors
  }
  return next;
}

interface FormulaClashGameProps {
  onBack: () => void;
}

interface CombatLogEntry {
  id: number;
  actor: 'player' | 'ai' | 'system';
  text: string;
  isCrit?: boolean;
}

const QUESTION_SECONDS = 12;

export function FormulaClashGame({ onBack }: FormulaClashGameProps) {
  const { recordArenaGameResult, triggerPrepsBotVictory } = usePrepskm2();

  const [deck, setDeck] = useState<FormulaClashCard[]>(() => shuffleCards(FORMULA_CLASH_DECK));
  const [hand, setHand] = useState<FormulaClashCard[]>(() => shuffleCards(FORMULA_CLASH_DECK).slice(0, 4));
  const [turn, setTurn] = useState(1);
  const [maxEnergy, setMaxEnergy] = useState(3);
  const [energy, setEnergy] = useState(3);

  const [playerHp, setPlayerHp] = useState(100);
  const [playerShield, setPlayerShield] = useState(0);
  const [aiHp, setAiHp] = useState(100);
  const [aiShield, setAiShield] = useState(0);

  const [activeCard, setActiveCard] = useState<FormulaClashCard | null>(null);
  const [questionTimer, setQuestionTimer] = useState(QUESTION_SECONDS);
  const questionStartRef = useRef<number>(Date.now());

  const [conceptFlash, setConceptFlash] = useState<{ title: string; note: string; crit?: boolean; fizzled?: boolean } | null>(null);
  const [impactFx, setImpactFx] = useState<{ target: 'ai' | 'player'; label: string; isCrit?: boolean } | null>(null);
  const [aiThinking, setAiThinking] = useState(false);

  const [correctPlays, setCorrectPlays] = useState(0);
  const [totalPlays, setTotalPlays] = useState(0);
  const [critStreak, setCritStreak] = useState(0);
  const [maxCritStreak, setMaxCritStreak] = useState(0);

  const [outcome, setOutcome] = useState<'playing' | 'victory' | 'defeat'>('playing');
  const [unlockedRareCard, setUnlockedRareCard] = useState<FormulaClashCard | null>(null);
  const [rewarded, setRewarded] = useState(false);

  const [combatLog, setCombatLog] = useState<CombatLogEntry[]>([
    { id: 1, actor: 'system', text: 'Duel Ready! Play a Formula Card & answer within 5s for a 1.5× CRITICAL HIT.' },
  ]);

  const appendLog = useCallback((actor: CombatLogEntry['actor'], text: string, isCrit?: boolean) => {
    setCombatLog((prev) => [{ id: Date.now() + Math.random(), actor, text, isCrit }, ...prev].slice(0, 6));
  }, []);

  const drawReplacementCard = useCallback((playedCardId: string) => {
    setHand((prevHand) => {
      const remaining = prevHand.filter((c) => c.id !== playedCardId);
      setDeck((prevDeck) => {
        const pool = prevDeck.length > 0 ? prevDeck : shuffleCards(FORMULA_CLASH_DECK);
        const nextCard = pool.find((c) => !remaining.some((h) => h.id === c.id)) ?? pool[0];
        if (nextCard && remaining.length < 4) {
          remaining.push(nextCard);
        }
        return pool.filter((c) => c.id !== nextCard?.id);
      });
      return [...remaining];
    });
  }, []);

  const resetMatch = useCallback(() => {
    const fresh = shuffleCards(FORMULA_CLASH_DECK);
    setHand(fresh.slice(0, 4));
    setDeck(fresh.slice(4));
    setTurn(1);
    setMaxEnergy(3);
    setEnergy(3);
    setPlayerHp(100);
    setPlayerShield(0);
    setAiHp(100);
    setAiShield(0);
    setActiveCard(null);
    setConceptFlash(null);
    setImpactFx(null);
    setAiThinking(false);
    setCorrectPlays(0);
    setTotalPlays(0);
    setCritStreak(0);
    setMaxCritStreak(0);
    setOutcome('playing');
    setUnlockedRareCard(null);
    setRewarded(false);
    setCombatLog([
      { id: Date.now(), actor: 'system', text: 'Fresh match started! Prove your formulas to shatter the AI Rival.' },
    ]);
  }, []);

  // Finish match check
  useEffect(() => {
    if (outcome !== 'playing') return;
    if (aiHp <= 0) {
      setOutcome('victory');
    } else if (playerHp <= 0) {
      setOutcome('defeat');
    }
  }, [aiHp, playerHp, outcome]);

  // Award XP / Elo / Rare Card on match finish
  useEffect(() => {
    if (outcome === 'playing' || rewarded) return;
    setRewarded(true);
    const acc = totalPlays > 0 ? correctPlays / totalPlays : 0.7;
    if (outcome === 'victory') {
      const existingRare = loadUnlockedRareIds();
      const candidate =
        RARE_UNLOCKABLE_CARDS.find((c) => !existingRare.includes(c.id)) ??
        RARE_UNLOCKABLE_CARDS[Math.floor(Math.random() * RARE_UNLOCKABLE_CARDS.length)];
      if (candidate) {
        saveUnlockedRareId(candidate.id);
        setUnlockedRareCard(candidate);
      }
      recordArenaGameResult({
        gameName: 'Formula Clash',
        subject: 'physics',
        score: 100 - aiHp + playerHp,
        accuracyRatio: Math.max(0.6, acc),
        maxCombo: Math.max(1, maxCritStreak),
        xpEarned: 150,
        difficultyRating: 1180,
      });
      triggerPrepsBotVictory({
        title: 'Formula Clash Victory!',
        subtitle: '+150 Arena XP, +15 Elo & Rare Play Card unlocked!',
        badge: 'FORMULA MASTER',
      });
    } else {
      recordArenaGameResult({
        gameName: 'Formula Clash',
        subject: 'physics',
        score: 100 - aiHp,
        accuracyRatio: Math.min(0.45, acc),
        maxCombo: maxCritStreak,
        xpEarned: 35,
        difficultyRating: 1180,
      });
    }
  }, [outcome, rewarded, totalPlays, correctPlays, aiHp, playerHp, maxCritStreak, recordArenaGameResult, triggerPrepsBotVictory]);

  // 12-second micro-question countdown
  const handleAnswer = useCallback(
    (optionIndex: number | null) => {
      if (!activeCard) return;
      const elapsedSec = (Date.now() - questionStartRef.current) / 1000;
      const isCorrect = optionIndex !== null && optionIndex === activeCard.correctIndex;
      const res = resolveFormulaClashCard(activeCard, isCorrect, elapsedSec);

      setTotalPlays((p) => p + 1);
      setEnergy((e) => Math.max(0, e - activeCard.cost));

      if (isCorrect) {
        setCorrectPlays((c) => c + 1);
        if (res.isCritical) {
          setCritStreak((s) => {
            const next = s + 1;
            setMaxCritStreak((m) => Math.max(m, next));
            return next;
          });
        } else {
          setCritStreak(0);
        }
      } else {
        setCritStreak(0);
      }

      if (activeCard.kind === 'attack') {
        const dmg = res.effectivePower;
        setAiShield((prevSh) => {
          const absorbed = Math.min(prevSh, dmg);
          const remainingDmg = dmg - absorbed;
          if (remainingDmg > 0) {
            setAiHp((hp) => Math.max(0, hp - remainingDmg));
          }
          return prevSh - absorbed;
        });
        setImpactFx({ target: 'ai', label: res.isCritical ? `CRIT -${dmg}` : `-${dmg}`, isCrit: res.isCritical });
      } else if (res.effectivePower > 0) {
        setPlayerShield((sh) => sh + res.effectivePower);
        setImpactFx({ target: 'player', label: `+${res.effectivePower} SHIELD`, isCrit: res.isCritical });
      }

      appendLog('player', `${activeCard.name}: ${res.label}`, res.isCritical);

      if (!isCorrect) {
        setConceptFlash({
          title: activeCard.name,
          note: activeCard.conceptNote,
          fizzled: true,
        });
        window.setTimeout(() => setConceptFlash(null), 2400);
      } else if (res.isCritical) {
        setConceptFlash({
          title: 'CRITICAL HIT · 1.5× SPEED BONUS!',
          note: activeCard.conceptNote,
          crit: true,
        });
        window.setTimeout(() => setConceptFlash(null), 1700);
      }

      window.setTimeout(() => setImpactFx(null), 950);
      drawReplacementCard(activeCard.id);
      setActiveCard(null);
    },
    [activeCard, appendLog, drawReplacementCard]
  );

  useEffect(() => {
    if (!activeCard) return;
    setQuestionTimer(QUESTION_SECONDS);
    questionStartRef.current = Date.now();
    const id = window.setInterval(() => {
      setQuestionTimer((t) => {
        if (t <= 1) {
          window.clearInterval(id);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [activeCard]);

  useEffect(() => {
    if (activeCard && questionTimer === 0) {
      handleAnswer(null);
    }
  }, [activeCard, questionTimer, handleAnswer]);

  const handleEndTurn = useCallback(() => {
    if (aiThinking || outcome !== 'playing' || activeCard) return;
    setAiThinking(true);
    window.setTimeout(() => {
      // AI executes a balanced tactical move
      const aiRollsShield = aiHp < 45 && Math.random() < 0.45;
      if (aiRollsShield) {
        const gain = 14 + Math.min(10, turn * 2);
        setAiShield((s) => s + gain);
        appendLog('ai', `AI Rival cast Gauss Barrier (+${gain} Shield).`);
      } else {
        const rawDmg = 12 + Math.min(14, turn * 2) + Math.floor(Math.random() * 5);
        setPlayerShield((prevSh) => {
          const absorbed = Math.min(prevSh, rawDmg);
          const pierce = rawDmg - absorbed;
          if (pierce > 0) {
            setPlayerHp((hp) => Math.max(0, hp - pierce));
          }
          return prevSh - absorbed;
        });
        setImpactFx({ target: 'player', label: `-${rawDmg} HP` });
        appendLog('ai', `AI Rival launched Entropy Pulse for ${rawDmg} DMG.`);
        window.setTimeout(() => setImpactFx(null), 850);
      }

      setTurn((t) => t + 1);
      setMaxEnergy((m) => {
        const nextMax = nextTurnEnergy(m);
        setEnergy(nextMax);
        return nextMax;
      });
      setAiThinking(false);
    }, 650);
  }, [aiThinking, outcome, activeCard, aiHp, turn, appendLog]);

  const playableCount = useMemo(
    () => hand.filter((c) => c.cost <= energy).length,
    [hand, energy]
  );

  return (
    <div
      data-testid="formula-clash-stage"
      className="relative rounded-3xl border border-cyan-400/20 bg-gradient-to-b from-[#080d1e] via-[#0d152c] to-[#131b36] p-5 sm:p-6 shadow-2xl overflow-hidden"
    >
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Arena Lobby
          </button>
          <div>
            <h2 className="text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
              <Swords className="w-5 h-5 text-cyan-400" />
              Formula Clash
            </h2>
            <p className="text-xs text-slate-400">Turn {turn} · Answer within 5s for 1.5× Critical Hit</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400/15 border border-amber-400/30 text-amber-300 text-xs font-bold">
            <Zap className="w-3.5 h-3.5" />
            Energy {energy}/{maxEnergy}
          </span>
          <button
            type="button"
            onClick={resetMatch}
            aria-label="Restart Formula Clash"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Combatants Arena */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-5">
        {/* Player Fighter */}
        <div className="relative rounded-2xl border border-cyan-400/25 bg-slate-900/65 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-sm font-bold text-white">You · Challenger</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="text-emerald-300 inline-flex items-center gap-1">
                <Heart className="w-3.5 h-3.5" /> {playerHp}/100
              </span>
              {playerShield > 0 && (
                <span className="px-2 py-0.5 rounded-lg bg-sky-400/15 text-sky-300 border border-sky-400/30 inline-flex items-center gap-1">
                  <Shield className="w-3 h-3" /> {playerShield}
                </span>
              )}
            </div>
          </div>
          <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400"
              animate={{ width: `${playerHp}%` }}
              transition={{ type: 'spring', stiffness: 180, damping: 24 }}
            />
          </div>
          <AnimatePresence>
            {impactFx?.target === 'player' && (
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.8 }}
                animate={{ opacity: 1, y: -6, scale: 1.05 }}
                exit={{ opacity: 0, y: -20 }}
                className="absolute right-4 top-3 px-2.5 py-1 rounded-lg bg-slate-950/90 border border-cyan-400/50 text-xs font-black text-cyan-300"
              >
                {impactFx.label}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* AI Rival */}
        <div className="relative rounded-2xl border border-amber-400/25 bg-slate-900/65 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span className="text-sm font-bold text-white">
                AI Rival · AIR-120 Bot {aiThinking ? '(Casting...)' : ''}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="text-rose-300 inline-flex items-center gap-1">
                <Heart className="w-3.5 h-3.5" /> {aiHp}/100
              </span>
              {aiShield > 0 && (
                <span className="px-2 py-0.5 rounded-lg bg-purple-400/15 text-purple-300 border border-purple-400/30 inline-flex items-center gap-1">
                  <Shield className="w-3 h-3" /> {aiShield}
                </span>
              )}
            </div>
          </div>
          <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-rose-500 to-amber-400"
              animate={{ width: `${aiHp}%` }}
              transition={{ type: 'spring', stiffness: 180, damping: 24 }}
            />
          </div>
          <AnimatePresence>
            {impactFx?.target === 'ai' && (
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.8 }}
                animate={{ opacity: 1, y: -6, scale: 1.12 }}
                exit={{ opacity: 0, y: -22 }}
                className={`absolute right-4 top-3 px-3 py-1 rounded-lg border text-xs font-black ${
                  impactFx.isCrit
                    ? 'bg-amber-400 text-slate-950 border-amber-200 shadow-[0_0_20px_rgba(251,191,36,0.7)]'
                    : 'bg-cyan-500/90 text-slate-950 border-cyan-200'
                }`}
              >
                {impactFx.label}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Handwritten Concept Flash Banner */}
      <AnimatePresence>
        {conceptFlash && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`mb-4 rounded-2xl border px-4 py-3 ${
              conceptFlash.crit
                ? 'border-amber-400/50 bg-amber-400/10 text-amber-100'
                : 'border-rose-400/40 bg-rose-500/10 text-rose-100'
            }`}
          >
            <p className="text-xs font-black uppercase tracking-wider">{conceptFlash.title}</p>
            <p className="font-handwritten text-base mt-0.5 text-slate-100">{conceptFlash.note}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Play Cards Hand */}
      {outcome === 'playing' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Your Tactical Hand ({hand.length} Cards · {playableCount} Ready)
            </span>
            <button
              type="button"
              disabled={aiThinking || Boolean(activeCard)}
              onClick={handleEndTurn}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-400 text-slate-950 font-extrabold text-xs hover:brightness-110 disabled:opacity-50 transition-all cursor-pointer"
            >
              <Flame className="w-3.5 h-3.5" />
              {aiThinking ? 'AI Turn...' : 'End Turn (+1 Max Energy)'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {hand.map((card) => {
              const theme = SUBJECT_THEME[card.subject];
              const affordable = card.cost <= energy && !aiThinking && !activeCard;
              return (
                <motion.button
                  key={card.id}
                  type="button"
                  disabled={!affordable}
                  whileHover={affordable ? { y: -6, scale: 1.02 } : undefined}
                  whileTap={affordable ? { scale: 0.98 } : undefined}
                  onClick={() => setActiveCard(card)}
                  className={`text-left rounded-2xl border p-4 bg-slate-900/80 transition-all flex flex-col justify-between min-h-[192px] ${
                    theme.border
                  } ${affordable ? `${theme.glow} cursor-pointer` : 'opacity-45 cursor-not-allowed'}`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <span className={`px-2 py-0.5 rounded-lg border text-[11px] font-bold ${theme.badge}`}>
                        {card.subject}
                      </span>
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-black">
                        <Zap className="w-3 h-3" /> {card.cost}
                      </span>
                    </div>

                    <h3 className="text-sm font-extrabold text-white leading-snug">{card.name}</h3>
                    <p className="font-handwritten text-sm text-cyan-200/90 mt-2 bg-slate-950/60 rounded-xl px-2.5 py-1.5 border border-white/5">
                      {card.formulaHint}
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between">
                    <span className="text-xs font-extrabold text-white inline-flex items-center gap-1">
                      {card.kind === 'attack' ? (
                        <>
                          <Swords className="w-3.5 h-3.5 text-rose-400" /> {card.power} DMG
                        </>
                      ) : (
                        <>
                          <Shield className="w-3.5 h-3.5 text-sky-400" /> +{card.power} Shield
                        </>
                      )}
                    </span>
                    <span className="text-[11px] font-semibold text-cyan-300">
                      {affordable ? 'Play Card →' : 'Need Energy'}
                    </span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {/* Compact Battle Log */}
      <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Duel Feed</p>
        <div className="space-y-1">
          {combatLog.slice(0, 3).map((entry) => (
            <p
              key={entry.id}
              className={`text-xs ${
                entry.isCrit
                  ? 'text-amber-300 font-bold'
                  : entry.actor === 'ai'
                    ? 'text-rose-300'
                    : 'text-slate-300'
              }`}
            >
              {entry.text}
            </p>
          ))}
        </div>
      </div>

      {/* Play + Prove Micro-Question Modal */}
      <AnimatePresence>
        {activeCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.94, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 12 }}
              role="dialog"
              aria-label={`Prove ${activeCard.name}`}
              className="w-full max-w-lg rounded-3xl border border-cyan-400/35 bg-[#0c1328] p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between gap-3 mb-3">
                <span className={`px-2.5 py-1 rounded-lg border text-xs font-bold ${SUBJECT_THEME[activeCard.subject].badge}`}>
                  {activeCard.name} · {activeCard.kind === 'attack' ? `${activeCard.power} DMG` : `+${activeCard.power} Shield`}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black border ${
                    questionTimer >= 7
                      ? 'bg-amber-400/20 text-amber-300 border-amber-400/40'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  }`}
                >
                  <Timer className="w-3.5 h-3.5" />
                  {questionTimer}s {questionTimer >= 7 ? '· CRIT WINDOW' : ''}
                </span>
              </div>

              <p className="font-handwritten text-base text-cyan-300 mb-2">Hint: {activeCard.formulaHint}</p>
              <h3 className="text-base sm:text-lg font-bold text-white leading-snug mb-4">
                {activeCard.question}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {activeCard.options.map((opt, idx) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleAnswer(idx)}
                    className="text-left px-4 py-3 rounded-xl border border-white/15 bg-slate-900/80 hover:border-cyan-400 hover:bg-cyan-400/10 text-sm font-semibold text-slate-100 transition-all cursor-pointer"
                  >
                    <span className="inline-block w-5 text-cyan-400 font-black">
                      {String.fromCharCode(65 + idx)}.
                    </span>
                    {opt}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Victory / Defeat Overlay */}
      <AnimatePresence>
        {outcome !== 'playing' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-5 rounded-3xl border border-emerald-400/35 bg-gradient-to-br from-emerald-950/50 via-slate-900/90 to-cyan-950/50 p-6 text-center"
          >
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-400/15 border border-amber-400/40 text-amber-300 mb-3">
              <Trophy className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-black text-white">
              {outcome === 'victory' ? 'AI Rival Shattered — Victory!' : 'Rival Survived — Rematch Ready'}
            </h3>
            <p className="text-sm text-slate-300 mt-1">
              {outcome === 'victory'
                ? '+150 Arena XP · +15 Elo earned · Rare Formula Card unlocked!'
                : '+35 Arena XP earned for battle practice.'}
            </p>

            {outcome === 'victory' && unlockedRareCard && (
              <div className="max-w-sm mx-auto mt-4 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4 text-left">
                <p className="text-[11px] font-black uppercase tracking-widest text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Rare Play Card Unlocked
                </p>
                <p className="text-sm font-extrabold text-white mt-1">{unlockedRareCard.name}</p>
                <p className="font-handwritten text-sm text-amber-100 mt-0.5">{unlockedRareCard.formulaHint}</p>
              </div>
            )}

            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={resetMatch}
                className="px-5 py-2.5 rounded-xl bg-cyan-400 text-slate-950 font-extrabold text-sm hover:brightness-110 transition-all cursor-pointer"
              >
                Play Again
              </button>
              <button
                type="button"
                onClick={onBack}
                className="px-5 py-2.5 rounded-xl bg-white/10 text-white font-semibold text-sm hover:bg-white/15 transition-all cursor-pointer"
              >
                Back to Arena Lobby
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
