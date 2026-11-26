import type {
  IQConfig,
  TestAttemptRecord,
  TestQuestionRecord,
} from '../types';
import { DEFAULT_IQ_CONFIG } from './scoringEngine';

export type AttemptTimeBucket =
  | 'perfect'
  | 'overtime-correct'
  | 'silly-mistake'
  | 'overtime-wrong'
  | 'unattempted';

export type QuestionDifficultyTier = 'Easy' | 'Medium' | 'Hard';

export interface CategorizedQuestionItem {
  questionId: string;
  questionNumber: number;
  subjectName: string;
  chapterName: string;
  timeSpentSeconds: number;
  bucket: AttemptTimeBucket;
  difficulty: QuestionDifficultyTier;
  answered: boolean;
  isCorrect: boolean;
}

export interface AttemptTimeAnalysisSummary {
  perfectCount: number;
  overtimeCorrectCount: number;
  sillyMistakeCount: number;
  overtimeWrongCount: number;
  unattemptedCount: number;
  totalQuestions: number;
  items: CategorizedQuestionItem[];
}

export interface DifficultyTierStats {
  tier: QuestionDifficultyTier;
  total: number;
  attempted: number;
  correct: number;
  wrong: number;
  skipped: number;
  accuracyPercent: number;
}

export interface ProAttemptMetrics {
  score: number;
  maxScore: number;
  scorePercent: number;
  predictedPercentile: number;
  leaderboardRank: number;
  estimatedTestTakers: number;
  attemptedCount: number;
  totalQuestions: number;
  accuracyPercent: number;
  positiveScore: number;
  marksLostNegative: number;
  totalTimeSeconds: number;
  avgTimePerQuestion: number;
}

export interface MistakeEntry {
  questionId: string;
  question: TestQuestionRecord;
  latestAttemptId: string;
  testId: string;
  testTitle: string;
  submittedAtIso: string;
  status: 'wrong' | 'unattempted';
  occurrences: number;
  subjectName: string;
  chapterName: string;
  studentAnswer: TestAttemptRecord['answers'][string] | undefined;
  timeSpentSeconds: number;
}

export type MistakeNotebookEntry = MistakeEntry;

export interface JeePercentileAnchorRow {
  marks: number;
  marksLabel: string;
  percentile: number;
  percentileNote?: string;
  approxAir: number;
  peerIntake: string;
}

export interface JeeMarkSensitivityZone {
  rangeLabel: string;
  minMarks: number;
  maxMarks: number;
  percentileRange: string;
  deltaPercentilePerMark: string;
  rankImpactPerMark: string;
  insight: string;
}

export interface JeeNtaShiftProof {
  shiftLabel: string;
  marks99: string;
  marks97: string;
  marks95: string;
}

export const JEE_MAIN_2026_TOTAL_CANDIDATES = 1_538_468;

/**
 * Official NTA 2025–2026 Calibrated Marks vs Percentile vs Rank Table
 * Anchor: 165/300 = 99.00%ile | Total Unique Candidates Base: 15,38,468
 */
