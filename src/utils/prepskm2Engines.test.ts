import test from 'node:test';
import assert from 'node:assert/strict';
import { predictExamPercentile } from './percentilePredictor.ts';
import {
  advanceSm2Stage,
  analyzeExamTemperament,
  buildSundayWeaknessKillerQuestions,
} from './examTemperamentEngine.ts';
import {
  computeEloUpdate,
  createInitialArenaProgression,
  generateMentorshipPassToken,
  getTrifectaProgress,
} from './arenaProgression.ts';
import { validateAiGamePayload } from '../lib/ai-game-generator.ts';
import type { TestAttemptRecord, TestQuestionRecord } from '../types/index.ts';

test('predictExamPercentile calibrates JEE Main (165=99%ile, 120=96.45%ile) & NEET UG (650=99.38%ile)', () => {
  const jee99 = predictExamPercentile('jee-main', 165);
  assert.equal(jee99.percentile, 99);
  assert.equal(jee99.maxMarks, 300);
  assert.ok(jee99.targetTier.includes('99'));

  const jee120 = predictExamPercentile('jee-main', 120);
  assert.equal(jee120.percentile, 96.45);

  const neet650 = predictExamPercentile('neet-ug', 650);
  assert.equal(neet650.percentile, 99.38);
  assert.equal(neet650.maxMarks, 720);

  const clamped = predictExamPercentile('jee-main', 999);
  assert.equal(clamped.marks, 300);
});

test('analyzeExamTemperament detects Negative-Marking Tilt, Time-Sink Traps (>210s), and SM-2 schedule', () => {
  const questions: TestQuestionRecord[] = [
    {
      id: 'q1',
      testId: 't1',
      questionNumber: 1,
      subjectName: 'Physics',
      chapterName: 'Rotational Motion',
      questionType: 'single-mcq',
      questionText: 'Q1',
      optionTexts: ['A', 'B', 'C', 'D'],
      correctOptionIndices: [0],
      testStatus: 'published',
    },
    {
      id: 'q2',
      testId: 't1',
      questionNumber: 2,
      subjectName: 'Physics',
      chapterName: 'Electrostatics',
      questionType: 'single-mcq',
      questionText: 'Q2',
      optionTexts: ['A', 'B', 'C', 'D'],
      correctOptionIndices: [1],
      testStatus: 'published',
    },
    {
      id: 'q3',
      testId: 't1',
      questionNumber: 3,
      subjectName: 'Chemistry',
      chapterName: 'Chemical Bonding',
      questionType: 'single-mcq',
      questionText: 'Q3',
      optionTexts: ['A', 'B', 'C', 'D'],
      correctOptionIndices: [2],
      testStatus: 'published',
    },
  ];

  const attempt: TestAttemptRecord = {
    id: 'att1',
    userId: 'u1',
    testId: 't1',
    testTitle: 'Mini Mock',
    destination: 'cbt-mock',
    cohortId: 'class-12-jee',
    score: -3,
    maxScore: 12,
    correctCount: 0,
    incorrectCount: 3,
    unattemptedCount: 0,
    accuracyPercent: 0,
    totalTimeSeconds: 300,
    avgTimePerQuestion: 100,
    iqScore: 60,
    paceSummary: {
      tooFastCount: 1,
      optimalCount: 1,
      tooSlowCount: 1,
      unattemptedCount: 0,
      rushingFlagNote: '',
    },
    subjectScores: [],
    chapterScores: [],
    questionTimings: [
      {
        questionId: 'q1',
        questionNumber: 1,
        subjectName: 'Physics',
        chapterName: 'Rotational Motion',
        openedAtMs: 0,
        answeredAtMs: 240_000,
        timeSpentSeconds: 240,
        answered: true,
        isCorrect: false,
        paceCategory: 'Too Slow',
      },
      {
        questionId: 'q2',
        questionNumber: 2,
        subjectName: 'Physics',
        chapterName: 'Electrostatics',
        openedAtMs: 240_000,
        answeredAtMs: 290_000,
        timeSpentSeconds: 50,
        answered: true,
        isCorrect: false,
        paceCategory: 'Optimal Pace',
      },
      {
        questionId: 'q3',
        questionNumber: 3,
        subjectName: 'Chemistry',
        chapterName: 'Chemical Bonding',
        openedAtMs: 290_000,
        answeredAtMs: 300_000,
        timeSpentSeconds: 10,
        answered: true,
        isCorrect: false,
        paceCategory: 'Too Fast',
      },
    ],
    answers: {},
    submittedAtIso: '2026-11-26T10:00:00.000Z',
  };

  const report = analyzeExamTemperament([attempt], questions);
  assert.equal(report.tiltIncidents.length, 1);
  assert.equal(report.tiltIncidents[0].questionId, 'q3');
  assert.equal(report.totalMarksLostToTilt, 1);
  assert.equal(report.timeSinkTraps.length, 1);
  assert.equal(report.timeSinkTraps[0].questionId, 'q1');
  assert.equal(report.sm2Queue.length, 3);
  assert.equal(report.sm2Queue[0].intervalDays, 1);

  const killerQs = buildSundayWeaknessKillerQuestions(report.sm2Queue, questions, 2);
  assert.equal(killerQs.length, 2);
  assert.equal(advanceSm2Stage(1, 4).nextInterval, 3);
  assert.equal(advanceSm2Stage(3, 4).nextInterval, 7);
  assert.equal(advanceSm2Stage(7, 4).nextInterval, 21);
  assert.equal(advanceSm2Stage(21, 5).nextInterval, 21);
  assert.equal(advanceSm2Stage(7, 1).nextInterval, 1);
});

