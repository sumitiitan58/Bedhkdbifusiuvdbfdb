import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Flame, Play, RotateCcw, Shield, Trophy, Zap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePrepskm2 } from '../../context/Prepskm2Context';
import { saveApexProfileStats } from '../../services/blueprintStore';
import {
  createInitialFormulaRunnerState,
  FORMULA_RUNNER_BANK,
  resolveFormulaGatePass,
  type FormulaGateChallenge,
  type FormulaRunnerState,
} from '../../utils/apexArcadeLogic';

interface FormulaRunnerGameProps {
  onBack: () => void;
}

interface ActiveGate {
  challenge: FormulaGateChallenge;
  z: number; // 0 (horizon) -> 1 (player car)
}

export function FormulaRunnerGame({ onBack }: FormulaRunnerGameProps) {
  const { firebaseUser } = useAuth();
  const { recordArenaGameResult } = usePrepskm2();
  const userScope = firebaseUser?.uid ?? 'guest';

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<FormulaRunnerState>(createInitialFormulaRunnerState());
  const gateRef = useRef<ActiveGate>({
    challenge: FORMULA_RUNNER_BANK[0],
    z: 0.15,
  });
  const bankIdxRef = useRef(0);
  const flashRef = useRef<{ color: string; alpha: number }>({ color: '#34d399', alpha: 0 });
  const roadOffsetRef = useRef(0);

  const [hud, setHud] = useState<FormulaRunnerState>(stateRef.current);
  const [promptBanner, setPromptBanner] = useState<FormulaGateChallenge>(FORMULA_RUNNER_BANK[0]);

  const syncHud = useCallback(() => {
    setHud({ ...stateRef.current });
    setPromptBanner(gateRef.current.challenge);
  }, []);

  const spawnNextGate = useCallback(() => {
    bankIdxRef.current = (bankIdxRef.current + 1) % FORMULA_RUNNER_BANK.length;
    const next = FORMULA_RUNNER_BANK[bankIdxRef.current];
    gateRef.current = { challenge: next, z: 0.02 };
    setPromptBanner(next);
  }, []);

  const startGame = useCallback(() => {
    bankIdxRef.current = Math.floor(Math.random() * FORMULA_RUNNER_BANK.length);
    const fresh: FormulaRunnerState = {
      ...createInitialFormulaRunnerState(),
      status: 'playing',
    };
    stateRef.current = fresh;
    gateRef.current = {
      challenge: FORMULA_RUNNER_BANK[bankIdxRef.current],
      z: 0.08,
    };
    flashRef.current = { color: '#34d399', alpha: 0 };
    document.body.dataset.state = 'playing';
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    syncHud();
  }, [syncHud]);

  const setLane = useCallback((lane: 0 | 1 | 2) => {
    if (stateRef.current.status !== 'playing') return;
    stateRef.current = { ...stateRef.current, lane };
    setHud({ ...stateRef.current });
  }, []);

  useEffect(() => {
    document.body.dataset.state = hud.status;
    return () => {
      delete document.body.dataset.state;
    };
  }, [hud.status]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (stateRef.current.status !== 'playing') return;
      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') {
        setLane(Math.max(0, stateRef.current.lane - 1) as 0 | 1 | 2);
      } else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') {
        setLane(Math.min(2, stateRef.current.lane + 1) as 0 | 1 | 2);
      } else if (e.key === '1') setLane(0);
      else if (e.key === '2') setLane(1);
      else if (e.key === '3') setLane(2);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setLane]);

  // Main Canvas2D Render + Physics Loop
  useEffect(() => {
    let rafId = 0;
    let lastTs = performance.now();

    const frame = (ts: number) => {
      const dt = Math.min(0.05, (ts - lastTs) / 1000);
      lastTs = ts;

      const s = stateRef.current;
      if (s.status === 'playing') {
        const speedFactor = s.speedKmh / 180;
        roadOffsetRef.current = (roadOffsetRef.current + dt * 2.8 * speedFactor) % 1;
        s.distanceMeters += Math.round(dt * s.speedKmh * 0.45);
        s.nitroTimer = Math.max(0, s.nitroTimer - dt);

        // Advance formula gate toward car
        gateRef.current.z += dt * (0.19 + speedFactor * 0.09);
        if (gateRef.current.z >= 0.94) {
          const { nextState, hitCorrect } = resolveFormulaGatePass(
            s,
            s.lane,
            gateRef.current.challenge.correctLane
          );
          stateRef.current = nextState;
          flashRef.current = {
            color: hitCorrect ? '#34d399' : '#f43f5e',
            alpha: 0.42,
          };

          if (nextState.status === 'gameover') {
            saveApexProfileStats(userScope, {
              formulaRunnerBestScore: nextState.score,
            });
            recordArenaGameResult({
              gameName: 'Formula Runner',
              subject: 'speedArena',
              score: nextState.score,
              accuracyRatio:
                nextState.gatesAttempted > 0
                  ? nextState.gatesCleared / nextState.gatesAttempted
                  : 0,
              maxCombo: nextState.maxCombo,
              xpEarned: Math.max(40, Math.round(nextState.score / 10)),
            });
          } else {
            spawnNextGate();
          }
          syncHud();
        }
      }

      if (flashRef.current.alpha > 0) {
        flashRef.current.alpha = Math.max(0, flashRef.current.alpha - dt * 1.4);
      }

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const W = canvas.width;
          const H = canvas.height;
          ctx.clearRect(0, 0, W, H);

          // Night Synth Highway Sky
          const sky = ctx.createLinearGradient(0, 0, 0, H * 0.42);
          sky.addColorStop(0, '#040610');
          sky.addColorStop(1, '#101b38');
          ctx.fillStyle = sky;
          ctx.fillRect(0, 0, W, H);

          // Perspective Highway Surface
          const horizonY = H * 0.34;
          const roadTopW = W * 0.24;
          const roadBotW = W * 0.86;
          ctx.fillStyle = '#0c1324';
          ctx.beginPath();
          ctx.moveTo(W / 2 - roadTopW / 2, horizonY);
          ctx.lineTo(W / 2 + roadTopW / 2, horizonY);
          ctx.lineTo(W / 2 + roadBotW / 2, H);
          ctx.lineTo(W / 2 - roadBotW / 2, H);
          ctx.closePath();
          ctx.fill();

          // Neon Road Edges & Lane Dividers
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(W / 2 - roadTopW / 2, horizonY);
          ctx.lineTo(W / 2 - roadBotW / 2, H);
          ctx.moveTo(W / 2 + roadTopW / 2, horizonY);
          ctx.lineTo(W / 2 + roadBotW / 2, H);
          ctx.stroke();

          ctx.strokeStyle = 'rgba(198,255,0,0.45)';
          ctx.lineWidth = 2;
          ctx.setLineDash([14, 14]);
          for (const frac of [-1 / 6, 1 / 6]) {
            ctx.beginPath();
            ctx.moveTo(W / 2 + roadTopW * frac, horizonY);
            ctx.lineTo(W / 2 + roadBotW * frac, H);
            ctx.stroke();
          }
          ctx.setLineDash([]);

          // Scrolling speed bars
          for (let i = 0; i < 8; i++) {
            const p = ((i / 8) + roadOffsetRef.current) % 1;
            const y = horizonY + Math.pow(p, 1.8) * (H - horizonY);
            const curW = roadTopW + (roadBotW - roadTopW) * Math.pow(p, 1.8);
            ctx.strokeStyle = 'rgba(56,189,248,0.16)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(W / 2 - curW / 2, y);
            ctx.lineTo(W / 2 + curW / 2, y);
            ctx.stroke();
          }

          // Render Incoming 3-Lane Formula Gate
          const gate = gateRef.current;
          const gz = Math.pow(Math.max(0.05, gate.z), 1.55);
          const gateY = horizonY + gz * (H - horizonY - 40);
          const gateTotalW = roadTopW + (roadBotW - roadTopW) * gz;
          const laneW = gateTotalW / 3;
          const gateH = 26 + gz * 44;

          for (let l = 0; l < 3; l++) {
            const gx = W / 2 - gateTotalW / 2 + l * laneW;
            const isSelected = stateRef.current.lane === l;
            ctx.fillStyle = isSelected ? 'rgba(56,189,248,0.28)' : 'rgba(15,23,42,0.88)';
            ctx.strokeStyle = isSelected ? '#38bdf8' : 'rgba(56,189,248,0.55)';
            ctx.lineWidth = isSelected ? 2.8 : 1.5;
            ctx.fillRect(gx + 4, gateY - gateH, laneW - 8, gateH);
            ctx.strokeRect(gx + 4, gateY - gateH, laneW - 8, gateH);

            ctx.fillStyle = '#f8fafc';
            ctx.font = `700 ${Math.max(11, Math.round(11 + gz * 10))}px monospace`;
            ctx.textAlign = 'center';
            ctx.fillText(
              gate.challenge.lanes[l],
              gx + laneW / 2,
              gateY - gateH / 2 + 5
            );
          }

          // Player Cyber Racer Car
          const carY = H - 64;
          const carLaneCenter =
            W / 2 - roadBotW / 2 + (stateRef.current.lane + 0.5) * (roadBotW / 3);
          const hasNitro = stateRef.current.nitroTimer > 0;

          if (hasNitro) {
            ctx.fillStyle = '#C6FF00';
            ctx.beginPath();
            ctx.moveTo(carLaneCenter - 16, carY + 32);
            ctx.lineTo(carLaneCenter + 16, carY + 32);
            ctx.lineTo(carLaneCenter, carY + 58 + Math.random() * 14);
            ctx.closePath();
            ctx.fill();
          }

          ctx.fillStyle = '#2563eb';
          ctx.strokeStyle = hasNitro ? '#C6FF00' : '#38bdf8';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.roundRect(carLaneCenter - 30, carY - 22, 60, 52, 12);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#0f172a';
          ctx.fillRect(carLaneCenter - 18, carY - 10, 36, 18);

          // Hit/Damage Screen Flash
          if (flashRef.current.alpha > 0) {
            ctx.fillStyle = flashRef.current.color;
            ctx.globalAlpha = flashRef.current.alpha;
            ctx.fillRect(0, 0, W, H);
            ctx.globalAlpha = 1;
          }
        }
      }

      rafId = window.requestAnimationFrame(frame);
    };

    rafId = window.requestAnimationFrame(frame);
    return () => window.cancelAnimationFrame(rafId);
  }, [recordArenaGameResult, spawnNextGate, syncHud, userScope]);

  return (
    <div className="rounded-3xl bg-[#050811] border border-sky-500/35 overflow-hidden text-slate-100">
      {/* Compact Arcade HUD */}
      <div className="px-4 py-3 bg-[#091124] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-sky-400">
              Apex Arena · Formula Runner
            </p>
            <p className="text-xs text-slate-400">
              Swerve into the correct formula lane (A/D, Arrows, or tap lanes)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs font-bold tabular-nums">
          <span className="text-[#C6FF00] inline-flex items-center gap-1">
            <Zap className="w-3.5 h-3.5" /> {hud.speedKmh} km/h
          </span>
          <span className="text-amber-300 inline-flex items-center gap-1">
            <Flame className="w-3.5 h-3.5" /> {hud.combo}× Combo
          </span>
          <span className="text-emerald-300 inline-flex items-center gap-1">
            <Shield className="w-3.5 h-3.5" /> {hud.shields}/{hud.maxShields}
          </span>
          <span className="text-white">Score {hud.score}</span>
        </div>
      </div>

      {/* Live Formula Prompt Banner */}
      <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 text-center">
        <span className="text-[11px] font-mono uppercase text-sky-400 mr-2">
          [{promptBanner.subject} · {promptBanner.concept}]
        </span>
        <span className="font-display font-bold text-base sm:text-lg text-white">
          {promptBanner.prompt}
        </span>
      </div>

      {/* Highway Viewport */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={920}
          height={410}
          className="w-full max-h-[460px] object-contain block bg-[#040610]"
        />

        {/* Touch / Click Lane Controls */}
        {hud.status === 'playing' && (
          <div className="grid grid-cols-3 gap-2 p-3 bg-[#091124] border-t border-slate-800">
            {[0, 1, 2].map((laneIdx) => (
              <button
                key={laneIdx}
                type="button"
                onClick={() => setLane(laneIdx as 0 | 1 | 2)}
                className={`py-2.5 rounded-xl font-mono text-xs font-bold border transition cursor-pointer ${
                  hud.lane === laneIdx
                    ? 'bg-[#C6FF00] text-slate-950 border-[#C6FF00]'
                    : 'bg-slate-900 text-slate-200 border-slate-700 hover:border-sky-400'
                }`}
              >
                Lane {laneIdx + 1}: {promptBanner.lanes[laneIdx]}
              </button>
            ))}
          </div>
        )}

        {/* Title / Game Over Overlay */}
        {hud.status !== 'playing' && (
          <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center p-4">
            <div className="max-w-md w-full rounded-3xl bg-slate-900 border border-sky-500/40 p-6 text-center space-y-4">
              {hud.status === 'title' ? (
                <>
                  <Zap className="w-11 h-11 text-[#C6FF00] mx-auto" />
                  <h3 className="font-display text-2xl font-bold text-white">
                    Formula Runner
                  </h3>
                  <p className="text-xs text-slate-300">
                    High-speed Physics, Chemistry &amp; Maths highway racer. Hit the right formula gate for Nitro Boost &amp; Combo Multipliers!
                  </p>
                  <button
                    type="button"
                    data-start="true"
                    data-testid="formula-runner-start-btn"
                    onClick={startGame}
                    className="w-full py-3 rounded-2xl bg-[#C6FF00] text-slate-950 font-black text-sm inline-flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Start Race
                  </button>
                </>
              ) : (
                <>
                  <Trophy className="w-11 h-11 text-amber-400 mx-auto" />
                  <h3 className="font-display text-2xl font-bold text-white">
                    Run Complete — {hud.score} pts
                  </h3>
                  <p className="text-xs text-slate-300">
                    Gates Cleared: {hud.gatesCleared}/{hud.gatesAttempted} · Max Combo: {hud.maxCombo}×
                  </p>
                  <button
                    type="button"
                    onClick={startGame}
                    className="w-full py-3 rounded-2xl bg-[#C6FF00] text-slate-950 font-black text-sm inline-flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Race Again
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
