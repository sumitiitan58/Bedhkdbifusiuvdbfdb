import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeAiPrepScore, getPrepReadinessTier } from './prepScoreEngine';
import type { ChapterRecord, TestAttemptRecord, TestQuestionRecord } from '../types';

const SAMPLE_CHAPTERS: ChapterRecord[] = [
  {
    id: 'ch-elec',
    subjectId: 'subj-physics',
    name: 'Electrostatics',
    order: 1,
    cohorts: ['class-12-jee'],
    weightageMarks: 12,
    difficulty: 'Moderate',
  },
  {
    id: 'ch-calc',
    subjectId: 'subj-mathematics',
    name: 'Definite Integration Calculus',
    order: 2,
    cohorts: ['class-12-jee'],
    weightageMarks: 12,
    difficulty: 'Tough',
  },
  {
    id: 'ch-goc',
    subjectId: 'subj-chemistry',
    name: 'General Organic Chemistry (GOC)',
    order: 3,
    cohorts: ['class-12-jee'],
    weightageMarks: 10,
    difficulty: 'Moderate',
  },
];

const SAMPLE_QUESTIONS: TestQuestionRecord[] = [
  {
    id: 'q1',
    testId: 't1',
    questionNumber: 1,
    subjectName: 'Physics',
    chapterName: 'Electrostatics',
    questionType: 'single-mcq',
    correctOptionIndices: [0],
    positiveMarks: 4,
    negativeMarks: 1,
    testStatus: 'published',
  },
  {
    id: 'q2',
    testId: 't1',
    questionNumber: 2,
    subjectName: 'Physics',
    chapterName: 'Modern Physics',
    questionType: 'single-mcq',
    correctOptionIndices: [1],
    positiveMarks: 4,
    negativeMarks: 1,
    testStatus: 'published',
  },
  {
    id: 'q3',
    testId: 't1',
    questionNumber: 3,
    subjectName: 'Mathematics',
    chapterName: 'Definite Integration Calculus',
    questionType: 'single-mcq',
    correctOptionIndices: [2],
    positiveMarks: 4,
    negativeMarks: 1,
    testStatus: 'published',
  },
  {
    id: 'q4',
    testId: 't1',
    questionNumber: 4,
    subjectName: 'Chemistry',
    chapterName: 'General Organic Chemistry (GOC)',
    questionType: 'single-mcq',
    correctOptionIndices: [3],
    positiveMarks: 4,
    negativeMarks: 1,
    testStatus: 'published',
  },
];

function makeAttempt(overrides: Partial<TestAttemptRecord>): TestAttemptRecord {
  return {
    id: 'att-base',
    userId: 'u1',
    testId: 't1',
    testTitle: 'JEE Main Full Mock #1',
    destination: 'cbt-mock',
    cohortId: 'class-12-jee',
    score: 11,
    maxScore: 16,
    correctCount: 3,
    incorrectCount: 1,
    unattemptedCount: 0,
    accuracyPercent: 75,
    totalTimeSeconds: 310,
    avgTimePerQuestion: 78,
    iqScore: 118,
    subjectScores: [],
    chapterScores: [],
    paceSummary: {
      tooFastCount: 1,
      optimalCount: 3,
      tooSlowCount: 0,
      unattemptedCount: 0,
      rushingFlagNote: 'Good',
    },
    questionTimings: [
      {
        questionId: 'q1',
        questionNumber: 1,
        subjectName: 'Physics',
        chapterName: 'Electrostatics',
        openedAtMs: 0,
        answeredAtMs: 80000,
        timeSpentSeconds: 80,
        answered: true,
        isCorrect: true,
        paceCategory: 'Optimal Pace',
      },
      {
        questionId: 'q2',
        questionNumber: 2,
        subjectName: 'Physics',
        chapterName: 'Modern Physics',
        openedAtMs: 80000,
        answeredAtMs: 165000,
        timeSpentSeconds: 85,
        answered: true,
        isCorrect: true,
        paceCategory: 'Optimal Pace',
      },
      {
        questionId: 'q3',
        questionNumber: 3,
        subjectName: 'Mathematics',
        chapterName: 'Definite Integration Calculus',
        openedAtMs: 165000,
        answeredAtMs: 173000,
        timeSpentSeconds: 8, // Rushed guess (<10s wrong)
        answered: true,
        isCorrect: false,
        paceCategory: 'Too Fast',
      },
      {
        questionId: 'q4',
        questionNumber: 4,
        subjectName: 'Chemistry',
        chapterName: 'General Organic Chemistry (GOC)',
        openedAtMs: 173000,
        answeredAtMs: 268000,
        timeSpentSeconds: 95,
        answered: true,
        isCorrect: true,
        paceCategory: 'Optimal Pace',
      },
    ],
    answers: {},
    submittedAtIso: '2026-11-24T10:00:00.000Z',
    ...overrides,
  };
}

