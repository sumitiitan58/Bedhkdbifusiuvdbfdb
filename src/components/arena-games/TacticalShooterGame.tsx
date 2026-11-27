import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Crosshair,
  Heart,
  Pause,
  Play,
  RotateCcw,
  Shield,
  Trophy,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import {
  SHOOTER_LEVELS,
  pickArenaQuestion,
  resolveReloadAttempt,
  resolveReviveAttempt,
  type ArenaSyllabusQuestion,
  type ShooterEnemyArchetype,
} from '../../utils/arenaGameRules';
import {
  isSoundEnabled,
  playArcadeWrong,
  playClick,
  playEnemyEliminated,
  playEnemyHit,
  playLaserShot,
  playLevelClear,
  playPlayerDamage,
  playReloadChime,
  playReviveFanfare,
  setSoundEnabled,
} from '../../utils/soundEffects';
import { usePrepskm2 } from '../../context/Prepskm2Context';

const ARENA_W = 820;
const ARENA_H = 470;
const MAX_AMMO = 10;
const MAX_HP = 5;
const MAX_REVIVES_PER_LEVEL = 2;
const PARTICLE_POOL_SIZE = 96;

type GamePhase =
  | 'title'
  | 'playing'
  | 'paused'
  | 'reload-quiz'
  | 'revive-quiz'
  | 'level-clear'
  | 'victory'
  | 'gameover';

interface PlayerBullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

