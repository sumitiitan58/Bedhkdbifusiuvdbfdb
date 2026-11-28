import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  CheckCircle2,
  Compass,
  RotateCcw,
  Shield,
  Sparkles,
  Swords,
  Timer,
  Trophy,
} from 'lucide-react';
import {
  DOMINION_REGIONS,
  SUBJECT_THEME,
  SYLLABUS_DOMINION_HEXES,
  getDominatedRegions,
  isHexAttackable,
  resolveSkirmishOutcome,
  type DominionHexTile,
} from '../../utils/apexArenaGamesEngine';
import { usePrepskm2 } from '../../context/Prepskm2Context';

const DOMINION_STORAGE_KEY = 'prepskm_syllabus_dominion_v1';

interface DominionSaveState {
  ownedHexIds: string[];
  fortifiedHexIds: string[];
  damagedHexIds: string[];
}

function loadDominionState(): DominionSaveState {
  try {
    const raw = window.localStorage.getItem(DOMINION_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DominionSaveState;
      if (Array.isArray(parsed.ownedHexIds) && parsed.ownedHexIds.length > 0) {
        return {
          ownedHexIds: parsed.ownedHexIds,
          fortifiedHexIds: parsed.fortifiedHexIds ?? [],
          damagedHexIds: parsed.damagedHexIds ?? [],
        };
      }
    }
  } catch {
    // ignore storage errors
  }
  return {
    ownedHexIds: ['mech-1'],
    fortifiedHexIds: [],
    damagedHexIds: [],
  };
}

function hexPolygonPoints(cx: number, cy: number, r = 40): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    pts.push(`${(cx + r * Math.cos(angle)).toFixed(1)},${(cy + r * Math.sin(angle)).toFixed(1)}`);
  }
  return pts.join(' ');
}

interface SyllabusDominionGameProps {
  onBack: () => void;
}