describe('prepScoreEngine', () => {
  const refDate = new Date('2026-11-24T12:00:00.000Z');

  it('maps score ranges to the 4 expected readiness tiers', () => {
    assert.equal(getPrepReadinessTier(220).tier, 'Foundation');
    assert.equal(getPrepReadinessTier(540).tier, 'Contender');
    assert.equal(getPrepReadinessTier(742).tier, '98+ %ile Ready');
    assert.equal(getPrepReadinessTier(880).tier, 'AIR Top 1000 Pace');
  });

  it('computes a 0-1000 score with 4 factors totaling 100% weight and 3 insights', () => {
    const report = computeAiPrepScore({
      attempts: [makeAttempt({})],
      questions: SAMPLE_QUESTIONS,
      chapters: SAMPLE_CHAPTERS,
      activeStudyDates: ['2026-11-20', '2026-11-21', '2026-11-22', '2026-11-23', '2026-11-24'],
      resolvedMistakeIds: [],
      cohortLabel: 'Class 12 JEE',
      referenceDate: refDate,
    });

    assert.ok(report.score >= 0 && report.score <= 1000);
    assert.equal(report.factors.length, 4);
    const totalWeight = report.factors.reduce((sum, f) => sum + f.weightPercent, 0);
    assert.equal(totalWeight, 100);
    const factorSum = report.factors.reduce((sum, f) => sum + f.score, 0);
    assert.equal(factorSum, report.score);
    assert.equal(report.insights.length, 3);
    assert.equal(report.diagnostics.rushedWrongCount, 1);
    assert.ok(
      report.insights.some((i) => i.headline.toLowerCase().includes('rushed')),
      'Expected an insight calling out rushed (<10s) errors'
    );
    assert.ok(report.actionItems.length >= 1);
  });

  it('increases score when Mistake Notebook items are resolved and streak lengthens', () => {
    const base = computeAiPrepScore({
      attempts: [makeAttempt({})],
      questions: SAMPLE_QUESTIONS,
      chapters: SAMPLE_CHAPTERS,
      activeStudyDates: ['2026-11-24'],
      resolvedMistakeIds: [],
      cohortLabel: 'Class 12 JEE',
      referenceDate: refDate,
    });

    const improved = computeAiPrepScore({
      attempts: [makeAttempt({})],
      questions: SAMPLE_QUESTIONS,
      chapters: SAMPLE_CHAPTERS,
      activeStudyDates: [
        '2026-11-15',
        '2026-11-16',
        '2026-11-17',
        '2026-11-18',
        '2026-11-19',
        '2026-11-20',
        '2026-11-21',
        '2026-11-22',
        '2026-11-23',
        '2026-11-24',
      ],
      resolvedMistakeIds: ['q3'],
      cohortLabel: 'Class 12 JEE',
      referenceDate: refDate,
    });

    assert.ok(improved.score > base.score, `Expected ${improved.score} > ${base.score}`);
    assert.equal(improved.diagnostics.mistakeRecoveryPercent, 100);
  });

  it('penalizes time-sink traps (>180s) and computes weekly delta across attempts', () => {
    const olderWeak = makeAttempt({
      id: 'att-old',
      submittedAtIso: '2026-11-10T10:00:00.000Z',
      score: 2,
      correctCount: 1,
      incorrectCount: 2,
      unattemptedCount: 1,
      questionTimings: [
        {
          questionId: 'q1',
          questionNumber: 1,
          subjectName: 'Physics',
          chapterName: 'Electrostatics',
          openedAtMs: 0,
          answeredAtMs: 220000,
          timeSpentSeconds: 220, // Time sink (>180s)
          answered: true,
          isCorrect: true,
          paceCategory: 'Too Slow',
        },
        {
          questionId: 'q2',
          questionNumber: 2,
          subjectName: 'Physics',
          chapterName: 'Modern Physics',
          openedAtMs: 220000,
          answeredAtMs: 227000,
          timeSpentSeconds: 7,
          answered: true,
          isCorrect: false,
          paceCategory: 'Too Fast',
        },
        {
          questionId: 'q3',
          questionNumber: 3,
          subjectName: 'Mathematics',
          chapterName: 'Definite Integration Calculus',
          openedAtMs: 227000,
          answeredAtMs: 430000,
          timeSpentSeconds: 203, // Time sink (>180s)
          answered: true,
          isCorrect: false,
          paceCategory: 'Too Slow',
        },
        {
          questionId: 'q4',
          questionNumber: 4,
          subjectName: 'Chemistry',
          chapterName: 'General Organic Chemistry (GOC)',
          openedAtMs: 430000,
          answeredAtMs: null,
          timeSpentSeconds: 15,
          answered: false,
          isCorrect: false,
          paceCategory: 'Unattempted',
        },
      ],
    });

    const recentStrong = makeAttempt({
      id: 'att-new',
      submittedAtIso: '2026-11-23T10:00:00.000Z',
    });

    const report = computeAiPrepScore({
      attempts: [olderWeak, recentStrong],
      questions: SAMPLE_QUESTIONS,
      chapters: SAMPLE_CHAPTERS,
      activeStudyDates: ['2026-11-10', '2026-11-22', '2026-11-23', '2026-11-24'],
      resolvedMistakeIds: ['q2'],
      cohortLabel: 'Class 12 JEE',
      referenceDate: refDate,
    });

    assert.equal(report.diagnostics.timeSinkCount, 2);
    assert.ok(report.deltaThisWeek > 0, `Expected positive weekly delta, got ${report.deltaThisWeek}`);
  });

  it('handles zero-attempt new students cleanly without NaN', () => {
    const report = computeAiPrepScore({
      attempts: [],
      questions: SAMPLE_QUESTIONS,
      chapters: SAMPLE_CHAPTERS,
      activeStudyDates: ['2026-11-24'],
      resolvedMistakeIds: [],
      cohortLabel: 'Class 12 NEET',
      referenceDate: refDate,
    });

    assert.equal(report.hasAttemptData, false);
    assert.equal(Number.isNaN(report.score), false);
    assert.equal(report.tier, 'Foundation');
    assert.equal(report.insights.length, 3);
    assert.equal(report.actionItems.length, 3);
  });
});
