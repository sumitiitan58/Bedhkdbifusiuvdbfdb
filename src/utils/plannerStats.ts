import type { ChapterDifficulty, ManzilLectureItem, UserProgressData } from '../types';

export interface WeightageDifficultySummary {
  totalMarks: number;
  byDifficulty: {
    difficulty: ChapterDifficulty;
    chapterCount: number;
    marks: number;
    sharePercent: number;
  }[];
  bySubject: {
    subject: 'Physics' | 'Chemistry' | 'Mathematics';
    chapterCount: number;
    marks: number;
    watchedCount: number;
    watchedMinutes: number;
    totalMinutes: number;
  }[];
}

export function computeManzilAndWeightageStats(
  lectures: ManzilLectureItem[],
  manzilProgress: Record<string, { watched: boolean; watchedMinutes: number }>
): {
  totalLectures: number;
  watchedLectures: number;
  completionPercent: number;
  totalMinutes: number;
  watchedMinutes: number;
  weightage: WeightageDifficultySummary;
} {
  let watchedLectures = 0;
  let totalMinutes = 0;
  let watchedMinutes = 0;
  let totalMarks = 0;

  const diffBuckets: Record<ChapterDifficulty, { chapterCount: number; marks: number }> = {
    Easy: { chapterCount: 0, marks: 0 },
    Moderate: { chapterCount: 0, marks: 0 },
    Tough: { chapterCount: 0, marks: 0 },
  };

  const subjBuckets: Record<
    'Physics' | 'Chemistry' | 'Mathematics',
    { chapterCount: number; marks: number; watchedCount: number; watchedMinutes: number; totalMinutes: number }
  > = {
    Physics: { chapterCount: 0, marks: 0, watchedCount: 0, watchedMinutes: 0, totalMinutes: 0 },
    Chemistry: { chapterCount: 0, marks: 0, watchedCount: 0, watchedMinutes: 0, totalMinutes: 0 },
    Mathematics: { chapterCount: 0, marks: 0, watchedCount: 0, watchedMinutes: 0, totalMinutes: 0 },
  };

  for (const lec of lectures) {
    const prog = manzilProgress[lec.id];
    const isWatched = Boolean(prog?.watched);
    const wMin = isWatched ? Math.max(prog?.watchedMinutes ?? 0, lec.durationMinutes) : prog?.watchedMinutes ?? 0;

    totalMinutes += lec.durationMinutes;
    watchedMinutes += wMin;
    totalMarks += lec.weightageMarks;
    if (isWatched) watchedLectures += 1;

    diffBuckets[lec.difficulty].chapterCount += 1;
    diffBuckets[lec.difficulty].marks += lec.weightageMarks;

    const sb = subjBuckets[lec.subject];
    sb.chapterCount += 1;
    sb.marks += lec.weightageMarks;
    sb.totalMinutes += lec.durationMinutes;
    sb.watchedMinutes += wMin;
    if (isWatched) sb.watchedCount += 1;
  }

  const byDifficulty = (['Easy', 'Moderate', 'Tough'] as ChapterDifficulty[]).map((difficulty) => ({
    difficulty,
    chapterCount: diffBuckets[difficulty].chapterCount,
    marks: diffBuckets[difficulty].marks,
    sharePercent: totalMarks > 0 ? Math.round((diffBuckets[difficulty].marks / totalMarks) * 100) : 0,
  }));

  const bySubject = (['Physics', 'Chemistry', 'Mathematics'] as const).map((subject) => ({
    subject,
    ...subjBuckets[subject],
  }));

  return {
    totalLectures: lectures.length,
    watchedLectures,
    completionPercent:
      lectures.length > 0 ? Math.round((watchedLectures / lectures.length) * 100) : 0,
    totalMinutes,
    watchedMinutes,
    weightage: {
      totalMarks,
      byDifficulty,
      bySubject,
    },
  };
}

/**
 * Lossless merge of Guest localStorage progress into authenticated Cloud Firestore progress
 * during Guest-to-Google migration (preserves completed days, weekly schedule, watch progress, and bookmarks).
 */
export function mergeUserProgress(
  cloud: UserProgressData | null,
  guest: UserProgressData,
  targetUserId: string
): UserProgressData {
  if (!cloud) {
    return {
      ...guest,
      userId: targetUserId,
      weeklySchedule: guest.weeklySchedule ?? [],
      updatedAtIso: new Date().toISOString(),
    };
  }

  const plannerCompletedDays = Array.from(
    new Set([...cloud.plannerCompletedDays, ...guest.plannerCompletedDays])
  ).sort((a, b) => a - b);

  const weeklyMap = new Map((cloud.weeklySchedule ?? []).map((item) => [item.id, item]));
  for (const item of guest.weeklySchedule ?? []) {
    const existing = weeklyMap.get(item.id);
    if (!existing) {
      weeklyMap.set(item.id, item);
    } else if (item.completed && !existing.completed) {
      weeklyMap.set(item.id, { ...existing, completed: true });
    }
  }
  const weeklySchedule = Array.from(weeklyMap.values()).slice(0, 80);

  const manzilProgress = { ...cloud.manzilProgress };
  for (const [id, gVal] of Object.entries(guest.manzilProgress ?? {})) {
    const cVal = manzilProgress[id];
    manzilProgress[id] = {
      watched: Boolean(cVal?.watched || gVal.watched),
      watchedMinutes: Math.max(cVal?.watchedMinutes ?? 0, gVal.watchedMinutes ?? 0),
    };
  }

  const lectureWatchState = { ...cloud.lectureWatchState };
  for (const [id, gRec] of Object.entries(guest.lectureWatchState ?? {})) {
    const cRec = lectureWatchState[id];
    if (!cRec || gRec.watchedSeconds > cRec.watchedSeconds) {
      lectureWatchState[id] = {
        ...gRec,
        watched: Boolean(cRec?.watched || gRec.watched),
      };
    }
  }

  const bookmarkedMaterials = Array.from(
    new Set([...cloud.bookmarkedMaterials, ...guest.bookmarkedMaterials])
  ).slice(0, 200);

  const recentMaterials = Array.from(
    new Set([...guest.recentMaterials, ...cloud.recentMaterials])
  ).slice(0, 50);

  return {
    userId: targetUserId,
    plannerCompletedDays,
    weeklySchedule,
    manzilProgress,
    lectureWatchState,
    bookmarkedMaterials,
    recentMaterials,
    focusSessionsMinutes: Math.max(cloud.focusSessionsMinutes, guest.focusSessionsMinutes),
    updatedAtIso: new Date().toISOString(),
  };
}
