export interface FormulaGateChallenge {
  id: string;
  subject: 'Physics' | 'Chemistry' | 'Mathematics';
  prompt: string;
  lanes: [string, string, string];
  correctLane: 0 | 1 | 2;
  concept: string;
}

export interface FormulaRunnerState {
  lane: 0 | 1 | 2;
  speedKmh: number;
  shields: number;
  maxShields: number;
  score: number;
  combo: number;
  maxCombo: number;
  nitroTimer: number;
  distanceMeters: number;
  gatesCleared: number;
  gatesAttempted: number;
  status: 'title' | 'playing' | 'gameover';
}

export const FORMULA_RUNNER_BANK: FormulaGateChallenge[] = [
  {
    id: 'fr-1',
    subject: 'Physics',
    prompt: 'Escape Velocity from Earth surface',
    lanes: ['√(2gR)', '√(gR)', '2gR²'],
    correctLane: 0,
    concept: 'Gravitation',
  },
  {
    id: 'fr-2',
    subject: 'Physics',
    prompt: 'Electric Flux via Gauss Law',
    lanes: ['q · ε₀', 'q / ε₀', 'q / (4πε₀)'],
    correctLane: 1,
    concept: 'Electrostatics',
  },
  {
    id: 'fr-3',
    subject: 'Chemistry',
    prompt: 'First-Order Half-Life (t₁/₂)',
    lanes: ['k / 0.693', '1 / (k[A]₀)', '0.693 / k'],
    correctLane: 2,
    concept: 'Chemical Kinetics',
  },
  {
    id: 'fr-4',
    subject: 'Mathematics',
    prompt: 'Derivative of tan(x)',
    lanes: ['sec²(x)', 'cot(x)', 'sec(x)tan(x)'],
    correctLane: 0,
    concept: 'Differential Calculus',
  },
  {
    id: 'fr-5',
    subject: 'Physics',
    prompt: 'de Broglie Wavelength (λ)',
    lanes: ['h · p', 'h / p', 'p / h'],
    correctLane: 1,
    concept: 'Modern Physics',
  },
  {
    id: 'fr-6',
    subject: 'Chemistry',
    prompt: 'Gibbs Free Energy Standard Relation',
    lanes: ['ΔH + TΔS', 'ΔH − TΔS', 'TΔS − ΔH'],
    correctLane: 1,
    concept: 'Thermodynamics',
  },
  {
    id: 'fr-7',
    subject: 'Mathematics',
    prompt: 'Integral ∫ (1 / x) dx',
    lanes: ['−1/x² + C', 'eˣ + C', 'ln|x| + C'],
    correctLane: 2,
    concept: 'Indefinite Integration',
  },
  {
    id: 'fr-8',
    subject: 'Physics',
    prompt: 'Energy stored in a Capacitor',
    lanes: ['½ CV²', 'CV', 'C / V²'],
    correctLane: 0,
    concept: 'Capacitance',
  },
  {
    id: 'fr-9',
    subject: 'Chemistry',
    prompt: 'Ideal Gas Equation',
    lanes: ['P = nRTV', 'PV = nRT', 'PT = nRV'],
    correctLane: 1,
    concept: 'States of Matter',
  },
  {
    id: 'fr-10',
    subject: 'Mathematics',
    prompt: 'Sum of infinite GP (|r| < 1)',
    lanes: ['a / (1 + r)', 'a(1 − r)', 'a / (1 − r)'],
    correctLane: 2,
    concept: 'Sequences & Series',
  },
  {
    id: 'fr-11',
    subject: 'Physics',
    prompt: 'Lorentz Magnetic Force on charge q',
    lanes: ['q(v × B)', 'q(E × B)', 'qv / B'],
    correctLane: 0,
    concept: 'Magnetism',
  },
  {
    id: 'fr-12',
    subject: 'Chemistry',
    prompt: 'Spin-Only Magnetic Moment (BM)',
    lanes: ['n(n+2)', '√[n(n+2)]', '√(2n)'],
    correctLane: 1,
    concept: 'Coordination Chemistry',
  },
];

export function createInitialFormulaRunnerState(): FormulaRunnerState {
  return {
    lane: 1,
    speedKmh: 140,
    shields: 3,
    maxShields: 3,
    score: 0,
    combo: 0,
    maxCombo: 0,
    nitroTimer: 0,
    distanceMeters: 0,
    gatesCleared: 0,
    gatesAttempted: 0,
    status: 'title',
  };
}

export function resolveFormulaGatePass(
  state: FormulaRunnerState,
  chosenLane: 0 | 1 | 2,
  correctLane: 0 | 1 | 2
): { nextState: FormulaRunnerState; hitCorrect: boolean } {
  const hitCorrect = chosenLane === correctLane;
  if (hitCorrect) {
    const nextCombo = state.combo + 1;
    const multiplier = 1 + Math.min(nextCombo, 8) * 0.25;
    return {
      hitCorrect: true,
      nextState: {
        ...state,
        combo: nextCombo,
        maxCombo: Math.max(state.maxCombo, nextCombo),
        score: state.score + Math.round(120 * multiplier),
        speedKmh: Math.min(340, state.speedKmh + 22),
        nitroTimer: 2.2,
        gatesCleared: state.gatesCleared + 1,
        gatesAttempted: state.gatesAttempted + 1,
      },
    };
  }
  const nextShields = Math.max(0, state.shields - 1);
  return {
    hitCorrect: false,
    nextState: {
      ...state,
      combo: 0,
      shields: nextShields,
      speedKmh: Math.max(95, state.speedKmh - 42),
      nitroTimer: 0,
      gatesAttempted: state.gatesAttempted + 1,
      status: nextShields <= 0 ? 'gameover' : state.status,
    },
  };
}

