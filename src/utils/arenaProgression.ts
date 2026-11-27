export type EloSubjectKey = 'physics' | 'chemistry' | 'mathsBio' | 'speedArena';

export interface DailyTrifectaState {
  dateIso: string;
  pyqsOrTestDone: boolean;
  focusBlockDone: boolean;
  arenaOrMistakesDone: boolean;
  pyqsSolvedToday: number;
  focusMinutesToday: number;
  arenaWinsToday: number;
}

export interface ArenaProgressionState {
  seasonXp: number;
  streakShields: number;
  elo: Record<EloSubjectKey, number>;
  gamesPlayed: number;
  bestCombo: number;
  trifecta: DailyTrifectaState;
  recentHistory: Array<{
    id: string;
    gameName: string;
    subject: EloSubjectKey;
    score: number;
    xpEarned: number;
    eloDelta: number;
    playedAtIso: string;
  }>;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  cohort: string;
  city: string;
  seasonXp: number;
  speedElo: number;
  trifectaStreak: number;
  isCurrentUser?: boolean;
}

export function getTodayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function createInitialArenaProgression(dateIso = getTodayIsoDate()): ArenaProgressionState {
  return {
    seasonXp: 0,
    streakShields: 1,
    elo: {
      physics: 1000,
      chemistry: 1000,
      mathsBio: 1000,
      speedArena: 1000,
    },
    gamesPlayed: 0,
    bestCombo: 0,
    trifecta: {
      dateIso,
      pyqsOrTestDone: false,
      focusBlockDone: false,
      arenaOrMistakesDone: false,
      pyqsSolvedToday: 0,
      focusMinutesToday: 0,
      arenaWinsToday: 0,
    },
    recentHistory: [],
  };
}

/**
 * Standard Elo delta calculator for subject & speed ratings.
 * accuracyRatio: 0..1, difficultyRating: 950 (Easy) | 1100 (Exam-Level) | 1280 (Ranker)
 */
export function computeEloUpdate(
  currentRating: number,
  accuracyRatio: number,
  difficultyRating = 1100,
  kFactor = 32
): { newRating: number; delta: number } {
  const clampedScore = Math.max(0, Math.min(1, accuracyRatio));
  const expected = 1 / (1 + Math.pow(10, (difficultyRating - currentRating) / 400));
  const delta = Math.round(kFactor * (clampedScore - expected));
  const newRating = Math.max(600, currentRating + delta);
  return { newRating, delta: newRating - currentRating };
}

export function getTrifectaProgress(trifecta: DailyTrifectaState): {
  completedCount: number;
  totalCount: number;
  percent: number;
  shieldProtected: boolean;
} {
  const completedCount = [
    trifecta.pyqsOrTestDone,
    trifecta.focusBlockDone,
    trifecta.arenaOrMistakesDone,
  ].filter(Boolean).length;
  return {
    completedCount,
    totalCount: 3,
    percent: Math.round((completedCount / 3) * 100),
    shieldProtected: completedCount === 3,
  };
}

export function getEloRankBadge(rating: number): string {
  if (rating >= 1450) return 'AIR Grandmaster';
  if (rating >= 1300) return 'Ranker Diamond';
  if (rating >= 1150) return '99%ile Challenger';
  if (rating >= 1020) return 'Contender';
  return 'Aspirant';
}

/**
 * Generates a cryptographic-style digital pass token (e.g. PSKM-JEE-8F4K9)
 */
export function generateMentorshipPassToken(trackPrefix: 'JEE' | 'NEET' | 'FND'): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);
    for (const b of bytes) {
      code += alphabet[b % alphabet.length];
    }
  } else {
    for (let i = 0; i < 6; i++) {
      code += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
  }
  return `PSKM-${trackPrefix}-${code}`;
}

export function buildSundayBlitzLeaderboard(
  currentUserName: string,
  currentCohort: string,
  state: ArenaProgressionState
): LeaderboardEntry[] {
  const basePeers: Omit<LeaderboardEntry, 'rank'>[] = [
    { name: 'Aarav Deshmukh', cohort: 'JEE 2027', city: 'Pune', seasonXp: 2840, speedElo: 1348, trifectaStreak: 19 },
    { name: 'Diya Chatterjee', cohort: 'NEET 2027', city: 'Kolkata', seasonXp: 2610, speedElo: 1312, trifectaStreak: 15 },
    { name: 'Karthik Subramanian', cohort: 'JEE Dropper', city: 'Chennai', seasonXp: 2390, speedElo: 1274, trifectaStreak: 14 },
    { name: 'Riya Agrawal', cohort: 'NEET 2027', city: 'Jaipur', seasonXp: 1980, speedElo: 1215, trifectaStreak: 11 },
    { name: 'Pranav Joshi', cohort: 'Class 12 JEE', city: 'Kota', seasonXp: 1620, speedElo: 1168, trifectaStreak: 9 },
    { name: 'Sneha Reddy', cohort: 'Class 12 NEET', city: 'Hyderabad', seasonXp: 1290, speedElo: 1110, trifectaStreak: 7 },
    { name: 'Vihaan Malhotra', cohort: 'Class 11 JEE', city: 'Delhi', seasonXp: 890, speedElo: 1054, trifectaStreak: 5 },
  ];

  const userEntry: Omit<LeaderboardEntry, 'rank'> = {
    name: currentUserName || 'You (Guest)',
    cohort: currentCohort || 'JEE 2027',
    city: 'Your Workspace',
    seasonXp: state.seasonXp,
    speedElo: state.elo.speedArena,
    trifectaStreak: getTrifectaProgress(state.trifecta).completedCount,
    isCurrentUser: true,
  };

  return [...basePeers, userEntry]
    .sort((a, b) => b.seasonXp - a.seasonXp || b.speedElo - a.speedElo)
    .map((entry, idx) => ({ ...entry, rank: idx + 1 }));
}