export const JEE_MAIN_2026_PERCENTILE_TABLE: readonly JeePercentileAnchorRow[] = [
  { marks: 235, marksLabel: '235+', percentile: 99.90, approxAir: 1538, peerIntake: 'Top 0.10%' },
  { marks: 205, marksLabel: '205', percentile: 99.70, approxAir: 4615, peerIntake: 'Top 0.30%' },
  { marks: 185, marksLabel: '185', percentile: 99.45, approxAir: 8460, peerIntake: 'Top 0.55%' },
  { marks: 175, marksLabel: '175', percentile: 99.25, approxAir: 11540, peerIntake: 'Top 0.75%' },
  { marks: 170, marksLabel: '170', percentile: 99.12, approxAir: 13540, peerIntake: 'Top 0.88%' },
  { marks: 165, marksLabel: '165', percentile: 99.00, percentileNote: '99%ile Anchor', approxAir: 15385, peerIntake: 'Top 1.00%' },
  { marks: 160, marksLabel: '160', percentile: 98.82, approxAir: 18150, peerIntake: 'Top 1.18%' },
  { marks: 155, marksLabel: '155', percentile: 98.62, approxAir: 21230, peerIntake: 'Top 1.38%' },
  { marks: 150, marksLabel: '150', percentile: 98.40, approxAir: 24615, peerIntake: 'Top 1.60%' },
  { marks: 145, marksLabel: '145', percentile: 98.15, approxAir: 28460, peerIntake: 'Top 1.85%' },
  { marks: 140, marksLabel: '140', percentile: 97.88, approxAir: 32615, peerIntake: 'Top 2.12%' },
  { marks: 135, marksLabel: '135', percentile: 97.58, approxAir: 37230, peerIntake: 'Top 2.42%' },
  { marks: 130, marksLabel: '130', percentile: 97.25, approxAir: 42300, peerIntake: 'Top 2.75%' },
  { marks: 125, marksLabel: '125', percentile: 96.88, approxAir: 48000, peerIntake: 'Top 3.12%' },
  { marks: 120, marksLabel: '120', percentile: 96.45, percentileNote: 'Range: 96.2–96.7', approxAir: 54615, peerIntake: 'Top 3.55%' },
  { marks: 115, marksLabel: '115', percentile: 95.95, approxAir: 62300, peerIntake: 'Top 4.05%' },
  { marks: 110, marksLabel: '110', percentile: 95.40, approxAir: 70770, peerIntake: 'Top 4.60%' },
  { marks: 105, marksLabel: '105', percentile: 94.75, approxAir: 80770, peerIntake: 'Top 5.25%' },
  { marks: 100, marksLabel: '100', percentile: 94.00, approxAir: 92300, peerIntake: 'Top 6.00%' },
  { marks: 95, marksLabel: '95', percentile: 93.15, percentileNote: 'Gen Cutoff Zone', approxAir: 105385, peerIntake: 'Top 6.85%' },
  { marks: 90, marksLabel: '90', percentile: 92.20, approxAir: 120000, peerIntake: 'Top 7.80%' },
  { marks: 85, marksLabel: '85', percentile: 91.10, approxAir: 136920, peerIntake: 'Top 8.90%' },
  { marks: 80, marksLabel: '80', percentile: 89.90, approxAir: 155385, peerIntake: 'Top 10.10%' },
  { marks: 70, marksLabel: '70', percentile: 87.00, approxAir: 200000, peerIntake: 'Top 13.00%' },
  { marks: 60, marksLabel: '60', percentile: 83.20, approxAir: 258460, peerIntake: 'Top 16.80%' },
  { marks: 50, marksLabel: '50', percentile: 78.50, approxAir: 330770, peerIntake: 'Top 21.50%' },
];

export const JEE_MARK_SENSITIVITY_ZONES: readonly JeeMarkSensitivityZone[] = [
  {
    rangeLabel: '165 → 150 Marks',
    minMarks: 150,
    maxMarks: 165,
    percentileRange: '99.00%ile → 98.40%ile',
    deltaPercentilePerMark: '~0.040%ile / mark',
    rankImpactPerMark: '~615 ranks / mark',
    insight: 'Top-tier band: 15 marks separate ~9,200 All India Ranks.',
  },
  {
    rangeLabel: '150 → 130 Marks',
    minMarks: 130,
    maxMarks: 150,
    percentileRange: '98.40%ile → 97.25%ile',
    deltaPercentilePerMark: '~0.057%ile / mark',
    rankImpactPerMark: '~885 ranks / mark',
    insight: 'Core NIT CSE/ECE zone where every +4 question jumps ~3,500 ranks.',
  },
  {
    rangeLabel: '130 → 110 Marks',
    minMarks: 110,
    maxMarks: 130,
    percentileRange: '97.25%ile → 95.40%ile',
    deltaPercentilePerMark: '~0.092%ile / mark',
    rankImpactPerMark: '~1,420 ranks / mark',
    insight: 'Densest bell-curve band: 120 marks yields ~96.45%ile and 130 jumps straight to 97.25%ile.',
  },
  {
    rangeLabel: '110 → 90 Marks',
    minMarks: 90,
    maxMarks: 110,
    percentileRange: '95.40%ile → 92.20%ile',
    deltaPercentilePerMark: '~0.160%ile / mark',
    rankImpactPerMark: '~2,460 ranks / mark',
    insight: 'High-stakes negative marking zone: a single −1 penalty costs ~2,500 ranks.',
  },
];

