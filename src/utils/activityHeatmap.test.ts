import test from 'node:test';
import assert from 'node:assert/strict';
import { build30DayActivityHeatmap, resolveIntensityLevel } from './activityHeatmap';

test('build30DayActivityHeatmap returns exactly 30 chronological days ending on todayIso', () => {
  const heatmap = build30DayActivityHeatmap({
    activeStudyDates: ['2026-11-25', '2026-11-24', '2026-11-20', '2026-10-01'],
    attempts: [
      { submittedAtIso: '2026-11-25T10:00:00.000Z' },
      { submittedAtIso: '2026-11-25T16:00:00.000Z' },
      { submittedAtIso: '2026-11-24T09:00:00.000Z' },
    ],
    todayIso: '2026-11-25',
  });

  assert.equal(heatmap.days.length, 30);
  assert.equal(heatmap.days[0].dateIso, '2026-10-27');
  assert.equal(heatmap.days[29].dateIso, '2026-11-25');
  assert.equal(heatmap.days[29].isToday, true);

  // 3 active days within the 30-day window (2026-10-01 is outside the 30-day window)
  assert.equal(heatmap.activeDaysCount, 3);
  assert.equal(heatmap.consistencyPercent, 10);
  assert.equal(heatmap.totalMocks30d, 3);
  assert.equal(heatmap.currentStreak, 2);
  assert.equal(heatmap.studiedToday, true);

  // Today has check-in (1) + 2 mocks (4) = 5 -> level 4 peak grind
  assert.equal(heatmap.days[29].intensityLevel, 4);
  // Nov 24 has check-in (1) + 1 mock (2) = 3 -> level 3
  assert.equal(heatmap.days[28].intensityLevel, 3);
  // Nov 20 has check-in only (1) -> level 1
  const nov20 = heatmap.days.find((d) => d.dateIso === '2026-11-20');
  assert.equal(nov20?.intensityLevel, 1);
  assert.equal(heatmap.bestDay?.dateIso, '2026-11-25');
});

test('build30DayActivityHeatmap aligns weeksGrid into 7-day Sun-Sat columns', () => {
  const heatmap = build30DayActivityHeatmap({
    activeStudyDates: [],
    attempts: [],
    todayIso: '2026-11-25',
  });

  assert.ok(heatmap.weeksGrid.length >= 5);
  for (const week of heatmap.weeksGrid) {
    assert.equal(week.length, 7);
    assert.equal(week[0].dayOfWeek, 0); // Sunday
    assert.equal(week[6].dayOfWeek, 6); // Saturday
  }

  const inRangeCount = heatmap.weeksGrid.flat().filter((cell) => cell.isInRange).length;
  assert.equal(inRangeCount, 30);
  assert.equal(heatmap.activeDaysCount, 0);
  assert.equal(heatmap.bestDay, null);
});

test('resolveIntensityLevel clamps cleanly to 0..4', () => {
  assert.equal(resolveIntensityLevel(0), 0);
  assert.equal(resolveIntensityLevel(1), 1);
  assert.equal(resolveIntensityLevel(2), 2);
  assert.equal(resolveIntensityLevel(3), 3);
  assert.equal(resolveIntensityLevel(9), 4);
});
