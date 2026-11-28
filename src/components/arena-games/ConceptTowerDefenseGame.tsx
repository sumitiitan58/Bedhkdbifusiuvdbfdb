import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Crosshair, Play, RotateCcw, Shield, Sparkles, Trophy, X, Zap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePrepskm2 } from '../../context/Prepskm2Context';
import { pickArenaQuestion, saveApexProfileStats } from '../../services/blueprintStore';
import type { BlueprintQuestionItem } from '../../utils/chatHistoryLogic';
import {
  createWaveEnemies,
  getTurretStats,
  samplePathPoint,
  TURRET_ARCHETYPES,
  type PlacedTurret,
  type TowerEnemy,
  type TurretTypeId,
} from '../../utils/apexArcadeLogic';

interface ConceptTowerDefenseGameProps {
  onBack: () => void;
}

const WAYPOINTS = [
  { x: 30, y: 120 },
  { x: 240, y: 120 },
  { x: 240, y: 310 },
  { x: 520, y: 310 },
  { x: 520, y: 105 },
  { x: 830, y: 105 },
  { x: 830, y: 270 },
];

const TURRET_SLOTS = [
  { x: 150, y: 205 },
  { x: 365, y: 215 },
  { x: 425, y: 115 },
  { x: 635, y: 215 },
  { x: 720, y: 205 },
  { x: 365, y: 380 },
];

interface BeamFx {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  ttl: number;
}

