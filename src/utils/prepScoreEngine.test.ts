import test from 'node:test';
import assert from 'node:assert/strict';
import { computePrepScore } from './prepScoreEngine';
import type {
  ChapterRecord,
  QuestionTimingRecord,
  TestAttemptRecord,
  TestQuestionRecord,
} from '../types';

function makeQuestion(overrides: Partial<TestQuestionRecord> = {}): TestQuestionRecord {
  return {
    id: overrides.id ?? 'q-1',
    testId: overrides.testId ?? 'test-1',
    questionNumber: overrides.questionNumber ?? 1,
    subjectName: overrides.subjectName ?? 'Physics',
    chapterName: overrides.chapterName ?? 'Electrostatics',
    questionType: overrides.questionType ?? 'single-mcq',
    questionText: overrides.questionText ?? 'Sample physics question',
    optionTexts: overrides.optionTexts ?? ['A', 'B', 'C', 'D'],
    correctOptionIndices: overrides.correctOptionIndices ?? [0],
    positiveMarks: overrides.positiveMarks ?? 4,
    negativeMarks: overrides.negativeMarks ?? 1,
    testStatus: overrides.testStatus ?? 'published',
  };
}

function makeTiming(overrides: Partial<QuestionTimingRecord> = {}): QuestionTimingRecord {
  return {
    questionId: overrides.questionId ?? 'q-1',
    questionNumber: overrides.questionNumber ?? 1,
    subjectName: overrides.subjectName ?? 'Physics',
    chapterName: overrides.chapterName ?? 'Electrostatics',
    openedAtMs: overrides.openedAtMs ?? 1000,
    answeredAtMs: overrides.answeredAtMs ?? 65000,
    timeSpentSeconds: overrides.timeSpentSeconds ?? 65,
    answered: overrides.answered ?? true,
    isCorrect: overrides.isCorrect ?? true,
    paceCategory: overrides.paceCategory ?? 'Optimal Pace',
  };
}

function makeAttempt(overrides: Partial<TestAttemptRecord> = {}): TestAttemptRecord {
  return {
    id: overrides.id ?? 'att-1',
    userId: overrides.userId ?? 'u-1',
    testId: overrides.testId ?? 'test-1',
    testTitle: overrides.testTitle ?? 'JEE Main Mock 1',
    destination: overrides.destination ?? 'cbt-mock',
    cohortId: overrides.cohortId ?? 'class-12-jee',
    score: overrides.score ?? 48,
    maxScore: overrides.maxScore ?? 48,
    correctCount: overrides.correctCount ?? 12,
    incorrectCount: overrides.incorrectCount ?? 0,
    unattemptedCount: overrides.unattemptedCount ?? 0,
    accuracyPercent: overrides.accuracyPercent ?? 100,
    totalTimeSeconds: overrides.totalTimeSeconds ?? 780,
    avgTimePerQuestion: overrides.avgTimePerQuestion ?? 65,
    iqScore: overrides.iqScore ?? 88,
    paceSummary: overrides.paceSummary ?? {
      tooFastCount: 0,
      optimalCount: 12,
      tooSlowCount: 0,
      unattemptedCount: 0,
      rushingFlagNote: 'Balanced pacing',
    },
    subjectScores: overrides.subjectScores ?? [
      {
        subjectName: 'Physics',
        total: 12,
        correct: 12,
        incorrect: 0,
        unattempted: 0,
        score: 48,
        maxScore: 48,
        accuracyPercent: 100,
        avgTimeSeconds: 65,
      },
    ],
    chapterScores: overrides.chapterScores ?? [
      {
        chapterName: 'Electrostatics',
        subjectName: 'Physics',
        total: 6,
        correct: 6,
        incorrect: 0,
        accuracyPercent: 100,
      },
      {
        chapterName: 'Modern Physics',
        subjectName: 'Physics',
        total: 6,
        correct: 6,
        incorrect: 0,
        accuracyPercent: 100,
      },
    ],
    questionTimings: overrides.questionTimings ?? [],
    answers: overrides.answers ?? {},
    submittedAtIso: overrides.submittedAtIso ?? '2026-11-24T10:00:00.000Z',
  };
}

const SAMPLE_CHAPTERS: ChapterRecord[] = [
  {
    id: 'ch-1',
    subjectId: 'subj-physics',
    name: 'Electrostatics',
    order: 1,
    cohorts: ['class-12-jee'],
    weightageMarks: 12,
    difficulty: 'Moderate',
  },
  {
    id: 'ch-2',
    subjectId: 'subj-physics',
    name: 'Modern Physics',
    order: 2,
    cohorts: ['class-12-jee'],
    weightageMarks: 12,
    difficulty: 'Moderate',
  },
];

test('computePrepScore calibrates cleanly to 0–100 scale with empty attempts', () => {
  const result = computePrepScore({
    attempts: [],
    questions: [],
    chapters: SAMPLE_CHAPTERS,
    activeStudyDates: ['2026-11-23', '2026-11-24'],
    resolvedMistakeIds: [],
    cohortLabel: 'Class 12 JEE',
    referenceDate: new Date('2026-11-24T12:00:00.000Z'),
  });

  assert.equal(result.maxScore, 100);
  assert.ok(result.score >= 0 && result.score <= 100, `score ${result.score} out of 0–100 bounds`);
  assert.equal(result.pointsTo85, Math.max(0, 85 - result.score));

  const factorMaxSum = result.factors.reduce((sum, f) => sum + f.maxScore, 0);
  assert.equal(factorMaxSum, 100);
  assert.deepEqual(
    result.factors.map((f) => f.maxScore),
    [25, 30, 25, 20]
  );
  assert.equal(result.tier, 'Foundation');
});