export const JEE_2026_NTA_SHIFT_PROOFS: readonly JeeNtaShiftProof[] = [
  { shiftLabel: '23 Jan Shift 1 (2026)', marks99: '166 marks', marks97: '126 marks', marks95: '112 marks' },
  { shiftLabel: '24 Jan Shift 2 (2026)', marks99: '160 marks', marks97: '126 marks', marks95: '110 marks' },
  { shiftLabel: '6 April Shift 1 (2026)', marks99: '160–165 marks', marks97: '132 marks', marks95: '115–120 marks (95.5–96%)' },
];

// Ascending piecewise anchor curve (marks out of 300 -> exact NTA percentile)
const JEE_MAIN_INTERPOLATION_ANCHORS: ReadonlyArray<[number, number]> = [
  [-75, 1.0],
  [-20, 5.0],
  [0, 25.0],
  [15, 48.0],
  [30, 65.0],
  [50, 78.5],
  [60, 83.2],
  [70, 87.0],
  [80, 89.9],
  [85, 91.1],
  [90, 92.2],
  [95, 93.15],
  [100, 94.0],
  [105, 94.75],
  [110, 95.4],
  [115, 95.95],
  [120, 96.45],
  [125, 96.88],
  [130, 97.25],
  [135, 97.58],
  [140, 97.88],
  [145, 98.15],
  [150, 98.4],
  [155, 98.62],
  [160, 98.82],
  [165, 99.0],
  [170, 99.12],
  [175, 99.25],
  [185, 99.45],
  [205, 99.7],
  [235, 99.9],
  [260, 99.96],
  [285, 99.99],
  [300, 99.99],
];

function interpolateJeeMainPercentile(equivalent300: number): number {
  const anchors = JEE_MAIN_INTERPOLATION_ANCHORS;
  if (equivalent300 <= anchors[0][0]) return anchors[0][1];
  const last = anchors[anchors.length - 1];
  if (equivalent300 >= last[0]) return last[1];

  for (let i = 0; i < anchors.length - 1; i++) {
    const [x0, y0] = anchors[i];
    const [x1, y1] = anchors[i + 1];
    if (equivalent300 >= x0 && equivalent300 <= x1) {
      if (x1 === x0) return y1;
      const t = (equivalent300 - x0) / (x1 - x0);
      return y0 + t * (y1 - y0);
    }
  }
  return last[1];
}

export function getJeeMarkSensitivityForScore(equivalent300: number): JeeMarkSensitivityZone {
  if (equivalent300 >= 150) return JEE_MARK_SENSITIVITY_ZONES[0];
  if (equivalent300 >= 130) return JEE_MARK_SENSITIVITY_ZONES[1];
  if (equivalent300 >= 110) return JEE_MARK_SENSITIVITY_ZONES[2];
  return JEE_MARK_SENSITIVITY_ZONES[3];
}

/**
 * Deterministic JEE Main / NEET percentile & All India Rank estimator.
 * For JEE Main, calibrated against official NTA 2025–2026 shift bell-curve data
 * (Anchor: 165/300 = 99.00%ile, 120/300 = 96.45%ile, 15,38,468 unique candidates).
 */
export function estimatePercentileAndRank(
  score: number,
  maxScore: number,
  examCategory = 'JEE Main'
): { predictedPercentile: number; leaderboardRank: number; estimatedTestTakers: number } {
  const safeMax = Math.max(1, maxScore);
  const ratio = Math.max(-0.25, Math.min(1, score / safeMax));
  const isNeet = examCategory.toLowerCase().includes('neet');

  if (!isNeet) {
    const estimatedTestTakers = JEE_MAIN_2026_TOTAL_CANDIDATES;
    const equivalent300 = ratio * 300;
    const rawPercentile = interpolateJeeMainPercentile(equivalent300);
    const predictedPercentile = Number(Math.min(99.99, Math.max(1.0, rawPercentile)).toFixed(2));
    const rawRank = Math.round(((100 - predictedPercentile) / 100) * estimatedTestTakers);
    const leaderboardRank = Math.max(1, Math.min(estimatedTestTakers, rawRank));
    return { predictedPercentile, leaderboardRank, estimatedTestTakers };
  }

  const estimatedTestTakers = 24500;
  let percentile: number;
  if (ratio <= 0) {
    percentile = 12.4;
  } else if (ratio < 0.25) {
    percentile = 12.4 + (ratio / 0.25) * 42.6; // 12.4 -> 55.0
  } else if (ratio < 0.5) {
    percentile = 55.0 + ((ratio - 0.25) / 0.25) * 30.5; // 55.0 -> 85.5
  } else if (ratio < 0.72) {
    percentile = 85.5 + ((ratio - 0.5) / 0.22) * 11.7; // 85.5 -> 97.2
  } else if (ratio < 0.88) {
    percentile = 97.2 + ((ratio - 0.72) / 0.16) * 2.45; // 97.2 -> 99.65
  } else {
    percentile = 99.65 + ((ratio - 0.88) / 0.12) * 0.34; // 99.65 -> 99.99
  }

  const predictedPercentile = Number(Math.min(99.99, Math.max(1.0, percentile)).toFixed(2));
  const rawRank = Math.round(((100 - predictedPercentile) / 100) * estimatedTestTakers) + 1;
  const leaderboardRank = Math.max(1, Math.min(estimatedTestTakers, rawRank));

  return { predictedPercentile, leaderboardRank, estimatedTestTakers };
}