interface EnemyOrb {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

interface EnemyActor {
  id: number;
  archetype: ShooterEnemyArchetype;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hp: number;
  maxHp: number;
  hitFlash: number;
  koTimer: number;
  dying: boolean;
  aiState: 'approach' | 'telegraph' | 'action' | 'recover';
  stateTimer: number;
  dashVx: number;
  dashVy: number;
  aimAngle: number;
  strafeSign: number;
}

interface PooledParticle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface HudSnapshot {
  phase: GamePhase;
  levelIndex: number;
  hp: number;
  ammo: number;
  score: number;
  eliminations: number;
  targetEliminations: number;
  revivesLeft: number;
}

function createParticlePool(): PooledParticle[] {
  return Array.from({ length: PARTICLE_POOL_SIZE }, () => ({
    active: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    life: 0,
    maxLife: 0.4,
    size: 3,
    color: '#06B6D4',
  }));
}

export function TacticalShooterGame() {
  const { recordArenaGameResult } = usePrepskm2();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const recordArenaResultRef = useRef(recordArenaGameResult);
  recordArenaResultRef.current = recordArenaGameResult;

  const [muted, setMuted] = useState(() => !isSoundEnabled());
  const [hud, setHud] = useState<HudSnapshot>({
    phase: 'title',
    levelIndex: 0,
    hp: MAX_HP,
    ammo: MAX_AMMO,
    score: 0,
    eliminations: 0,
    targetEliminations: SHOOTER_LEVELS[0].targetEliminations,
    revivesLeft: MAX_REVIVES_PER_LEVEL,
  });

  const [activeQuiz, setActiveQuiz] = useState<ArenaSyllabusQuestion | null>(null);
  const [quizFeedback, setQuizFeedback] = useState<{
    selectedIndex: number;
    ok: boolean;
    message: string;
  } | null>(null);

  const simRef = useRef({
    phase: 'title' as GamePhase,
    levelIndex: 0,
    score: 0,
    bestScore: 0,
    hp: MAX_HP,
    ammo: MAX_AMMO,
    eliminations: 0,
    revivesLeft: MAX_REVIVES_PER_LEVEL,
    playerX: ARENA_W * 0.5,
    playerY: ARENA_H * 0.55,
    playerAngle: -Math.PI / 2,
    playerInvuln: 0,
    playerRecoil: 0,
    fireCooldown: 0,
    spawnTimer: 1.0,
    hitstop: 0,
    shakeTrauma: 0,
    nextEnemyId: 1,
    mouseX: ARENA_W * 0.65,
    mouseY: ARENA_H * 0.35,
    mouseDown: false,
    keys: new Set<string>(),
    bullets: [] as PlayerBullet[],
    enemyOrbs: [] as EnemyOrb[],
    enemies: [] as EnemyActor[],
    particles: createParticlePool(),
    particleCursor: 0,
    usedQuestionIds: new Set<string>(),
    ambientClock: 0,
  });

  const syncHud = useCallback(() => {
    const s = simRef.current;
    const lvl = SHOOTER_LEVELS[s.levelIndex] ?? SHOOTER_LEVELS[0];
    setHud({
      phase: s.phase,
      levelIndex: s.levelIndex,
      hp: s.hp,
      ammo: s.ammo,
      score: s.score,
      eliminations: s.eliminations,
      targetEliminations: lvl.targetEliminations,
      revivesLeft: s.revivesLeft,
    });
  }, []);

  const openQuizGate = useCallback(
    (gate: 'reload-quiz' | 'revive-quiz') => {
      const s = simRef.current;
      s.phase = gate;
      s.keys.clear();
      s.mouseDown = false;
      const q = pickArenaQuestion(s.usedQuestionIds);
      s.usedQuestionIds.add(q.id);
      setQuizFeedback(null);
      setActiveQuiz(q);
      syncHud();
    },
    [syncHud]
  );

  const startLevel = useCallback(
    (levelIdx: number, resetScore: boolean) => {
      const s = simRef.current;
      s.levelIndex = Math.max(0, Math.min(SHOOTER_LEVELS.length - 1, levelIdx));
      if (resetScore) s.score = 0;
      s.hp = MAX_HP;
      s.ammo = MAX_AMMO;
      s.eliminations = 0;
      s.revivesLeft = MAX_REVIVES_PER_LEVEL;
      s.playerX = ARENA_W * 0.5;
      s.playerY = ARENA_H * 0.55;
      s.playerInvuln = 2.0;
      s.playerRecoil = 0;
      s.fireCooldown = 0;
      s.spawnTimer = 1.65;
      s.hitstop = 0;
      s.shakeTrauma = 0;
      s.bullets = [];
      s.enemyOrbs = [];
      s.enemies = [];
      s.keys.clear();
      s.mouseDown = false;
      s.phase = 'playing';
      setActiveQuiz(null);
      setQuizFeedback(null);
      syncHud();
    },
    [syncHud]
  );

  const spawnBurst = (x: number, y: number, color: string, count: number, speed = 150) => {
    const s = simRef.current;
    for (let i = 0; i < count; i++) {
      const p = s.particles[s.particleCursor];
      s.particleCursor = (s.particleCursor + 1) % PARTICLE_POOL_SIZE;
      const ang = Math.random() * Math.PI * 2;
      const mag = speed * (0.35 + Math.random() * 0.85);
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(ang) * mag;
      p.vy = Math.sin(ang) * mag;
      p.maxLife = 0.25 + Math.random() * 0.25;
      p.life = p.maxLife;
      p.size = 2 + Math.random() * 3.5;
      p.color = color;
    }
  };

  const handleQuizOptionClick = (optIdx: number) => {
    if (!activeQuiz || quizFeedback) return;
    const s = simRef.current;

    if (s.phase === 'reload-quiz') {
      const outcome = resolveReloadAttempt({
        selectedIndex: optIdx,
        correctIndex: activeQuiz.correctIndex,
        maxAmmo: MAX_AMMO,
        currentScore: s.score,
      });
      s.ammo = outcome.nextAmmo;
      s.score = outcome.nextScore;
      if (outcome.fullClip) {
        playReloadChime();
      } else {
        playArcadeWrong();
      }
      setQuizFeedback({
        selectedIndex: optIdx,
        ok: outcome.fullClip,
        message: outcome.message,
      });
      window.setTimeout(() => {
        if (simRef.current.phase === 'reload-quiz') {
          simRef.current.phase = 'playing';
          simRef.current.playerInvuln = Math.max(simRef.current.playerInvuln, 0.7);
          setActiveQuiz(null);
          setQuizFeedback(null);
          syncHud();
        }
      }, 950);
    } else if (s.phase === 'revive-quiz') {
      const outcome = resolveReviveAttempt({
        selectedIndex: optIdx,
        correctIndex: activeQuiz.correctIndex,
        maxHp: MAX_HP,
        maxAmmo: MAX_AMMO,
        currentScore: s.score,
      });
      setQuizFeedback({
        selectedIndex: optIdx,
        ok: outcome.revived,
        message: outcome.message,
      });
      if (outcome.revived) {
        playReviveFanfare();
        s.hp = outcome.nextHp;
        s.ammo = outcome.nextAmmo;
        s.score = outcome.nextScore;
        s.revivesLeft = Math.max(0, s.revivesLeft - 1);
        s.enemyOrbs = [];
        // Push nearby enemies back so revive is fair
        for (const e of s.enemies) {
          const dx = e.x - s.playerX;
          const dy = e.y - s.playerY;
          const dist = Math.hypot(dx, dy) || 1;
          if (dist < 170) {
            e.x = Math.max(36, Math.min(ARENA_W - 36, s.playerX + (dx / dist) * 185));
            e.y = Math.max(36, Math.min(ARENA_H - 36, s.playerY + (dy / dist) * 185));
          }
        }
        window.setTimeout(() => {
          if (simRef.current.phase === 'revive-quiz') {
            simRef.current.phase = 'playing';
            simRef.current.playerInvuln = 2.0;
            setActiveQuiz(null);
            setQuizFeedback(null);
            syncHud();
          }
        }, 1050);
      } else {
        playArcadeWrong();
        window.setTimeout(() => {
          simRef.current.phase = 'gameover';
          simRef.current.bestScore = Math.max(simRef.current.bestScore, simRef.current.score);
          setActiveQuiz(null);
          setQuizFeedback(null);
          syncHud();
        }, 1100);
      }
    }
  };

  // Input & focus-loss hygiene
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const s = simRef.current;
      const code = e.code;

      if (s.phase === 'title' && (code === 'Enter' || code === 'Space')) {
        e.preventDefault();
        playClick();
        startLevel(0, true);
        return;
      }

      if (code === 'KeyP' || code === 'Escape') {
        if (s.phase === 'playing') {
          s.phase = 'paused';
          s.keys.clear();
          s.mouseDown = false;
          syncHud();
        } else if (s.phase === 'paused') {
          s.phase = 'playing';
          syncHud();
        }
        return;
      }

      if (code === 'KeyR' && s.phase === 'playing' && s.ammo < MAX_AMMO) {
        e.preventDefault();
        openQuizGate('reload-quiz');
        return;
      }

      if (
        s.phase === 'playing' &&
        (code === 'ArrowUp' ||
          code === 'ArrowDown' ||
          code === 'ArrowLeft' ||
          code === 'ArrowRight' ||
          code === 'Space')
      ) {
        e.preventDefault();
      }
      s.keys.add(code);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      simRef.current.keys.delete(e.code);
    };

