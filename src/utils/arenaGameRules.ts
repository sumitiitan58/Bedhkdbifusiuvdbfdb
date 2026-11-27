export type ArenaSyllabusSubject = 'Physics' | 'Chemistry' | 'Mathematics' | 'Biology';

export interface ArenaSyllabusQuestion {
  id: string;
  subject: ArenaSyllabusSubject;
  chapter: string;
  prompt: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanation: string;
}

export type ShooterEnemyArchetype = 'swarmer' | 'kiter' | 'charger';

export interface ShooterLevelConfig {
  level: 1 | 2 | 3;
  title: string;
  subtitle: string;
  targetEliminations: number;
  spawnIntervalSec: number;
  maxActiveEnemies: number;
  maxAttackTokens: number;
  speedScale: number;
  archetypePool: ShooterEnemyArchetype[];
}

export interface BubbleLevelConfig {
  level: 1 | 2 | 3;
  title: string;
  subtitle: string;
  colorCount: number;
  initialRows: number;
  targetPops: number;
  missesBeforeDrop: number;
}

export const ARENA_SYLLABUS_QUESTIONS: ArenaSyllabusQuestion[] = [
  {
    id: 'aq-phy-1',
    subject: 'Physics',
    chapter: 'Electrostatics',
    prompt: 'Two identical point charges q are separated by distance r. If r is doubled, the electrostatic force becomes:',
    options: ['F / 2', 'F / 4', '2F', '4F'],
    correctIndex: 1,
    explanation: 'By Coulomb law F ∝ 1/r², so doubling r reduces F to F/4.',
  },
  {
    id: 'aq-phy-2',
    subject: 'Physics',
    chapter: 'Current Electricity',
    prompt: 'Three resistors of 6 Ω each are connected in parallel. Their equivalent resistance is:',
    options: ['18 Ω', '3 Ω', '2 Ω', '1 Ω'],
    correctIndex: 2,
    explanation: 'For n equal resistors in parallel, R_eq = R/n = 6/3 = 2 Ω.',
  },
  {
    id: 'aq-phy-3',
    subject: 'Physics',
    chapter: 'Rotational Motion',
    prompt: 'The moment of inertia of a uniform solid sphere of mass M and radius R about its diameter is:',
    options: ['(1/2)MR²', '(2/3)MR²', '(2/5)MR²', 'MR²'],
    correctIndex: 2,
    explanation: 'A solid sphere has I = (2/5)MR² about any diameter.',
  },
  {
    id: 'aq-phy-4',
    subject: 'Physics',
    chapter: 'Modern Physics',
    prompt: 'If the kinetic energy of a free electron is quadrupled, its de Broglie wavelength becomes:',
    options: ['Half', 'Double', 'One-fourth', 'Four times'],
    correctIndex: 0,
    explanation: 'λ = h / √(2mK) ∝ 1/√K; quadrupling K halves λ.',
  },
  {
    id: 'aq-phy-5',
    subject: 'Physics',
    chapter: 'Gravitation',
    prompt: 'The escape velocity from a planet of mass M and radius R is proportional to:',
    options: ['√(M / R)', 'M / R²', '√(M · R)', 'M² / R'],
    correctIndex: 0,
    explanation: 'Escape velocity v_e = √(2GM / R), so v_e ∝ √(M/R).',
  },
  {
    id: 'aq-chem-1',
    subject: 'Chemistry',
    chapter: 'Chemical Bonding',
    prompt: 'According to VSEPR theory, the molecular geometry of SF₆ is:',
    options: ['Trigonal bipyramidal', 'Square pyramidal', 'Octahedral', 'Tetrahedral'],
    correctIndex: 2,
    explanation: 'SF₆ has 6 bond pairs and 0 lone pairs (sp³d²), giving an octahedral shape.',
  },
  {
    id: 'aq-chem-2',
    subject: 'Chemistry',
    chapter: 'Organic Chemistry',
    prompt: 'Which reagent distinguishes an aldehyde from a ketone by forming a silver mirror?',
    options: ['Lucas reagent', 'Tollens reagent', 'Bayer reagent', 'Hinsberg reagent'],
    correctIndex: 1,
    explanation: 'Ammoniacal AgNO₃ (Tollens reagent) oxidizes aldehydes and deposits metallic Ag.',
  },
  {
    id: 'aq-chem-3',
    subject: 'Chemistry',
    chapter: 'Chemical Kinetics',
    prompt: 'For a first-order reaction, the half-life t₁/₂ is:',
    options: [
      'Directly proportional to initial concentration',
      'Inversely proportional to initial concentration',
      'Independent of initial concentration',
      'Proportional to square of initial concentration',
    ],
    correctIndex: 2,
    explanation: 'For first-order kinetics, t₁/₂ = 0.693 / k, completely independent of [A]₀.',
  },
  {
    id: 'aq-chem-4',
    subject: 'Chemistry',
    chapter: 'Thermodynamics',
    prompt: 'A process is spontaneous at all temperatures when:',
    options: ['ΔH > 0 and ΔS < 0', 'ΔH < 0 and ΔS > 0', 'ΔH < 0 and ΔS < 0', 'ΔH > 0 and ΔS > 0'],
    correctIndex: 1,
    explanation: 'ΔG = ΔH - TΔS is always negative when ΔH < 0 and ΔS > 0.',
  },
  {
    id: 'aq-math-1',
    subject: 'Mathematics',
    chapter: 'Calculus',
    prompt: 'What is the value of the limit lim(x → 0) (sin 5x) / x ?',
    options: ['1', '0', '5', '1/5'],
    correctIndex: 2,
    explanation: 'lim(x→0) (sin kx)/x = k, so lim(x→0) (sin 5x)/x = 5.',
  },
  {
    id: 'aq-math-2',
    subject: 'Mathematics',
    chapter: 'Matrices & Determinants',
    prompt: 'If A is a 3×3 matrix with det(A) = 4, then det(2A) equals:',
    options: ['8', '16', '32', '64'],
    correctIndex: 2,
    explanation: 'For an n×n matrix, det(kA) = kⁿ det(A) = 2³ × 4 = 32.',
  },
  {
    id: 'aq-math-3',
    subject: 'Mathematics',
    chapter: 'Coordinate Geometry',
    prompt: 'The eccentricity of a rectangular hyperbola x² − y² = a² is:',
    options: ['1', '√2', '2', '1 / √2'],
    correctIndex: 1,
    explanation: 'For a rectangular hyperbola a = b, so e = √(1 + b²/a²) = √2.',
  },
  {
    id: 'aq-math-4',
    subject: 'Mathematics',
    chapter: 'Vectors',
    prompt: 'If a · b = 0 for two non-zero vectors a and b, the angle between them is:',
    options: ['0°', '45°', '90°', '180°'],
    correctIndex: 2,
    explanation: 'a · b = |a||b|cos θ = 0 implies cos θ = 0, so θ = 90°.',
  },
  {
    id: 'aq-bio-1',
    subject: 'Biology',
    chapter: 'Cell Cycle',
    prompt: 'DNA replication takes place during which phase of the eukaryotic cell cycle?',
    options: ['G₁ phase', 'S phase', 'G₂ phase', 'M phase'],
    correctIndex: 1,
    explanation: 'DNA synthesis (replication) occurs exclusively during the S (Synthesis) phase.',
  },
  {
    id: 'aq-bio-2',
    subject: 'Biology',
    chapter: 'Genetics',
    prompt: 'Which codon acts as both the initiation codon and codes for Methionine?',
    options: ['UAA', 'UAG', 'AUG', 'UGA'],
    correctIndex: 2,
    explanation: 'AUG is the universal start codon and codes for Methionine (Met).',
  },
  {
    id: 'aq-bio-3',
    subject: 'Biology',
    chapter: 'Plant Physiology',
    prompt: 'The primary CO₂ acceptor in C₄ plants inside mesophyll cells is:',
    options: ['RuBP', 'PEP', 'OAA', 'PGA'],
    correctIndex: 1,
    explanation: 'Phosphoenolpyruvate (PEP) accepts CO₂ via PEPcase in C₄ mesophyll cells.',
  },
];

