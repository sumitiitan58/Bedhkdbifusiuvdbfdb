import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeExpectedPercentileRange,
  getChapterStudyPack,
  getLevelFromXp,
} from './prepskm2Upgrades';
import { computePrepScore } from './prepScoreEngine';

test('getLevelFromXp increments level cleanly at every 250 XP boundary', () => {
  assert.equal(getLevelFromXp(0).level, 1);
  assert.equal(getLevelFromXp(249).level, 1);
  assert.equal(getLevelFromXp(250).level, 2);
  assert.equal(getLevelFromXp(520).level, 3);
  assert.equal(getLevelFromXp(520).currentLevelXp, 20);
});

test('computeExpectedPercentileRange returns tight bounded range for JEE and NEET', () => {
  const jee = computeExpectedPercentileRange(99.2, 'JEE Main');
  assert.ok(jee.low < 99.2 && jee.high > 99.2 && jee.high <= 99.99);
  assert.ok(jee.label.includes('%ile'));

  const neet = computeExpectedPercentileRange(96.5, 'NEET UG');
  assert.ok(neet.bandSummary.toLowerCase().includes('medical'));
});

test('getChapterStudyPack provides Unique PYQs, NCERT X-Ray, and 3D Flip Cards across subjects', () => {
  for (const subject of ['Physics', 'Chemistry', 'Mathematics', 'Biology']) {
    const pack = getChapterStudyPack('Core Chapter', subject);
    assert.ok(pack.uniquePyqGroups.length >= 2);
    assert.ok(pack.ncertXrayMappings.length >= 2);
    assert.ok(pack.flipFormulaCards.length >= 3);
  }
});

test('computePrepScore credits taggedMistakeIds toward mistake diagnostics', () => {
  const result = computePrepScore({
    attempts: [],
    questions: [],
    chapters: [],
    activeStudyDates: [],
    resolvedMistakeIds: [],
    taggedMistakeIds: ['q1', 'q2'],
  });
  assert.equal(result.diagnostics.mistakeTaggedCount, 2);
});
