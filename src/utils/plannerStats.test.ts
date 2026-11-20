import test from 'node:test';
import assert from 'node:assert/strict';
import { MANZIL_78_LECTURES, PLANNER_60_DAYS } from './plannerData';
import { computeManzilAndWeightageStats, mergeUserProgress } from './plannerStats';
import type { UserProgressData } from '../types';

test('MANZIL_78_LECTURES contains exactly 78 chapters totaling 300 marks and PLANNER_60_DAYS has 60 days', () => {
  assert.equal(MANZIL_78_LECTURES.length, 78);
  assert.equal(PLANNER_60_DAYS.length, 60);

  const stats = computeManzilAndWeightageStats(MANZIL_78_LECTURES, {
    'manzil-phy-1': { watched: true, watchedMinutes: 95 },
    'manzil-chem-1': { watched: true, watchedMinutes: 125 },
  });

  assert.equal(stats.weightage.totalMarks, 300);
  assert.equal(stats.watchedLectures, 2);
  assert.equal(stats.watchedMinutes, 220);
  assert.equal(stats.weightage.bySubject.length, 3);
  assert.equal(stats.weightage.bySubject[0].marks, 100);
  assert.equal(stats.weightage.bySubject[1].marks, 100);
  assert.equal(stats.weightage.bySubject[2].marks, 100);
});

test('mergeUserProgress preserves both cloud and guest progress without resetting 78 Manzil', () => {
  const cloud: UserProgressData = {
    userId: 'uid-1',
    plannerCompletedDays: [1, 2],
    weeklySchedule: [],
    manzilProgress: { 'manzil-phy-1': { watched: true, watchedMinutes: 95 } },
    lectureWatchState: {},
    bookmarkedMaterials: ['mat-1'],
    recentMaterials: ['mat-1'],
    focusSessionsMinutes: 50,
    updatedAtIso: '2026-11-19T00:00:00.000Z',
  };
  const guest: UserProgressData = {
    userId: 'guest',
    plannerCompletedDays: [2, 3, 4],
    weeklySchedule: [],
    manzilProgress: { 'manzil-math-1': { watched: true, watchedMinutes: 140 } },
    lectureWatchState: {},
    bookmarkedMaterials: ['mat-2'],
    recentMaterials: ['mat-2'],
    focusSessionsMinutes: 75,
    updatedAtIso: '2026-11-20T00:00:00.000Z',
  };

  const merged = mergeUserProgress(cloud, guest, 'uid-1');
  assert.deepEqual(merged.plannerCompletedDays, [1, 2, 3, 4]);
  assert.equal(merged.manzilProgress['manzil-phy-1'].watched, true);
  assert.equal(merged.manzilProgress['manzil-math-1'].watched, true);
  assert.equal(merged.focusSessionsMinutes, 75);
  assert.deepEqual(merged.bookmarkedMaterials, ['mat-1', 'mat-2']);
});