export const SHOOTER_LEVELS: ShooterLevelConfig[] = [
  {
    level: 1,
    title: 'Level 1 · Perimeter Patrol',
    subtitle: 'Clear 8 drones · Swarmers & Ranged Kiters',
    targetEliminations: 8,
    spawnIntervalSec: 1.85,
    maxActiveEnemies: 4,
    maxAttackTokens: 2,
    speedScale: 1.0,
    archetypePool: ['swarmer', 'swarmer', 'kiter'],
  },
  {
    level: 2,
    title: 'Level 2 · Plasma Corridor',
    subtitle: 'Clear 12 drones · Chargers enter the sector',
    targetEliminations: 12,
    spawnIntervalSec: 1.45,
    maxActiveEnemies: 5,
    maxAttackTokens: 3,
    speedScale: 1.18,
    archetypePool: ['swarmer', 'kiter', 'charger', 'swarmer'],
  },
  {
    level: 3,
    title: 'Level 3 · Apex Citadel',
    subtitle: 'Clear 16 elites · Full tactical wave assault',
    targetEliminations: 16,
    spawnIntervalSec: 1.15,
    maxActiveEnemies: 6,
    maxAttackTokens: 3,
    speedScale: 1.35,
    archetypePool: ['swarmer', 'kiter', 'charger'],
  },
];

