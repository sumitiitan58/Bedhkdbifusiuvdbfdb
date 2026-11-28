import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Flame,
  Layers,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trophy,
  Zap,
} from 'lucide-react';
import {
  SUBJECT_THEME,
  buildConceptLinkDeck,
  canPlayConceptCard,
  shuffleCards,
  type ArenaSubject,
  type ConceptLinkCard,
} from '../../utils/apexArenaGamesEngine';
import { usePrepskm2 } from '../../context/Prepskm2Context';

interface ConceptLinkGameProps {
  onBack: () => void;
}

const ALL_SUBJECTS: ArenaSubject[] = ['Physics', 'Chemistry', 'Maths', 'Biology'];

function initConceptMatch() {
  const full = shuffleCards(buildConceptLinkDeck());
  const playerHand = full.slice(0, 7);
  const aiHand = full.slice(7, 14);
  const centerIdx = full.findIndex((c, idx) => idx >= 14 && c.cardType === 'normal');
  const centerCard = centerIdx >= 0 ? full[centerIdx] : full[14];
  const drawPile = full.filter((_, idx) => idx >= 14 && idx !== centerIdx);
  return { playerHand, aiHand, centerCard, drawPile, activeSubject: centerCard.subject };
}

export function ConceptLinkGame({ onBack }: ConceptLinkGameProps) {
  const { recordArenaGameResult, triggerPrepsBotVictory } = usePrepskm2();

  const [state, setState] = useState(() => initConceptMatch());
  const [comboCount, setComboCount] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [turn, setTurn] = useState<'player' | 'ai'>('player');
  const [statusBanner, setStatusBanner] = useState(
    'Match Subject Color, Chapter Tag, Wild NCERT — or solve the Link Challenge on any card!'
  );

  const [challengeCard, setChallengeCard] = useState<ConceptLinkCard | null>(null);
  const [pendingWildCard, setPendingWildCard] = useState<ConceptLinkCard | null>(null);
  const [outcome, setOutcome] = useState<'playing' | 'victory' | 'defeat'>('playing');
  const [rewarded, setRewarded] = useState(false);

  const drawCardsFromPile = useCallback(
    (count: number, currentPile: ConceptLinkCard[]): { drawn: ConceptLinkCard[]; nextPile: ConceptLinkCard[] } => {
      let pile = currentPile.length >= count ? [...currentPile] : [...currentPile, ...shuffleCards(buildConceptLinkDeck())];
      const drawn = pile.slice(0, count);
      pile = pile.slice(count);
      return { drawn, nextPile: pile };
    },
    []
  );

  const resetGame = useCallback(() => {
    setState(initConceptMatch());
    setComboCount(0);
    setMaxCombo(0);
    setSpeedMultiplier(1);
    setTurn('player');
    setChallengeCard(null);
    setPendingWildCard(null);
    setOutcome('playing');
    setRewarded(false);
    setStatusBanner('Fresh deck dealt! First player to empty all 7 cards wins.');
  }, []);

  // Victory / Defeat detection
  useEffect(() => {
    if (outcome !== 'playing') return;
    if (state.playerHand.length === 0) {
      setOutcome('victory');
    } else if (state.aiHand.length === 0) {
      setOutcome('defeat');
    }
  }, [state.playerHand.length, state.aiHand.length, outcome]);

  useEffect(() => {
    if (outcome === 'playing' || rewarded) return;
    setRewarded(true);
    if (outcome === 'victory') {
      const xp = speedMultiplier >= 2 ? 180 : 120;
      recordArenaGameResult({
        gameName: 'Concept Link',
        subject: 'speedArena',
        score: 100 + maxCombo * 15,
        accuracyRatio: 0.9,
        maxCombo: Math.max(1, maxCombo),
        xpEarned: xp,
        difficultyRating: 1120,
      });
      triggerPrepsBotVictory({
        title: 'Concept Link Champion!',
        subtitle: `+${xp} XP & +1 Streak Shield fragment secured!`,
        badge: 'CHAIN MASTER',
      });
    } else {
      recordArenaGameResult({
        gameName: 'Concept Link',
        subject: 'speedArena',
        score: 40,
        accuracyRatio: 0.45,
        maxCombo,
        xpEarned: 30,
        difficultyRating: 1120,
      });
    }
  }, [outcome, rewarded, speedMultiplier, maxCombo, recordArenaGameResult, triggerPrepsBotVictory]);

  const executePlayerCard = useCallback(
    (card: ConceptLinkCard, chosenWildSubject?: ArenaSubject) => {
      const nextSubject = chosenWildSubject ?? card.subject;
      let skipAiTurn = false;

      setState((prev) => {
        const nextPlayerHand = prev.playerHand.filter((c) => c.id !== card.id);
        let nextAiHand = [...prev.aiHand];
        let nextPile = [...prev.drawPile];

        if (card.cardType === 'plus2') {
          const { drawn, nextPile: p } = drawCardsFromPile(2, nextPile);
          nextAiHand = [...nextAiHand, ...drawn];
          nextPile = p;
        }
        if (card.cardType === 'skip') {
          skipAiTurn = true;
        }
        return {
          playerHand: nextPlayerHand,
          aiHand: nextAiHand,
          centerCard: card,
          drawPile: nextPile,
          activeSubject: nextSubject,
        };
      });

      setComboCount((c) => {
        const next = c + 1;
        setMaxCombo((m) => Math.max(m, next));
        if (next >= 3) setSpeedMultiplier(2);
        return next;
      });

      if (card.cardType === 'plus2') {
        setStatusBanner(`+2 Doubt Trap! AI forced to draw 2 cards. Active color: ${nextSubject}.`);
        setTurn('ai');
      } else if (card.cardType === 'skip') {
        setStatusBanner(`Skip Turn played! You chain again immediately on ${nextSubject}!`);
        setTurn('player');
      } else if (card.cardType === 'wild') {
        setStatusBanner(`Wild NCERT Card! Switched active subject to ${nextSubject}.`);
        setTurn('ai');
      } else {
        setStatusBanner(`Linked ${card.title} (${card.chapterTag})!`);
        setTurn('ai');
      }
      if (skipAiTurn) setTurn('player');
    },
    [drawCardsFromPile]
  );

  const handleCardClick = (card: ConceptLinkCard) => {
    if (turn !== 'player' || outcome !== 'playing') return;
    const check = canPlayConceptCard(card, state.centerCard, state.activeSubject);
    if (check.matchType === 'wild') {
      setPendingWildCard(card);
      return;
    }
    if (check.matchType === 'link-challenge') {
      setChallengeCard(card);
      return;
    }
    executePlayerCard(card);
  };

  const handleDrawCard = () => {
    if (turn !== 'player' || outcome !== 'playing') return;
    setState((prev) => {
      const { drawn, nextPile } = drawCardsFromPile(1, prev.drawPile);
      return {
        ...prev,
        playerHand: [...prev.playerHand, ...drawn],
        drawPile: nextPile,
      };
    });
    setComboCount(0);
    setSpeedMultiplier(1);
    setStatusBanner('Drew 1 fresh concept card. AI Rival takes the turn.');
    setTurn('ai');
  };

  // AI Turn automation
  useEffect(() => {
    if (turn !== 'ai' || outcome !== 'playing') return;
    const id = window.setTimeout(() => {
      setState((prev) => {
        const matchIdx = prev.aiHand.findIndex(
          (c) => c.cardType === 'wild' || c.subject === prev.activeSubject || c.chapterTag === prev.centerCard.chapterTag
        );
        if (matchIdx === -1) {
          const { drawn, nextPile } = drawCardsFromPile(1, prev.drawPile);
          setStatusBanner('AI Rival had no direct link and drew 1 card — Your turn!');
          setTurn('player');
          return { ...prev, aiHand: [...prev.aiHand, ...drawn], drawPile: nextPile };
        }
        const played = prev.aiHand[matchIdx];
        const nextAiHand = prev.aiHand.filter((c) => c.id !== played.id);
        let nextPlayerHand = [...prev.playerHand];
        let nextPile = [...prev.drawPile];
        const nextSubject =
          played.cardType === 'wild'
            ? ALL_SUBJECTS[Math.floor(Math.random() * ALL_SUBJECTS.length)]
            : played.subject;

        if (played.cardType === 'plus2') {
          const { drawn, nextPile: p } = drawCardsFromPile(2, nextPile);
          nextPlayerHand = [...nextPlayerHand, ...drawn];
          nextPile = p;
          setStatusBanner(`AI dropped +2 Doubt Trap (${played.title})! You drew 2 cards.`);
        } else {
          setStatusBanner(`AI played ${played.title} (${nextSubject}). Your turn!`);
        }

        setTurn('player');
        return {
          playerHand: nextPlayerHand,
          aiHand: nextAiHand,
          centerCard: played,
          drawPile: nextPile,
          activeSubject: nextSubject,
        };
      });
    }, 650);
    return () => window.clearTimeout(id);
  }, [turn, outcome, drawCardsFromPile]);

  const activeTheme = SUBJECT_THEME[state.activeSubject];

  return (
    <div
      data-testid="concept-link-stage"
      className="relative rounded-3xl border border-cyan-400/20 bg-gradient-to-b from-[#080d1e] via-[#0d152c] to-[#131b36] p-5 sm:p-6 shadow-2xl"
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
              <Layers className="w-5 h-5 text-cyan-400" />
              Concept Link
            </h2>
            <p className="text-xs text-slate-400">Fast Chain Reaction · First to 0 Cards Wins</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {speedMultiplier >= 2 && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-black">
              <Flame className="w-3.5 h-3.5" /> 2× SPEED XP ACTIVE
            </span>
          )}
          <span className="px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-200">
            Combo: {comboCount}
          </span>
          <button
            type="button"
            onClick={resetGame}
            aria-label="Restart Concept Link"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Opponent + Center Active Card Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 my-5 items-center">
        {/* AI Rival Hand Counter */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">AI Rival Hand</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-2xl font-black text-white">{state.aiHand.length} Cards</span>
            <div className="flex -space-x-2">
              {state.aiHand.slice(0, 6).map((c) => (
                <div
                  key={c.id}
                  className="w-6 h-9 rounded-md border border-cyan-400/30 bg-gradient-to-br from-slate-800 to-indigo-950"
                />
              ))}
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            {turn === 'ai' ? 'AI Rival is chaining a card...' : 'Waiting for your move'}
          </p>
        </div>

        {/* Center Active Card */}
        <div className={`rounded-3xl border-2 p-5 bg-slate-900/90 text-center ${activeTheme.border} ${activeTheme.glow}`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`px-2.5 py-0.5 rounded-lg border text-xs font-bold ${activeTheme.badge}`}>
              Active: {state.activeSubject}
            </span>
            <span className="text-xs font-semibold text-slate-300">{state.centerCard.chapterTag}</span>
          </div>
          <h3 className="text-lg font-black text-white mt-2">{state.centerCard.title}</h3>
          <p className="font-handwritten text-base text-cyan-200 mt-1">{state.centerCard.linkPrompt}</p>
        </div>

        {/* Draw Pile + Status */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 flex flex-col justify-between gap-3">
          <p className="text-xs text-cyan-200 font-medium leading-relaxed">{statusBanner}</p>
          <button
            type="button"
            disabled={turn !== 'player' || outcome !== 'playing'}
            onClick={handleDrawCard}
            className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold text-white disabled:opacity-45 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-cyan-300" />
            Draw Card ({state.drawPile.length} in Deck)
          </button>
        </div>
      </div>

      {/* Player Hand */}
      {outcome === 'playing' && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
            Your Cards ({state.playerHand.length}) — Click matching cards directly, or click any card to solve its Link Challenge
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {state.playerHand.map((card) => {
              const check = canPlayConceptCard(card, state.centerCard, state.activeSubject);
              const theme = SUBJECT_THEME[card.subject];
              const isDirect = check.matchType !== 'link-challenge';
              return (
                <motion.button
                  key={card.id}
                  type="button"
                  disabled={turn !== 'player'}
                  whileHover={{ y: -5 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleCardClick(card)}
                  className={`text-left rounded-2xl border p-3.5 bg-slate-900/85 transition-all cursor-pointer ${
                    card.cardType === 'wild'
                      ? 'border-amber-400/70 shadow-[0_0_24px_rgba(251,191,36,0.28)]'
                      : isDirect
                        ? `${theme.border} ${theme.glow}`
                        : 'border-white/10 opacity-85 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5 mb-2">
                    <span className={`px-2 py-0.5 rounded-md border text-[11px] font-bold ${theme.badge}`}>
                      {card.cardType === 'wild' ? 'WILD NCERT' : card.subject}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400">{card.chapterTag}</span>
                  </div>
                  <h4 className="text-sm font-extrabold text-white">{card.title}</h4>
                  <p className="font-handwritten text-sm text-slate-300 mt-1.5">{card.linkPrompt}</p>
                  <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[11px] font-bold">
                    <span className={isDirect ? 'text-emerald-300' : 'text-amber-300'}>
                      {check.matchType === 'wild'
                        ? 'Choose Color'
                        : isDirect
                          ? `Instant ${check.matchType === 'chapter' ? 'Chapter' : 'Subject'} Link`
                          : 'Solve Link Challenge'}
                    </span>
                    {card.cardType === 'plus2' && <span className="text-rose-300">+2 TRAP</span>}
                    {card.cardType === 'skip' && <span className="text-cyan-300">SKIP</span>}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {/* Wild Card Color Picker Modal */}
      <AnimatePresence>
        {pendingWildCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
          >
            <div className="w-full max-w-md rounded-3xl border border-amber-400/40 bg-[#0c1328] p-6 text-center shadow-2xl">
              <Sparkles className="w-8 h-8 text-amber-300 mx-auto mb-2" />
              <h3 className="text-lg font-black text-white">Wild NCERT Card — Pick Next Subject</h3>
              <p className="text-xs text-slate-400 mt-1 mb-4">Switch the chain to whichever subject dominates your hand!</p>
              <div className="grid grid-cols-2 gap-3">
                {ALL_SUBJECTS.map((subj) => (
                  <button
                    key={subj}
                    type="button"
                    onClick={() => {
                      const c = pendingWildCard;
                      setPendingWildCard(null);
                      executePlayerCard(c, subj);
                    }}
                    className={`py-3 rounded-xl border font-extrabold text-sm cursor-pointer transition-all hover:scale-[1.02] ${SUBJECT_THEME[subj].badge}`}
                  >
                    {subj}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Link Challenge Modal (for non-matching cards) */}
      <AnimatePresence>
        {challengeCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
          >
            <div className="w-full max-w-md rounded-3xl border border-cyan-400/40 bg-[#0c1328] p-6 shadow-2xl">
              <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-300">
                <Zap className="w-3.5 h-3.5" /> Link Challenge Override
              </span>
              <h3 className="text-lg font-extrabold text-white mt-2">{challengeCard.title}</h3>
              <p className="font-handwritten text-base text-cyan-200 mt-1 mb-4">
                Match the concept clue: “{challengeCard.linkPrompt}”
              </p>
              <div className="space-y-2.5">
                {challengeCard.linkOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      const c = challengeCard;
                      setChallengeCard(null);
                      if (opt === c.linkAnswer) {
                        executePlayerCard(c);
                      } else {
                        setComboCount(0);
                        setSpeedMultiplier(1);
                        setStatusBanner(`Wrong link! Correct link was "${c.linkAnswer}". Drew 1 penalty card.`);
                        setState((prev) => {
                          const { drawn, nextPile } = drawCardsFromPile(1, prev.drawPile);
                          return { ...prev, playerHand: [...prev.playerHand, ...drawn], drawPile: nextPile };
                        });
                        setTurn('ai');
                      }
                    }}
                    className="w-full text-left px-4 py-3 rounded-xl border border-white/15 bg-slate-900/80 hover:border-cyan-400 hover:bg-cyan-400/10 text-sm font-semibold text-white cursor-pointer"
                  >
                    {opt}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setChallengeCard(null)}
                className="mt-4 w-full py-2 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Victory / Defeat Card */}
      {outcome !== 'playing' && (
        <div className="mt-5 rounded-3xl border border-emerald-400/35 bg-gradient-to-br from-emerald-950/50 via-slate-900/90 to-cyan-950/50 p-6 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-400/15 border border-emerald-400/40 text-emerald-300 mb-3">
            {outcome === 'victory' ? <Trophy className="w-7 h-7" /> : <ShieldCheck className="w-7 h-7" />}
          </div>
          <h3 className="text-2xl font-black text-white">
            {outcome === 'victory' ? 'Hand Cleared — Concept Link Victory!' : 'AI Cleared First — Try Another Chain!'}
          </h3>
          <p className="text-sm text-slate-300 mt-1">
            {outcome === 'victory'
              ? `+${speedMultiplier >= 2 ? 180 : 120} XP & +1 Streak Shield Fragment unlocked!`
              : '+30 XP earned for rapid revision.'}
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={resetGame}
              className="px-5 py-2.5 rounded-xl bg-cyan-400 text-slate-950 font-extrabold text-sm cursor-pointer"
            >
              Play Again
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
  );
}