export function SyllabusDominionGame({ onBack }: SyllabusDominionGameProps) {
  const { recordArenaGameResult, triggerPrepsBotVictory } = usePrepskm2();

  const [saveState, setSaveState] = useState<DominionSaveState>(() => loadDominionState());
  const [selectedHex, setSelectedHex] = useState<DominionHexTile | null>(null);
  const [battleMode, setBattleMode] = useState<'skirmish' | 'fortify' | null>(null);

  const [qIndex, setQIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [skirmishTimer, setSkirmishTimer] = useState(45);
  const [reviewNotes, setReviewNotes] = useState<string[]>([]);
  const [battleResult, setBattleResult] = useState<{
    status: 'captured' | 'damaged' | 'repelled' | 'fortified' | 'fortify-failed';
    headline: string;
    detail: string;
  } | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(DOMINION_STORAGE_KEY, JSON.stringify(saveState));
    } catch {
      // ignore storage errors
    }
  }, [saveState]);

  const dominatedRegions = useMemo(
    () => getDominatedRegions(saveState.ownedHexIds),
    [saveState.ownedHexIds]
  );

  const startSkirmish = useCallback((tile: DominionHexTile) => {
    setSelectedHex(tile);
    setBattleMode('skirmish');
    setQIndex(0);
    setCorrectCount(0);
    setSkirmishTimer(45);
    setReviewNotes([]);
    setBattleResult(null);
  }, []);

  const startFortify = useCallback((tile: DominionHexTile) => {
    setSelectedHex(tile);
    setBattleMode('fortify');
    setQIndex(0);
    setCorrectCount(0);
    setSkirmishTimer(45);
    setReviewNotes([]);
    setBattleResult(null);
  }, []);

  const finishSkirmish = useCallback(
    (tile: DominionHexTile, totalCorrect: number, notes: string[]) => {
      const outcome = resolveSkirmishOutcome(totalCorrect);
      setReviewNotes(notes);
      if (outcome === 'captured') {
        setSaveState((prev) => {
          const nextOwned = prev.ownedHexIds.includes(tile.id)
            ? prev.ownedHexIds
            : [...prev.ownedHexIds, tile.id];
          return {
            ...prev,
            ownedHexIds: nextOwned,
            damagedHexIds: prev.damagedHexIds.filter((id) => id !== tile.id),
          };
        });
        recordArenaGameResult({
          gameName: 'Syllabus Dominion',
          subject:
            tile.subject === 'Chemistry'
              ? 'chemistry'
              : tile.subject === 'Physics'
                ? 'physics'
                : 'mathsBio',
          score: 300,
          accuracyRatio: 1,
          maxCombo: 3,
          xpEarned: 130,
          difficultyRating: 1140,
        });
        triggerPrepsBotVictory({
          title: `${tile.chapterName} Captured!`,
          subtitle: 'Territory illuminated on your Syllabus Dominion War Map (+130 XP)!',
          badge: 'HEX CONQUERED',
        });
        setBattleResult({
          status: 'captured',
          headline: `3/3 Flawless — ${tile.chapterName} Captured!`,
          detail: 'Hex is now neon cyan & unlocks neighboring territories for conquest.',
        });
      } else if (outcome === 'damaged') {
        setSaveState((prev) => ({
          ...prev,
          damagedHexIds: prev.damagedHexIds.includes(tile.id)
            ? prev.damagedHexIds
            : [...prev.damagedHexIds, tile.id],
        }));
        setBattleResult({
          status: 'damaged',
          headline: `2/3 — ${tile.chapterName} Weakened!`,
          detail: 'Hex defenses are cracked. Attack again to capture it cleanly.',
        });
      } else {
        setBattleResult({
          status: 'repelled',
          headline: `${totalCorrect}/3 — Attack Repelled!`,
          detail: 'Review the handwritten solution tips below and launch a counter-strike.',
        });
      }
    },
    [recordArenaGameResult, triggerPrepsBotVictory]
  );

  // 45s skirmish timer
  useEffect(() => {
    if (!battleMode || battleResult || !selectedHex) return;
    const id = window.setInterval(() => {
      setSkirmishTimer((t) => {
        if (t <= 1) {
          window.clearInterval(id);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [battleMode, battleResult, selectedHex]);

  useEffect(() => {
    if (skirmishTimer === 0 && battleMode && !battleResult && selectedHex) {
      if (battleMode === 'skirmish') {
        finishSkirmish(selectedHex, correctCount, selectedHex.skirmish.map((q) => q.note));
      } else {
        setBattleResult({
          status: 'fortify-failed',
          headline: 'Time Expired — Shield Tower Incomplete',
          detail: selectedHex.bossPyq.note,
        });
      }
    }
  }, [skirmishTimer, battleMode, battleResult, selectedHex, correctCount, finishSkirmish]);

  const handleAnswer = (optionIdx: number) => {
    if (!selectedHex || !battleMode || battleResult) return;

    if (battleMode === 'fortify') {
      const ok = optionIdx === selectedHex.bossPyq.correctIndex;
      if (ok) {
        setSaveState((prev) => ({
          ...prev,
          fortifiedHexIds: prev.fortifiedHexIds.includes(selectedHex.id)
            ? prev.fortifiedHexIds
            : [...prev.fortifiedHexIds, selectedHex.id],
        }));
        recordArenaGameResult({
          gameName: 'Syllabus Dominion',
          subject: 'speedArena',
          score: 200,
          accuracyRatio: 1,
          maxCombo: 2,
          xpEarned: 90,
          difficultyRating: 1180,
        });
        setBattleResult({
          status: 'fortified',
          headline: `Shield Tower Built on ${selectedHex.chapterName}!`,
          detail: 'Boss PYQ solved — this territory is now permanently fortified (+90 XP).',
        });
      } else {
        setReviewNotes([selectedHex.bossPyq.note]);
        setBattleResult({
          status: 'fortify-failed',
          headline: 'Boss PYQ Missed — Shield Tower Not Placed',
          detail: 'Review the handwritten breakdown below and try fortifying again.',
        });
      }
      return;
    }

    const q = selectedHex.skirmish[qIndex];
    const ok = optionIdx === q.correctIndex;
    const nextCorrect = correctCount + (ok ? 1 : 0);
    const nextNotes = ok ? reviewNotes : [...reviewNotes, q.note];
    setCorrectCount(nextCorrect);
    setReviewNotes(nextNotes);

    if (qIndex < 2) {
      setQIndex((i) => i + 1);
    } else {
      finishSkirmish(selectedHex, nextCorrect, nextNotes.length > 0 ? nextNotes : [q.note]);
    }
  };

  const resetMap = () => {
    setSaveState({ ownedHexIds: ['mech-1'], fortifiedHexIds: [], damagedHexIds: [] });
    setSelectedHex(null);
    setBattleMode(null);
    setBattleResult(null);
  };

  const activeQuestion =
    selectedHex && battleMode === 'fortify'
      ? selectedHex.bossPyq
      : selectedHex && battleMode === 'skirmish'
        ? selectedHex.skirmish[qIndex]
        : null;

  return (
    <div
      data-testid="syllabus-dominion-stage"
      className="relative rounded-3xl border border-cyan-400/20 bg-gradient-to-b from-[#070b18] via-[#0c142a] to-[#131b36] p-5 sm:p-6 shadow-2xl"
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
              <Compass className="w-5 h-5 text-cyan-400" />
              Syllabus Dominion
            </h2>
            <p className="text-xs text-slate-400">
              Conquered {saveState.ownedHexIds.length}/{SYLLABUS_DOMINION_HEXES.length} Hexes · Click glowing adjacent hex to attack, or owned hex to fortify
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={resetMap}
          aria-label="Reset War Map"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset Campaign
        </button>
      </div>

      {/* Main Layout: SVG Hex Map + Region Bonuses */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-5">
        <div className="lg:col-span-8 rounded-2xl border border-cyan-400/15 bg-slate-950/80 p-3 sm:p-4 overflow-x-auto">
          <svg
            viewBox="0 0 600 340"
            className="w-full h-auto min-w-[460px]"
            role="img"
            aria-label="Syllabus Dominion Hexagonal War Map"
          >
            {/* Neighbor connector lines */}
            {SYLLABUS_DOMINION_HEXES.map((tile) =>
              tile.neighbors.map((nId) => {
                if (tile.id > nId) return null;
                const nb = SYLLABUS_DOMINION_HEXES.find((h) => h.id === nId);
                if (!nb) return null;
                const bothOwned =
                  saveState.ownedHexIds.includes(tile.id) && saveState.ownedHexIds.includes(nb.id);
                return (
                  <line
                    key={`${tile.id}-${nb.id}`}
                    x1={tile.x}
                    y1={tile.y}
                    x2={nb.x}
                    y2={nb.y}
                    stroke={bothOwned ? 'rgba(56,189,248,0.65)' : 'rgba(148,163,184,0.18)'}
                    strokeWidth={bothOwned ? 2.5 : 1.5}
                    strokeDasharray={bothOwned ? undefined : '4 4'}
                  />
                );
              })
            )}

            {/* Hex Tiles */}
            {SYLLABUS_DOMINION_HEXES.map((tile) => {
              const owned = saveState.ownedHexIds.includes(tile.id);
              const fortified = saveState.fortifiedHexIds.includes(tile.id);
              const damaged = saveState.damagedHexIds.includes(tile.id);
              const attackable = isHexAttackable(tile.id, saveState.ownedHexIds);
              const theme = SUBJECT_THEME[tile.subject];

              const fill = owned
                ? 'rgba(56, 189, 248, 0.28)'
                : attackable
                  ? theme.hexFill
                  : 'rgba(15, 23, 42, 0.9)';
              const stroke = owned
                ? '#38bdf8'
                : attackable
                  ? '#fbbf24'
                  : 'rgba(148, 163, 184, 0.25)';

              return (
                <g
                  key={tile.id}
                  onClick={() => {
                    if (owned) startFortify(tile);
                    else if (attackable) startSkirmish(tile);
                  }}
                  style={{ cursor: owned || attackable ? 'pointer' : 'not-allowed' }}
                >
                  <polygon
                    points={hexPolygonPoints(tile.x, tile.y, 42)}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={owned || attackable ? 2.4 : 1.2}
                  />
                  <text
                    x={tile.x}
                    y={tile.y - 11}
                    textAnchor="middle"
                    fill={owned ? '#e0f2fe' : attackable ? '#fef3c7' : '#94a3b8'}
                    fontSize="8.5"
                    fontWeight="700"
                  >
                    {tile.subject.toUpperCase()}
                  </text>
                  <text
                    x={tile.x}
                    y={tile.y + 4}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="9.5"
                    fontWeight="800"
                  >
                    {tile.chapterName.split(' ').slice(0, 2).join(' ')}
                  </text>
                  <text
                    x={tile.x}
                    y={tile.y + 19}
                    textAnchor="middle"
                    fill={fortified ? '#34d399' : owned ? '#38bdf8' : damaged ? '#fb7185' : attackable ? '#fbbf24' : '#64748b'}
                    fontSize="8"
                    fontWeight="700"
                  >
                    {fortified
                      ? '🛡 FORTIFIED'
                      : owned
                        ? 'OWNED · FORTIFY'
                        : damaged
                          ? 'CRACKED · ATTACK'
                          : attackable
                            ? '⚔ ATTACK'
                            : 'LOCKED'}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Accessible Quick-Attack Buttons below SVG for instant keyboard/click reliability */}
          <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap gap-2">
            {SYLLABUS_DOMINION_HEXES.filter((h) => isHexAttackable(h.id, saveState.ownedHexIds)).map((tile) => (
              <button
                key={tile.id}
                type="button"
                onClick={() => startSkirmish(tile)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/40 text-amber-200 text-xs font-bold cursor-pointer"
              >
                <Swords className="w-3.5 h-3.5" />
                Attack {tile.chapterName}
              </button>
            ))}
            {SYLLABUS_DOMINION_HEXES.filter(
              (h) => saveState.ownedHexIds.includes(h.id) && !saveState.fortifiedHexIds.includes(h.id)
            )
              .slice(0, 2)
              .map((tile) => (
                <button
                  key={`fort-${tile.id}`}
                  type="button"
                  onClick={() => startFortify(tile)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-400/15 hover:bg-cyan-400/25 border border-cyan-400/40 text-cyan-200 text-xs font-bold cursor-pointer"
                >
                  <Shield className="w-3.5 h-3.5" />
                  Fortify {tile.chapterName}
                </button>
              ))}
          </div>
        </div>

        {/* Right Region Conquest Tracker */}
        <div className="lg:col-span-4 rounded-2xl border border-white/10 bg-slate-950/70 p-4 flex flex-col justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-cyan-300 mb-3">
              5 Dominion Regions (+15% XP Bonuses)
            </p>
            <div className="space-y-2.5">
              {DOMINION_REGIONS.map((region) => {
                const regionHexes = SYLLABUS_DOMINION_HEXES.filter((h) => h.regionId === region.id);
                const ownedInRegion = regionHexes.filter((h) => saveState.ownedHexIds.includes(h.id)).length;
                const conquered = dominatedRegions.includes(region.id);
                return (
                  <div
                    key={region.id}
                    className={`rounded-xl border p-3 ${
                      conquered
                        ? 'border-emerald-400/45 bg-emerald-400/10'
                        : 'border-white/10 bg-slate-900/70'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-extrabold text-white">{region.name}</span>
                      <span className={`text-[11px] font-bold ${conquered ? 'text-emerald-300' : 'text-slate-400'}`}>
                        {ownedInRegion}/{regionHexes.length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[11px] text-slate-400">{region.subject}</span>
                      <span
                        className={`text-[11px] font-bold inline-flex items-center gap-1 ${
                          conquered ? 'text-emerald-300' : 'text-amber-300/80'
                        }`}
                      >
                        {conquered ? <CheckCircle2 className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                        {region.bonusLabel}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-900/80 p-3 text-xs text-slate-300">
            <strong className="text-white">How Conquest Works:</strong> Win a 3/3 Skirmish (45s) to claim a hex. Fortify any owned hex with a Boss PYQ to raise a Shield Tower.
          </div>
        </div>
      </div>

      {/* Skirmish / Fortify Modal */}
      <AnimatePresence>
        {selectedHex && battleMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
          >
            <div className="w-full max-w-lg rounded-3xl border border-cyan-400/35 bg-[#0c1328] p-6 shadow-2xl">
              {!battleResult && activeQuestion ? (
                <>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-1 rounded-lg bg-cyan-400/15 border border-cyan-400/35 text-cyan-200 text-xs font-black">
                      {battleMode === 'fortify'
                        ? `FORTIFY · ${selectedHex.chapterName}`
                        : `SKIRMISH ${qIndex + 1}/3 · ${selectedHex.chapterName}`}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-400/15 border border-amber-400/35 text-amber-300 text-xs font-black">
                      <Timer className="w-3.5 h-3.5" /> {skirmishTimer}s
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-extrabold text-white mb-4">
                    {activeQuestion.prompt}
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {activeQuestion.options.map((opt, idx) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleAnswer(idx)}
                        className="text-left px-4 py-3 rounded-xl border border-white/15 bg-slate-900/85 hover:border-cyan-400 hover:bg-cyan-400/10 text-sm font-semibold text-white cursor-pointer"
                      >
                        <span className="inline-block w-5 text-cyan-400 font-black">
                          {String.fromCharCode(65 + idx)}.
                        </span>
                        {opt}
                      </button>
                    ))}
                  </div>
                </>
              ) : battleResult ? (
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-cyan-400/15 border border-cyan-400/35 text-cyan-300 mb-3">
                    {battleResult.status === 'captured' || battleResult.status === 'fortified' ? (
                      <Trophy className="w-6 h-6 text-emerald-300" />
                    ) : (
                      <Swords className="w-6 h-6 text-amber-300" />
                    )}
                  </div>
                  <h3 className="text-xl font-black text-white">{battleResult.headline}</h3>
                  <p className="text-xs text-slate-300 mt-1">{battleResult.detail}</p>

                  {reviewNotes.length > 0 && (
                    <div className="mt-4 text-left rounded-2xl border border-white/10 bg-slate-950/75 p-3.5 space-y-1.5">
                      <p className="text-[11px] font-black uppercase tracking-widest text-cyan-300">
                        Handwritten Concept Notes
                      </p>
                      {reviewNotes.map((n, i) => (
                        <p key={i} className="font-handwritten text-sm text-slate-200">
                          • {n}
                        </p>
                      ))}
                    </div>
                  )}

                  <div className="mt-5 flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedHex(null);
                        setBattleMode(null);
                        setBattleResult(null);
                      }}
                      className="px-5 py-2.5 rounded-xl bg-cyan-400 text-slate-950 font-extrabold text-sm cursor-pointer"
                    >
                      Return to War Map
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