test('arenaProgression computes Elo, Trifecta completion, and cryptographic pass tokens', () => {
  const init = createInitialArenaProgression('2026-11-26');
  assert.equal(init.elo.physics, 1000);
  const progress0 = getTrifectaProgress(init.trifecta);
  assert.equal(progress0.completedCount, 0);

  const progress3 = getTrifectaProgress({
    dateIso: '2026-11-26',
    pyqsOrTestDone: true,
    focusBlockDone: true,
    arenaOrMistakesDone: true,
    pyqsSolvedToday: 12,
    focusMinutesToday: 25,
    arenaWinsToday: 1,
  });
  assert.equal(progress3.completedCount, 3);
  assert.equal(progress3.shieldProtected, true);

  const wonElo = computeEloUpdate(1000, 0.9);
  assert.ok(wonElo.newRating > 1000);
  const lostElo = computeEloUpdate(1000, 0.2);
  assert.ok(lostElo.newRating < 1000);

  const token = generateMentorshipPassToken('JEE');
  assert.match(token, /^PSKM-JEE-[A-Z0-9]{6}$/);
});

test('validateAiGamePayload validates clean payloads and rejects malformed payloads', () => {
  const valid = validateAiGamePayload({
    title: 'Electrostatics Speed Blitz',
    exam: 'JEE Main',
    subject: 'Physics',
    chapter: 'Electrostatics',
    format: 'Formula Blitz',
    difficulty: 'Exam-Grade',
    xpReward: 150,
    questions: [
      {
        id: 'g1',
        prompt: 'Electric field inside a uniformly charged hollow conducting sphere is:',
        options: ['Zero', 'kQ/R^2', 'kQ/r^2', 'Infinity'],
        correctIndex: 0,
        timeLimitSeconds: 25,
        hint: 'Apply Gauss law inside the hollow shell.',
        explanation: 'Enclosed charge q_in = 0 so E = 0 everywhere inside.',
      },
    ],
  });
  assert.equal(valid.questions.length, 1);
  assert.equal(valid.questions[0].correctIndex, 0);

  assert.throws(() => validateAiGamePayload({ title: 'Broken', questions: [] }));
});