export const BUBBLE_LEVELS: BubbleLevelConfig[] = [
  {
    level: 1,
    title: 'Level 1 · Resonance Grid',
    subtitle: 'Pop 18 bubbles · 4 spectrum colors',
    colorCount: 4,
    initialRows: 4,
    targetPops: 18,
    missesBeforeDrop: 6,
  },
  {
    level: 2,
    title: 'Level 2 · Quantum Lattice',
    subtitle: 'Pop 26 bubbles · 5 spectrum colors',
    colorCount: 5,
    initialRows: 5,
    targetPops: 26,
    missesBeforeDrop: 5,
  },
  {
    level: 3,
    title: 'Level 3 · Supernova Core',
    subtitle: 'Pop 34 bubbles · 6 spectrum colors',
    colorCount: 6,
    initialRows: 5,
    targetPops: 34,
    missesBeforeDrop: 4,
  },
];

export function pickArenaQuestion(
  usedIds: Set<string>,
  preferredSubject?: ArenaSyllabusSubject
): ArenaSyllabusQuestion {
  const candidates = preferredSubject
    ? ARENA_SYLLABUS_QUESTIONS.filter((q) => q.subject === preferredSubject)
    : ARENA_SYLLABUS_QUESTIONS;
  const fresh = candidates.filter((q) => !usedIds.has(q.id));
  const pool = fresh.length > 0 ? fresh : candidates.length > 0 ? candidates : ARENA_SYLLABUS_QUESTIONS;
  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx];
}

export function resolveReloadAttempt(params: {
  selectedIndex: number;
  correctIndex: number;
  maxAmmo: number;
  currentScore: number;
}): {
  reloaded: boolean;
  fullClip: boolean;
  nextAmmo: number;
  nextScore: number;
  scoreDelta: number;
  message: string;
} {
  if (params.selectedIndex === params.correctIndex) {
    const bonus = 60;
    return {
      reloaded: true,
      fullClip: true,
      nextAmmo: params.maxAmmo,
      nextScore: params.currentScore + bonus,
      scoreDelta: bonus,
      message: `Full clip reloaded (${params.maxAmmo}/${params.maxAmmo}) +${bonus} Tactical Bonus!`,
    };
  }
  const reserve = Math.max(3, Math.ceil(params.maxAmmo * 0.4));
  return {
    reloaded: true,
    fullClip: false,
    nextAmmo: reserve,
    nextScore: params.currentScore,
    scoreDelta: 0,
    message: `Emergency reserve loaded (${reserve}/${params.maxAmmo}). Review the concept and stay sharp!`,
  };
}

export function resolveReviveAttempt(params: {
  selectedIndex: number;
  correctIndex: number;
  maxHp: number;
  maxAmmo: number;
  currentScore: number;
}): {
  revived: boolean;
  nextHp: number;
  nextAmmo: number;
  nextScore: number;
  scoreDelta: number;
  message: string;
} {
  if (params.selectedIndex === params.correctIndex) {
    const bonus = 100;
    return {
      revived: true,
      nextHp: params.maxHp,
      nextAmmo: params.maxAmmo,
      nextScore: params.currentScore + bonus,
      scoreDelta: bonus,
      message: `Revive Shield Online! Full HP (${params.maxHp}/${params.maxHp}) & Ammo restored (+${bonus} pts).`,
    };
  }
  return {
    revived: false,
    nextHp: 0,
    nextAmmo: 0,
    nextScore: params.currentScore,
    scoreDelta: 0,
    message: 'Revive sequence failed — squad down. Retry the mission!',
  };
}

