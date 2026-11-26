/**
 * Pure 30-Day GitHub-Style Study Consistency Activity Heatmap Engine.
 * Aggregates daily check-ins and submitted CBT mocks/DPPs across the exact
 * trailing 30 calendar days into a weekday-aligned (Sun–Sat) contribution grid.
 */

import type { TestAttemptRecord } from '../types';
import { computeStudyStreak, toLocalDateKey } from './streakTracker';

function addDays(isoDate: string, deltaDays: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setDate(dt.getDate() + deltaDays);
  return toLocalDateKey(dt);
}

export type HeatmapIntensityLevel = 0 | 1 | 2 | 3 | 4;

export interface HeatmapDayCell {
  dateIso: string;
  dayOfWeek: number; // 0 = Sun ... 6 = Sat
  dayNumber: number;
  monthShort: string;
  formattedDate: string;
  checkedIn: boolean;
  mocksCount: number;
  activityCount: number;
  intensityLevel: HeatmapIntensityLevel;
  isToday: boolean;
  isInRange: boolean;
}

export interface StudyActivityHeatmapData {
  days: HeatmapDayCell[]; // Exact 30 days in chronological order
  weeksGrid: HeatmapDayCell[][]; // Columns of 7 days (Sun..Sat) padded for GitHub matrix alignment
  activeDaysCount: number;
  totalDays: number;
  consistencyPercent: number;
  totalActivities30d: number;
  totalMocks30d: number;
  currentStreak: number;
  longestStreak: number;
  studiedToday: boolean;
  bestDay: HeatmapDayCell | null;
  monthSpanLabel: string;
}

const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

function parseDateParts(iso: string): { year: number; monthIdx: number; day: number; dayOfWeek: number } {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  return {
    year: dt.getFullYear(),
    monthIdx: dt.getMonth(),
    day: dt.getDate(),
    dayOfWeek: dt.getDay(),
  };
}

export function resolveIntensityLevel(activityCount: number): HeatmapIntensityLevel {
  if (activityCount <= 0) return 0;
  if (activityCount === 1) return 1;
  if (activityCount === 2) return 2;
  if (activityCount === 3) return 3;
  return 4;
}

export function getIntensityLabel(level: HeatmapIntensityLevel): string {
  switch (level) {
    case 0:
      return 'Rest day';
    case 1:
      return 'Light study';
    case 2:
      return 'Solid session';
    case 3:
      return 'Strong focus';
    case 4:
      return 'Peak grind';
  }
}

export function build30DayActivityHeatmap(params: {
  activeStudyDates: string[];
  attempts?: Pick<TestAttemptRecord, 'submittedAtIso'>[];
  todayIso?: string;
}): StudyActivityHeatmapData {
  const todayIso = (params.todayIso || toLocalDateKey()).slice(0, 10);
  const totalDays = 30;
  const startIso = addDays(todayIso, -(totalDays - 1));

  const studyDateSet = new Set(
    (params.activeStudyDates ?? [])
      .map((d) => String(d || '').slice(0, 10))
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
  );

  const mocksByDate = new Map<string, number>();
  for (const att of params.attempts ?? []) {
    const raw = String(att?.submittedAtIso ?? '').slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      mocksByDate.set(raw, (mocksByDate.get(raw) ?? 0) + 1);
      studyDateSet.add(raw);
    }
  }

  const days: HeatmapDayCell[] = [];
  let activeDaysCount = 0;
  let totalActivities30d = 0;
  let totalMocks30d = 0;
  let bestDay: HeatmapDayCell | null = null;

  for (let i = 0; i < totalDays; i++) {
    const dateIso = addDays(startIso, i);
    const { monthIdx, day, dayOfWeek } = parseDateParts(dateIso);
    const checkedIn = studyDateSet.has(dateIso);
    const mocksCount = mocksByDate.get(dateIso) ?? 0;
    // Check-in = 1 point, each submitted CBT mock / DPP = +2 intensity weight (capped cleanly at level 4)
    const activityCount = (checkedIn ? 1 : 0) + mocksCount * 2;
    const intensityLevel = resolveIntensityLevel(activityCount);

    const cell: HeatmapDayCell = {
      dateIso,
      dayOfWeek,
      dayNumber: day,
      monthShort: MONTH_SHORT[monthIdx] ?? '',
      formattedDate: `${DAY_SHORT[dayOfWeek]}, ${MONTH_SHORT[monthIdx]} ${day}`,
      checkedIn,
      mocksCount,
      activityCount,
      intensityLevel,
      isToday: dateIso === todayIso,
      isInRange: true,
    };

    if (activityCount > 0) {
      activeDaysCount += 1;
      totalActivities30d += (checkedIn ? 1 : 0) + mocksCount;
    }
    totalMocks30d += mocksCount;

    if (!bestDay || cell.activityCount > bestDay.activityCount) {
      bestDay = cell;
    }

    days.push(cell);
  }

  // Build weekday-aligned columns (Sun=0 .. Sat=6) just like GitHub's contribution matrix
  const firstDow = days[0]?.dayOfWeek ?? 0;
  const lastDow = days[days.length - 1]?.dayOfWeek ?? 6;
  const paddedCells: HeatmapDayCell[] = [];

  for (let pad = firstDow; pad > 0; pad--) {
    const padIso = addDays(startIso, -pad);
    const { monthIdx, day, dayOfWeek } = parseDateParts(padIso);
    paddedCells.push({
      dateIso: padIso,
      dayOfWeek,
      dayNumber: day,
      monthShort: MONTH_SHORT[monthIdx] ?? '',
      formattedDate: `${DAY_SHORT[dayOfWeek]}, ${MONTH_SHORT[monthIdx]} ${day}`,
      checkedIn: false,
      mocksCount: 0,
      activityCount: 0,
      intensityLevel: 0,
      isToday: false,
      isInRange: false,
    });
  }

  paddedCells.push(...days);

  for (let pad = 1; pad <= 6 - lastDow; pad++) {
    const padIso = addDays(todayIso, pad);
    const { monthIdx, day, dayOfWeek } = parseDateParts(padIso);
    paddedCells.push({
      dateIso: padIso,
      dayOfWeek,
      dayNumber: day,
      monthShort: MONTH_SHORT[monthIdx] ?? '',
      formattedDate: `${DAY_SHORT[dayOfWeek]}, ${MONTH_SHORT[monthIdx]} ${day}`,
      checkedIn: false,
      mocksCount: 0,
      activityCount: 0,
      intensityLevel: 0,
      isToday: false,
      isInRange: false,
    });
  }

  const weeksGrid: HeatmapDayCell[][] = [];
  for (let i = 0; i < paddedCells.length; i += 7) {
    weeksGrid.push(paddedCells.slice(i, i + 7));
  }

  const streakSummary = computeStudyStreak(Array.from(studyDateSet), todayIso);
  const startMonth = days[0]?.monthShort ?? '';
  const endMonth = days[days.length - 1]?.monthShort ?? '';
  const monthSpanLabel =
    startMonth && endMonth && startMonth !== endMonth
      ? `${startMonth} – ${endMonth}`
      : endMonth || startMonth;

  return {
    days,
    weeksGrid,
    activeDaysCount,
    totalDays,
    consistencyPercent: Math.round((activeDaysCount / totalDays) * 100),
    totalActivities30d,
    totalMocks30d,
    currentStreak: streakSummary.currentStreak,
    longestStreak: streakSummary.longestStreak,
    studiedToday: streakSummary.activeToday,
    bestDay: bestDay && bestDay.activityCount > 0 ? bestDay : null,
    monthSpanLabel,
  };
}
