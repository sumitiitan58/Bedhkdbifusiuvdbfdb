import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPrepsAiStudentContext,
  computeExamCountdown,
  computeStudyStreak,
} from './streakTracker';

describe('streakTracker', () => {
  it('computes current and longest streaks accurately with 7-day calendar', () => {
    const summary = computeStudyStreak(
      ['2026-11-18', '2026-11-22', '2026-11-23', '2026-11-24'],
      '2026-11-24'
    );
    assert.equal(summary.currentStreak, 3);
    assert.equal(summary.longestStreak, 3);
    assert.equal(summary.activeToday, true);
    assert.equal(summary.last7Days.length, 7);
    assert.equal(summary.last7Days[6].active, true);
  });

  it('keeps current streak alive when active yesterday but not yet today', () => {
    const summary = computeStudyStreak(['2026-11-22', '2026-11-23'], '2026-11-24');
    assert.equal(summary.currentStreak, 2);
    assert.equal(summary.activeToday, false);
  });

  it('computes countdown days to target JEE/NEET exam date', () => {
    const res = computeExamCountdown('2027-01-22', '2026-11-24');
    assert.equal(res.daysRemaining, 59);
    assert.equal(res.isPast, false);
  });

  it('builds structured student context for Preps AI even with zero attempts', () => {
    const ctx = buildPrepsAiStudentContext({
      studentName: 'Aarav',
      cohortLabel: 'Class 12 JEE',
      attempts: [],
      currentStreakDays: 4,
      targetExamDaysLeft: 59,
      bookmarkedQuestionsCount: 3,
      unresolvedMistakesCount: 0,
    });
    assert.equal(ctx.studentName, 'Aarav');
    assert.equal(ctx.totalAttempts, 0);
    assert.equal(ctx.latestTest, undefined);
  });
});