/**
 * Deterministic difficulty classifier for any test question.
 * Uses questionType, subject/chapter keywords, and question position when explicit difficulty isn't stored.
 */
export function inferQuestionDifficulty(
  question: Pick<TestQuestionRecord, 'questionNumber' | 'questionType' | 'chapterName' | 'positiveMarks'>
): QuestionDifficultyTier {
  if (question.questionType === 'multi-mcq') return 'Hard';
  const ch = (question.chapterName ?? '').toLowerCase();
  if (
    ch.includes('rotation') ||
    ch.includes('electrostat') ||
    ch.includes('calculus') ||
    ch.includes('definite') ||
    ch.includes('ionic') ||
    ch.includes('thermodynamics') ||
    ch.includes('electromagnetism') ||
    ch.includes('organic') ||
    ch.includes('probability')
  ) {
    return question.questionNumber % 3 === 0 ? 'Hard' : 'Medium';
  }
  if (question.questionType === 'integer') {
    return question.questionNumber % 2 === 0 ? 'Hard' : 'Medium';
  }
  const mod = question.questionNumber % 5;
  if (mod === 1 || mod === 2) return 'Easy';
  if (mod === 0) return 'Hard';
  return 'Medium';
}

export function categorizeAttemptQuestions(
  attempt: TestAttemptRecord,
  questions: TestQuestionRecord[],
  iqConfig: IQConfig = DEFAULT_IQ_CONFIG
): AttemptTimeAnalysisSummary {
  const qMap = new Map(questions.map((q) => [q.id, q]));
  const items: CategorizedQuestionItem[] = [];

  let perfectCount = 0;
  let overtimeCorrectCount = 0;
  let sillyMistakeCount = 0;
  let overtimeWrongCount = 0;
  let unattemptedCount = 0;

  for (const timing of attempt.questionTimings) {
    const q = qMap.get(timing.questionId);
    const difficulty = q
      ? inferQuestionDifficulty(q)
      : timing.questionNumber % 3 === 0
        ? 'Hard'
        : timing.questionNumber % 2 === 0
          ? 'Medium'
          : 'Easy';

    let bucket: AttemptTimeBucket;
    const isOvertime =
      timing.paceCategory === 'Too Slow' ||
      timing.timeSpentSeconds > iqConfig.tooSlowThresholdSec;

    if (!timing.answered) {
      bucket = 'unattempted';
      unattemptedCount++;
    } else if (timing.isCorrect) {
      if (isOvertime) {
        bucket = 'overtime-correct';
        overtimeCorrectCount++;
      } else {
        bucket = 'perfect';
        perfectCount++;
      }
    } else {
      if (isOvertime) {
        bucket = 'overtime-wrong';
        overtimeWrongCount++;
      } else {
        bucket = 'silly-mistake';
        sillyMistakeCount++;
      }
    }

    items.push({
      questionId: timing.questionId,
      questionNumber: timing.questionNumber,
      subjectName: timing.subjectName,
      chapterName: timing.chapterName || q?.chapterName || 'General',
      timeSpentSeconds: timing.timeSpentSeconds,
      bucket,
      difficulty,
      answered: timing.answered,
      isCorrect: timing.isCorrect,
    });
  }

  return {
    perfectCount,
    overtimeCorrectCount,
    sillyMistakeCount,
    overtimeWrongCount,
    unattemptedCount,
    totalQuestions: items.length,
    items,
  };
}