    const clearInputs = () => {
      simRef.current.keys.clear();
      simRef.current.mouseDown = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearInputs);
    document.addEventListener('visibilitychange', clearInputs);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearInputs);
      document.removeEventListener('visibilitychange', clearInputs);
    };
  }, [openQuizGate, startLevel, syncHud]);

  // Main Canvas 2D Loop (isolated from React state updates)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let lastTs = performance.now();

    const spawnEnemy = () => {
      const s = simRef.current;
      const lvl = SHOOTER_LEVELS[s.levelIndex] ?? SHOOTER_LEVELS[0];
      const pool = lvl.archetypePool;
      const archetype = pool[Math.floor(Math.random() * pool.length)];

      // Spawn along perimeter edges, away from player
      const edge = Math.floor(Math.random() * 4);
      let x = 32;
      let y = 32;
      if (edge === 0) {
        x = 36 + Math.random() * (ARENA_W - 72);
        y = 32;
      } else if (edge === 1) {
        x = ARENA_W - 32;
        y = 36 + Math.random() * (ARENA_H - 72);
      } else if (edge === 2) {
        x = 36 + Math.random() * (ARENA_W - 72);
        y = ARENA_H - 32;
      } else {
        x = 32;
        y = 36 + Math.random() * (ARENA_H - 72);
      }

      const maxHp = archetype === 'charger' ? 3 : archetype === 'kiter' ? 2 : 1;
      s.enemies.push({
        id: s.nextEnemyId++,
        archetype,
        x,
        y,
        vx: 0,
        vy: 0,
        radius: archetype === 'charger' ? 19 : archetype === 'kiter' ? 16 : 14,
        hp: maxHp,
        maxHp,
        hitFlash: 0,
        koTimer: 0,
        dying: false,
        aiState: 'approach',
        stateTimer: 0.7 + Math.random() * 0.7,
        dashVx: 0,
        dashVy: 0,
        aimAngle: 0,
        strafeSign: Math.random() < 0.5 ? 1 : -1,
      });
    };

    const damagePlayer = () => {
      const s = simRef.current;
      if (s.playerInvuln > 0 || s.phase !== 'playing') return;
      s.hp = Math.max(0, s.hp - 1);
      s.playerInvuln = 1.5;
      s.hitstop = 0.055;
      s.shakeTrauma = Math.min(1, s.shakeTrauma + 0.65);
      // Knockback nearby enemies so a single collision cannot trap or chain-hit the player
      for (const e of s.enemies) {
        if (e.dying) continue;
        const dx = e.x - s.playerX;
        const dy = e.y - s.playerY;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist < 140) {
          e.x = Math.max(32, Math.min(ARENA_W - 32, s.playerX + (dx / dist) * 125));
          e.y = Math.max(32, Math.min(ARENA_H - 32, s.playerY + (dy / dist) * 125));
        }
      }
      spawnBurst(s.playerX, s.playerY, '#F43F5E', 18, 190);
      playPlayerDamage();

      if (s.hp <= 0) {
        if (s.revivesLeft > 0) {
          openQuizGate('revive-quiz');
        } else {
          s.phase = 'gameover';
          s.bestScore = Math.max(s.bestScore, s.score);
          syncHud();
        }
      } else {
        syncHud();
      }
    };

    const fireShot = () => {
      const s = simRef.current;
      if (s.fireCooldown > 0) return;
      if (s.ammo <= 0) {
        openQuizGate('reload-quiz');
        return;
      }
      s.ammo -= 1;
      s.fireCooldown = 0.17;
      s.playerRecoil = 6;
      const cos = Math.cos(s.playerAngle);
      const sin = Math.sin(s.playerAngle);
      s.bullets.push({
        x: s.playerX + cos * 20,
        y: s.playerY + sin * 20,
        vx: cos * 620,
        vy: sin * 620,
        life: 1.4,
      });
      spawnBurst(s.playerX + cos * 22, s.playerY + sin * 22, '#22D3EE', 4, 95);
      playLaserShot();
      syncHud();
      if (s.ammo === 0) {
        // Trigger seamless Tactical Reload MCQ immediately when last round fires
        window.setTimeout(() => {
          if (simRef.current.phase === 'playing' && simRef.current.ammo === 0) {
            openQuizGate('reload-quiz');
          }
        }, 160);
      }
    };

    const stepSimulation = (dt: number) => {
      const s = simRef.current;
      s.ambientClock += dt;

      // Always decay visual feedback & particles in real dt
      s.shakeTrauma = Math.max(0, s.shakeTrauma - dt * 2.2);
      s.playerRecoil = Math.max(0, s.playerRecoil - dt * 36);
      for (const p of s.particles) {
        if (!p.active) continue;
        p.life -= dt;
        if (p.life <= 0) {
          p.active = false;
        } else {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vx *= 0.94;
          p.vy *= 0.94;
        }
      }

      if (s.phase !== 'playing') return;

      if (s.hitstop > 0) {
        s.hitstop = Math.max(0, s.hitstop - dt);
        return;
      }

      const lvl = SHOOTER_LEVELS[s.levelIndex] ?? SHOOTER_LEVELS[0];
      s.playerInvuln = Math.max(0, s.playerInvuln - dt);
      s.fireCooldown = Math.max(0, s.fireCooldown - dt);

      // Player movement (WASD + Arrows)
      let moveX = 0;
      let moveY = 0;
      if (s.keys.has('KeyW') || s.keys.has('ArrowUp')) moveY -= 1;
      if (s.keys.has('KeyS') || s.keys.has('ArrowDown')) moveY += 1;
      if (s.keys.has('KeyA') || s.keys.has('ArrowLeft')) moveX -= 1;
      if (s.keys.has('KeyD') || s.keys.has('ArrowRight')) moveX += 1;
      if (moveX !== 0 || moveY !== 0) {
        const len = Math.hypot(moveX, moveY);
        const speed = 250;
        s.playerX = Math.max(26, Math.min(ARENA_W - 26, s.playerX + (moveX / len) * speed * dt));
        s.playerY = Math.max(26, Math.min(ARENA_H - 26, s.playerY + (moveY / len) * speed * dt));
      }

      s.playerAngle = Math.atan2(s.mouseY - s.playerY, s.mouseX - s.playerX);

      if (s.mouseDown || s.keys.has('Space')) {
        fireShot();
      }

      // Enemy spawning
      const livingEnemies = s.enemies.filter((e) => !e.dying);
      const remainingToClear = lvl.targetEliminations - s.eliminations;
      s.spawnTimer -= dt;
      if (
        s.spawnTimer <= 0 &&
        livingEnemies.length < Math.min(lvl.maxActiveEnemies, remainingToClear)
      ) {
        spawnEnemy();
        s.spawnTimer = lvl.spawnIntervalSec;
      }

      // Count active attack tokens (telegraphing or charging enemies)
      let activeTokens = s.enemies.filter(
        (e) => !e.dying && (e.aiState === 'telegraph' || e.aiState === 'action')
      ).length;

      // Update enemies with 3 distinct behavior policies
      for (let i = s.enemies.length - 1; i >= 0; i--) {
        const e = s.enemies[i];
        if (e.hitFlash > 0) e.hitFlash = Math.max(0, e.hitFlash - dt);

        if (e.dying) {
          e.koTimer -= dt;
          e.x += e.vx * dt;
          e.y += e.vy * dt;
          if (e.koTimer <= 0) {
            s.enemies.splice(i, 1);
          }
          continue;
        }

        const dx = s.playerX - e.x;
        const dy = s.playerY - e.y;
        const dist = Math.hypot(dx, dy) || 1;
        const nx = dx / dist;
        const ny = dy / dist;

        if (e.archetype === 'swarmer') {
          // Weaving agile chaser
          const perpX = -ny * e.strafeSign;
          const perpY = nx * e.strafeSign;
          const weave = Math.sin(s.ambientClock * 5 + e.id) * 0.45;
          const spd = 88 * lvl.speedScale;
          e.vx = (nx + perpX * weave) * spd;
          e.vy = (ny + perpY * weave) * spd;
          e.x += e.vx * dt;
          e.y += e.vy * dt;
          e.aimAngle = Math.atan2(dy, dx);
        } else if (e.archetype === 'kiter') {
          // Standoff ranged kiter with 0.48s telegraph before firing plasma orb
          e.aimAngle = Math.atan2(dy, dx);
          if (e.aiState === 'approach') {
            const desired = 215;
            const radial = dist > desired + 24 ? 1 : dist < desired - 28 ? -0.85 : 0;
            const perpX = -ny * e.strafeSign;
            const perpY = nx * e.strafeSign;
            const spd = 88 * lvl.speedScale;
            e.x += (nx * radial + perpX * 0.65) * spd * dt;
            e.y += (ny * radial + perpY * 0.65) * spd * dt;
            e.stateTimer -= dt;
            if (e.stateTimer <= 0 && activeTokens < lvl.maxAttackTokens) {
              e.aiState = 'telegraph';
              e.stateTimer = 0.48;
              activeTokens++;
            }
          } else if (e.aiState === 'telegraph') {
            e.stateTimer -= dt;
            if (e.stateTimer <= 0) {
              const orbSpd = 245 * lvl.speedScale;
              s.enemyOrbs.push({
                x: e.x + Math.cos(e.aimAngle) * 18,
                y: e.y + Math.sin(e.aimAngle) * 18,
                vx: Math.cos(e.aimAngle) * orbSpd,
                vy: Math.sin(e.aimAngle) * orbSpd,
                life: 3.0,
                color: '#A855F7',
              });
              e.aiState = 'recover';
              e.stateTimer = 1.15;
            }
          } else {
            e.stateTimer -= dt;
            if (e.stateTimer <= 0) {
              e.aiState = 'approach';
              e.stateTimer = 1.0 + Math.random() * 0.6;
            }
          }
        } else {
          // Charger: closes to medium range -> 0.55s laser telegraph -> high-speed dash -> recovery
          if (e.aiState === 'approach') {
            e.aimAngle = Math.atan2(dy, dx);
            const spd = 76 * lvl.speedScale;
            e.x += nx * spd * dt;
            e.y += ny * spd * dt;
            e.stateTimer -= dt;
            if (e.stateTimer <= 0 && dist < 340 && activeTokens < lvl.maxAttackTokens) {
              e.aiState = 'telegraph';
              e.stateTimer = 0.55;
              e.dashVx = nx * 360 * lvl.speedScale;
              e.dashVy = ny * 360 * lvl.speedScale;
              activeTokens++;
            }
          } else if (e.aiState === 'telegraph') {
            e.stateTimer -= dt;
            if (e.stateTimer <= 0) {
              e.aiState = 'action';
              e.stateTimer = 0.44;
            }
          } else if (e.aiState === 'action') {
            e.x += e.dashVx * dt;
            e.y += e.dashVy * dt;
            e.stateTimer -= dt;
            if (e.stateTimer <= 0) {
              e.aiState = 'recover';
              e.stateTimer = 0.85;
            }
          } else {
            e.stateTimer -= dt;
            if (e.stateTimer <= 0) {
              e.aiState = 'approach';
              e.stateTimer = 0.9;
            }
          }
        }

        e.x = Math.max(22, Math.min(ARENA_W - 22, e.x));
        e.y = Math.max(22, Math.min(ARENA_H - 22, e.y));

        // Enemy contact damage
        if (Math.hypot(e.x - s.playerX, e.y - s.playerY) < e.radius + 15) {
          damagePlayer();
        }
      }

      // Update player bullets
      for (let i = s.bullets.length - 1; i >= 0; i--) {
        const b = s.bullets[i];
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.life -= dt;
        if (b.life <= 0 || b.x < -10 || b.x > ARENA_W + 10 || b.y < -10 || b.y > ARENA_H + 10) {
          s.bullets.splice(i, 1);
          continue;
        }

        let hit = false;
        for (const e of s.enemies) {
          if (e.dying) continue;
          if (Math.hypot(b.x - e.x, b.y - e.y) <= e.radius + 6) {
            hit = true;
            e.hp -= 1;
            e.hitFlash = 0.06;
            const knockAng = Math.atan2(b.vy, b.vx);
            e.x += Math.cos(knockAng) * 9;
            e.y += Math.sin(knockAng) * 9;

            if (e.hp <= 0) {
              e.dying = true;
              e.koTimer = 0.28;
              e.vx = Math.cos(knockAng) * 90;
              e.vy = Math.sin(knockAng) * 90;
              s.eliminations += 1;
              const pts = e.archetype === 'charger' ? 150 : e.archetype === 'kiter' ? 120 : 90;
              s.score += pts;
              s.hitstop = 0.035;
              s.shakeTrauma = Math.min(1, s.shakeTrauma + 0.3);
              spawnBurst(
                e.x,
                e.y,
                e.archetype === 'charger'
                  ? '#F43F5E'
                  : e.archetype === 'kiter'
                    ? '#A855F7'
                    : '#F97316',
                16,
                185
              );
              playEnemyEliminated();

              if (s.eliminations >= lvl.targetEliminations) {
                playLevelClear();
                s.bestScore = Math.max(s.bestScore, s.score);
                if (s.levelIndex < SHOOTER_LEVELS.length - 1) {
                  s.phase = 'level-clear';
                } else {
                  s.phase = 'victory';
                  recordArenaResultRef.current({
                    gameName: 'Apex Tactical Shooter',
                    subject: 'speedArena',
                    score: s.score,
                    accuracyRatio: 0.9,
                    maxCombo: 3,
                    xpEarned: 120 + Math.round(s.score / 25),
                  });
                }
              }
              syncHud();
            } else {
              spawnBurst(b.x, b.y, '#F8FAFC', 6, 110);
              playEnemyHit();
            }
            break;
          }
        }
        if (hit) s.bullets.splice(i, 1);
      }

      // Update enemy orbs
      for (let i = s.enemyOrbs.length - 1; i >= 0; i--) {
        const orb = s.enemyOrbs[i];
        orb.x += orb.vx * dt;
        orb.y += orb.vy * dt;
        orb.life -= dt;
        if (orb.life <= 0 || orb.x < -12 || orb.x > ARENA_W + 12 || orb.y < -12 || orb.y > ARENA_H + 12) {
          s.enemyOrbs.splice(i, 1);
          continue;
        }
        if (Math.hypot(orb.x - s.playerX, orb.y - s.playerY) < 20) {
          s.enemyOrbs.splice(i, 1);
          damagePlayer();
        }
      }
    };

    const renderScene = () => {
      const s = simRef.current;
      ctx.save();
      ctx.clearRect(0, 0, ARENA_W, ARENA_H);

      // Camera trauma shake
      const shakeMag = s.shakeTrauma * s.shakeTrauma * 10;
      if (shakeMag > 0.2) {
        ctx.translate(
          (Math.random() * 2 - 1) * shakeMag,
          (Math.random() * 2 - 1) * shakeMag
        );
      }

      // Arena Deck Background
      const bgGrad = ctx.createRadialGradient(
        ARENA_W * 0.5,
        ARENA_H * 0.5,
        40,
        ARENA_W * 0.5,
        ARENA_H * 0.5,
        ARENA_W * 0.65
      );
      bgGrad.addColorStop(0, '#0F1B33');
      bgGrad.addColorStop(1, '#060B16');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, ARENA_W, ARENA_H);

      // Tactical Grid Lines
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.08)';
      ctx.lineWidth = 1;
      for (let gx = 40; gx < ARENA_W; gx += 40) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, ARENA_H);
        ctx.stroke();
      }
      for (let gy = 40; gy < ARENA_H; gy += 40) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(ARENA_W, gy);
        ctx.stroke();
      }

      // Center Arena Ring
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.14)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ARENA_W * 0.5, ARENA_H * 0.5, 92, 0, Math.PI * 2);
      ctx.stroke();

      // Ambient idle preview drones during title screen
      if (s.phase === 'title') {
        for (let k = 0; k < 4; k++) {
          const ang = s.ambientClock * 0.55 + (k * Math.PI) / 2;
          const ox = ARENA_W * 0.5 + Math.cos(ang) * 185;
          const oy = ARENA_H * 0.5 + Math.sin(ang) * 110;
          ctx.fillStyle = k % 2 === 0 ? 'rgba(249, 115, 22, 0.45)' : 'rgba(168, 85, 247, 0.45)';
          ctx.beginPath();
          ctx.arc(ox, oy, 11, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Enemy telegraphs
      for (const e of s.enemies) {
        if (e.dying || e.aiState !== 'telegraph') continue;
        if (e.archetype === 'charger') {
          ctx.save();
          ctx.strokeStyle = 'rgba(244, 63, 94, 0.65)';
          ctx.lineWidth = 2;
          ctx.setLineDash([7, 5]);
          ctx.beginPath();
          ctx.moveTo(e.x, e.y);
          ctx.lineTo(e.x + Math.cos(e.aimAngle) * 190, e.y + Math.sin(e.aimAngle) * 190);
          ctx.stroke();
          ctx.restore();
        } else if (e.archetype === 'kiter') {
          ctx.strokeStyle = 'rgba(168, 85, 247, 0.78)';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(e.x, e.y, e.radius + 7, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // Draw Enemies (distinct geometric silhouettes)
      for (const e of s.enemies) {
        ctx.save();
        ctx.translate(e.x, e.y);
        if (e.dying) {
          const alpha = Math.max(0, e.koTimer / 0.28);
          ctx.globalAlpha = alpha;
          ctx.scale(1 + (1 - alpha) * 0.45, 1 + (1 - alpha) * 0.45);
        }
        ctx.rotate(e.aimAngle);

        const fill =
          e.hitFlash > 0
            ? '#FFFFFF'
            : e.archetype === 'charger'
              ? '#F43F5E'
              : e.archetype === 'kiter'
                ? '#A855F7'
                : '#F97316';

        ctx.fillStyle = fill;
        ctx.strokeStyle = '#070B14';
        ctx.lineWidth = 2.5;

        if (e.archetype === 'swarmer') {
          // Sharp diamond dart
          ctx.beginPath();
          ctx.moveTo(e.radius + 3, 0);
          ctx.lineTo(-e.radius * 0.6, -e.radius * 0.85);
          ctx.lineTo(-e.radius, 0);
          ctx.lineTo(-e.radius * 0.6, e.radius * 0.85);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (e.archetype === 'kiter') {
          // Ranged hex turret
          ctx.beginPath();
          for (let v = 0; v < 6; v++) {
            const a = (v * Math.PI) / 3;
            const px = Math.cos(a) * e.radius;
            const py = Math.sin(a) * e.radius;
            if (v === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#E9D5FF';
          ctx.beginPath();
          ctx.arc(4, 0, 4.5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Armored Charger chevron
          ctx.beginPath();
          ctx.moveTo(e.radius + 5, 0);
          ctx.lineTo(-e.radius * 0.3, -e.radius);
          ctx.lineTo(-e.radius, -e.radius * 0.55);
          ctx.lineTo(-e.radius * 0.55, 0);
          ctx.lineTo(-e.radius, e.radius * 0.55);
          ctx.lineTo(-e.radius * 0.3, e.radius);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }

        ctx.restore();

        // Compact HP pip bar above multi-HP enemies
        if (!e.dying && e.maxHp > 1) {
          const barW = 28;
          ctx.fillStyle = 'rgba(7, 11, 20, 0.85)';
          ctx.fillRect(e.x - barW / 2, e.y - e.radius - 10, barW, 4);
          ctx.fillStyle = e.archetype === 'charger' ? '#FB7185' : '#C084FC';
          ctx.fillRect(e.x - barW / 2, e.y - e.radius - 10, (barW * e.hp) / e.maxHp, 4);
        }
      }

      // Draw Player Bullets
      for (const b of s.bullets) {
        ctx.fillStyle = '#22D3EE';
        ctx.beginPath();
        ctx.arc(b.x, b.y, 4.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(b.x, b.y, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw Enemy Plasma Orbs
      for (const orb of s.enemyOrbs) {
        ctx.fillStyle = orb.color;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, 6.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#F5D0FE';
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, 2.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw Player Tactical Mech
      ctx.save();
      ctx.translate(s.playerX, s.playerY);
      if (s.playerInvuln > 0) {
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.75)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, 24, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.rotate(s.playerAngle);
      const kick = -s.playerRecoil;

      // Aim laser sight line
      if (s.phase === 'playing') {
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.22)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(18, 0);
        ctx.lineTo(140, 0);
        ctx.stroke();
      }

      // Twin rail barrel
      ctx.fillStyle = '#06B6D4';
      ctx.fillRect(4 + kick, -5, 20, 10);
      ctx.fillStyle = '#E0F2FE';
      ctx.fillRect(14 + kick, -2, 10, 4);

      // Chassis body
      ctx.fillStyle = '#0EA5E9';
      ctx.strokeStyle = '#070B14';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(kick * 0.4, 0, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Visor core
      ctx.fillStyle = '#E0F2FE';
      ctx.beginPath();
      ctx.arc(4 + kick * 0.4, 0, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Draw Pooled Particles
      for (const p of s.particles) {
        if (!p.active) continue;
        const alpha = Math.max(0, p.life / p.maxLife);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Crosshair Reticle
      if (s.phase === 'playing') {
        ctx.strokeStyle = s.ammo > 0 ? '#22D3EE' : '#F43F5E';
        ctx.lineWidth = 1.75;
        ctx.beginPath();
        ctx.arc(s.mouseX, s.mouseY, 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(s.mouseX - 15, s.mouseY);
        ctx.lineTo(s.mouseX - 6, s.mouseY);
        ctx.moveTo(s.mouseX + 6, s.mouseY);
        ctx.lineTo(s.mouseX + 15, s.mouseY);
        ctx.moveTo(s.mouseX, s.mouseY - 15);
        ctx.lineTo(s.mouseX, s.mouseY - 6);
        ctx.moveTo(s.mouseX, s.mouseY + 6);
        ctx.lineTo(s.mouseX, s.mouseY + 15);
        ctx.stroke();
      }

      ctx.restore();
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTs) / 1000));
      lastTs = now;
      stepSimulation(dt);
      renderScene();
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [openQuizGate, syncHud]);

  const projectPointer = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    simRef.current.mouseX = ((clientX - rect.left) / rect.width) * ARENA_W;
    simRef.current.mouseY = ((clientY - rect.top) / rect.height) * ARENA_H;
  };

  const levelCfg = SHOOTER_LEVELS[hud.levelIndex] ?? SHOOTER_LEVELS[0];

  return (
    <div
      data-testid="tactical-shooter-shell"
      data-state={hud.phase}
      className="rounded-2xl border border-[#06B6D4]/30 bg-[#070B14] text-slate-100 overflow-hidden shadow-xl"
    >
      {/* Perimeter Tactical HUD Bar (Solid dark surface — zero backdrop-blur over canvas) */}
      <div className="px-4 py-2.5 bg-[#0C1324] border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4">
          {/* Level & Eliminations */}
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#22D3EE]">
              {levelCfg.title}
            </p>
            <p className="font-mono text-sm font-extrabold tabular-nums text-white">
              Elims {hud.eliminations} / {hud.targetEliminations}
            </p>
          </div>

          {/* HP Hearts */}
          <div className="flex items-center gap-1" aria-label={`Health ${hud.hp} of ${MAX_HP}`}>
            {Array.from({ length: MAX_HP }).map((_, i) => (
              <Heart
                key={i}
                className={`w-4 h-4 ${
                  i < hud.hp ? 'text-rose-500 fill-rose-500' : 'text-slate-700'
                }`}
              />
            ))}
          </div>

          {/* Ammo Clip */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
              AMMO
            </span>
            <div className="flex items-center gap-0.5">
              {Array.from({ length: MAX_AMMO }).map((_, i) => (
                <span
                  key={i}
                  className={`w-1.5 h-3.5 rounded-xs ${
                    i < hud.ammo ? 'bg-[#22D3EE]' : 'bg-slate-800'
                  }`}
                />
              ))}
            </div>
            <span className="font-mono text-xs font-bold tabular-nums text-[#22D3EE]">
              {hud.ammo}/{MAX_AMMO}
            </span>
            {hud.phase === 'playing' && hud.ammo < MAX_AMMO && (
              <button
                type="button"
                onClick={() => openQuizGate('reload-quiz')}
                className="px-2 py-0.5 rounded-md bg-[#F97316]/20 border border-[#F97316]/45 text-[10px] font-bold text-[#FB923C] hover:bg-[#F97316]/30"
              >
                Reload [R]
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="text-right font-mono tabular-nums pr-1">
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
            className="w-8 h-8 rounded-lg bg-[#162033] border border-white/10 hover:border-[#06B6D4] flex items-center justify-center text-slate-300"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {hud.phase === 'playing' || hud.phase === 'paused' ? (
            <button
              type="button"
              tabIndex={-1}
              aria-label={hud.phase === 'paused' ? 'Resume game' : 'Pause game'}
              onClick={(e) => {
                e.currentTarget.blur();
                simRef.current.phase = hud.phase === 'paused' ? 'playing' : 'paused';
                syncHud();
              }}
              className="w-8 h-8 rounded-lg bg-[#162033] border border-white/10 hover:border-[#06B6D4] flex items-center justify-center text-slate-300"
            >
              {hud.phase === 'paused' ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </button>
          ) : null}

          <button
            type="button"
            tabIndex={-1}
            aria-label="Restart level"
            onClick={(e) => {
              e.currentTarget.blur();
              startLevel(hud.levelIndex, hud.levelIndex === 0);
            }}
            className="w-8 h-8 rounded-lg bg-[#162033] border border-white/10 hover:border-[#06B6D4] flex items-center justify-center text-slate-300"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Live Canvas Stage + Crisp Phase Modals */}
      <div className="relative w-full aspect-[820/470] bg-[#060B16] select-none">
        <canvas
          ref={canvasRef}
          width={ARENA_W}
          height={ARENA_H}
          data-testid="tactical-shooter-canvas"
          onMouseMove={(e) => projectPointer(e.clientX, e.clientY)}
          onMouseDown={(e) => {
            projectPointer(e.clientX, e.clientY);
            simRef.current.mouseDown = true;
          }}
          onMouseUp={() => {
            simRef.current.mouseDown = false;
          }}
          onMouseLeave={() => {
            simRef.current.mouseDown = false;
          }}
          className="w-full h-full block cursor-crosshair"
        />

        {/* TITLE OVERLAY */}
        {hud.phase === 'title' && (
          <div className="absolute inset-0 bg-[#060B16]/82 flex flex-col items-center justify-center p-6 text-center">
            <div className="max-w-md space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#06B6D4]/15 border border-[#06B6D4]/45 text-[#22D3EE] flex items-center justify-center mx-auto">
                <Crosshair className="w-6 h-6" />
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Apex Tactical Shooter
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Eliminate Swarmers, Ranged Kiters, and Armored Chargers across 3 escalating levels. Empty clip? Answer a syllabus question to reload! Hit 0 HP? Solve a Revive challenge to jump right back in.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                {SHOOTER_LEVELS.map((lvl, idx) => (
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
                        ? 'bg-[#06B6D4] hover:bg-[#22D3EE] text-[#060B16]'
                        : 'bg-[#111B33] hover:bg-[#19284A] border border-white/15 text-slate-100'
                    }`}
                  >
                    Start Level {lvl.level}
                  </button>
                ))}
              </div>

              <p className="text-[11px] font-mono text-slate-400 pt-2">
                WASD / Arrows Move · Mouse Aim &amp; Click / Space Fire · R Reload · P Pause
              </p>
            </div>
          </div>
        )}

        {/* SYLLABUS RELOAD / REVIVE GATE OVERLAY */}
        {(hud.phase === 'reload-quiz' || hud.phase === 'revive-quiz') && activeQuiz && (
          <div
            data-testid="shooter-syllabus-gate"
            className="absolute inset-0 bg-[#060B16]/90 flex items-center justify-center p-4"
          >
            <div className="w-full max-w-lg rounded-2xl border border-[#06B6D4]/45 bg-[#0D162B] p-5 space-y-3.5 shadow-2xl">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 font-mono text-xs font-extrabold uppercase tracking-wider text-[#FB923C]">
                  {hud.phase === 'revive-quiz' ? (
                    <>
                      <Shield className="w-4 h-4 text-emerald-400" />
                      Emergency Revive Challenge ({hud.revivesLeft} left)
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 text-[#22D3EE]" />
                      Tactical Reload · Solve to Refill Clip
                    </>
                  )}
                </span>
                <span className="font-mono text-[11px] text-slate-400">
                  {activeQuiz.subject} · {activeQuiz.chapter}
                </span>
              </div>

              <p className="text-sm font-semibold text-white leading-snug">{activeQuiz.prompt}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {activeQuiz.options.map((opt, idx) => {
                  const chosen = quizFeedback?.selectedIndex === idx;
                  const isCorrect = idx === activeQuiz.correctIndex;
                  const style = quizFeedback
                    ? isCorrect
                      ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200'
                      : chosen
                        ? 'border-rose-400 bg-rose-500/20 text-rose-200'
                        : 'border-white/10 bg-[#111B33] text-slate-400'
                    : 'border-white/15 bg-[#111B33] hover:border-[#22D3EE] hover:bg-[#172647] text-slate-100';
                  return (
                    <button
                      key={opt}
                      type="button"
                      disabled={Boolean(quizFeedback)}
                      onClick={() => handleQuizOptionClick(idx)}
                      className={`text-left px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-colors ${style}`}
                    >
                      <span className="font-mono font-bold mr-2 text-[#22D3EE]">
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
                  <p className="text-[11px] opacity-85 mt-0.5">{activeQuiz.explanation}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PAUSED MODAL */}
        {hud.phase === 'paused' && (
          <div className="absolute inset-0 bg-[#060B16]/85 flex items-center justify-center p-4">
            <div className="rounded-2xl border border-white/15 bg-[#0D162B] p-6 text-center space-y-4 max-w-xs w-full">
              <h3 className="font-display text-xl font-extrabold text-white">Mission Paused</h3>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    simRef.current.phase = 'playing';
                    syncHud();
                  }}
                  className="py-2.5 rounded-xl bg-[#06B6D4] text-[#060B16] text-xs font-extrabold"
                >
                  Resume Mission
                </button>
                <button
                  type="button"
                  onClick={() => startLevel(hud.levelIndex, false)}
                  className="py-2.5 rounded-xl bg-[#162033] border border-white/15 text-slate-200 text-xs font-bold"
                >
                  Restart Level {hud.levelIndex + 1}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* LEVEL CLEAR / VICTORY / GAME OVER MODAL */}
        {(hud.phase === 'level-clear' || hud.phase === 'victory' || hud.phase === 'gameover') && (
          <div className="absolute inset-0 bg-[#060B16]/88 flex items-center justify-center p-4">
            <div className="rounded-2xl border border-[#06B6D4]/40 bg-[#0D162B] p-6 text-center space-y-4 max-w-sm w-full">
              <div className="w-11 h-11 rounded-2xl bg-amber-400/15 border border-amber-400/40 text-amber-300 flex items-center justify-center mx-auto">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display text-xl font-extrabold text-white">
                  {hud.phase === 'victory'
                    ? 'All 3 Sectors Cleared!'
                    : hud.phase === 'level-clear'
                      ? `Level ${hud.levelIndex + 1} Cleared!`
                      : 'Mission Failed'}
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  Score: <strong className="font-mono text-amber-300">{hud.score}</strong> · Elims:{' '}
                  <strong className="font-mono text-[#22D3EE]">
                    {hud.eliminations}/{hud.targetEliminations}
                  </strong>
                </p>
              </div>
              <div className="flex items-center justify-center gap-2.5">
                {hud.phase === 'level-clear' ? (
                  <button
                    type="button"
                    data-start="true"
                    onClick={() => startLevel(hud.levelIndex + 1, false)}
                    className="px-5 py-2.5 rounded-xl bg-[#06B6D4] hover:bg-[#22D3EE] text-[#060B16] text-xs font-extrabold"
                  >
                    Advance to Level {hud.levelIndex + 2}
                  </button>
                ) : (
                  <button
                    type="button"
                    data-start="true"
                    onClick={() => startLevel(0, true)}
                    className="px-5 py-2.5 rounded-xl bg-[#06B6D4] hover:bg-[#22D3EE] text-[#060B16] text-xs font-extrabold"
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
