import type { DifficultyTier } from './chatHistoryLogic';

export type RobotAvatarId =
  | 'prepsbot-prime'
  | 'astra-bot'
  | 'bookbot-scholar'
  | 'cyber-buddy'
  | 'data-bot';

export interface RobotAvatarSpec {
  id: RobotAvatarId;
  name: string;
  roleTitle: string;
  perkSummary: string;
  primaryColor: string;
  accentColor: string;
  visorColor: string;
  coinMultiplier: number;
  moveSpeedMultiplier: number;
  quizTimeBonusSec: number;
  blasterPrecisionBonus: number;
  buildCostDiscount: number; // 0 to 0.25
}

export const ROBOT_AVATARS: RobotAvatarSpec[] = [
  {
    id: 'prepsbot-prime',
    name: 'PrepsBot Prime',
    roleTitle: 'Mascot Commander',
    perkSummary: '+25% Empire Coins on quiz streaks',
    primaryColor: '#2563eb',
    accentColor: '#C6FF00',
    visorColor: '#38bdf8',
    coinMultiplier: 1.25,
    moveSpeedMultiplier: 1.0,
    quizTimeBonusSec: 0,
    blasterPrecisionBonus: 0,
    buildCostDiscount: 0,
  },
  {
    id: 'astra-bot',
    name: 'Astra Bot',
    roleTitle: 'Scout & Driver',
    perkSummary: '+25% sprint speed & faster Gaadi / Ghoda Gaadi acceleration',
    primaryColor: '#7c3aed',
    accentColor: '#f59e0b',
    visorColor: '#fbbf24',
    coinMultiplier: 1.0,
    moveSpeedMultiplier: 1.25,
    quizTimeBonusSec: 0,
    blasterPrecisionBonus: 0.05,
    buildCostDiscount: 0,
  },
  {
    id: 'bookbot-scholar',
    name: 'BookBot Scholar',
    roleTitle: 'Grand Strategist',
    perkSummary: '+8s extra battle timer on Hard & Very Hard Palda questions',
    primaryColor: '#059669',
    accentColor: '#fde047',
    visorColor: '#6ee7b7',
    coinMultiplier: 1.1,
    moveSpeedMultiplier: 1.0,
    quizTimeBonusSec: 8,
    blasterPrecisionBonus: 0,
    buildCostDiscount: 0,
  },
  {
    id: 'cyber-buddy',
    name: 'Cyber Buddy',
    roleTitle: 'Sniper Defender',
    perkSummary: '+30% Blaster precision & instant Sniper Scope stabilization',
    primaryColor: '#e11d48',
    accentColor: '#22d3ee',
    visorColor: '#f43f5e',
    coinMultiplier: 1.0,
    moveSpeedMultiplier: 1.05,
    quizTimeBonusSec: 0,
    blasterPrecisionBonus: 0.3,
    buildCostDiscount: 0,
  },
  {
    id: 'data-bot',
    name: 'Data Bot',
    roleTitle: 'Imperial Architect',
    perkSummary: '20% reduced Empire Coin cost for Houses, Walls & Towers',
    primaryColor: '#0284c7',
    accentColor: '#a3e635',
    visorColor: '#bae6fd',
    coinMultiplier: 1.0,
    moveSpeedMultiplier: 1.0,
    quizTimeBonusSec: 0,
    blasterPrecisionBonus: 0,
    buildCostDiscount: 0.2,
  },
];

export type EmpireActionType =
  | 'earn-coins'
  | 'unlock-chest'
  | 'unlock-gate'
  | 'build-house'
  | 'build-tower'
  | 'build-wall'
  | 'summon-gaadi'
  | 'summon-ghoda-gaadi'
  | 'summon-senapati'
  | 'deploy-guard'
  | 'revive-player'
  | 'battle-raider'
  | 'palda-war';

export interface RivalEmpireSpec {
  id: string;
  name: string;
  commanderName: string;
  areaSqFt: number;
  treasuryCoins: number;
  bannerColor: string;
  tierLabel: string;
  difficulty: DifficultyTier;
  allied: boolean;
}

export interface EmpireSaveState {
  playerNameTag: string;
  avatarId: RobotAvatarId;
  areaSqFt: number;
  coins: number;
  housesBuilt: number;
  watchtowersBuilt: number;
  wallsBuilt: number;
  guardRobots: number;
  hasGaadi: boolean;
  hasGhodaGaadi: boolean;
  hasSenapati: boolean;
  unlockedChests: number;
  raidersDefeated: number;
  quizStreak: number;
  totalQuestionsSolved: number;
  alliedEmpires: Array<{
    id: string;
    name: string;
    areaSqFt: number;
    bannerColor: string;
  }>;
  musicTrack: 'royal-anthem' | 'study-lofi' | 'cyber-party';
  stageMusicPlaying: boolean;
}

