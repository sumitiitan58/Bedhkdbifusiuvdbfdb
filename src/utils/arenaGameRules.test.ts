import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ARENA_SYLLABUS_QUESTIONS,
  BUBBLE_LEVELS,
  SHOOTER_LEVELS,
  calculateBubblePopScore,
  findFloatingBubbles,
  findMatchingBubbleCluster,
  pickArenaQuestion,
  resolvePowerShotAttempt,
  resolveReloadAttempt,
  resolveReviveAttempt,
} from './arenaGameRules';

test('Apex Arena level progression configs define 3 escalating levels for both Tactical Shooter and Bubble Shooter', () => {
  assert.equal(SHOOTER_LEVELS.length, 3);
  assert.ok(SHOOTER_LEVELS[0].targetEliminations < SHOOTER_LEVELS[1].targetEliminations);
  assert.ok(SHOOTER_LEVELS[1].targetEliminations < SHOOTER_LEVELS[2].targetEliminations);
  assert.ok(SHOOTER_LEVELS[0].speedScale < SHOOTER_LEVELS[2].speedScale);

  assert.equal(BUBBLE_LEVELS.length, 3);
  assert.ok(BUBBLE_LEVELS[0].colorCount < BUBBLE_LEVELS[1].colorCount);
  assert.ok(BUBBLE_LEVELS[1].targetPops < BUBBLE_LEVELS[2].targetPops);
  assert.ok(ARENA_SYLLABUS_QUESTIONS.length >= 12);
});

test('Tactical Shooter reload and revive syllabus gates reward correct answers and handle misses cleanly', () => {
  const okReload = resolveReloadAttempt({
    selectedIndex: 2,
    correctIndex: 2,
    maxAmmo: 10,
    currentScore: 150,
  });
  assert.equal(okReload.fullClip, true);
  assert.equal(okReload.nextAmmo, 10);
  assert.equal(okReload.nextScore, 210);

  const missReload = resolveReloadAttempt({
    selectedIndex: 0,
    correctIndex: 2,
    maxAmmo: 10,
    currentScore: 150,
  });
  assert.equal(missReload.fullClip, false);
  assert.ok(missReload.nextAmmo >= 3 && missReload.nextAmmo < 10);
  assert.equal(missReload.nextScore, 150);

  const okRevive = resolveReviveAttempt({
    selectedIndex: 1,
    correctIndex: 1,
    maxHp: 5,
    maxAmmo: 10,
    currentScore: 400,
  });
  assert.equal(okRevive.revived, true);
  assert.equal(okRevive.nextHp, 5);
  assert.equal(okRevive.nextAmmo, 10);
  assert.equal(okRevive.nextScore, 500);

  const failRevive = resolveReviveAttempt({
    selectedIndex: 3,
    correctIndex: 1,
    maxHp: 5,
    maxAmmo: 10,
    currentScore: 400,
  });
  assert.equal(failRevive.revived, false);
  assert.equal(failRevive.nextHp, 0);
});

test('Bubble Shooter BFS detects matching clusters and disconnected floating bubbles accurately', () => {
  const grid: Array<Array<number | null>> = [
    [1, 1, null, 2, null],
    [1, null, null, 2, null],
    [null, null, null, 3, null],
    [null, null, null, 3, null],
  ];

  const cluster = findMatchingBubbleCluster(grid, 0, 0);
  assert.equal(cluster.length, 3);

  // Remove the top-right color-2 bridge so the color-3 bubbles underneath become floating
  grid[0][3] = null;
  grid[1][3] = null;
  const floating = findFloatingBubbles(grid);
  assert.equal(floating.length, 2);
  assert.deepEqual(
    floating.map(([r, c]) => `${r},${c}`).sort(),
    ['2,3', '3,3']
  );

  assert.equal(calculateBubblePopScore(3, 2, 2), (75 + 80) * 2);

  const powerOk = resolvePowerShotAttempt({ selectedIndex: 0, correctIndex: 0 });
  assert.equal(powerOk.granted, true);
  assert.ok(powerOk.bonusScore > 0);
});

test('pickArenaQuestion avoids repeating used IDs until pool exhausted', () => {
  const used = new Set<string>();
  const first = pickArenaQuestion(used, 'Physics');
  used.add(first.id);
  const second = pickArenaQuestion(used, 'Physics');
  assert.notEqual(first.id, second.id);
  assert.equal(second.subject, 'Physics');
});
