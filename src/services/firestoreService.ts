import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { deleteObject, ref } from 'firebase/storage';
import { db, handleFirestoreError, OperationType, storage } from '../firebase/config';
import type {
  ChapterRecord,
  ClassGroupRecord,
  IQConfig,
  MockTestRecord,
  SectionRecord,
  StudyMaterialRecord,
  SubjectRecord,
  TestAttemptRecord,
  TestQuestionRecord,
  UserProfile,
  UserProgressData,
  VideoLectureRecord,
} from '../types';
import {
  STARTER_CHAPTERS,
  STARTER_LECTURES,
  STARTER_MATERIALS,
  STARTER_QUESTIONS,
  STARTER_SECTIONS,
  STARTER_SUBJECTS,
  STARTER_TESTS,
} from './starterCatalog';
import { STARTER_CLASS_GROUPS } from './platformRegistry';
import { DEFAULT_IQ_CONFIG } from '../utils/scoringEngine';
import { instantUploadAsset } from '../utils/instantUpload';

export function makeSafeDocId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now()}-${rand}`.replace(/[^a-zA-Z0-9_-]/g, '');
}

function toIsoString(val: unknown): string {
  if (!val) return new Date().toISOString();
  if (typeof val === 'string') return val;
  if (typeof val === 'object' && val !== null && 'toDate' in val && typeof (val as { toDate: () => Date }).toDate === 'function') {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  return new Date().toISOString();
}

// ==========================================
// INSTANT NON-BLOCKING FILE UPLOAD
// ==========================================
export async function uploadPlatformFile(params: {
  folder: 'materials' | 'lectures' | 'questions' | 'avatars' | 'thumbnails';
  file: File;
  kind?: 'image' | 'avatar' | 'thumbnail' | 'document' | 'video';
  onProgress?: (percent: number) => void;
}): Promise<{ downloadUrl: string; storagePath: string; mode: string }> {
  const res = await instantUploadAsset({
    file: params.file,
    folder: params.folder,
    kind: params.kind,
    onProgress: params.onProgress,
  });
  return {
    downloadUrl: res.downloadUrl,
    storagePath: res.storagePath,
    mode: res.mode,
  };
}

export async function deleteStorageFileIfPresent(storagePath?: string): Promise<void> {
  if (!storagePath || storagePath.trim().length === 0) return;
  try {
    await deleteObject(ref(storage, storagePath));
  } catch (err) {
    console.warn('Could not remove Storage object (may already be deleted):', storagePath, err);
  }
}

// ==========================================
// REAL-TIME COLLECTION SUBSCRIPTIONS
// ==========================================
export function subscribeClassGroups(onData: (items: ClassGroupRecord[]) => void) {
  return onSnapshot(
    collection(db, 'classGroups'),
    (snap) => {
      const rows = snap.docs
        .map((d) => d.data() as ClassGroupRecord)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      onData(rows);
    },
    (err) => {
      console.warn('classGroups snapshot error:', err.message);
      onData([]);
    }
  );
}

export function subscribeSubjects(onData: (items: SubjectRecord[]) => void) {
  return onSnapshot(
    collection(db, 'subjects'),
    (snap) => {
      const rows = snap.docs
        .map((d) => d.data() as SubjectRecord)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      onData(rows);
    },
    (err) => {
      console.warn('subjects snapshot error:', err.message);
      onData([]);
    }
  );
}

export function subscribeSections(onData: (items: SectionRecord[]) => void) {
  return onSnapshot(
    collection(db, 'sections'),
    (snap) => {
      const rows = snap.docs
        .map((d) => d.data() as SectionRecord)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      onData(rows);
    },
    (err) => {
      console.warn('sections snapshot error:', err.message);
      onData([]);
    }
  );
}

export function subscribeChapters(onData: (items: ChapterRecord[]) => void) {
  return onSnapshot(
    collection(db, 'chapters'),
    (snap) => {
      const rows = snap.docs
        .map((d) => d.data() as ChapterRecord)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      onData(rows);
    },
    (err) => {
      console.warn('chapters snapshot error:', err.message);
      onData([]);
    }
  );
}

export function subscribeMaterials(onData: (items: StudyMaterialRecord[]) => void) {
  return onSnapshot(
    collection(db, 'materials'),
    (snap) => {
      const rows = snap.docs
        .map((d) => {
          const data = d.data() as StudyMaterialRecord;
          return { ...data, createdAtIso: toIsoString(data.createdAt) };
        })
        .sort((a, b) => (b.createdAtIso ?? '').localeCompare(a.createdAtIso ?? ''));
      onData(rows);
    },
    (err) => {
      console.warn('materials snapshot error:', err.message);
      onData([]);
    }
  );
}

export function subscribeLectures(onData: (items: VideoLectureRecord[]) => void) {
  return onSnapshot(
    collection(db, 'lectures'),
    (snap) => {
      const rows = snap.docs
        .map((d) => {
          const data = d.data() as VideoLectureRecord;
          return { ...data, createdAtIso: toIsoString(data.createdAt) };
        })
        .sort((a, b) => (a.lectureNumber ?? 0) - (b.lectureNumber ?? 0));
      onData(rows);
    },
    (err) => {
      console.warn('lectures snapshot error:', err.message);
      onData([]);
    }
  );
}

export function subscribeMockTests(isAdmin: boolean, onData: (items: MockTestRecord[]) => void) {
  const q = isAdmin
    ? collection(db, 'mockTests')
    : query(collection(db, 'mockTests'), where('status', '==', 'published'));

  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs
        .map((d) => {
          const data = d.data() as MockTestRecord;
          return { ...data, createdAtIso: toIsoString(data.createdAt) };
        })
        .sort((a, b) => (b.createdAtIso ?? '').localeCompare(a.createdAtIso ?? ''));
      onData(rows);
    },
    (err) => {
      console.warn('mockTests snapshot error:', err.message);
      onData([]);
    }
  );
}

export function subscribeQuestions(isAdmin: boolean, onData: (items: TestQuestionRecord[]) => void) {
  const q = isAdmin
    ? collection(db, 'questions')
    : query(collection(db, 'questions'), where('testStatus', '==', 'published'));

  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs
        .map((d) => d.data() as TestQuestionRecord)
        .sort((a, b) => (a.questionNumber ?? 0) - (b.questionNumber ?? 0));
      onData(rows);
    },
    (err) => {
      console.warn('questions snapshot error:', err.message);
      onData([]);
    }
  );
}

export function subscribeUserAttempts(userId: string, onData: (items: TestAttemptRecord[]) => void) {
  const q = query(collection(db, 'testAttempts'), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs
        .map((d) => {
          const data = d.data() as TestAttemptRecord;
          return { ...data, submittedAtIso: toIsoString(data.submittedAt) };
        })
        .sort((a, b) => a.submittedAtIso.localeCompare(b.submittedAtIso));
      onData(rows);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'testAttempts')
  );
}

export function subscribeIqSettings(onData: (cfg: IQConfig) => void) {
  return onSnapshot(
    doc(db, 'platformSettings', 'iqScoring'),
    (snap) => {
      if (snap.exists()) {
        onData(snap.data() as IQConfig);
      } else {
        onData(DEFAULT_IQ_CONFIG);
      }
    },
    () => onData(DEFAULT_IQ_CONFIG)
  );
}

// ==========================================
// USER PROFILE & PROGRESS PERSISTENCE
// ==========================================
export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? (snap.data() as UserProfile) : null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `users/${uid}`);
  }
}

export async function checkAdminDocExists(uid: string): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, 'admins', uid));
    return snap.exists();
  } catch {
    return false;
  }
}

export async function upsertUserProfile(
  profile: Omit<UserProfile, 'createdAt' | 'updatedAt'>,
  isNew: boolean
): Promise<void> {
  const refDoc = doc(db, 'users', profile.uid);
  const optionalFields = {
    ...(profile.photoURL !== undefined ? { photoURL: profile.photoURL.slice(0, 290000) } : {}),
    ...(profile.bio !== undefined ? { bio: profile.bio.slice(0, 300) } : {}),
    ...(profile.targetExam !== undefined ? { targetExam: profile.targetExam.slice(0, 80) } : {}),
    ...(profile.targetYear !== undefined ? { targetYear: profile.targetYear.slice(0, 16) } : {}),
  };

  try {
    if (isNew) {
      await setDoc(refDoc, {
        uid: profile.uid,
        displayName: profile.displayName.slice(0, 120),
        email: profile.email.slice(0, 200),
        ...optionalFields,
        cohortId: profile.cohortId,
        role: profile.role,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(refDoc, {
        displayName: profile.displayName.slice(0, 120),
        ...optionalFields,
        cohortId: profile.cohortId,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, isNew ? OperationType.CREATE : OperationType.UPDATE, `users/${profile.uid}`);
  }
}

export async function fetchUserProgress(uid: string): Promise<UserProgressData | null> {
  try {
    const snap = await getDoc(doc(db, 'userProgress', uid));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      userId: uid,
      plannerCompletedDays: (data.plannerCompletedDays as number[]) ?? [],
      weeklySchedule: (data.weeklySchedule as UserProgressData['weeklySchedule']) ?? [],
      manzilProgress: (data.manzilProgress as UserProgressData['manzilProgress']) ?? {},
      lectureWatchState: (data.lectureWatchState as UserProgressData['lectureWatchState']) ?? {},
      bookmarkedMaterials: (data.bookmarkedMaterials as string[]) ?? [],
      recentMaterials: (data.recentMaterials as string[]) ?? [],
      focusSessionsMinutes: (data.focusSessionsMinutes as number) ?? 0,
      updatedAtIso: toIsoString(data.updatedAt),
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `userProgress/${uid}`);
  }
}

export async function saveUserProgress(progress: UserProgressData): Promise<void> {
  const path = `userProgress/${progress.userId}`;
  try {
    await setDoc(doc(db, 'userProgress', progress.userId), {
      userId: progress.userId,
      plannerCompletedDays: progress.plannerCompletedDays.slice(0, 120),
      weeklySchedule: (progress.weeklySchedule ?? []).slice(0, 80),
      manzilProgress: progress.manzilProgress ?? {},
      lectureWatchState: progress.lectureWatchState ?? {},
      bookmarkedMaterials: progress.bookmarkedMaterials.slice(0, 200),
      recentMaterials: progress.recentMaterials.slice(0, 50),
      focusSessionsMinutes: Math.max(0, Math.round(progress.focusSessionsMinutes)),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function saveTestAttemptToFirestore(attempt: TestAttemptRecord): Promise<void> {
  const path = `testAttempts/${attempt.id}`;
  try {
    await setDoc(doc(db, 'testAttempts', attempt.id), {
      id: attempt.id,
      userId: attempt.userId,
      testId: attempt.testId,
      testTitle: attempt.testTitle.slice(0, 200),
      destination: attempt.destination,
      cohortId: attempt.cohortId,
      score: attempt.score,
      maxScore: attempt.maxScore,
      correctCount: attempt.correctCount,
      incorrectCount: attempt.incorrectCount,
      unattemptedCount: attempt.unattemptedCount,
      accuracyPercent: attempt.accuracyPercent,
      totalTimeSeconds: attempt.totalTimeSeconds,
      avgTimePerQuestion: attempt.avgTimePerQuestion,
      iqScore: attempt.iqScore,
      roomExitWarnings: Math.max(0, Math.min(100, Math.round(attempt.roomExitWarnings ?? 0))),
      paceSummary: attempt.paceSummary,
      subjectScores: attempt.subjectScores.slice(0, 15),
      chapterScores: attempt.chapterScores.slice(0, 100),
      questionTimings: attempt.questionTimings.slice(0, 300),
      answers: attempt.answers,
      submittedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

// ==========================================
// ADMIN CRUD MUTATIONS
// ==========================================
export async function saveClassGroup(
  group: Omit<ClassGroupRecord, 'createdAt' | 'updatedAt'>,
  isEdit: boolean
) {
  const path = `classGroups/${group.id}`;
  const cleanPayload = {
    id: group.id,
    name: group.name.trim().slice(0, 60),
    order: group.order,
    subClasses: group.subClasses.slice(0, 15),
  };
  try {
    if (isEdit) {
      await updateDoc(doc(db, 'classGroups', group.id), {
        ...cleanPayload,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(doc(db, 'classGroups', group.id), {
        ...cleanPayload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, isEdit ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function deleteClassGroupDoc(groupId: string) {
  try {
    await deleteDoc(doc(db, 'classGroups', groupId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `classGroups/${groupId}`);
  }
}

export async function saveSubject(subject: Omit<SubjectRecord, 'createdAt' | 'updatedAt'>, isEdit: boolean) {
  const path = `subjects/${subject.id}`;
  try {
    if (isEdit) {
      await updateDoc(doc(db, 'subjects', subject.id), {
        name: subject.name.trim().slice(0, 80),
        code: subject.code.trim().toUpperCase().slice(0, 24),
        order: subject.order,
        cohorts: subject.cohorts.slice(0, 30),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(doc(db, 'subjects', subject.id), {
        id: subject.id,
        name: subject.name.trim().slice(0, 80),
        code: subject.code.trim().toUpperCase().slice(0, 24),
        order: subject.order,
        cohorts: subject.cohorts.slice(0, 30),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, isEdit ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function deleteSubjectDoc(subjectId: string) {
  try {
    await deleteDoc(doc(db, 'subjects', subjectId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `subjects/${subjectId}`);
  }
}

export async function saveSection(section: Omit<SectionRecord, 'createdAt' | 'updatedAt'>, isEdit: boolean) {
  const path = `sections/${section.id}`;
  const payload = {
    id: section.id,
    name: section.name.trim().slice(0, 80),
    slug: section.slug.trim().slice(0, 80),
    order: section.order,
    description: (section.description ?? '').trim().slice(0, 300),
    scope: section.scope ?? 'all',
    subjectIds: (section.subjectIds ?? []).slice(0, 30),
    chapterIds: (section.chapterIds ?? []).slice(0, 50),
  };
  try {
    if (isEdit) {
      await updateDoc(doc(db, 'sections', section.id), {
        ...payload,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(doc(db, 'sections', section.id), {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, isEdit ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function deleteSectionDoc(sectionId: string) {
  try {
    await deleteDoc(doc(db, 'sections', sectionId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `sections/${sectionId}`);
  }
}

export async function saveChapter(chapter: Omit<ChapterRecord, 'createdAt' | 'updatedAt'>, isEdit: boolean) {
  const path = `chapters/${chapter.id}`;
  try {
    if (isEdit) {
      await updateDoc(doc(db, 'chapters', chapter.id), {
        subjectId: chapter.subjectId,
        name: chapter.name.trim().slice(0, 140),
        order: chapter.order,
        cohorts: chapter.cohorts.slice(0, 30),
        weightageMarks: chapter.weightageMarks,
        difficulty: chapter.difficulty,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(doc(db, 'chapters', chapter.id), {
        id: chapter.id,
        subjectId: chapter.subjectId,
        name: chapter.name.trim().slice(0, 140),
        order: chapter.order,
        cohorts: chapter.cohorts.slice(0, 30),
        weightageMarks: chapter.weightageMarks,
        difficulty: chapter.difficulty,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, isEdit ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function deleteChapterDoc(chapterId: string) {
  try {
    await deleteDoc(doc(db, 'chapters', chapterId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `chapters/${chapterId}`);
  }
}

export async function saveMaterial(
  mat: Omit<StudyMaterialRecord, 'createdAt' | 'updatedAt' | 'createdAtIso'>,
  isEdit: boolean
) {
  const path = `materials/${mat.id}`;
  const basePayload = {
    id: mat.id,
    title: mat.title.trim().slice(0, 200),
    subjectId: mat.subjectId,
    chapterId: mat.chapterId,
    sectionName: mat.sectionName.trim().slice(0, 80),
    resourceType: mat.resourceType.trim().slice(0, 80),
    mediaType: mat.mediaType ?? 'pdf',
    cohorts: mat.cohorts.slice(0, 30),
    fileUrl: mat.fileUrl.trim().slice(0, 740000),
    ...(mat.thumbnailUrl ? { thumbnailUrl: mat.thumbnailUrl.trim().slice(0, 290000) } : {}),
    ...(mat.storagePath ? { storagePath: mat.storagePath.slice(0, 500) } : {}),
    ...(mat.fileName ? { fileName: mat.fileName.slice(0, 255) } : {}),
    ...(mat.fileSizeBytes !== undefined ? { fileSizeBytes: mat.fileSizeBytes } : {}),
    ...(mat.mimeType ? { mimeType: mat.mimeType.slice(0, 120) } : {}),
    ...(mat.durationMinutes !== undefined ? { durationMinutes: Math.max(0, Math.min(600, Math.round(mat.durationMinutes))) } : {}),
    ...(mat.seoSlug ? { seoSlug: mat.seoSlug.trim().slice(0, 140) } : {}),
    ...(mat.seoKeywords ? { seoKeywords: mat.seoKeywords.trim().slice(0, 300) } : {}),
    ...(mat.description ? { description: mat.description.trim().slice(0, 600) } : {}),
    ...(mat.uploadedBy ? { uploadedBy: mat.uploadedBy.slice(0, 128) } : {}),
  };

  try {
    if (isEdit) {
      await updateDoc(doc(db, 'materials', mat.id), {
        ...basePayload,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(doc(db, 'materials', mat.id), {
        ...basePayload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, isEdit ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function deleteMaterialDoc(material: StudyMaterialRecord) {
  try {
    await deleteDoc(doc(db, 'materials', material.id));
    await deleteStorageFileIfPresent(material.storagePath);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `materials/${material.id}`);
  }
}

export async function saveLecture(
  lec: Omit<VideoLectureRecord, 'createdAt' | 'updatedAt' | 'createdAtIso'>,
  isEdit: boolean
) {
  const path = `lectures/${lec.id}`;
  const payload = {
    id: lec.id,
    title: lec.title.trim().slice(0, 200),
    subjectId: lec.subjectId,
    chapterId: lec.chapterId,
    lectureNumber: Math.max(1, Math.round(lec.lectureNumber)),
    cohorts: lec.cohorts.slice(0, 30),
    videoUrl: lec.videoUrl.trim().slice(0, 740000),
    ...(lec.thumbnailUrl ? { thumbnailUrl: lec.thumbnailUrl.trim().slice(0, 290000) } : {}),
    ...(lec.description ? { description: lec.description.trim().slice(0, 600) } : {}),
    ...(lec.sectionName ? { sectionName: lec.sectionName.trim().slice(0, 80) } : {}),
    ...(lec.seoSlug ? { seoSlug: lec.seoSlug.trim().slice(0, 140) } : {}),
    ...(lec.storagePath ? { storagePath: lec.storagePath.slice(0, 500) } : {}),
    durationMinutes: Math.max(1, Math.round(lec.durationMinutes)),
    ...(lec.notesUrl ? { notesUrl: lec.notesUrl.trim().slice(0, 2000) } : {}),
  };
  try {
    if (isEdit) {
      await updateDoc(doc(db, 'lectures', lec.id), { ...payload, updatedAt: serverTimestamp() });
    } else {
      await setDoc(doc(db, 'lectures', lec.id), {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, isEdit ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function deleteLectureDoc(lec: VideoLectureRecord) {
  try {
    await deleteDoc(doc(db, 'lectures', lec.id));
    await deleteStorageFileIfPresent(lec.storagePath);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `lectures/${lec.id}`);
  }
}

export async function saveMockTestWithQuestions(
  test: Omit<MockTestRecord, 'createdAt' | 'updatedAt' | 'createdAtIso'>,
  questions: Omit<TestQuestionRecord, 'createdAt' | 'updatedAt'>[],
  isEdit: boolean
): Promise<void> {
  const testRef = doc(db, 'mockTests', test.id);
  const totalQuestions = questions.length;
  const totalMarks = questions.reduce((sum, q) => sum + (q.positiveMarks ?? test.positiveMarks), 0);

  const testPayload = {
    id: test.id,
    title: test.title.trim().slice(0, 200),
    destination: test.destination,
    cohortId: test.cohortId,
    examCategory: test.examCategory.trim().slice(0, 80),
    ...(test.examType ? { examType: test.examType } : {}),
    ...(test.syllabus ? { syllabus: test.syllabus.slice(0, 30) } : {}),
    ...(test.instructions ? { instructions: test.instructions.slice(0, 25) } : {}),
    ...(test.subjectId ? { subjectId: test.subjectId } : {}),
    ...(test.chapterId ? { chapterId: test.chapterId } : {}),
    ...(test.subjectRanges ? { subjectRanges: test.subjectRanges.slice(0, 10) } : {}),
    totalQuestions,
    totalMarks,
    durationMinutes: Math.max(1, Math.round(test.durationMinutes)),
    positiveMarks: test.positiveMarks,
    negativeMarks: test.negativeMarks,
    negativeMarkingEnabled: test.negativeMarkingEnabled,
    showSolutionsAfterSubmit: test.showSolutionsAfterSubmit,
    status: test.status,
  };

  try {
    if (isEdit) {
      await updateDoc(testRef, { ...testPayload, updatedAt: serverTimestamp() });
    } else {
      await setDoc(testRef, {
        ...testPayload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    const existingQSnap = await getDocs(
      query(collection(db, 'questions'), where('testId', '==', test.id))
    );
    const keepIds = new Set(questions.map((q) => q.id));
    const batch = writeBatch(db);

    for (const d of existingQSnap.docs) {
      if (!keepIds.has(d.id)) {
        batch.delete(d.ref);
      }
    }

    for (const q of questions) {
      const qRef = doc(db, 'questions', q.id);
      const existingDoc = existingQSnap.docs.find((d) => d.id === q.id);
      const qPayload = {
        id: q.id,
        testId: test.id,
        questionNumber: q.questionNumber,
        subjectName: q.subjectName.trim().slice(0, 80),
        ...(q.chapterName ? { chapterName: q.chapterName.trim().slice(0, 140) } : {}),
        questionType: q.questionType,
        ...(q.questionText ? { questionText: q.questionText.slice(0, 3000) } : {}),
        ...(q.questionImageUrl ? { questionImageUrl: q.questionImageUrl.slice(0, 290000) } : {}),
        ...(q.questionType !== 'integer' && q.optionTexts ? { optionTexts: q.optionTexts.slice(0, 4) } : {}),
        ...(q.questionType !== 'integer' && q.optionImageUrls ? { optionImageUrls: q.optionImageUrls.slice(0, 4) } : {}),
        ...(q.questionType !== 'integer' && q.correctOptionIndices ? { correctOptionIndices: q.correctOptionIndices.slice(0, 4) } : {}),
        ...(q.questionType === 'integer' && q.numericalAnswer ? { numericalAnswer: q.numericalAnswer.slice(0, 40) } : {}),
        ...(q.solutionText ? { solutionText: q.solutionText.slice(0, 3000) } : {}),
        ...(q.solutionImageUrl ? { solutionImageUrl: q.solutionImageUrl.slice(0, 290000) } : {}),
        ...(q.sourcePageNumber ? { sourcePageNumber: q.sourcePageNumber } : {}),
        positiveMarks: q.positiveMarks ?? test.positiveMarks,
        negativeMarks: q.negativeMarks ?? test.negativeMarks,
        testStatus: test.status,
      };

      if (existingDoc) {
        batch.update(qRef, { ...qPayload, updatedAt: serverTimestamp() });
      } else {
        batch.set(qRef, {
          ...qPayload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }

    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `mockTests/${test.id}`);
  }
}

export async function deleteMockTestAndQuestions(testId: string): Promise<void> {
  try {
    const qSnap = await getDocs(query(collection(db, 'questions'), where('testId', '==', testId)));
    const batch = writeBatch(db);
    for (const d of qSnap.docs) {
      batch.delete(d.ref);
    }
    batch.delete(doc(db, 'mockTests', testId));
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `mockTests/${testId}`);
  }
}

export async function saveIqSettings(cfg: IQConfig): Promise<void> {
  try {
    await setDoc(doc(db, 'platformSettings', 'iqScoring'), {
      id: 'iqScoring',
      tooFastThresholdSec: cfg.tooFastThresholdSec,
      optimalMinSec: cfg.optimalMinSec,
      optimalMaxSec: cfg.optimalMaxSec,
      tooSlowThresholdSec: cfg.tooSlowThresholdSec,
      rushingPenaltyWeight: cfg.rushingPenaltyWeight,
      slowPenaltyWeight: cfg.slowPenaltyWeight,
      optimalBonusWeight: cfg.optimalBonusWeight,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'platformSettings/iqScoring');
  }
}

export async function seedStarterCurriculumToFirestore(): Promise<void> {
  try {
    for (const cg of STARTER_CLASS_GROUPS) {
      await saveClassGroup(cg, false);
    }
    for (const s of STARTER_SUBJECTS) {
      await saveSubject(s, false);
    }
    for (const sec of STARTER_SECTIONS) {
      await saveSection(sec, false);
    }
    for (const ch of STARTER_CHAPTERS) {
      await saveChapter(ch, false);
    }
    for (const m of STARTER_MATERIALS) {
      await saveMaterial(m, false);
    }
    for (const l of STARTER_LECTURES) {
      await saveLecture(l, false);
    }
    for (const t of STARTER_TESTS) {
      const qs = STARTER_QUESTIONS.filter((q) => q.testId === t.id);
      await saveMockTestWithQuestions(t, qs, false);
    }
    await saveIqSettings(DEFAULT_IQ_CONFIG);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'seedStarterCurriculum');
  }
}
