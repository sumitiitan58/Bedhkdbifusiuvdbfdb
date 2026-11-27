import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Flame,
  RotateCcw,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import {
  BUBBLE_LEVELS,
  calculateBubblePopScore,
  findFloatingBubbles,
  findMatchingBubbleCluster,
  pickArenaQuestion,
  resolvePowerShotAttempt,
  type ArenaSyllabusQuestion,
} from '../../utils/arenaGameRules';
import {
  isSoundEnabled,
  playArcadeWrong,
  playBubblePop,
  playClick,
  playLaserShot,
  playLevelClear,
  playReloadChime,
  setSoundEnabled,
} from '../../utils/soundEffects';
import { usePrepskm2 } from '../../context/Prepskm2Context';

const BOARD_W = 760;
const BOARD_H = 480;
const GRID_COLS = 13;
const GRID_ROWS = 11;
const BUBBLE_R = 23;
const ROW_STEP = BUBBLE_R * 1.76;
const BOARD_LEFT = 74;
const BOARD_TOP = 38;
const SHOOTER_X = BOARD_W * 0.5;
const SHOOTER_Y = BOARD_H - 38;
const DANGER_Y = SHOOTER_Y - 56;

const BUBBLE_PALETTE = [
  { fill: '#06B6D4', hi: '#A5F3FC', rim: '#0E7490', symbol: 'circle' },
  { fill: '#F97316', hi: '#FED7AA', rim: '#C2410C', symbol: 'triangle' },
  { fill: '#22C55E', hi: '#BBF7D0', rim: '#15803D', symbol: 'square' },
  { fill: '#A855F7', hi: '#E9D5FF', rim: '#7E22CE', symbol: 'diamond' },
  { fill: '#F43F5E', hi: '#FECDD3', rim: '#BE123C', symbol: 'cross' },
  { fill: '#EAB308', hi: '#FEF08A', rim: '#A16207', symbol: 'ring' },
] as const;

type BubblePhase = 'title' | 'playing' | 'power-quiz' | 'level-clear' | 'victory' | 'gameover';

interface FlyingBubble {
  x: number;
  y: number;
  vx: number;
  vy: number;
  colorIndex: number;
  isBomb: boolean;
}

interface PopSpark {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

function cellCenter(row: number, col: number): { x: number; y: number } {
  const offset = row % 2 === 1 ? BUBBLE_R : 0;
  return {
    x: BOARD_LEFT + col * (BUBBLE_R * 2) + offset,
    y: BOARD_TOP + row * ROW_STEP,
  };
}

function buildInitialGrid(rowsToFill: number, colorCount: number): Array<Array<number | null>> {
  const grid: Array<Array<number | null>> = Array.from({ length: GRID_ROWS }, () =>
    Array.from({ length: GRID_COLS }, () => null)
  );
  for (let r = 0; r < rowsToFill; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      // Cluster friendly seed so satisfying pops exist on frame 1
      if (c > 0 && Math.random() < 0.42 && grid[r][c - 1] !== null) {
        grid[r][c] = grid[r][c - 1];
      } else {
        grid[r][c] = Math.floor(Math.random() * colorCount);
      }
    }
  }
  return grid;
}

function pickAvailableColor(grid: Array<Array<number | null>>, colorCount: number): number {
  const present = new Set<number>();
  for (const row of grid) {
    for (const val of row) {
      if (val !== null) present.add(val);
    }
  }
  const pool = present.size > 0 ? Array.from(present) : Array.from({ length: colorCount }, (_, i) => i);
  return pool[Math.floor(Math.random() * pool.length)];
}

