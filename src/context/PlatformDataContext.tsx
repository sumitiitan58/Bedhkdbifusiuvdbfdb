import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useAuth, EMPTY_PROGRESS } from './AuthContext';
import type {
  ChapterRecord,
  ClassGroupRecord,
  IQConfig,
  LectureWatchRecord,
  MockTestRecord,
  SectionRecord,
  StudentCohort,
  StudyMaterialRecord,
  SubjectRecord,
  TestAttemptRecord,
  TestQuestionRecord,
  UserProgressData,
  VideoLectureRecord,
  WeeklyScheduleItem,
} from '../types';
import {
  fetchUserProgress,
  saveTestAttemptToFirestore,
  saveUserProgress,
  subscribeChapters,
  subscribeClassGroups,
  subscribeIqSettings,
  subscribeLectures,
  subscribeMaterials,
  subscribeMockTests,
  subscribeQuestions,
  subscribeSections,
  subscribeSubjects,
  subscribeUserAttempts,
} from '../services/firestoreService';
import {
  STARTER_CHAPTERS,
  STARTER_LECTURES,
  STARTER_MATERIALS,
  STARTER_QUESTIONS,
  STARTER_SECTIONS,
  STARTER_SUBJECTS,
  STARTER_TESTS,
} from '../services/starterCatalog';
import { flattenClassGroupsToCohorts, STARTER_CLASS_GROUPS } from '../services/platformRegistry';
import {
  mergeClassGroups,
  mergeOfficialJeeCatalog,
  mergeOfficialMockTests,
} from '../utils/catalogMerge';
import { DEFAULT_IQ_CONFIG } from '../utils/scoringEngine';
import { createDefaultWeeklySchedule } from '../utils/weeklySchedule';

import {
  getDefaultTargetExamDate,
  toLocalDateKey,
} from '../utils/streakTracker';

const GUEST_PROGRESS_KEY = 'prepskm_guest_progress_v2';
const GUEST_ATTEMPTS_KEY = 'prepskm_guest_attempts_v2';
const RETENTION_STATE_PREFIX = 'prepskm_retention_v1_';

interface StudentRetentionState {
  bookmarkedQuestionIds: string[];
  resolvedMistakeIds: string[];
  activeStudyDates: string[];
  targetExamDate: string;
  targetExamLabel: string;
}

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function normalizeProgress(raw: UserProgressData | null, uid: string): UserProgressData {
  if (!raw) {
    return {
      ...EMPTY_PROGRESS,
      userId: uid,
      weeklySchedule: createDefaultWeeklySchedule(),
    };
  }
  return {
    ...EMPTY_PROGRESS,
    ...raw,
    userId: uid,
    weeklySchedule:
      Array.isArray(raw.weeklySchedule) && raw.weeklySchedule.length > 0
        ? raw.weeklySchedule
        : createDefaultWeeklySchedule(),
  };
}

export interface PlatformDataContextValue {
  classGroups: ClassGroupRecord[];
  allCohorts: StudentCohort[];
  subjects: SubjectRecord[];
  sections: SectionRecord[];
  chapters: ChapterRecord[];
  materials: StudyMaterialRecord[];
  lectures: VideoLectureRecord[];
  mockTests: MockTestRecord[];
  questions: TestQuestionRecord[];
  iqConfig: IQConfig;
  isUsingStarterCatalog: boolean;
  progress: UserProgressData;
  attempts: TestAttemptRecord[];
  bookmarkedQuestionIds: string[];
  resolvedMistakeIds: string[];
  activeStudyDates: string[];
  targetExamDate: string;
  targetExamLabel: string;
  togglePlannerDay: (day: number) => void;
  toggleWeeklyTask: (taskId: string) => void;
  addWeeklyTask: (task: Omit<WeeklyScheduleItem, 'id'>) => void;
  deleteWeeklyTask: (taskId: string) => void;
  resetWeeklySchedule: () => void;
  toggleManzilLecture: (lectureId: string, durationMinutes: number) => void;
  updateLectureWatchPosition: (lectureId: string, positionSec: number, durationSec: number, watched?: boolean) => void;
  toggleMaterialBookmark: (materialId: string) => void;
  recordMaterialView: (materialId: string) => void;
  logFocusMinutes: (minutes: number) => void;
  importBackupProgress: (data: Partial<UserProgressData>) => void;
  recordAttempt: (attempt: TestAttemptRecord) => Promise<void>;
  toggleQuestionBookmark: (questionId: string) => void;
  toggleMistakeResolved: (questionId: string) => void;
  recordDailyActivity: (dateIso?: string) => void;
  setTargetExam: (dateIso: string, label?: string) => void;
}