test('computePrepScore awards high 0–100 score and AIR Top 1000 Pace tier for strong optimal attempts', () => {
  const qs = Array.from({ length: 12 }, (_, idx) =>
    makeQuestion({
      id: `q-${idx + 1}`,
      questionNumber: idx + 1,
      chapterName: idx % 2 === 0 ? 'Electrostatics' : 'Modern Physics',
    })
  );

  const timings = qs.map((q) =>
    makeTiming({
      questionId: q.id,
      questionNumber: q.questionNumber,
      chapterName: q.chapterName ?? 'Electrostatics',
      timeSpentSeconds: 70,
      answered: true,
      isCorrect: true,
      paceCategory: 'Optimal Pace',
    })
  );

  const answers: TestAttemptRecord['answers'] = {};
  for (const q of qs) {
    answers[q.id] = { type: 'single-mcq', selectedIndex: 0 };
  }

  const attempt = makeAttempt({
    questionTimings: timings,
    answers,
    submittedAtIso: '2026-11-24T10:00:00.000Z',
  });

  const studyDates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date('2026-11-24T12:00:00.000Z');
    d.setDate(d.getDate() - i);
    return d.toISOString().slice(0, 10);
  });

  const result = computePrepScore({
    attempts: [attempt, { ...attempt, id: 'att-2', submittedAtIso: '2026-11-20T10:00:00.000Z' }],
    questions: qs,
    chapters: SAMPLE_CHAPTERS,
    activeStudyDates: studyDates,
    resolvedMistakeIds: [],
    cohortLabel: 'Class 12 JEE',
    referenceDate: new Date('2026-11-24T12:00:00.000Z'),
  });

  assert.equal(result.maxScore, 100);
  assert.ok(result.score >= 85 && result.score <= 100, `Expected >=85, got ${result.score}`);
  assert.equal(result.tier, 'AIR Top 1000 Pace');
  assert.equal(result.pointsTo85, 0);
});

test('computePrepScore penalizes rushed <10s mistakes and >180s time sinks with bounded 0–100 insights', () => {
  const qs = [
    makeQuestion({ id: 'q-fast-1', questionNumber: 1, chapterName: 'Rotational Motion' }),
    makeQuestion({ id: 'q-fast-2', questionNumber: 2, chapterName: 'Rotational Motion' }),
    makeQuestion({ id: 'q-slow-1', questionNumber: 3, chapterName: 'Optics' }),
    makeQuestion({ id: 'q-slow-2', questionNumber: 4, chapterName: 'Optics' }),
  ];

  const attempt = makeAttempt({
    score: -4,
    maxScore: 16,
    correctCount: 0,
    incorrectCount: 4,
    unattemptedCount: 0,
    accuracyPercent: 0,
    questionTimings: [
      makeTiming({ questionId: 'q-fast-1', questionNumber: 1, chapterName: 'Rotational Motion', timeSpentSeconds: 6, isCorrect: false, paceCategory: 'Too Fast' }),
      makeTiming({ questionId: 'q-fast-2', questionNumber: 2, chapterName: 'Rotational Motion', timeSpentSeconds: 8, isCorrect: false, paceCategory: 'Too Fast' }),
      makeTiming({ questionId: 'q-slow-1', questionNumber: 3, chapterName: 'Optics', timeSpentSeconds: 210, isCorrect: false, paceCategory: 'Too Slow' }),
      makeTiming({ questionId: 'q-slow-2', questionNumber: 4, chapterName: 'Optics', timeSpentSeconds: 240, isCorrect: false, paceCategory: 'Too Slow' }),
    ],
    answers: {
      'q-fast-1': { type: 'single-mcq', selectedIndex: 1 },
      'q-fast-2': { type: 'single-mcq', selectedIndex: 2 },
      'q-slow-1': { type: 'single-mcq', selectedIndex: 1 },
      'q-slow-2': { type: 'single-mcq', selectedIndex: 1 },
    },
    chapterScores: [
      { chapterName: 'Rotational Motion', subjectName: 'Physics', total: 2, correct: 0, incorrect: 2, accuracyPercent: 0 },
      { chapterName: 'Optics', subjectName: 'Physics', total: 2, correct: 0, incorrect: 2, accuracyPercent: 0 },
    ],
  });

  const result = computePrepScore({
    attempts: [attempt],
    questions: qs,
    chapters: SAMPLE_CHAPTERS,
    activeStudyDates: [],
    resolvedMistakeIds: [],
    cohortLabel: 'Class 12 JEE',
    referenceDate: new Date('2026-11-24T12:00:00.000Z'),
  });

  assert.ok(result.score >= 0 && result.score <= 45, `Expected low score, got ${result.score}`);
  assert.ok(result.diagnostics.rushedWrongCount >= 2);
  assert.ok(result.diagnostics.timeSinkCount >= 2);
  for (const item of result.actionItems) {
    assert.ok(item.estimatedGainPts <= 25, `Gain ${item.estimatedGainPts} should be bounded for 0–100 scale`);
  }
});