export function BubbleShooterGame() {
  const { recordArenaGameResult } = usePrepskm2();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const recordArenaResultRef = useRef(recordArenaGameResult);
  recordArenaResultRef.current = recordArenaGameResult;

  const [muted, setMuted] = useState(() => !isSoundEnabled());
  const [hud, setHud] = useState({
    phase: 'title' as BubblePhase,
    levelIndex: 0,
    score: 0,
    poppedCount: 0,
    targetPops: BUBBLE_LEVELS[0].targetPops,
    combo: 1,
    bombReady: false,
    missesLeft: BUBBLE_LEVELS[0].missesBeforeDrop,
  });

  const [powerQuiz, setPowerQuiz] = useState<ArenaSyllabusQuestion | null>(null);
  const [quizFeedback, setQuizFeedback] = useState<{
    selectedIndex: number;
    ok: boolean;
    message: string;
  } | null>(null);

  const simRef = useRef({
    phase: 'title' as BubblePhase,
    levelIndex: 0,
    score: 0,
    poppedCount: 0,
    combo: 1,
    missesSinceDrop: 0,
    bombReady: false,
    grid: buildInitialGrid(BUBBLE_LEVELS[0].initialRows, BUBBLE_LEVELS[0].colorCount),
    currentColor: 0,
    nextColor: 1,
    aimAngle: -Math.PI / 2,
    flying: null as FlyingBubble | null,
    sparks: Array.from({ length: 84 }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 0.4,
      color: '#06B6D4',
      size: 4,
    })) as PopSpark[],
    sparkCursor: 0,
    usedQuestionIds: new Set<string>(),
  });

  const syncHud = useCallback(() => {
    const s = simRef.current;
    const lvl = BUBBLE_LEVELS[s.levelIndex] ?? BUBBLE_LEVELS[0];
    setHud({
      phase: s.phase,
      levelIndex: s.levelIndex,
      score: s.score,
      poppedCount: s.poppedCount,
      targetPops: lvl.targetPops,
      combo: s.combo,
      bombReady: s.bombReady,
      missesLeft: Math.max(0, lvl.missesBeforeDrop - s.missesSinceDrop),
    });
  }, []);

  const startLevel = useCallback(
    (levelIdx: number, resetScore: boolean) => {
      const s = simRef.current;
      s.levelIndex = Math.max(0, Math.min(BUBBLE_LEVELS.length - 1, levelIdx));
      const lvl = BUBBLE_LEVELS[s.levelIndex];
      if (resetScore) s.score = 0;
      s.poppedCount = 0;
      s.combo = 1;
      s.missesSinceDrop = 0;
      s.bombReady = false;
      s.flying = null;
      s.grid = buildInitialGrid(lvl.initialRows, lvl.colorCount);
      s.currentColor = pickAvailableColor(s.grid, lvl.colorCount);
      s.nextColor = pickAvailableColor(s.grid, lvl.colorCount);
      s.phase = 'playing';
      setPowerQuiz(null);
      setQuizFeedback(null);
      syncHud();
    },
    [syncHud]
  );

  const openPowerQuiz = useCallback(() => {
    const s = simRef.current;
    if (s.phase !== 'playing' || s.bombReady || s.flying) return;
    s.phase = 'power-quiz';
    const q = pickArenaQuestion(s.usedQuestionIds);
    s.usedQuestionIds.add(q.id);
    setQuizFeedback(null);
    setPowerQuiz(q);
    syncHud();
  }, [syncHud]);

  const handlePowerOption = (optIdx: number) => {
    if (!powerQuiz || quizFeedback) return;
    const outcome = resolvePowerShotAttempt({
      selectedIndex: optIdx,
      correctIndex: powerQuiz.correctIndex,
    });
    const s = simRef.current;
    if (outcome.granted) {
      s.bombReady = true;
      s.score += outcome.bonusScore;
      playReloadChime();
    } else {
      playArcadeWrong();
    }
    setQuizFeedback({
      selectedIndex: optIdx,
      ok: outcome.granted,
      message: outcome.message,
    });
    window.setTimeout(() => {
      if (simRef.current.phase === 'power-quiz') {
        simRef.current.phase = 'playing';
        setPowerQuiz(null);
        setQuizFeedback(null);
        syncHud();
      }
    }, 900);
  };

  const emitPopSparks = (x: number, y: number, color: string, count = 8) => {
    const s = simRef.current;
    for (let i = 0; i < count; i++) {
      const p = s.sparks[s.sparkCursor];
      s.sparkCursor = (s.sparkCursor + 1) % s.sparks.length;
      const ang = Math.random() * Math.PI * 2;
      const spd = 65 + Math.random() * 145;
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(ang) * spd;
      p.vy = Math.sin(ang) * spd;
      p.maxLife = 0.28 + Math.random() * 0.22;
      p.life = p.maxLife;
      p.color = color;
      p.size = 3 + Math.random() * 3.5;
    }
  };

  const fireBubble = useCallback(() => {
    const s = simRef.current;
    if (s.phase !== 'playing' || s.flying) return;
    const spd = 680;
    s.flying = {
      x: SHOOTER_X,
      y: SHOOTER_Y,
      vx: Math.cos(s.aimAngle) * spd,
      vy: Math.sin(s.aimAngle) * spd,
      colorIndex: s.currentColor,
      isBomb: s.bombReady,
    };
    const lvl = BUBBLE_LEVELS[s.levelIndex];
    s.bombReady = false;
    s.currentColor = s.nextColor;
    s.nextColor = pickAvailableColor(s.grid, lvl.colorCount);
    playLaserShot();
    syncHud();
  }, [syncHud]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const s = simRef.current;
      if (s.phase === 'title' && (e.code === 'Enter' || e.code === 'Space')) {
        e.preventDefault();
        playClick();
        startLevel(0, true);
      } else if (s.phase === 'playing' && e.code === 'Space') {
        e.preventDefault();
        fireBubble();
      } else if (s.phase === 'playing' && e.code === 'ArrowLeft') {
        e.preventDefault();
        s.aimAngle = Math.max(-Math.PI + 0.16, s.aimAngle - 0.08);
      } else if (s.phase === 'playing' && e.code === 'ArrowRight') {
        e.preventDefault();
        s.aimAngle = Math.min(-0.16, s.aimAngle + 0.08);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [fireBubble, startLevel]);

  // Main Canvas Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let lastTs = performance.now();

    const snapFlyingBubble = (fb: FlyingBubble) => {
      const s = simRef.current;
      const lvl = BUBBLE_LEVELS[s.levelIndex];

      // Find nearest open hex cell
      let bestRow = 0;
      let bestCol = 0;
      let bestDist = Infinity;
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          if (s.grid[r][c] !== null) continue;
          const pos = cellCenter(r, c);
          const d = Math.hypot(pos.x - fb.x, pos.y - fb.y);
          if (d < bestDist) {
            bestDist = d;
            bestRow = r;
            bestCol = c;
          }
        }
      }

      if (fb.isBomb) {
        // Plasma Bomb blasts everything within 2.5 bubble radii
        const impact = cellCenter(bestRow, bestCol);
        let cleared = 0;
        for (let r = 0; r < GRID_ROWS; r++) {
          for (let c = 0; c < GRID_COLS; c++) {
            if (s.grid[r][c] === null) continue;
            const pos = cellCenter(r, c);
            if (Math.hypot(pos.x - impact.x, pos.y - impact.y) <= BUBBLE_R * 2.8) {
              const pal = BUBBLE_PALETTE[s.grid[r][c]! % BUBBLE_PALETTE.length];
              emitPopSparks(pos.x, pos.y, pal.fill, 8);
              s.grid[r][c] = null;
              cleared++;
            }
          }
        }
        const floating = findFloatingBubbles(s.grid);
        for (const [fr, fc] of floating) {
          const pos = cellCenter(fr, fc);
          emitPopSparks(pos.x, pos.y, '#FDE047', 6);
          s.grid[fr][fc] = null;
        }
        s.poppedCount += cleared + floating.length;
        s.score += calculateBubblePopScore(Math.max(3, cleared), floating.length, s.combo);
        s.combo = Math.min(5, s.combo + 1);
        s.missesSinceDrop = 0;
        playBubblePop(5);
      } else {
        s.grid[bestRow][bestCol] = fb.colorIndex;
        const cluster = findMatchingBubbleCluster(s.grid, bestRow, bestCol);
        if (cluster.length >= 3) {
          for (const [r, c] of cluster) {
            const pos = cellCenter(r, c);
            const pal = BUBBLE_PALETTE[fb.colorIndex % BUBBLE_PALETTE.length];
            emitPopSparks(pos.x, pos.y, pal.fill, 7);
            s.grid[r][c] = null;
          }
          const floating = findFloatingBubbles(s.grid);
          for (const [fr, fc] of floating) {
            const pos = cellCenter(fr, fc);
            emitPopSparks(pos.x, pos.y, '#FFFFFF', 5);
            s.grid[fr][fc] = null;
          }
          s.poppedCount += cluster.length + floating.length;
          s.score += calculateBubblePopScore(cluster.length, floating.length, s.combo);
          s.combo = Math.min(5, s.combo + 1);
          s.missesSinceDrop = 0;
          playBubblePop(cluster.length);
        } else {
          s.combo = 1;
          s.missesSinceDrop += 1;
          if (s.missesSinceDrop >= lvl.missesBeforeDrop) {
            s.missesSinceDrop = 0;
            // Shift all rows down by 1 and inject a fresh top row
            for (let r = GRID_ROWS - 1; r >= 1; r--) {
              s.grid[r] = [...s.grid[r - 1]];
            }
            s.grid[0] = Array.from({ length: GRID_COLS }, () =>
              Math.floor(Math.random() * lvl.colorCount)
            );
          }
        }
      }

      // Check stage clear (target pops or empty grid)
      const remainingBubbles = s.grid.reduce(
        (acc, row) => acc + row.filter((v) => v !== null).length,
        0
      );

      if (s.poppedCount >= lvl.targetPops || remainingBubbles === 0) {
        playLevelClear();
        if (s.levelIndex < BUBBLE_LEVELS.length - 1) {
          s.phase = 'level-clear';
        } else {
          s.phase = 'victory';
          recordArenaResultRef.current({
            gameName: 'Apex Bubble Shooter',
            subject: 'speedArena',
            score: s.score,
            accuracyRatio: 0.88,
            maxCombo: s.combo,
            xpEarned: 110 + Math.round(s.score / 30),
          });
        }
        syncHud();
        return;
      }

      // Check danger-line breach
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          if (s.grid[r][c] !== null && cellCenter(r, c).y + BUBBLE_R >= DANGER_Y) {
            s.phase = 'gameover';
            playArcadeWrong();
            syncHud();
            return;
          }
        }
      }

      syncHud();
    };

    const drawBubble = (x: number, y: number, colorIdx: number, isBomb = false) => {
      if (isBomb) {
        const g = ctx.createRadialGradient(x - 6, y - 6, 3, x, y, BUBBLE_R);
        g.addColorStop(0, '#FEF08A');
        g.addColorStop(0.5, '#F97316');
        g.addColorStop(1, '#DC2626');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, BUBBLE_R - 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 13px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('★', x, y + 1);
        return;
      }

      const pal = BUBBLE_PALETTE[colorIdx % BUBBLE_PALETTE.length];
      const grad = ctx.createRadialGradient(x - 7, y - 7, 3, x, y, BUBBLE_R);
      grad.addColorStop(0, pal.hi);
      grad.addColorStop(0.45, pal.fill);
      grad.addColorStop(1, pal.rim);

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, BUBBLE_R - 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(7, 11, 20, 0.55)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Specular gloss pill
      ctx.fillStyle = 'rgba(255,255,255,0.42)';
      ctx.beginPath();
      ctx.ellipse(x - 7, y - 8, 5, 3, -0.5, 0, Math.PI * 2);
      ctx.fill();

      // Subtle colorblind-accessible geometric glyph
      ctx.strokeStyle = 'rgba(255,255,255,0.72)';
      ctx.lineWidth = 1.5;
      if (pal.symbol === 'circle') {
        ctx.beginPath();
        ctx.arc(x, y + 1, 5, 0, Math.PI * 2);
        ctx.stroke();
      } else if (pal.symbol === 'triangle') {
        ctx.beginPath();
        ctx.moveTo(x, y - 5);
        ctx.lineTo(x + 5.5, y + 4.5);
        ctx.lineTo(x - 5.5, y + 4.5);
        ctx.closePath();
        ctx.stroke();
      } else if (pal.symbol === 'square') {
        ctx.strokeRect(x - 4.5, y - 4.5, 9, 9);
      } else if (pal.symbol === 'diamond') {
        ctx.beginPath();
        ctx.moveTo(x, y - 6);
        ctx.lineTo(x + 5.5, y);
        ctx.lineTo(x, y + 6);
        ctx.lineTo(x - 5.5, y);
        ctx.closePath();
        ctx.stroke();
      } else if (pal.symbol === 'cross') {
        ctx.beginPath();
        ctx.moveTo(x - 4.5, y);
        ctx.lineTo(x + 4.5, y);
        ctx.moveTo(x, y - 4.5);
        ctx.lineTo(x, y + 4.5);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.stroke();
      }
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTs) / 1000));
      lastTs = now;
      const s = simRef.current;

      // Update particles
      for (const p of s.sparks) {
        if (!p.active) continue;
        p.life -= dt;
        if (p.life <= 0) {
          p.active = false;
        } else {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vy += 220 * dt;
        }
      }

      // Update flying bubble
      if (s.phase === 'playing' && s.flying) {
        const fb = s.flying;
        const subSteps = 3;
        const subDt = dt / subSteps;
        let snapped = false;

        for (let step = 0; step < subSteps; step++) {
          fb.x += fb.vx * subDt;
          fb.y += fb.vy * subDt;

          // Wall bounce
          const minX = BOARD_LEFT - BUBBLE_R * 0.2;
          const maxX = BOARD_LEFT + (GRID_COLS - 1) * (BUBBLE_R * 2) + BUBBLE_R * 1.2;
          if (fb.x <= minX) {
            fb.x = minX;
            fb.vx = Math.abs(fb.vx);
          } else if (fb.x >= maxX) {
            fb.x = maxX;
            fb.vx = -Math.abs(fb.vx);
          }

          // Top ceiling collision
          if (fb.y <= BOARD_TOP) {
            snapped = true;
            break;
          }

          // Existing bubble collision
          outer: for (let r = 0; r < GRID_ROWS; r++) {
            for (let c = 0; c < GRID_COLS; c++) {
              if (s.grid[r][c] === null) continue;
              const pos = cellCenter(r, c);
              if (Math.hypot(fb.x - pos.x, fb.y - pos.y) <= BUBBLE_R * 1.88) {
                snapped = true;
                break outer;
              }
            }
          }
          if (snapped) break;
        }

        if (snapped) {
          const toSnap = fb;
          s.flying = null;
          snapFlyingBubble(toSnap);
        }
      }

      // Render Board
      ctx.clearRect(0, 0, BOARD_W, BOARD_H);
      const bg = ctx.createLinearGradient(0, 0, 0, BOARD_H);
      bg.addColorStop(0, '#091122');
      bg.addColorStop(1, '#0F1A33');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, BOARD_W, BOARD_H);

      // Playfield side rails
      const railLeft = BOARD_LEFT - BUBBLE_R - 4;
      const railRight = BOARD_LEFT + (GRID_COLS - 1) * (BUBBLE_R * 2) + BUBBLE_R * 2 + 4;
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.22)';
      ctx.lineWidth = 2;
      ctx.strokeRect(railLeft, 12, railRight - railLeft, BOARD_H - 20);

      // Danger line
      ctx.save();
      ctx.strokeStyle = 'rgba(244, 63, 94, 0.35)';
      ctx.setLineDash([8, 6]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(railLeft + 4, DANGER_Y);
      ctx.lineTo(railRight - 4, DANGER_Y);
      ctx.stroke();
      ctx.restore();

      // Grid bubbles
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          const val = s.grid[r][c];
          if (val === null) continue;
          const pos = cellCenter(r, c);
          drawBubble(pos.x, pos.y, val);
        }
      }

      // Dashed Wall-Bounce Trajectory Preview
      if (s.phase === 'playing' && !s.flying) {
        ctx.save();
        ctx.strokeStyle = s.bombReady ? 'rgba(251, 146, 60, 0.7)' : 'rgba(34, 211, 238, 0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        let px = SHOOTER_X;
        let py = SHOOTER_Y;
        let vx = Math.cos(s.aimAngle) * 14;
        let vy = Math.sin(s.aimAngle) * 14;
        ctx.moveTo(px, py);
        const minX = BOARD_LEFT - BUBBLE_R * 0.2;
        const maxX = BOARD_LEFT + (GRID_COLS - 1) * (BUBBLE_R * 2) + BUBBLE_R * 1.2;
        for (let step = 0; step < 34; step++) {
          px += vx;
          py += vy;
          if (px <= minX) {
            px = minX;
            vx = Math.abs(vx);
          } else if (px >= maxX) {
            px = maxX;
            vx = -Math.abs(vx);
          }
          ctx.lineTo(px, py);
          if (py <= BOARD_TOP) break;
        }
        ctx.stroke();
        ctx.restore();
      }

      // Flying bubble
      if (s.flying) {
        drawBubble(s.flying.x, s.flying.y, s.flying.colorIndex, s.flying.isBomb);
      }

      // Shooter turret & active bubble
      ctx.save();
      ctx.translate(SHOOTER_X, SHOOTER_Y);
      ctx.rotate(s.aimAngle + Math.PI / 2);
      ctx.fillStyle = '#1E293B';
      ctx.strokeStyle = '#06B6D4';
      ctx.lineWidth = 2;
      ctx.fillRect(-10, -34, 20, 30);
      ctx.strokeRect(-10, -34, 20, 30);
      ctx.restore();

      drawBubble(SHOOTER_X, SHOOTER_Y, s.currentColor, s.bombReady);

      // Next bubble indicator
      ctx.fillStyle = '#94A3B8';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('NEXT', SHOOTER_X + 76, SHOOTER_Y - 18);
      ctx.save();
      ctx.translate(SHOOTER_X + 76, SHOOTER_Y + 4);
      ctx.scale(0.68, 0.68);
      drawBubble(0, 0, s.nextColor);
      ctx.restore();

      // Pop particles
      for (const p of s.sparks) {
        if (!p.active) continue;
        const alpha = Math.max(0, p.life / p.maxLife);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [syncHud]);

  const updateAimFromPointer = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const mx = ((clientX - rect.left) / rect.width) * BOARD_W;
    const my = ((clientY - rect.top) / rect.height) * BOARD_H;
    const raw = Math.atan2(my - SHOOTER_Y, mx - SHOOTER_X);
    simRef.current.aimAngle = Math.max(-Math.PI + 0.14, Math.min(-0.14, raw));
  };

  const levelCfg = BUBBLE_LEVELS[hud.levelIndex] ?? BUBBLE_LEVELS[0];

  return (
    <div
      data-testid="bubble-shooter-shell"
      data-state={hud.phase}
      className="rounded-2xl border border-[#A855F7]/35 bg-[#070B14] text-slate-100 overflow-hidden shadow-xl"
    >
      {/* Perimeter HUD Strip */}
      <div className="px-4 py-2.5 bg-[#0C1324] border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-purple-300">
              {levelCfg.title}
            </p>
            <p className="font-mono text-sm font-extrabold tabular-nums text-white">
              Popped {hud.poppedCount} / {hud.targetPops}
            </p>
          </div>

          <span className="px-2.5 py-1 rounded-lg bg-[#162033] border border-white/10 font-mono text-xs font-bold text-[#22D3EE] tabular-nums">
            Combo {hud.combo}x
          </span>

          <span className="font-mono text-xs text-slate-400 tabular-nums">
            Drop in {hud.missesLeft}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {hud.phase === 'playing' && (
            <button
              type="button"
              disabled={hud.bombReady}
              onClick={openPowerQuiz}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-colors ${
                hud.bombReady
                  ? 'bg-amber-400/20 border border-amber-400/50 text-amber-300'
                  : 'bg-[#F97316] hover:bg-[#EA580C] text-[#070B14]'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              {hud.bombReady ? 'Plasma Bomb Ready!' : 'Charge Bomb (Quiz)'}
            </button>
          )}

          <div className="text-right font-mono tabular-nums px-1">
            <p className="text-[10px] uppercase text-slate-400">SCORE</p>
            <p className="text-base font-extrabold text-amber-300 leading-none">{hud.score}</p>
          </div>

          <button
            type="button"
            tabIndex={-1}
            aria-label={muted ? 'Unmute sound' : 'Mute sound'}
            onClick={(e) => {
              e.currentTarget.blur();
              const next = !muted;
              setMuted(next);
              setSoundEnabled(!next);
            }}
            className="w-8 h-8 rounded-lg bg-[#162033] border border-white/10 hover:border-purple-400 flex items-center justify-center text-slate-300"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label="Restart level"
            onClick={(e) => {
              e.currentTarget.blur();
              startLevel(hud.levelIndex, hud.levelIndex === 0);
            }}
            className="w-8 h-8 rounded-lg bg-[#162033] border border-white/10 hover:border-purple-400 flex items-center justify-center text-slate-300"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Canvas Board */}
      <div className="relative w-full aspect-[760/480] bg-[#091122] select-none">
        <canvas
          ref={canvasRef}
          width={BOARD_W}
          height={BOARD_H}
          data-testid="bubble-shooter-canvas"
          onMouseMove={(e) => updateAimFromPointer(e.clientX, e.clientY)}
          onClick={(e) => {
            updateAimFromPointer(e.clientX, e.clientY);
            fireBubble();
          }}
          className="w-full h-full block cursor-crosshair"
        />

        {/* TITLE OVERLAY */}
        {hud.phase === 'title' && (
          <div className="absolute inset-0 bg-[#070B14]/84 flex flex-col items-center justify-center p-6 text-center">
            <div className="max-w-md space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-400/50 text-purple-300 flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Apex Bubble Shooter
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Bank precision shots off the rails to pop 3+ matching spectrum clusters and drop hanging cascades across 3 progressive levels. Solve quick syllabus quizzes to arm a Plasma Bomb!
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                {BUBBLE_LEVELS.map((lvl, idx) => (
                  <button
                    key={lvl.level}
                    type="button"
                    data-start={idx === 0 ? 'true' : undefined}
                    onClick={() => {
                      playClick();
                      startLevel(idx, true);
                    }}
                    className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-colors ${
                      idx === 0
                        ? 'bg-[#A855F7] hover:bg-[#C084FC] text-white'
                        : 'bg-[#111B33] hover:bg-[#19284A] border border-white/15 text-slate-100'
                    }`}
                  >
                    Start Level {lvl.level}
                  </button>
                ))}
              </div>

              <p className="text-[11px] font-mono text-slate-400 pt-2">
                Mouse Aim &amp; Click to Shoot · Arrow Keys Adjust · Charge Bomb for Syllabus Power-Up
              </p>
            </div>
          </div>
        )}

        {/* PLASMA BOMB SYLLABUS QUIZ OVERLAY */}
        {hud.phase === 'power-quiz' && powerQuiz && (
          <div className="absolute inset-0 bg-[#060B16]/90 flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-2xl border border-amber-400/45 bg-[#0D162B] p-5 space-y-3.5 shadow-2xl">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 font-mono text-xs font-extrabold uppercase tracking-wider text-amber-300">
                  <Zap className="w-4 h-4" />
                  Charge Plasma Bomb · Syllabus Boost
                </span>
                <span className="font-mono text-[11px] text-slate-400">
                  {powerQuiz.subject} · {powerQuiz.chapter}
                </span>
              </div>

              <p className="text-sm font-semibold text-white leading-snug">{powerQuiz.prompt}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {powerQuiz.options.map((opt, idx) => {
                  const chosen = quizFeedback?.selectedIndex === idx;
                  const isCorrect = idx === powerQuiz.correctIndex;
                  const style = quizFeedback
                    ? isCorrect
                      ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200'
                      : chosen
                        ? 'border-rose-400 bg-rose-500/20 text-rose-200'
                        : 'border-white/10 bg-[#111B33] text-slate-400'
                    : 'border-white/15 bg-[#111B33] hover:border-amber-400 hover:bg-[#1B2542] text-slate-100';
                  return (
                    <button
                      key={opt}
                      type="button"
                      disabled={Boolean(quizFeedback)}
                      onClick={() => handlePowerOption(idx)}
                      className={`text-left px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-colors ${style}`}
                    >
                      <span className="font-mono font-bold mr-2 text-amber-300">
                        {String.fromCharCode(65 + idx)}.
                      </span>
                      {opt}
                    </button>
                  );
                })}
              </div>

              {quizFeedback && (
                <div
                  className={`rounded-xl px-3 py-2 text-xs font-semibold ${
                    quizFeedback.ok
                      ? 'bg-emerald-500/15 border border-emerald-400/40 text-emerald-200'
                      : 'bg-amber-500/15 border border-amber-400/40 text-amber-200'
                  }`}
                >
                  <p>{quizFeedback.message}</p>
                  <p className="text-[11px] opacity-85 mt-0.5">{powerQuiz.explanation}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* LEVEL CLEAR / VICTORY / GAME OVER */}
        {(hud.phase === 'level-clear' || hud.phase === 'victory' || hud.phase === 'gameover') && (
          <div className="absolute inset-0 bg-[#060B16]/88 flex items-center justify-center p-4">
            <div className="rounded-2xl border border-purple-400/40 bg-[#0D162B] p-6 text-center space-y-4 max-w-sm w-full">
              <div className="w-11 h-11 rounded-2xl bg-purple-500/20 border border-purple-400/40 text-purple-300 flex items-center justify-center mx-auto">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display text-xl font-extrabold text-white">
                  {hud.phase === 'victory'
                    ? 'All 3 Spectrums Cleared!'
                    : hud.phase === 'level-clear'
                      ? `Level ${hud.levelIndex + 1} Complete!`
                      : 'Grid Reached Danger Line'}
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  Score: <strong className="font-mono text-amber-300">{hud.score}</strong> · Popped:{' '}
                  <strong className="font-mono text-purple-300">
                    {hud.poppedCount}/{hud.targetPops}
                  </strong>
                </p>
              </div>
              <div className="flex items-center justify-center gap-2.5">
                {hud.phase === 'level-clear' ? (
                  <button
                    type="button"
                    data-start="true"
                    onClick={() => startLevel(hud.levelIndex + 1, false)}
                    className="px-5 py-2.5 rounded-xl bg-[#A855F7] hover:bg-[#C084FC] text-white text-xs font-extrabold"
                  >
                    Advance to Level {hud.levelIndex + 2}
                  </button>
                ) : (
                  <button
                    type="button"
                    data-start="true"
                    onClick={() => startLevel(0, true)}
                    className="px-5 py-2.5 rounded-xl bg-[#A855F7] hover:bg-[#C084FC] text-white text-xs font-extrabold"
                  >
                    Play Again
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