export function resolvePowerShotAttempt(params: {
  selectedIndex: number;
  correctIndex: number;
}): {
  granted: boolean;
  bonusScore: number;
  message: string;
} {
  if (params.selectedIndex === params.correctIndex) {
    return {
      granted: true,
      bonusScore: 80,
      message: 'Plasma Bomb armed! Next shot blasts a 3x3 cluster (+80 pts).',
    };
  }
  return {
    granted: false,
    bonusScore: 0,
    message: 'Charge missed — review the concept and keep popping clusters!',
  };
}

/**
 * Offset hex grid neighbors (odd-r horizontal layout: odd rows shift right by half a bubble).
 */
export function getHexNeighbors(
  row: number,
  col: number,
  rowCount: number,
  colCount: number
): Array<[number, number]> {
  const isOdd = row % 2 === 1;
  const deltas: Array<[number, number]> = isOdd
    ? [
        [0, -1],
        [0, 1],
        [-1, 0],
        [-1, 1],
        [1, 0],
        [1, 1],
      ]
    : [
        [0, -1],
        [0, 1],
        [-1, -1],
        [-1, 0],
        [1, -1],
        [1, 0],
      ];

  const result: Array<[number, number]> = [];
  for (const [dr, dc] of deltas) {
    const nr = row + dr;
    const nc = col + dc;
    if (nr >= 0 && nr < rowCount && nc >= 0 && nc < colCount) {
      result.push([nr, nc]);
    }
  }
  return result;
}

/**
 * BFS for all connected bubbles of the same color starting from (startRow, startCol).
 */
export function findMatchingBubbleCluster(
  grid: Array<Array<number | null>>,
  startRow: number,
  startCol: number
): Array<[number, number]> {
  const rowCount = grid.length;
  const colCount = grid[0]?.length ?? 0;
  if (startRow < 0 || startRow >= rowCount || startCol < 0 || startCol >= colCount) {
    return [];
  }
  const targetColor = grid[startRow][startCol];
  if (targetColor === null || targetColor === undefined) return [];

  const visited = new Set<string>();
  const queue: Array<[number, number]> = [[startRow, startCol]];
  const cluster: Array<[number, number]> = [];
  visited.add(`${startRow},${startCol}`);

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    cluster.push([r, c]);
    for (const [nr, nc] of getHexNeighbors(r, c, rowCount, colCount)) {
      const key = `${nr},${nc}`;
      if (!visited.has(key) && grid[nr][nc] === targetColor) {
        visited.add(key);
        queue.push([nr, nc]);
      }
    }
  }
  return cluster;
}

/**
 * Finds all occupied bubbles that are no longer anchored to row 0 (ceiling) after a pop.
 */
export function findFloatingBubbles(grid: Array<Array<number | null>>): Array<[number, number]> {
  const rowCount = grid.length;
  const colCount = grid[0]?.length ?? 0;
  const anchored = new Set<string>();
  const queue: Array<[number, number]> = [];

  for (let c = 0; c < colCount; c++) {
    if (grid[0]?.[c] !== null && grid[0]?.[c] !== undefined) {
      anchored.add(`0,${c}`);
      queue.push([0, c]);
    }
  }

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    for (const [nr, nc] of getHexNeighbors(r, c, rowCount, colCount)) {
      const key = `${nr},${nc}`;
      if (!anchored.has(key) && grid[nr][nc] !== null && grid[nr][nc] !== undefined) {
        anchored.add(key);
        queue.push([nr, nc]);
      }
    }
  }

  const floating: Array<[number, number]> = [];
  for (let r = 0; r < rowCount; r++) {
    for (let c = 0; c < colCount; c++) {
      if (grid[r][c] !== null && grid[r][c] !== undefined && !anchored.has(`${r},${c}`)) {
        floating.push([r, c]);
      }
    }
  }
  return floating;
}

export function calculateBubblePopScore(
  clusterCount: number,
  droppedCount: number,
  combo: number
): number {
  const safeCombo = Math.max(1, combo);
  return (clusterCount * 25 + droppedCount * 40) * safeCombo;
}