// ==========================================
// CONCEPT TOWER DEFENSE LOGIC
// ==========================================

export type TurretTypeId = 'optics-laser' | 'organic-acid' | 'calculus-pulse';

export interface TurretArchetype {
  id: TurretTypeId;
  name: string;
  subject: 'Physics' | 'Chemistry' | 'Mathematics';
  color: string;
  baseCost: number;
  baseDamage: number;
  baseRange: number;
  fireIntervalSec: number;
  description: string;
}

export const TURRET_ARCHETYPES: Record<TurretTypeId, TurretArchetype> = {
  'optics-laser': {
    id: 'optics-laser',
    name: 'Optics Laser',
    subject: 'Physics',
    color: '#38bdf8',
    baseCost: 70,
    baseDamage: 24,
    baseRange: 175,
    fireIntervalSec: 0.65,
    description: 'High-speed coherent beam tuned for Silly-Mistake Drones.',
  },
  'organic-acid': {
    id: 'organic-acid',
    name: 'Organic Acid Cannon',
    subject: 'Chemistry',
    color: '#34d399',
    baseCost: 90,
    baseDamage: 38,
    baseRange: 145,
    fireIntervalSec: 1.05,
    description: 'Corrosive splash shell shredding armored Sign-Error Sprinters.',
  },
  'calculus-pulse': {
    id: 'calculus-pulse',
    name: 'Calculus Pulse Tower',
    subject: 'Mathematics',
    color: '#c084fc',
    baseCost: 115,
    baseDamage: 56,
    baseRange: 205,
    fireIntervalSec: 1.35,
    description: 'Long-range harmonic shockwave breaking Concept-Trap Bosses.',
  },
};

export interface PlacedTurret {
  id: string;
  slotIndex: number;
  type: TurretTypeId;
  level: number;
  x: number;
  y: number;
  cooldownSec: number;
  ammo: number;
  maxAmmo: number;
}

export type EnemyArchetypeId = 'silly-drone' | 'sign-sprinter' | 'trap-boss';

export interface TowerEnemy {
  id: string;
  archetype: EnemyArchetypeId;
  label: string;
  hp: number;
  maxHp: number;
  speed: number;
  progress: number; // 0 to 1 along path
  rewardEnergy: number;
  coreDamage: number;
  color: string;
}

export function getTurretStats(turret: PlacedTurret): {
  damage: number;
  range: number;
  fireIntervalSec: number;
  upgradeCost: number;
} {
  const base = TURRET_ARCHETYPES[turret.type];
  const levelMult = 1 + (turret.level - 1) * 0.45;
  return {
    damage: Math.round(base.baseDamage * levelMult),
    range: Math.round(base.baseRange * (1 + (turret.level - 1) * 0.1)),
    fireIntervalSec: Math.max(0.32, base.fireIntervalSec * Math.pow(0.9, turret.level - 1)),
    upgradeCost: Math.round(base.baseCost * (0.85 * turret.level)),
  };
}

export function createWaveEnemies(waveNumber: number): TowerEnemy[] {
  const enemies: TowerEnemy[] = [];
  const count = 4 + waveNumber * 2;
  for (let i = 0; i < count; i++) {
    const isBoss = waveNumber >= 2 && i === count - 1;
    const isSprinter = !isBoss && i % 3 === 1;
    const archetype: EnemyArchetypeId = isBoss
      ? 'trap-boss'
      : isSprinter
        ? 'sign-sprinter'
        : 'silly-drone';
    const baseHp = isBoss ? 220 + waveNumber * 65 : isSprinter ? 70 + waveNumber * 18 : 95 + waveNumber * 22;
    enemies.push({
      id: `w${waveNumber}-e${i}-${Date.now()}`,
      archetype,
      label: isBoss
        ? 'Concept-Trap Boss'
        : isSprinter
          ? 'Sign-Error Sprinter'
          : 'Silly-Mistake Drone',
      hp: baseHp,
      maxHp: baseHp,
      speed: isBoss ? 0.042 : isSprinter ? 0.095 : 0.066,
      progress: -i * 0.11,
      rewardEnergy: isBoss ? 85 : isSprinter ? 28 : 22,
      coreDamage: isBoss ? 30 : isSprinter ? 12 : 10,
      color: isBoss ? '#f43f5e' : isSprinter ? '#fbbf24' : '#fb923c',
    });
  }
  return enemies;
}

export function samplePathPoint(
  waypoints: ReadonlyArray<{ x: number; y: number }>,
  progress: number
): { x: number; y: number } {
  if (waypoints.length === 0) return { x: 0, y: 0 };
  if (progress <= 0) return waypoints[0];
  if (progress >= 1) return waypoints[waypoints.length - 1];

  const segLengths: number[] = [];
  let total = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const dx = waypoints[i + 1].x - waypoints[i].x;
    const dy = waypoints[i + 1].y - waypoints[i].y;
    const len = Math.hypot(dx, dy);
    segLengths.push(len);
    total += len;
  }
  let targetDist = progress * total;
  for (let i = 0; i < segLengths.length; i++) {
    if (targetDist <= segLengths[i] || i === segLengths.length - 1) {
      const t = segLengths[i] > 0 ? targetDist / segLengths[i] : 0;
      return {
        x: waypoints[i].x + (waypoints[i + 1].x - waypoints[i].x) * t,
        y: waypoints[i].y + (waypoints[i + 1].y - waypoints[i].y) * t,
      };
    }
    targetDist -= segLengths[i];
  }
  return waypoints[waypoints.length - 1];
}
