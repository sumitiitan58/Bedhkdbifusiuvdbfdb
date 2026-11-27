import test from 'node:test';
import assert from 'node:assert/strict';
import {
  APEX_RIVALS,
  STARTING_DUEL_POINTS,
  calculatePointTrade,
  getApexRankTier,
  getDuelQuestionsForTrack,
} from './apexArenaEngine';
import {
  buildBalancedCustomMock,
  computeBalancedSubjectQuota,
  generateTailoredChapterDpp,
} from './customMockAndDppEngine';

test('Apex Arena 2-player duel begins with equal points and dynamically trades points on accuracy & speed', () => {
  assert.equal(STARTING_DUEL_POINTS, 1000);
  assert.equal(APEX_RIVALS.length, 3);

  // Player correct, AI wrong => player steals from AI (zero-sum conservation)
  const steal = calculatePointTrade({
    playerPoints: 1000,
    aiPoints: 1000,
    playerCorrect: true,
    aiCorrect: false,
    playerTimeMs: 3200,
    aiTimeMs: 8500,
    playerStreak: 1,
  });
  assert.ok(steal.deltaPlayer > 100);
  assert.equal(steal.nextPlayerPoints + steal.nextAiPoints, 2000);
  assert.equal(steal.verdict, 'player-steal');

  // Player wrong, AI correct => AI steals from player
  const counter = calculatePointTrade({
    playerPoints: steal.nextPlayerPoints,
    aiPoints: steal.nextAiPoints,
    playerCorrect: false,
    aiCorrect: true,
    playerTimeMs: 9000,
    aiTimeMs: 4200,
    playerStreak: 2,
  });
  assert.ok(counter.deltaPlayer < 0);
  assert.equal(counter.nextPlayerStreak, 0);
  assert.equal(counter.nextPlayerPoints + counter.nextAiPoints, 2000);
  assert.equal(counter.verdict, 'ai-steal');

  // Rank tier rises cleanly with higher points
  assert.ok(getApexRankTier(1450).rankIndex > getApexRankTier(1000).rankIndex);
  assert.equal(getDuelQuestionsForTrack('quantum-clash', 8).length, 8);
  assert.equal(getDuelQuestionsForTrack('synthesis-strike', 8).length, 8);
  assert.equal(getDuelQuestionsForTrack('logic-labyrinth', 8).length, 8);
});

test('Custom Mock Builder balances 10, 25, and 45 questions cleanly with zero synthetic prefixes and randomized A/B/C/D options', () => {
  for (const count of [10, 25, 45] as const) {
    const quotas = computeBalancedSubjectQuota(count, ['Physics', 'Chemistry', 'Mathematics']);
    const sum = quotas.reduce((acc, q) => acc + q.count, 0);
    assert.equal(sum, count);

    const mock = buildBalancedCustomMock(
      {
        questionCount: count,
        examType: 'JEE Main',
        subjects: ['Physics', 'Chemistry', 'Mathematics'],
        aiBalanced: true,
      },
      []
    );
    assert.equal(mock.questions.length, count);
    assert.equal(mock.test.totalQuestions, count);
    assert.equal(new Set(mock.questions.map((q) => q.id)).size, count);
    assert.ok(mock.test.title.includes('JEE Main'));

    // Zero synthetic prefixes in question stems
    for (const q of mock.questions) {
      assert.ok(
        !/^\s*\[(?:Custom Mock|AI Balanced|Mock)\]/i.test(q.questionText ?? ''),
        `Unexpected synthetic prefix in: ${q.questionText}`
      );
    }

    // Randomized option positions across A/B/C/D (must not all be index 0)
    const mcqIndices = new Set(
      mock.questions
        .filter((q) => q.questionType === 'single-mcq')
        .map((q) => q.correctOptionIndices?.[0])
    );
    assert.ok(mcqIndices.size >= 2, 'Expected randomized correct option indices across A/B/C/D');
  }

  // Strict single-subject and chapter filtering (no cross-subject bleed)
  const physicsOnly = buildBalancedCustomMock(
    {
      questionCount: 10,
      examType: 'JEE Main',
      subjects: ['Physics'],
      chapters: ['Electrostatics'],
      aiBalanced: false,
    },
    []
  );
  assert.equal(physicsOnly.questions.length, 10);
  assert.ok(physicsOnly.questions.every((q) => q.subjectName === 'Physics'));
  assert.ok(physicsOnly.questions.every((q) => q.chapterName === 'Electrostatics'));
});

test('Generate DPP creates a tailored chapter practice set with exact count and solutions', () => {
  const bundle = generateTailoredChapterDpp(
    {
      subjectName: 'Physics',
      chapterName: 'Rotational Motion',
      cohortId: 'class-12-jee',
      questionCount: 15,
      difficulty: 'JEE/NEET Mains',
      includeNumerical: true,
    },
    []
  );
  assert.equal(bundle.test.destination, 'dpp');
  assert.equal(bundle.questions.length, 15);
  assert.equal(new Set(bundle.questions.map((q) => q.id)).size, 15);
  assert.ok(bundle.test.title.includes('Rotational Motion'));
  assert.ok(bundle.questions.some((q) => q.questionType === 'integer'));
  assert.ok(bundle.questions.every((q) => Boolean(q.solutionText)));
});
