import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeWeeklyScheduleStats,
  createDefaultWeeklySchedule,
  createSeoSlug,
  WEEK_DAYS,
} from './weeklySchedule.ts';

test('default weekly schedule covers all 7 days and computes stats accurately', () => {
  const items = createDefaultWeeklySchedule();
  assert.ok(items.length >= 7);

  const daysCovered = new Set(items.map((i) => i.day));
  for (const d of WEEK_DAYS) {
    assert.ok(daysCovered.has(d), `Missing day ${d}`);
  }

  const initialStats = computeWeeklyScheduleStats(items);
  assert.equal(initialStats.completedTasks, 0);
  assert.equal(initialStats.completionPercent, 0);
  assert.ok(initialStats.plannedHours > 10);

  const updated = items.map((item, idx) => (idx < 3 ? { ...item, completed: true } : item));
  const nextStats = computeWeeklyScheduleStats(updated);
  assert.equal(nextStats.completedTasks, 3);
  assert.equal(nextStats.completionPercent, Math.round((3 / items.length) * 100));
  assert.ok(nextStats.completedHours > 0);
});

test('createSeoSlug produces clean URL-friendly slugs', () => {
  assert.equal(
    createSeoSlug('Electrostatics & Gauss Law — JEE Main PYQs (2026)!'),
    'electrostatics-gauss-law-jee-main-pyqs-2026'
  );
});