export interface PaldaBattleState {
  rival: RivalEmpireSpec;
  /** -100 (rival wins) to +100 (player wins), starts at 0 */
  balance: number;
  round: number;
  playerHits: number;
  rivalHits: number;
  status: 'active' | 'player-won' | 'player-lost';
}

export function getRobotAvatarSpec(id: RobotAvatarId): RobotAvatarSpec {
  return ROBOT_AVATARS.find((a) => a.id === id) ?? ROBOT_AVATARS[0];
}

export function createInitialEmpireState(
  avatarId: RobotAvatarId = 'prepsbot-prime',
  playerNameTag = 'PrepsKM'
): EmpireSaveState {
  return {
    playerNameTag: playerNameTag.trim() || 'PrepsKM',
    avatarId,
    areaSqFt: 10, // Strictly starts at 10 sq. ft. per blueprint
    coins: 120,
    housesBuilt: 2,
    watchtowersBuilt: 1,
    wallsBuilt: 1,
    guardRobots: 2,
    hasGaadi: false,
    hasGhodaGaadi: false,
    hasSenapati: false,
    unlockedChests: 0,
    raidersDefeated: 0,
    quizStreak: 0,
    totalQuestionsSolved: 0,
    alliedEmpires: [],
    musicTrack: 'royal-anthem',
    stageMusicPlaying: false,
  };
}

export function selectDifficultyForStake(
  action: EmpireActionType,
  areaSqFt = 10
): DifficultyTier {
  switch (action) {
    case 'earn-coins':
    case 'unlock-chest':
    case 'unlock-gate':
      return 'Easy';
    case 'build-house':
    case 'build-wall':
    case 'summon-gaadi':
    case 'summon-ghoda-gaadi':
    case 'battle-raider':
      return 'Moderate';
    case 'build-tower':
    case 'deploy-guard':
    case 'summon-senapati':
    case 'revive-player':
      return 'Hard';
    case 'palda-war':
      if (areaSqFt >= 1000) return 'Very Hard';
      if (areaSqFt >= 100) return 'Hard';
      return 'Moderate';
  }
}

export function getActionCoinCost(
  action: EmpireActionType,
  avatarId: RobotAvatarId
): number {
  const avatar = getRobotAvatarSpec(avatarId);
  const baseCostMap: Record<EmpireActionType, number> = {
    'earn-coins': 0,
    'unlock-chest': 0,
    'unlock-gate': 0,
    'build-house': 80,
    'build-tower': 120,
    'build-wall': 60,
    'summon-gaadi': 100,
    'summon-ghoda-gaadi': 90,
    'summon-senapati': 150,
    'deploy-guard': 75,
    'revive-player': 0,
    'battle-raider': 0,
    'palda-war': 0,
  };
  const base = baseCostMap[action];
  const isArchitecture =
    action === 'build-house' || action === 'build-tower' || action === 'build-wall';
  if (isArchitecture && avatar.buildCostDiscount > 0) {
    return Math.round(base * (1 - avatar.buildCostDiscount));
  }
  return base;
}

export function computeQuizRewardCoins(
  difficulty: DifficultyTier,
  streak: number,
  avatarId: RobotAvatarId
): number {
  const base: Record<DifficultyTier, number> = {
    Easy: 40,
    Moderate: 70,
    Hard: 110,
    'Very Hard': 160,
  };
  const avatar = getRobotAvatarSpec(avatarId);
  const streakMult = 1 + Math.min(streak, 6) * 0.1;
  return Math.round(base[difficulty] * streakMult * avatar.coinMultiplier);
}

/**
 * Tiered Fair Matchmaking strictly matching Blueprint Section 7.2:
 * - 10 to 99 sq. ft. -> rivals 15–100 sq. ft.
 * - 100 to 999 sq. ft. -> rivals 120–950 sq. ft.
 * - 1,000+ sq. ft. -> rivals 1,400–3,000 sq. ft.
 */
export function getMatchmakingBracket(areaSqFt: number): {
  minArea: number;
  maxArea: number;
  tierLabel: string;
  difficulty: DifficultyTier;
} {
  if (areaSqFt < 100) {
    return {
      minArea: 15,
      maxArea: 100,
      tierLabel: 'Starter Frontier (15–100 sq. ft.)',
      difficulty: 'Moderate',
    };
  }
  if (areaSqFt < 1000) {
    return {
      minArea: 120,
      maxArea: 950,
      tierLabel: 'Mid-Tier Kingdoms (100–999 sq. ft.)',
      difficulty: 'Hard',
    };
  }
  return {
    minArea: 1400,
    maxArea: 3000,
    tierLabel: 'Imperial Titans (1,400–3,000 sq. ft.)',
    difficulty: 'Very Hard',
  };
}

