import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_IQ_CONFIG,
  classifyPace,
  computeCumulativeAnalytics,
  evaluateFullAttempt,
  evaluateSingleQuestion,
  getNextQuestionNumber,
  transitionQuestionType,
} from './scoringEngine';
import type { MockTestRecord, TestQuestionRecord } from '../types';

const SAMPLE_TEST: MockTestRecord = {
  id: 'mock-1',
  title: 'JEE Main Full Mock #1',
  destination: 'cbt-mock',
  cohortId: 'class-12-jee',
  examCategory: 'JEE Main',
  totalQuestions: 3,
  totalMarks: 12,
  durationMinutes: 15,
  positiveMarks: 4,
  negativeMarks: 1,
  negativeMarkingEnabled: true,
  showSolutionsAfterSubmit: true,
  status: 'published',
};

const SAMPLE_QUESTIONS: TestQuestionRecord[] = [
  {
    id: 'q1',
    testId: 'mock-1',
    questionNumber: 1,
    subjectName: 'Physics',
    chapterName: 'Electrostatics',
    questionType: 'single-mcq',
    correctOptionIndices: [1],
    testStatus: 'published',
  },
  {
    id: 'q2',
    testId: 'mock-1',
    questionNumber: 2,
    subjectName: 'Chemistry',
    chapterName: 'Chemical Bonding',
    questionType: 'multi-mcq',
    correctOptionIndices: [0, 2],
    testStatus: 'published',
  },
  {
    id: 'q3',
    testId: 'mock-1',
    questionNumber: 3,
    subjectName: 'Mathematics',
    chapterName: 'Definite Integration',
    questionType: 'integer',
    numericalAnswer: '42',
    testStatus: 'published',
  },
];

test('getNextQuestionNumber continues sequentially across pages and never restarts at 1', () => {
  assert.equal(getNextQuestionNumber([]), 1);
  assert.equal(
    getNextQuestionNumber([
      { questionNumber: 1 },
      { questionNumber: 2 },
      { questionNumber: 7 },
    ]),
    8
  );
});

test('transitionQuestionType MCQ -> Integer keeps Question & Solution while discarding Options A-D', () => {
  const mcqDraft: Partial<TestQuestionRecord> = {
    questionType: 'single-mcq',
    questionImageUrl: 'data:image/png;base64,QUESTION_CROP',
    optionImageUrls: ['optA', 'optB', 'optC', 'optD'],
    optionTexts: ['A', 'B', 'C', 'D'],
    correctOptionIndices: [2],
    solutionImageUrl: 'data:image/png;base64,SOLUTION_CROP',
  };

  const integerDraft = transitionQuestionType(mcqDraft, 'integer');
  assert.equal(integerDraft.questionType, 'integer');
  assert.equal(integerDraft.questionImageUrl, 'data:image/png;base64,QUESTION_CROP');
  assert.equal(integerDraft.solutionImageUrl, 'data:image/png;base64,SOLUTION_CROP');
  assert.deepEqual(integerDraft.optionImageUrls, []);
  assert.deepEqual(integerDraft.optionTexts, []);
  assert.deepEqual(integerDraft.correctOptionIndices, []);
});

test('evaluateSingleQuestion accurately scores Single MCQ, Multi MCQ, Integer, and Negative Marking Off', () => {
  const r1 = evaluateSingleQuestion(
    SAMPLE_QUESTIONS[0],
    { type: 'single-mcq', selectedIndex: 1 },
    SAMPLE_TEST
  );
  assert.equal(r1.isCorrect, true);
  assert.equal(r1.deltaMarks, 4);

  const r2Wrong = evaluateSingleQuestion(
    SAMPLE_QUESTIONS[1],
    { type: 'multi-mcq', selectedIndices: [0] },
    SAMPLE_TEST
  );
  assert.equal(r2Wrong.isCorrect, false);
  assert.equal(r2Wrong.deltaMarks, -1);

  const r2Right = evaluateSingleQuestion(
    SAMPLE_QUESTIONS[1],
    { type: 'multi-mcq', selectedIndices: [2, 0] },
    SAMPLE_TEST
  );
  assert.equal(r2Right.isCorrect, true);
  assert.equal(r2Right.deltaMarks, 4);

  const r3Right = evaluateSingleQuestion(
    SAMPLE_QUESTIONS[2],
    { type: 'integer', value: '42.00' },
    SAMPLE_TEST
  );
  assert.equal(r3Right.isCorrect, true);
  assert.equal(r3Right.deltaMarks, 4);

  // Negative marking disabled (DPP mode)
  const rNoNeg = evaluateSingleQuestion(
    SAMPLE_QUESTIONS[0],
    { type: 'single-mcq', selectedIndex: 0 },
    { ...SAMPLE_TEST, negativeMarkingEnabled: false }
  );
  assert.equal(rNoNeg.deltaMarks, 0);
});

test('classifyPace and evaluateFullAttempt compute official score separately from IQ Score', () => {
  assert.equal(classifyPace(5, true, DEFAULT_IQ_CONFIG), 'Too Fast');
  assert.equal(classifyPace(65, true, DEFAULT_IQ_CONFIG), 'Optimal Pace');
  assert.equal(classifyPace(250, true, DEFAULT_IQ_CONFIG), 'Too Slow');
  assert.equal(classifyPace(0, false, DEFAULT_IQ_CONFIG), 'Unattempted');

  const attempt = evaluateFullAttempt({
    attemptId: 'att-1',
    userId: 'u-1',
    test: SAMPLE_TEST,
    questions: SAMPLE_QUESTIONS,
    answers: {
      q1: { type: 'single-mcq', selectedIndex: 1 }, // +4 Optimal
      q2: { type: 'multi-mcq', selectedIndices: [0, 2] }, // +4 Optimal
      q3: { type: 'integer', value: '99' }, // -1 Too Fast
    },
    questionSecondsMap: { q1: 60, q2: 80, q3: 4 },
    openedAtMap: { q1: 1000, q2: 61000, q3: 141000 },
    answeredAtMap: { q1: 59000, q2: 140000, q3: 145000 },
    totalTimeSeconds: 144,
    submittedAtIso: '2026-11-20T10:00:00.000Z',
  });

  assert.equal(attempt.score, 7);
  assert.equal(attempt.maxScore, 12);
  assert.equal(attempt.correctCount, 2);
  assert.equal(attempt.incorrectCount, 1);
  assert.equal(attempt.accuracyPercent, 67);
  assert.equal(attempt.paceSummary.tooFastCount, 1);
  assert.equal(attempt.paceSummary.optimalCount, 2);
  assert.ok(attempt.iqScore >= 40 && attempt.iqScore <= 150);

  const cumulative = computeCumulativeAnalytics([attempt]);
  assert.equal(cumulative.totalTests, 1);
  assert.equal(cumulative.cumulativeCorrect, 2);
  assert.equal(cumulative.highestScore, 7);
});