export function computeDifficultyBreakdown(
  attempt: TestAttemptRecord,
  questions: TestQuestionRecord[]
): DifficultyTierStats[] {
  const analysis = categorizeAttemptQuestions(attempt, questions);
  const tiers: QuestionDifficultyTier[] = ['Easy', 'Medium', 'Hard'];

  return tiers.map((tier) => {
    const group = analysis.items.filter((i) => i.difficulty === tier);
    const total = group.length;
    const attempted = group.filter((i) => i.answered).length;
    const correct = group.filter((i) => i.answered && i.isCorrect).length;
    const wrong = attempted - correct;
    const skipped = total - attempted;
    const accuracyPercent = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;

    return {
      tier,
      total,
      attempted,
      correct,
      wrong,
      skipped,
      accuracyPercent,
    };
  });
}

export function computeProAttemptMetrics(
  attempt: TestAttemptRecord,
  questions: TestQuestionRecord[],
  examCategory = 'JEE Main'
): ProAttemptMetrics {
  const qMap = new Map(questions.map((q) => [q.id, q]));
  let positiveScore = 0;
  let marksLostNegative = 0;

  if (attempt.questionTimings.length > 0) {
    for (const timing of attempt.questionTimings) {
      const q = qMap.get(timing.questionId);
      const pos = q?.positiveMarks ?? 4;
      const neg = q?.negativeMarks ?? 1;
      if (timing.answered && timing.isCorrect) {
        positiveScore += pos;
      } else if (timing.answered && !timing.isCorrect) {
        marksLostNegative += neg;
      }
    }
  } else {
    positiveScore = attempt.correctCount * 4;
    marksLostNegative = Math.max(0, positiveScore - attempt.score);
  }

  // Reconcile if negative marking was disabled on the test
  if (positiveScore - marksLostNegative !== attempt.score && attempt.score >= 0) {
    const inferredNeg = positiveScore - attempt.score;
    if (inferredNeg >= 0 && inferredNeg <= attempt.incorrectCount * 2) {
      marksLostNegative = inferredNeg;
    }
  }

  const totalQuestions = Math.max(
    1,
    attempt.correctCount + attempt.incorrectCount + attempt.unattemptedCount
  );
  const attemptedCount = attempt.correctCount + attempt.incorrectCount;
  const scorePercent =
    attempt.maxScore > 0 ? Math.round((attempt.score / attempt.maxScore) * 100) : 0;

  const { predictedPercentile, leaderboardRank, estimatedTestTakers } = estimatePercentileAndRank(
    attempt.score,
    attempt.maxScore,
    examCategory
  );

  return {
    score: attempt.score,
    maxScore: attempt.maxScore,
    scorePercent,
    predictedPercentile,
    leaderboardRank,
    estimatedTestTakers,
    attemptedCount,
    totalQuestions,
    accuracyPercent: attempt.accuracyPercent,
    positiveScore,
    marksLostNegative,
    totalTimeSeconds: attempt.totalTimeSeconds,
    avgTimePerQuestion: attempt.avgTimePerQuestion,
  };
}

/**
 * Automatically extracts every wrong and unattempted question across a student's
 * CBT mock and DPP attempts, deduplicated by questionId (keeping latest status).
 */
export function extractMistakeEntries(
  attempts: TestAttemptRecord[],
  questions: TestQuestionRecord[]
): MistakeEntry[] {
  const qMap = new Map(questions.map((q) => [q.id, q]));
  const sortedAttempts = [...attempts].sort((a, b) =>
    (b.submittedAtIso || '').localeCompare(a.submittedAtIso || '')
  );

  const byQuestion = new Map<string, MistakeEntry>();

  for (const att of sortedAttempts) {
    for (const timing of att.questionTimings) {
      if (timing.answered && timing.isCorrect) continue;
      const question = qMap.get(timing.questionId);
      if (!question) continue;

      const existing = byQuestion.get(timing.questionId);
      if (existing) {
        existing.occurrences += 1;
        continue;
      }

      byQuestion.set(timing.questionId, {
        questionId: timing.questionId,
        question,
        latestAttemptId: att.id,
        testId: att.testId,
        testTitle: att.testTitle,
        submittedAtIso: att.submittedAtIso,
        status: timing.answered ? 'wrong' : 'unattempted',
        occurrences: 1,
        subjectName: timing.subjectName || question.subjectName,
        chapterName: timing.chapterName || question.chapterName || 'General',
        studentAnswer: att.answers?.[timing.questionId],
        timeSpentSeconds: timing.timeSpentSeconds,
      });
    }
  }

  return Array.from(byQuestion.values());
}