export function generateMatchedRivals(
  playerAreaSqFt: number,
  alliedIds: string[] = []
): RivalEmpireSpec[] {
  const bracket = getMatchmakingBracket(playerAreaSqFt);
  const span = bracket.maxArea - bracket.minArea;
  const templates = [
    {
      id: 'rival-vikram',
      name: 'Vikramgarh Outpost',
      commanderName: 'Senapati Vikram',
      ratio: 0.18,
      bannerColor: '#ef4444',
    },
    {
      id: 'rival-nalanda',
      name: 'Nalanda Bastion',
      commanderName: 'Acharya Rudra',
      ratio: 0.54,
      bannerColor: '#f59e0b',
    },
    {
      id: 'rival-indraprastha',
      name: 'Indraprastha Citadel',
      commanderName: 'Samrat Dev',
      ratio: 0.92,
      bannerColor: '#8b5cf6',
    },
  ];

  const alliedSet = new Set(alliedIds);
  return templates.map((t) => {
    const areaSqFt = Math.round(bracket.minArea + span * t.ratio);
    return {
      id: t.id,
      name: t.name,
      commanderName: t.commanderName,
      areaSqFt,
      treasuryCoins: Math.round(areaSqFt * 1.4),
      bannerColor: t.bannerColor,
      tierLabel: bracket.tierLabel,
      difficulty: bracket.difficulty,
      allied: alliedSet.has(t.id),
    };
  });
}

export function startPaldaBattle(rival: RivalEmpireSpec): PaldaBattleState {
  return {
    rival,
    balance: 0,
    round: 1,
    playerHits: 0,
    rivalHits: 0,
    status: 'active',
  };
}

export function applyPaldaAnswer(
  battle: PaldaBattleState,
  isCorrect: boolean,
  responseTimeSec: number
): PaldaBattleState {
  if (battle.status !== 'active') return battle;
  // Faster correct answers grant heavier tug-of-war momentum (+30 to +45)
  const speedBonus = Math.max(0, Math.min(15, Math.round((15 - responseTimeSec) * 1.1)));
  const delta = isCorrect ? 30 + speedBonus : -35;
  const nextBalance = Math.max(-100, Math.min(100, battle.balance + delta));

  let status: PaldaBattleState['status'] = 'active';
  if (nextBalance >= 100) status = 'player-won';
  else if (nextBalance <= -100) status = 'player-lost';

  return {
    ...battle,
    balance: nextBalance,
    round: battle.round + 1,
    playerHits: battle.playerHits + (isCorrect ? 1 : 0),
    rivalHits: battle.rivalHits + (isCorrect ? 0 : 1),
    status,
  };
}

/**
 * Post-Battle Outcome Resolution per Blueprint Section 7.2:
 * - annex ('Hadap Lo'): absorbs rival's sq. ft. & treasury coins
 * - ally ('Chhod Do' / 'Dosti'): spares rival as a Connected Allied Empire + goodwill coins
 * - defeat: resets territory to 10 sq. ft. starter plot while preserving avatar & learned concepts
 */
export function resolvePaldaOutcome(
  empire: EmpireSaveState,
  rival: RivalEmpireSpec,
  outcome: 'annex' | 'ally' | 'defeat'
): EmpireSaveState {
  if (outcome === 'annex') {
    return {
      ...empire,
      areaSqFt: empire.areaSqFt + rival.areaSqFt,
      coins: empire.coins + rival.treasuryCoins,
      alliedEmpires: empire.alliedEmpires.filter((a) => a.id !== rival.id),
    };
  }
  if (outcome === 'ally') {
    const alreadyAllied = empire.alliedEmpires.some((a) => a.id === rival.id);
    return {
      ...empire,
      areaSqFt: empire.areaSqFt + Math.round(rival.areaSqFt * 0.25),
      coins: empire.coins + Math.round(rival.treasuryCoins * 0.6),
      alliedEmpires: alreadyAllied
        ? empire.alliedEmpires
        : [
            ...empire.alliedEmpires,
            {
              id: rival.id,
              name: rival.name,
              areaSqFt: rival.areaSqFt,
              bannerColor: rival.bannerColor,
            },
          ],
    };
  }
  // Defeat resets territory back to 10 sq. ft. starter base
  return {
    ...empire,
    areaSqFt: 10,
    coins: Math.max(60, Math.round(empire.coins * 0.5)),
    quizStreak: 0,
  };
}