export function ConceptTowerDefenseGame({ onBack }: ConceptTowerDefenseGameProps) {
  const { firebaseUser } = useAuth();
  const { recordArenaGameResult } = usePrepskm2();
  const userScope = firebaseUser?.uid ?? 'guest';

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState<'title' | 'playing' | 'gameover'>('title');
  const [coreHp, setCoreHp] = useState(100);
  const [energy, setEnergy] = useState(160);
  const [wave, setWave] = useState(1);
  const [score, setScore] = useState(0);
  const [selectedTurretType, setSelectedTurretType] = useState<TurretTypeId>('optics-laser');
  const [turrets, setTurrets] = useState<PlacedTurret[]>([]);

  // Quiz-gated Build / Upgrade / Reload modal
  const [pendingAction, setPendingAction] = useState<{
    kind: 'build' | 'upgrade';
    slotIndex: number;
    turretType: TurretTypeId;
    question: BlueprintQuestionItem;
  } | null>(null);
  const [quizFeedback, setQuizFeedback] = useState<string | null>(null);

  const enemiesRef = useRef<TowerEnemy[]>([]);
  const turretsRef = useRef<PlacedTurret[]>([]);
  const beamsRef = useRef<BeamFx[]>([]);
  const statusRef = useRef(status);
  const coreHpRef = useRef(coreHp);
  const waveRef = useRef(wave);
  const scoreRef = useRef(score);

  turretsRef.current = turrets;
  statusRef.current = status;
  coreHpRef.current = coreHp;
  waveRef.current = wave;
  scoreRef.current = score;

  useEffect(() => {
    document.body.dataset.state = status;
    return () => {
      delete document.body.dataset.state;
    };
  }, [status]);

  const startDefense = useCallback(() => {
    setCoreHp(100);
    setEnergy(160);
    setWave(1);
    setScore(0);
    setTurrets([]);
    turretsRef.current = [];
    enemiesRef.current = createWaveEnemies(1);
    beamsRef.current = [];
    setPendingAction(null);
    setQuizFeedback(null);
    setStatus('playing');
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  const openSlotAction = (slotIndex: number) => {
    if (status !== 'playing') return;
    const existing = turrets.find((t) => t.slotIndex === slotIndex);
    const turretType = existing ? existing.type : selectedTurretType;
    const subject = TURRET_ARCHETYPES[turretType].subject;
    const q = pickArenaQuestion(existing ? 'Hard' : 'Easy', subject);
    setQuizFeedback(null);
    setPendingAction({
      kind: existing ? 'upgrade' : 'build',
      slotIndex,
      turretType,
      question: q,
    });
  };

  const handleAnswerTurretQuiz = (optIdx: number) => {
    if (!pendingAction) return;
    const isCorrect = pendingAction.question.correctOptionIndices.includes(optIdx);
    if (!isCorrect) {
      setQuizFeedback('Incorrect concept! Try another option to power the turret.');
      return;
    }

    const slot = TURRET_SLOTS[pendingAction.slotIndex];
    if (pendingAction.kind === 'build') {
      const arch = TURRET_ARCHETYPES[pendingAction.turretType];
      if (energy < arch.baseCost) {
        setQuizFeedback(`Need ${arch.baseCost} Energy to construct ${arch.name}.`);
        return;
      }
      setEnergy((e) => e - arch.baseCost);
      setTurrets((prev) => [
        ...prev,
        {
          id: `tur-${Date.now()}`,
          slotIndex: pendingAction.slotIndex,
          type: pendingAction.turretType,
          level: 1,
          x: slot.x,
          y: slot.y,
          cooldownSec: 0,
          ammo: 18,
          maxAmmo: 18,
        },
      ]);
      setScore((sc) => sc + 80);
    } else {
      setTurrets((prev) =>
        prev.map((t) =>
          t.slotIndex === pendingAction.slotIndex
            ? { ...t, level: t.level + 1, ammo: t.maxAmmo + 8, maxAmmo: t.maxAmmo + 8 }
            : t
        )
      );
      setScore((sc) => sc + 120);
    }
    setPendingAction(null);
  };

  // Real-time Wave Simulation & Canvas Renderer
  useEffect(() => {
    let rafId = 0;
    let lastTs = performance.now();

    const loop = (ts: number) => {
      const dt = Math.min(0.05, (ts - lastTs) / 1000);
      lastTs = ts;

      if (statusRef.current === 'playing' && !pendingAction) {
        // Move enemies
        const remaining: TowerEnemy[] = [];
        let coreDamageDelta = 0;
        let energyDelta = 0;
        let scoreDelta = 0;

        for (const enemy of enemiesRef.current) {
          enemy.progress += enemy.speed * dt;
          if (enemy.progress >= 1) {
            coreDamageDelta += enemy.coreDamage;
          } else if (enemy.hp > 0) {
            remaining.push(enemy);
          } else {
            energyDelta += enemy.rewardEnergy;
            scoreDelta += enemy.rewardEnergy * 4;
          }
        }

        // Fire turrets
        for (const t of turretsRef.current) {
          t.cooldownSec = Math.max(0, t.cooldownSec - dt);
          if (t.cooldownSec <= 0 && t.ammo > 0) {
            const stats = getTurretStats(t);
            const target = remaining.find((e) => {
              if (e.progress < 0) return false;
              const pos = samplePathPoint(WAYPOINTS, e.progress);
              return Math.hypot(pos.x - t.x, pos.y - t.y) <= stats.range;
            });
            if (target) {
              target.hp -= stats.damage;
              t.cooldownSec = stats.fireIntervalSec;
              const pos = samplePathPoint(WAYPOINTS, target.progress);
              beamsRef.current.push({
                x1: t.x,
                y1: t.y,
                x2: pos.x,
                y2: pos.y,
                color: TURRET_ARCHETYPES[t.type].color,
                ttl: 0.16,
              });
              if (target.hp <= 0) {
                energyDelta += target.rewardEnergy;
                scoreDelta += target.rewardEnergy * 4;
              }
            }
          }
        }

        enemiesRef.current = remaining.filter((e) => e.hp > 0);
        beamsRef.current = beamsRef.current
          .map((b) => ({ ...b, ttl: b.ttl - dt }))
          .filter((b) => b.ttl > 0);

        if (energyDelta > 0) setEnergy((e) => e + energyDelta);
        if (scoreDelta > 0) setScore((s) => s + scoreDelta);

        if (coreDamageDelta > 0) {
          const nextHp = Math.max(0, coreHpRef.current - coreDamageDelta);
          setCoreHp(nextHp);
          if (nextHp <= 0) {
            setStatus('gameover');
            saveApexProfileStats(userScope, { towerDefenseBestWave: waveRef.current });
            recordArenaGameResult({
              gameName: 'Concept Tower Defense',
              subject: 'physics',
              score: scoreRef.current,
              accuracyRatio: 0.85,
              maxCombo: waveRef.current,
              xpEarned: Math.max(60, waveRef.current * 45),
            });
          }
        } else if (enemiesRef.current.length === 0) {
          const nextWave = waveRef.current + 1;
          setWave(nextWave);
          setEnergy((e) => e + 65);
          enemiesRef.current = createWaveEnemies(nextWave);
        }
      }

      // Draw Arena Map
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const W = canvas.width;
          const H = canvas.height;
          ctx.fillStyle = '#070C17';
          ctx.fillRect(0, 0, W, H);

          // Subtle tactical grid
          ctx.strokeStyle = 'rgba(148,163,184,0.08)';
          ctx.lineWidth = 1;
          for (let x = 0; x < W; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, H);
            ctx.stroke();
          }
          for (let y = 0; y < H; y += 40) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(W, y);
            ctx.stroke();
          }

          // Winding Exam-Trap Path
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 34;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          WAYPOINTS.forEach((pt, idx) => {
            if (idx === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          });
          ctx.stroke();

          ctx.strokeStyle = 'rgba(56,189,248,0.4)';
          ctx.lineWidth = 2;
          ctx.setLineDash([8, 8]);
          ctx.stroke();
          ctx.setLineDash([]);

          // Knowledge Core Base
          const core = WAYPOINTS[WAYPOINTS.length - 1];
          ctx.fillStyle = 'rgba(198,255,0,0.18)';
          ctx.strokeStyle = '#C6FF00';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(core.x, core.y, 32, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#ffffff';
          ctx.font = '800 10px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('KNOWLEDGE', core.x, core.y - 3);
          ctx.fillText('CORE', core.x, core.y + 10);

          // Turret Build Slots & Active Turrets
          TURRET_SLOTS.forEach((slot, idx) => {
            const placed = turretsRef.current.find((t) => t.slotIndex === idx);
            if (!placed) {
              ctx.fillStyle = 'rgba(30,41,59,0.9)';
              ctx.strokeStyle = '#475569';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(slot.x, slot.y, 20, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();
              ctx.fillStyle = '#94a3b8';
              ctx.font = '700 11px monospace';
              ctx.fillText(`+${idx + 1}`, slot.x, slot.y + 4);
            } else {
              const arch = TURRET_ARCHETYPES[placed.type];
              ctx.fillStyle = arch.color;
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(slot.x, slot.y, 21, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();
              ctx.fillStyle = '#06070A';
              ctx.font = '900 11px monospace';
              ctx.fillText(`L${placed.level}`, slot.x, slot.y + 4);
            }
          });

          // Laser / Acid / Pulse Beams
          for (const b of beamsRef.current) {
            ctx.strokeStyle = b.color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(b.x1, b.y1);
            ctx.lineTo(b.x2, b.y2);
            ctx.stroke();
          }

          // Enemies
          for (const e of enemiesRef.current) {
            if (e.progress < 0) continue;
            const pos = samplePathPoint(WAYPOINTS, e.progress);
            const r = e.archetype === 'trap-boss' ? 18 : 12;
            ctx.fillStyle = e.color;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
            ctx.fill();

            // HP Bar
            const pct = Math.max(0, e.hp / e.maxHp);
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(pos.x - 16, pos.y - r - 10, 32, 5);
            ctx.fillStyle = '#34d399';
            ctx.fillRect(pos.x - 16, pos.y - r - 10, 32 * pct, 5);
          }
        }
      }

      rafId = window.requestAnimationFrame(loop);
    };

    rafId = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(rafId);
  }, [pendingAction, recordArenaGameResult, userScope]);

  return (
    <div className="rounded-3xl bg-[#070C17] border border-purple-500/35 overflow-hidden text-slate-100">
      <div className="px-4 py-3 bg-[#0E1529] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-purple-400">
              Apex Arena · Concept Tower Defense
            </p>
            <p className="text-xs text-slate-400">
              Build &amp; upgrade Physics, Chemistry &amp; Maths turrets by solving subject questions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs font-bold tabular-nums">
          <span className="text-emerald-300 inline-flex items-center gap-1">
            <Shield className="w-3.5 h-3.5" /> Core {coreHp}%
          </span>
          <span className="text-[#C6FF00] inline-flex items-center gap-1">
            <Zap className="w-3.5 h-3.5" /> {energy} Energy
          </span>
          <span className="text-purple-300">Wave {wave}</span>
          <span className="text-white">Score {score}</span>
        </div>
      </div>

      {/* Turret Archetype Selector + Build Slots Bar */}
      <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {(Object.keys(TURRET_ARCHETYPES) as TurretTypeId[]).map((tid) => {
            const arch = TURRET_ARCHETYPES[tid];
            return (
              <button
                key={tid}
                type="button"
                onClick={() => setSelectedTurretType(tid)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer ${
                  selectedTurretType === tid
                    ? 'bg-purple-500/25 border-purple-400 text-white'
                    : 'bg-slate-900 border-slate-700 text-slate-300'
                }`}
              >
                {arch.name} ({arch.baseCost}E)
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5">
          {TURRET_SLOTS.map((_, idx) => {
            const existing = turrets.find((t) => t.slotIndex === idx);
            return (
              <button
                key={idx}
                type="button"
                disabled={status !== 'playing'}
                onClick={() => openSlotAction(idx)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-purple-600/40 border border-slate-700 text-xs font-mono font-bold cursor-pointer"
              >
                {existing ? `Up #${idx + 1}` : `Build #${idx + 1}`}
              </button>
            );
          })}
        </div>
      </div>

      {/* Battlefield Canvas */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={920}
          height={430}
          className="w-full max-h-[480px] object-contain block bg-[#070C17]"
        />

        {status !== 'playing' && (
          <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center p-4">
            <div className="max-w-md w-full rounded-3xl bg-slate-900 border border-purple-500/40 p-6 text-center space-y-4">
              {status === 'title' ? (
                <>
                  <Crosshair className="w-11 h-11 text-purple-400 mx-auto" />
                  <h3 className="font-display text-2xl font-bold text-white">
                    Concept Tower Defense
                  </h3>
                  <p className="text-xs text-slate-300">
                    Defend the Knowledge Core from Silly-Mistake Drones, Sign-Error Sprinters, and Concept-Trap Bosses using Optics Laser, Organic Acid Cannon, and Calculus Pulse Towers.
                  </p>
                  <button
                    type="button"
                    data-start="true"
                    data-testid="tower-defense-start-btn"
                    onClick={startDefense}
                    className="w-full py-3 rounded-2xl bg-[#C6FF00] text-slate-950 font-black text-sm inline-flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Defend Knowledge Core
                  </button>
                </>
              ) : (
                <>
                  <Trophy className="w-11 h-11 text-amber-400 mx-auto" />
                  <h3 className="font-display text-2xl font-bold text-white">
                    Wave {wave} Reached · {score} pts
                  </h3>
                  <button
                    type="button"
                    onClick={startDefense}
                    className="w-full py-3 rounded-2xl bg-[#C6FF00] text-slate-950 font-black text-sm inline-flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Play Again
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quiz-Gated Turret Construction / Upgrade Modal */}
      {pendingAction && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-purple-500/45 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <h3 className="font-display font-bold text-base text-white">
                  {pendingAction.kind === 'build' ? 'Construct' : 'Upgrade'}{' '}
                  {TURRET_ARCHETYPES[pendingAction.turretType].name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPendingAction(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-slate-100">{pendingAction.question.questionText}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {pendingAction.question.optionTexts.map((opt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAnswerTurretQuiz(idx)}
                  className="p-3 rounded-xl bg-slate-800 hover:bg-purple-500/25 border border-slate-700 hover:border-purple-400 text-left text-xs font-semibold cursor-pointer"
                >
                  {['A', 'B', 'C', 'D'][idx]}. {opt}
                </button>
              ))}
            </div>
            {quizFeedback && (
              <p className="text-xs text-rose-400 font-semibold">{quizFeedback}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
