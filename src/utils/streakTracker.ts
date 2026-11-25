import type { TestAttemptRecord } from '../types';
import { computeProAttemptMetrics } from './testAnalysisEngine';

export interface StudyStreakSummary {
  currentStreak: number;
  longestStreak: number;
  activeToday: boolean;
  last7Days: Array<{ dateIso: string; dayLabel: string; active: boolean }>;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export function toLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(isoDate: string, deltaDays: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  return dt.toISOString().slice(0, 10);
}

function getDayLabel(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  return DAY_LABELS[dt.getUTCDay()] ?? 'Day';
}

export function computeStudyStreak(
  activeDatesIso: string[],
  todayIso: string = toLocalDateKey()
): StudyStreakSummary {
  const uniqueDates = Array.from(
    new Set(
      activeDatesIso
        .map((d) => d.slice(0, 10))
        .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    )
  ).sort();

  const dateSet = new Set(uniqueDates);
  const activeToday = dateSet.has(todayIso);

  // Current streak counts backwards from today (or yesterday if not yet logged today)
  let currentStreak = 0;
  let cursor = activeToday ? todayIso : addDays(todayIso, -1);
  while (dateSet.has(cursor)) {
    currentStreak += 1;
    cursor = addDays(cursor, -1);
  }

  // Longest streak across all recorded dates
  let longestStreak = 0;
  let run = 0;
  for (let i = 0; i < uniqueDates.length; i++) {
    if (i === 0) {
      run = 1;
    } else {
      const expectedNext = addDays(uniqueDates[i - 1], 1);
      run = uniqueDates[i] === expectedNext ? run + 1 : 1;
    }
    if (run > longestStreak) longestStreak = run;
  }

  const last7Days: StudyStreakSummary['last7Days'] = [];
  for (let offset = -6; offset <= 0; offset++) {
    const dateIso = addDays(todayIso, offset);
    last7Days.push({
      dateIso,
      dayLabel: getDayLabel(dateIso),
      active: dateSet.has(dateIso),
    });
  }

  return {
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
    activeToday,
    last7Days,
  };
}

export function computeExamCountdown(
  targetDateIso: string,
  todayIso: string = toLocalDateKey()
): { daysRemaining: number; isPast: boolean; formattedTarget: string } {
  const [ty, tm, td] = targetDateIso.slice(0, 10).split('-').map(Number);
  const [cy, cm, cd] = todayIso.slice(0, 10).split('-').map(Number);
  const targetUtc = Date.UTC(ty || 2027, (tm || 1) - 1, td || 22);
  const todayUtc = Date.UTC(cy || 2026, (cm || 1) - 1, cd || 1);
  const diffDays = Math.round((targetUtc - todayUtc) / 86_400_000);

  const formattedTarget = new Date(targetUtc).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });

  return {
    daysRemaining: Math.max(0, diffDays),
    isPast: diffDays < 0,
    formattedTarget,
  };
}

export function getDefaultTargetExamDate(cohortId: string): { label: string; dateIso: string } {
  const lower = cohortId.toLowerCase();
  if (lower.includes('neet')) {
    return { label: 'NEET UG Target', dateIso: '2027-05-02' };
  }
  if (lower.includes('board')) {
    return { label: 'CBSE Board Target', dateIso: '2027-02-15' };
  }
  return { label: 'JEE Main Target', dateIso: '2027-01-22' };
}

export interface PrepsAiStudentContext {
  studentName: string;
  cohortLabel: string;
  totalAttempts: number;
  averageAccuracy: number;
  currentStreakDays: number;
  targetExamDaysLeft: number;
  bookmarkedQuestionsCount: number;
  unresolvedMistakesCount: number;
  latestTest?: {
    title: string;
    score: number;
    maxScore: number;
    accuracyPercent: number;
    predictedPercentile: number;
    positiveScore: number;
    marksLostNegative: number;
    subjectBreakdown: Array<{
      subject: string;
      score: number;
      maxScore: number;
      accuracy: number;
      incorrect: number;
    }>;
  };
  weakChapters: Array<{ chapter: string; subject: string; accuracy: number }>;
  recentTrend: Array<{ testTitle: string; score: number; maxScore: number; accuracy: number }>;
}

export function buildPrepsAiStudentContext(params: {
  studentName: string;
  cohortLabel: string;
  attempts: TestAttemptRecord[];
  currentStreakDays: number;
  targetExamDaysLeft: number;
  bookmarkedQuestionsCount: number;
  unresolvedMistakesCount: number;
}): PrepsAiStudentContext {
  const sorted = [...params.attempts].sort((a, b) =>
    (b.submittedAtIso || '').localeCompare(a.submittedAtIso || '')
  );

  const avgAccuracy =
    sorted.length > 0
      ? Math.round(sorted.reduce((sum, a) => sum + a.accuracyPercent, 0) / sorted.length)
      : 0;

  const latest = sorted[0];
  let latestTest: PrepsAiStudentContext['latestTest'] = undefined;
  if (latest) {
    const pro = computeProAttemptMetrics(latest, [], params.cohortLabel);
    latestTest = {
      title: latest.testTitle,
      score: latest.score,
      maxScore: latest.maxScore,
      accuracyPercent: latest.accuracyPercent,
      predictedPercentile: pro.predictedPercentile,
      positiveScore: pro.positiveScore,
      marksLostNegative: pro.marksLostNegative,
      subjectBreakdown: latest.subjectScores.map((s) => ({
        subject: s.subjectName,
        score: s.score,
        maxScore: s.maxScore,
        accuracy: s.accuracyPercent,
        incorrect: s.incorrect,
      })),
    };
  }

  // Aggregate weakest chapters across all attempts
  const chapterAgg = new Map<string, { chapter: string; subject: string; correct: number; total: number }>();
  for (const att of sorted) {
    for (const ch of att.chapterScores ?? []) {
      const key = `${ch.subjectName}::${ch.chapterName}`;
      const prev = chapterAgg.get(key) ?? {
        chapter: ch.chapterName,
        subject: ch.subjectName,
        correct: 0,
        total: 0,
      };
      prev.correct += ch.correct;
      prev.total += ch.total;
      chapterAgg.set(key, prev);
    }
  }

  const weakChapters = Array.from(chapterAgg.values())
    .filter((c) => c.total > 0)
    .map((c) => ({
      chapter: c.chapter,
      subject: c.subject,
      accuracy: Math.round((c.correct / c.total) * 100),
    }))
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 6);

  const recentTrend = sorted.slice(0, 5).map((a) => ({
    testTitle: a.testTitle,
    score: a.score,
    maxScore: a.maxScore,
    accuracy: a.accuracyPercent,
  }));

  return {
    studentName: params.studentName,
    cohortLabel: params.cohortLabel,
    totalAttempts: sorted.length,
    averageAccuracy: avgAccuracy,
    currentStreakDays: params.currentStreakDays,
    targetExamDaysLeft: params.targetExamDaysLeft,
    bookmarkedQuestionsCount: params.bookmarkedQuestionsCount,
    unresolvedMistakesCount: params.unresolvedMistakesCount,
    latestTest,
    weakChapters,
    recentTrend,
  };
}
