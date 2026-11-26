import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  categorizeAttemptQuestions,
  computeDifficultyBreakdown,
  computeProAttemptMetrics,
  estimatePercentileAndRank,
  extractMistakeEntries,
} from './testAnalysisEngine';
import type { TestAttemptRecord, TestQuestionRecord } from '../types';

const SAMPLE_QUESTIONS: TestQuestionRecord[] = [
  {
    id: 'q1',
    testId: 't1',
    questionNumber: 1,
    subjectName: 'Physics',
    chapterName: 'Kinematics',
    questionType: 'single-mcq',
    questionText: 'A ball is thrown upwards...',
    optionTexts: ['10m', '20m', '30m', '40m'],
    correctOptionIndices: [1],
    positiveMarks: 4,
    negativeMarks: 1,
    testStatus: 'published',
  },
  {
    id: 'q2',
    testId: 't1',
    questionNumber: 2,
    subjectName: 'Physics',
    chapterName: 'Electrostatics',
    questionType: 'single-mcq',
    questionText: 'Electric field due to dipole...',
    optionTexts: ['A', 'B', 'C', 'D'],
    correctOptionIndices: [0],
    positiveMarks: 4,
    negativeMarks: 1,
    testStatus: 'published',
  },
  {
    id: 'q3',
    testId: 't1',
    questionNumber: 3,
    subjectName: 'Chemistry',
    chapterName: 'Thermodynamics',
    questionType: 'integer',
    questionText: 'Calculate enthalpy change...',
    numericalAnswer: '42',
    positiveMarks: 4,
    negativeMarks: 0,
    testStatus: 'published',
  },
  {
    id: 'q4',
    testId: 't1',
    questionNumber: 4,
    subjectName: 'Mathematics',
    chapterName: 'Definite Integration',
    questionType: 'multi-mcq',
    questionText: 'Evaluate integral...',
    optionTexts: ['1', '2', '3', '4'],
    correctOptionIndices: [0, 2],
    positiveMarks: 4,
    negativeMarks: 1,
    testStatus: 'published',
  },
];

const SAMPLE_ATTEMPT: TestAttemptRecord = {
  id: 'att-1',
  userId: 'u1',
  testId: 't1',
  testTitle: 'JEE Main Full Mock #1',
  destination: 'cbt-mock',
  cohortId: 'class-12-jee',
  score: 7,
  maxScore: 16,
  correctCount: 2,
  incorrectCount: 1,
  unattemptedCount: 1,
  accuracyPercent: 67,
  totalTimeSeconds: 320,
  avgTimePerQuestion: 80,
  iqScore: 112,
  subjectScores: [
    {
      subjectName: 'Physics',
      total: 2,
      score: 8,
      maxScore: 8,
      correct: 2,
      incorrect: 0,
      unattempted: 0,
      accuracyPercent: 100,
      avgTimeSeconds: 100,
    },
    {
      subjectName: 'Chemistry',
      total: 1,
      score: -1,
      maxScore: 4,
      correct: 0,
      incorrect: 1,
      unattempted: 0,
      accuracyPercent: 0,
      avgTimeSeconds: 18,
    },
    {
      subjectName: 'Mathematics',
      total: 1,
      score: 0,
      maxScore: 4,
      correct: 0,
      incorrect: 0,
      unattempted: 1,
      accuracyPercent: 0,
      avgTimeSeconds: 10,
    },
  ],
  chapterScores: [],
  paceSummary: {
    tooFastCount: 1,
    optimalCount: 1,
    tooSlowCount: 1,
    unattemptedCount: 1,
    rushingFlagNote: 'Good',
  },
  questionTimings: [
    {
      questionId: 'q1',
      questionNumber: 1,
      subjectName: 'Physics',
      chapterName: 'Kinematics',
      openedAtMs: 0,
      answeredAtMs: 50000,
      timeSpentSeconds: 50,
      answered: true,
      isCorrect: true,
      paceCategory: 'Optimal Pace',
    },
    {
      questionId: 'q2',
      questionNumber: 2,
      subjectName: 'Physics',
      chapterName: 'Electrostatics',
      openedAtMs: 50000,
      answeredAtMs: 210000,
      timeSpentSeconds: 160,
      answered: true,
      isCorrect: true,
      paceCategory: 'Too Slow',
    },
    {
      questionId: 'q3',
      questionNumber: 3,
      subjectName: 'Chemistry',
      chapterName: 'Thermodynamics',
      openedAtMs: 210000,
      answeredAtMs: 228000,
      timeSpentSeconds: 18,
      answered: true,
      isCorrect: false,
      paceCategory: 'Too Fast',
    },
    {
      questionId: 'q4',
      questionNumber: 4,
      subjectName: 'Mathematics',
      chapterName: 'Definite Integration',
      openedAtMs: 228000,
      answeredAtMs: null,
      timeSpentSeconds: 10,
      answered: false,
      isCorrect: false,
      paceCategory: 'Unattempted',
    },
  ],
  answers: {
    q1: { type: 'single-mcq', selectedIndex: 1 },
    q2: { type: 'single-mcq', selectedIndex: 0 },
    q3: { type: 'integer', value: '99' },
  },
  submittedAtIso: '2026-11-20T10:00:00.000Z',
};