const PlatformDataContext = createContext<PlatformDataContextValue | null>(null);

export function PlatformDataProvider({ children }: { children: ReactNode }) {
  const { firebaseUser, isAdmin, authReady, cohortId } = useAuth();

  const [fsClassGroups, setFsClassGroups] = useState<ClassGroupRecord[]>([]);
  const [fsSubjects, setFsSubjects] = useState<SubjectRecord[]>([]);
  const [fsSections, setFsSections] = useState<SectionRecord[]>([]);
  const [fsChapters, setFsChapters] = useState<ChapterRecord[]>([]);
  const [fsMaterials, setFsMaterials] = useState<StudyMaterialRecord[]>([]);
  const [fsLectures, setFsLectures] = useState<VideoLectureRecord[]>([]);
  const [fsTests, setFsTests] = useState<MockTestRecord[]>([]);
  const [fsQuestions, setFsQuestions] = useState<TestQuestionRecord[]>([]);
  const [iqConfig, setIqConfig] = useState<IQConfig>(DEFAULT_IQ_CONFIG);

  const [progress, setProgress] = useState<UserProgressData>(() =>
    normalizeProgress(readLocal<UserProgressData | null>(GUEST_PROGRESS_KEY, null), 'guest')
  );
  const [attempts, setAttempts] = useState<TestAttemptRecord[]>(() =>
    readLocal<TestAttemptRecord[]>(GUEST_ATTEMPTS_KEY, [])
  );

  const retentionKey = `${RETENTION_STATE_PREFIX}${firebaseUser?.uid ?? 'guest'}`;
  const defaultTarget = useMemo(() => getDefaultTargetExamDate(cohortId), [cohortId]);

  const [retention, setRetention] = useState<StudentRetentionState>(() => {
    const saved = readLocal<Partial<StudentRetentionState> | null>(retentionKey, null);
    const today = toLocalDateKey();
    return {
      bookmarkedQuestionIds: Array.isArray(saved?.bookmarkedQuestionIds)
        ? saved.bookmarkedQuestionIds
        : [],
      resolvedMistakeIds: Array.isArray(saved?.resolvedMistakeIds)
        ? saved.resolvedMistakeIds
        : [],
      activeStudyDates:
        Array.isArray(saved?.activeStudyDates) && saved.activeStudyDates.length > 0
          ? saved.activeStudyDates
          : [today],
      targetExamDate: saved?.targetExamDate || defaultTarget.dateIso,
      targetExamLabel: saved?.targetExamLabel || defaultTarget.label,
    };
  });

  useEffect(() => {
    const saved = readLocal<Partial<StudentRetentionState> | null>(retentionKey, null);
    const today = toLocalDateKey();
    setRetention({
      bookmarkedQuestionIds: Array.isArray(saved?.bookmarkedQuestionIds)
        ? saved.bookmarkedQuestionIds
        : [],
      resolvedMistakeIds: Array.isArray(saved?.resolvedMistakeIds)
        ? saved.resolvedMistakeIds
        : [],
      activeStudyDates:
        Array.isArray(saved?.activeStudyDates) && saved.activeStudyDates.length > 0
          ? saved.activeStudyDates
          : [today],
      targetExamDate: saved?.targetExamDate || defaultTarget.dateIso,
      targetExamLabel: saved?.targetExamLabel || defaultTarget.label,
    });
  }, [retentionKey, defaultTarget.dateIso, defaultTarget.label]);

  const persistRetention = useCallback(
    (updater: (prev: StudentRetentionState) => StudentRetentionState) => {
      setRetention((prev) => {
        const next = updater(prev);
        try {
          window.localStorage.setItem(retentionKey, JSON.stringify(next));
        } catch {
          // ignore storage quota errors
        }
        return next;
      });
    },
    [retentionKey]
  );

  const recordDailyActivity = useCallback(
    (dateIso?: string) => {
      const key = (dateIso || toLocalDateKey()).slice(0, 10);
      persistRetention((prev) => {
        if (prev.activeStudyDates.includes(key)) return prev;
        return {
          ...prev,
          activeStudyDates: [...prev.activeStudyDates, key].slice(-365),
        };
      });
    },
    [persistRetention]
  );

  const toggleQuestionBookmark = useCallback(
    (questionId: string) => {
      persistRetention((prev) => {
        const exists = prev.bookmarkedQuestionIds.includes(questionId);
        return {
          ...prev,
          bookmarkedQuestionIds: exists
            ? prev.bookmarkedQuestionIds.filter((id) => id !== questionId)
            : [questionId, ...prev.bookmarkedQuestionIds].slice(0, 500),
        };
      });
    },
    [persistRetention]
  );

  const toggleMistakeResolved = useCallback(
    (questionId: string) => {
      persistRetention((prev) => {
        const exists = prev.resolvedMistakeIds.includes(questionId);
        return {
          ...prev,
          resolvedMistakeIds: exists
            ? prev.resolvedMistakeIds.filter((id) => id !== questionId)
            : [questionId, ...prev.resolvedMistakeIds].slice(0, 500),
        };
      });
    },
    [persistRetention]
  );

  const setTargetExam = useCallback(
    (dateIso: string, label?: string) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) return;
      persistRetention((prev) => ({
        ...prev,
        targetExamDate: dateIso,
        targetExamLabel: label?.trim() || prev.targetExamLabel,
      }));
    },
    [persistRetention]
  );

  useEffect(() => {
    const u0 = subscribeClassGroups(setFsClassGroups);
    const u1 = subscribeSubjects(setFsSubjects);
    const u2 = subscribeSections(setFsSections);
    const u3 = subscribeChapters(setFsChapters);
    const u4 = subscribeMaterials(setFsMaterials);
    const u5 = subscribeLectures(setFsLectures);
    const u6 = subscribeIqSettings(setIqConfig);
    return () => {
      u0();
      u1();
      u2();
      u3();
      u4();
      u5();
      u6();
    };
  }, []);

  useEffect(() => {
    if (!authReady) return;
    const uTests = subscribeMockTests(isAdmin, setFsTests);
    const uQuestions = subscribeQuestions(isAdmin, setFsQuestions);
    return () => {
      uTests();
      uQuestions();
    };
  }, [authReady, isAdmin]);

  useEffect(() => {
    if (!authReady) return;
    if (!firebaseUser) {
      setProgress(
        normalizeProgress(readLocal<UserProgressData | null>(GUEST_PROGRESS_KEY, null), 'guest')
      );
      setAttempts(readLocal<TestAttemptRecord[]>(GUEST_ATTEMPTS_KEY, []));
      return;
    }

    let cancelled = false;
    fetchUserProgress(firebaseUser.uid)
      .then((cloud) => {
        if (!cancelled) {
          setProgress(normalizeProgress(cloud, firebaseUser.uid));
        }
      })
      .catch((err) => console.error('Load progress failed:', err));

    const unsubAttempts = subscribeUserAttempts(firebaseUser.uid, (rows) => {
      if (!cancelled) setAttempts(rows);
    });

    return () => {
      cancelled = true;
      unsubAttempts();
    };
  }, [authReady, firebaseUser]);

  const persistProgress = useCallback(
    (updater: (prev: UserProgressData) => UserProgressData) => {
      setProgress((prev) => {
        const next: UserProgressData = {
          ...updater(prev),
          userId: firebaseUser?.uid ?? 'guest',
          updatedAtIso: new Date().toISOString(),
        };
        if (firebaseUser) {
          void saveUserProgress(next);
        } else {
          try {
            window.localStorage.setItem(GUEST_PROGRESS_KEY, JSON.stringify(next));
          } catch {
            // ignore
          }
        }
        return next;
      });
    },
    [firebaseUser]
  );

  const togglePlannerDay = useCallback(
    (day: number) => {
      persistProgress((prev) => {
        const exists = prev.plannerCompletedDays.includes(day);
        const plannerCompletedDays = exists
          ? prev.plannerCompletedDays.filter((d) => d !== day)
          : [...prev.plannerCompletedDays, day].sort((a, b) => a - b);
        return { ...prev, plannerCompletedDays };
      });
    },
    [persistProgress]
  );

  const toggleWeeklyTask = useCallback(
    (taskId: string) => {
      persistProgress((prev) => ({
        ...prev,
        weeklySchedule: (prev.weeklySchedule ?? []).map((item) =>
          item.id === taskId ? { ...item, completed: !item.completed } : item
        ),
      }));
    },
    [persistProgress]
  );

  const addWeeklyTask = useCallback(
    (task: Omit<WeeklyScheduleItem, 'id'>) => {
      const id = `ws-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      persistProgress((prev) => ({
        ...prev,
        weeklySchedule: [...(prev.weeklySchedule ?? []), { ...task, id }].slice(0, 80),
      }));
    },
    [persistProgress]
  );

  const deleteWeeklyTask = useCallback(
    (taskId: string) => {
      persistProgress((prev) => ({
        ...prev,
        weeklySchedule: (prev.weeklySchedule ?? []).filter((item) => item.id !== taskId),
      }));
    },
    [persistProgress]
  );

  const resetWeeklySchedule = useCallback(() => {
    persistProgress((prev) => ({
      ...prev,
      weeklySchedule: createDefaultWeeklySchedule(),
    }));
  }, [persistProgress]);

  const toggleManzilLecture = useCallback(
    (lectureId: string, durationMinutes: number) => {
      persistProgress((prev) => {
        const current = prev.manzilProgress[lectureId];
        const nextWatched = !current?.watched;
        return {
          ...prev,
          manzilProgress: {
            ...prev.manzilProgress,
            [lectureId]: {
              watched: nextWatched,
              watchedMinutes: nextWatched ? durationMinutes : 0,
            },
          },
        };
      });
    },
    [persistProgress]
  );

  const updateLectureWatchPosition = useCallback(
    (lectureId: string, positionSec: number, durationSec: number, watched?: boolean) => {
      persistProgress((prev) => {
        const existing = prev.lectureWatchState[lectureId];
        const nextRec: LectureWatchRecord = {
          watched:
            watched !== undefined
              ? watched
              : Boolean(existing?.watched || (durationSec > 0 && positionSec / durationSec >= 0.85)),
          lastPositionSeconds: Math.max(0, Math.round(positionSec)),
          watchedSeconds: Math.max(existing?.watchedSeconds ?? 0, Math.round(positionSec)),
          durationSeconds: Math.max(1, Math.round(durationSec || existing?.durationSeconds || 60)),
          updatedAtIso: new Date().toISOString(),
        };
        return {
          ...prev,
          lectureWatchState: {
            ...prev.lectureWatchState,
            [lectureId]: nextRec,
          },
        };
      });
    },
    [persistProgress]
  );

  const toggleMaterialBookmark = useCallback(
    (materialId: string) => {
      persistProgress((prev) => {
        const exists = prev.bookmarkedMaterials.includes(materialId);
        return {
          ...prev,
          bookmarkedMaterials: exists
            ? prev.bookmarkedMaterials.filter((id) => id !== materialId)
            : [materialId, ...prev.bookmarkedMaterials].slice(0, 200),
        };
      });
    },
    [persistProgress]
  );

  const recordMaterialView = useCallback(
    (materialId: string) => {
      recordDailyActivity();
      persistProgress((prev) => ({
        ...prev,
        recentMaterials: [
          materialId,
          ...prev.recentMaterials.filter((id) => id !== materialId),
        ].slice(0, 20),
      }));
    },
    [persistProgress, recordDailyActivity]
  );

  const logFocusMinutes = useCallback(
    (minutes: number) => {
      if (minutes <= 0) return;
      recordDailyActivity();
      persistProgress((prev) => ({
        ...prev,
        focusSessionsMinutes: prev.focusSessionsMinutes + minutes,
      }));
    },
    [persistProgress, recordDailyActivity]
  );

  const importBackupProgress = useCallback(
    (data: Partial<UserProgressData>) => {
      persistProgress((prev) => ({
        ...prev,
        plannerCompletedDays: Array.isArray(data.plannerCompletedDays)
          ? data.plannerCompletedDays.filter((n) => typeof n === 'number')
          : prev.plannerCompletedDays,
        weeklySchedule: Array.isArray(data.weeklySchedule)
          ? data.weeklySchedule
          : prev.weeklySchedule,
        bookmarkedMaterials: Array.isArray(data.bookmarkedMaterials)
          ? data.bookmarkedMaterials
          : prev.bookmarkedMaterials,
        focusSessionsMinutes:
          typeof data.focusSessionsMinutes === 'number'
            ? data.focusSessionsMinutes
            : prev.focusSessionsMinutes,
      }));
    },
    [persistProgress]
  );

  const recordAttempt = useCallback(
    async (attempt: TestAttemptRecord) => {
      recordDailyActivity();
      if (firebaseUser) {
        const payload = { ...attempt, userId: firebaseUser.uid };
        await saveTestAttemptToFirestore(payload);
      } else {
        setAttempts((prev) => {
          const next = [...prev, attempt];
          try {
            window.localStorage.setItem(GUEST_ATTEMPTS_KEY, JSON.stringify(next));
          } catch {
            // ignore
          }
          return next;
        });
      }
    },
    [firebaseUser, recordDailyActivity]
  );

  const classGroups = useMemo(
    () => mergeClassGroups(fsClassGroups, STARTER_CLASS_GROUPS),
    [fsClassGroups]
  );
  const allCohorts = useMemo(() => flattenClassGroupsToCohorts(classGroups), [classGroups]);
  const isUsingStarterCatalog = fsSubjects.length === 0 && fsTests.length === 0;

  const mergedCatalog = useMemo(
    () =>
      mergeOfficialJeeCatalog({
        subjects: fsSubjects.length > 0 ? fsSubjects : STARTER_SUBJECTS,
        sections: fsSections.length > 0 ? fsSections : STARTER_SECTIONS,
        chapters: fsChapters.length > 0 ? fsChapters : STARTER_CHAPTERS,
        materials: fsMaterials.length > 0 ? fsMaterials : STARTER_MATERIALS,
      }),
    [fsSubjects, fsSections, fsChapters, fsMaterials]
  );

  const mergedMocks = useMemo(
    () =>
      mergeOfficialMockTests({
        mockTests: fsTests.length > 0 ? fsTests : STARTER_TESTS,
        questions: fsQuestions.length > 0 ? fsQuestions : STARTER_QUESTIONS,
        starterTests: STARTER_TESTS,
        starterQuestions: STARTER_QUESTIONS,
        subjectIdMap: mergedCatalog.subjectIdMap,
      }),
    [fsTests, fsQuestions, mergedCatalog.subjectIdMap]
  );

  const value = useMemo<PlatformDataContextValue>(
    () => ({
      classGroups,
      allCohorts,
      subjects: mergedCatalog.subjects,
      sections: mergedCatalog.sections,
      chapters: mergedCatalog.chapters,
      materials: mergedCatalog.materials,
      lectures: fsLectures.length > 0 ? fsLectures : STARTER_LECTURES,
      mockTests: mergedMocks.mockTests,
      questions: mergedMocks.questions,
      iqConfig,
      isUsingStarterCatalog,
      progress,
      attempts,
      bookmarkedQuestionIds: retention.bookmarkedQuestionIds,
      resolvedMistakeIds: retention.resolvedMistakeIds,
      activeStudyDates: retention.activeStudyDates,
      targetExamDate: retention.targetExamDate,
      targetExamLabel: retention.targetExamLabel,
      togglePlannerDay,
      toggleWeeklyTask,
      addWeeklyTask,
      deleteWeeklyTask,
      resetWeeklySchedule,
      toggleManzilLecture,
      updateLectureWatchPosition,
      toggleMaterialBookmark,
      recordMaterialView,
      logFocusMinutes,
      importBackupProgress,
      recordAttempt,
      toggleQuestionBookmark,
      toggleMistakeResolved,
      recordDailyActivity,
      setTargetExam,
    }),
    [
      classGroups,
      allCohorts,
      mergedCatalog,
      mergedMocks,
      fsLectures,
      iqConfig,
      isUsingStarterCatalog,
      progress,
      attempts,
      retention,
      togglePlannerDay,
      toggleWeeklyTask,
      addWeeklyTask,
      deleteWeeklyTask,
      resetWeeklySchedule,
      toggleManzilLecture,
      updateLectureWatchPosition,
      toggleMaterialBookmark,
      recordMaterialView,
      logFocusMinutes,
      importBackupProgress,
      recordAttempt,
      toggleQuestionBookmark,
      toggleMistakeResolved,
      recordDailyActivity,
      setTargetExam,
    ]
  );

  return <PlatformDataContext.Provider value={value}>{children}</PlatformDataContext.Provider>;
}

export function usePlatformData(): PlatformDataContextValue {
  const ctx = useContext(PlatformDataContext);
  if (!ctx) throw new Error('usePlatformData must be used inside PlatformDataProvider');
  return ctx;
}