describe('testAnalysisEngine', () => {
  it('matches official NTA 2025-2026 calibrated JEE Main anchors (165=99%ile, 120=96.45%ile, 15,38,468 base)', () => {
    const a235 = estimatePercentileAndRank(235, 300, 'JEE Main');
    assert.equal(a235.predictedPercentile, 99.9);
    assert.equal(a235.leaderboardRank, 1538);
    assert.equal(a235.estimatedTestTakers, 1_538_468);

    const a165 = estimatePercentileAndRank(165, 300, 'JEE Main');
    assert.equal(a165.predictedPercentile, 99.0);
    assert.equal(a165.leaderboardRank, 15385);

    const a120 = estimatePercentileAndRank(120, 300, 'JEE Main');
    assert.equal(a120.predictedPercentile, 96.45);
    assert.ok(a120.leaderboardRank >= 54600 && a120.leaderboardRank <= 54630);

    const a95 = estimatePercentileAndRank(95, 300, 'JEE Main');
    assert.equal(a95.predictedPercentile, 93.15);
    assert.equal(a95.leaderboardRank, 105385);

    const a50 = estimatePercentileAndRank(50, 300, 'JEE Main');
    assert.equal(a50.predictedPercentile, 78.5);
    assert.ok(a50.leaderboardRank >= 330760 && a50.leaderboardRank <= 330780);

    // Proportional scaling on non-300 tests (e.g., 55/100 -> 165/300 -> 99.00%ile)
    const scaled = estimatePercentileAndRank(55, 100, 'JEE Main');
    assert.equal(scaled.predictedPercentile, 99.0);
    assert.equal(scaled.leaderboardRank, 15385);
  });

  it('computes monotonically increasing percentile and decreasing rank as score rises', () => {
    const low = estimatePercentileAndRank(40, 300, 'JEE Main');
    const mid = estimatePercentileAndRank(160, 300, 'JEE Main');
    const high = estimatePercentileAndRank(270, 300, 'JEE Main');

    assert.ok(low.predictedPercentile < mid.predictedPercentile);
    assert.ok(mid.predictedPercentile < high.predictedPercentile);
    assert.ok(high.predictedPercentile >= 99.5);
    assert.ok(low.leaderboardRank > mid.leaderboardRank);
    assert.ok(mid.leaderboardRank > high.leaderboardRank);
  });

  it('categorizes questions into Perfect, Overtime Correct, Silly Mistake, and Unattempted', () => {
    const res = categorizeAttemptQuestions(SAMPLE_ATTEMPT, SAMPLE_QUESTIONS);
    assert.equal(res.perfectCount, 1);
    assert.equal(res.overtimeCorrectCount, 1);
    assert.equal(res.sillyMistakeCount, 1);
    assert.equal(res.unattemptedCount, 1);
    assert.equal(res.totalQuestions, 4);
  });

  it('computes difficulty breakdown across Easy, Medium, Hard', () => {
    const breakdown = computeDifficultyBreakdown(SAMPLE_ATTEMPT, SAMPLE_QUESTIONS);
    assert.equal(breakdown.length, 3);
    const totalAcrossTiers = breakdown.reduce((sum, t) => sum + t.total, 0);
    assert.equal(totalAcrossTiers, 4);
    const hardTier = breakdown.find((t) => t.tier === 'Hard');
    assert.ok(hardTier && hardTier.total >= 1);
  });

  it('computes positive score, negative marks lost, and pro metrics', () => {
    const metrics = computeProAttemptMetrics(SAMPLE_ATTEMPT, SAMPLE_QUESTIONS, 'JEE Main');
    assert.equal(metrics.positiveScore, 8);
    assert.equal(metrics.marksLostNegative, 1);
    assert.equal(metrics.attemptedCount, 3);
    assert.equal(metrics.accuracyPercent, 67);
    assert.ok(metrics.predictedPercentile > 50);
  });

  it('auto-extracts wrong and unattempted questions into Mistake Notebook', () => {
    const mistakes = extractMistakeEntries([SAMPLE_ATTEMPT], SAMPLE_QUESTIONS);
    assert.equal(mistakes.length, 2);
    const q3 = mistakes.find((m) => m.questionId === 'q3');
    const q4 = mistakes.find((m) => m.questionId === 'q4');
    assert.equal(q3?.status, 'wrong');
    assert.equal(q4?.status, 'unattempted');
  });
});
