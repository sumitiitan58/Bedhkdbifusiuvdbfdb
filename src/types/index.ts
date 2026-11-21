export type ThemeMode = 'light' | 'dark';

export type RoutePath =
  | '/'
  | '/materials'
  | '/lectures'
  | '/cbt-mocks'
  | '/dpp'
  | '/analytics'
  | '/profile'
  | '/about'
  | '/admin';

export type StudentCohortId = string;

export interface SubClassItem {
  id: StudentCohortId;
  label: string;
  shortLabel: string;
  stream: string;
  focusSummary: string;
  subjects: string[];
}

export interface ClassGroupRecord {
  id: string;
  name: string;
  order: number;
  subClasses: SubClassItem[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface StudentCohort {
  id: StudentCohortId;
  label: string;
  shortLabel: string;
  stream: string;
  focusSummary: string;
  subjects: string[];
  classGroupId?: string;
  classGroupName?: string;
}

export interface NavRouteItem {
  path: RoutePath;
  label: string;
  shortDescription: string;
  showInPublicNav: boolean;
}

export interface SidebarSectionItem {
  id: string;
  label: string;
  path?: RoutePath;
  description?: string;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  bio?: string;
  targetExam?: string;
  targetYear?: string;
  cohortId: StudentCohortId;
  role: 'student' | 'admin';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface SubjectRecord {
  id: string;
  name: string;
  code: string;
  order: number;
  cohorts: StudentCohortId[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type SectionScope = 'all' | 'subjects' | 'chapters';

export interface SectionRecord {
  id: string;
  name: string;
  slug: string;
  order: number;
  description?: string;
  scope?: SectionScope;
  subjectIds?: string[];
  chapterIds?: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type ChapterDifficulty = 'Easy' | 'Moderate' | 'Tough';

export interface ChapterRecord {
  id: string;
  subjectId: string;
  name: string;
  order: number;
  cohorts: StudentCohortId[];
  weightageMarks: number;
  difficulty: ChapterDifficulty;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type MaterialResourceType =
  | 'Short Notes'
  | 'Formula Sheets'
  | 'Previous Year Questions (PYQs)'
  | 'DPPs'
  | 'Video Lectures'
  | 'Important Questions'
  | 'Custom Resources';

export type MaterialMediaType = 'pdf' | 'video' | 'image' | 'link';

export interface MaterialAttachment {
  id: string;
  title: string;
  fileUrl: string;
  fileName?: string;
  fileSizeBytes?: number;
  mimeType?: string;
}

export interface StudyMaterialRecord {
  id: string;
  title: string;
  subjectId: string;
  chapterId: string;
  sectionName: string;
  resourceType: string;
  mediaType?: MaterialMediaType;
  cohorts: StudentCohortId[];
  fileUrl: string;
  thumbnailUrl?: string;
  attachments?: MaterialAttachment[];
  storagePath?: string;
  fileName?: string;
  fileSizeBytes?: number;
  mimeType?: string;
  durationMinutes?: number;
  seoSlug?: string;
  slug?: string;
  seoKeywords?: string;
  seoDescription?: string;
  isPublished?: boolean;
  description?: string;
  uploadedBy?: string;
  createdAtIso?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface VideoLectureRecord {
  id: string;
  title: string;
  subjectId: string;
  chapterId: string;
  lectureNumber: number;
  cohorts: StudentCohortId[];
  videoUrl: string;
  thumbnailUrl?: string;
  description?: string;
  sectionName?: string;
  seoSlug?: string;
  storagePath?: string;
  durationMinutes: number;
  notesUrl?: string;
  createdAtIso?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type TestDestination = 'cbt-mock' | 'dpp';
export type QuestionType = 'single-mcq' | 'multi-mcq' | 'integer';
export type TestStatus = 'draft' | 'published';
export type ExamType = 'JEE Main' | 'JEE Advanced' | 'NEET UG' | 'Board Exam' | 'Custom';

export interface SubjectRange {
  subjectName: string;
  startQ: number;
  endQ: number;
}

export interface TestSyllabusItem {
  subject: string;
  chapters: string[];
}

export interface MockTestRecord {
  id: string;
  title: string;
  slug?: string;
  seoDescription?: string;
  isPublished?: boolean;
  destination: TestDestination;
  cohortId: StudentCohortId;
  cohortIds?: StudentCohortId[];
  examCategory: string;
  examType?: ExamType;
  syllabus?: TestSyllabusItem[];
  instructions?: string[];
  subjectId?: string;
  chapterId?: string;
  subjectRanges?: SubjectRange[];
  totalQuestions: number;
  totalMarks: number;
  durationMinutes: number;
  positiveMarks: number;
  negativeMarks: number;
  negativeMarkingEnabled: boolean;
  showSolutionsAfterSubmit: boolean;
  status: TestStatus;
  createdAtIso?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface TestQuestionRecord {
  id: string;
  testId: string;
  questionNumber: number;
  subjectName: string;
  chapterName?: string;
  questionType: QuestionType;
  questionText?: string;
  questionImageUrl?: string;
  optionTexts?: string[];
  optionImageUrls?: string[];
  correctOptionIndices?: number[];
  numericalAnswer?: string;
  solutionText?: string;
  solutionImageUrl?: string;
  sourcePageNumber?: number;
  positiveMarks?: number;
  negativeMarks?: number;
  testStatus: TestStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type StudentAnswerValue =
  | { type: 'single-mcq'; selectedIndex: number | null }
  | { type: 'multi-mcq'; selectedIndices: number[] }
  | { type: 'integer'; value: string };

export type QuestionPaletteState =
  | 'not-visited'
  | 'not-answered'
  | 'answered'
  | 'marked-review'
  | 'answered-marked';

export interface QuestionTimingRecord {
  questionId: string;
  questionNumber: number;
  subjectName: string;
  chapterName: string;
  openedAtMs: number;
  answeredAtMs: number | null;
  timeSpentSeconds: number;
  answered: boolean;
  isCorrect: boolean;
  paceCategory: PaceCategory;
}

export type PaceCategory = 'Too Fast' | 'Optimal Pace' | 'Too Slow' | 'Unattempted';

export interface IQConfig {
  id: string;
  tooFastThresholdSec: number;
  optimalMinSec: number;
  optimalMaxSec: number;
  tooSlowThresholdSec: number;
  rushingPenaltyWeight: number;
  slowPenaltyWeight: number;
  optimalBonusWeight: number;
}

export interface PaceSummary {
  tooFastCount: number;
  optimalCount: number;
  tooSlowCount: number;
  unattemptedCount: number;
  rushingFlagNote: string;
}

export interface SubjectScoreBreakdown {
  subjectName: string;
  total: number;
  correct: number;
  incorrect: number;
  unattempted: number;
  score: number;
  maxScore: number;
  accuracyPercent: number;
  avgTimeSeconds: number;
}

export interface ChapterScoreBreakdown {
  chapterName: string;
  subjectName: string;
  total: number;
  correct: number;
  incorrect: number;
  accuracyPercent: number;
}

export interface TestAttemptRecord {
  id: string;
  userId: string;
  testId: string;
  testTitle: string;
  destination: TestDestination;
  cohortId: StudentCohortId;
  score: number;
  maxScore: number;
  correctCount: number;
  incorrectCount: number;
  unattemptedCount: number;
  accuracyPercent: number;
  totalTimeSeconds: number;
  avgTimePerQuestion: number;
  iqScore: number;
  roomExitWarnings?: number;
  paceSummary: PaceSummary;
  subjectScores: SubjectScoreBreakdown[];
  chapterScores: ChapterScoreBreakdown[];
  questionTimings: QuestionTimingRecord[];
  answers: Record<string, StudentAnswerValue>;
  submittedAtIso: string;
  submittedAt?: unknown;
}

export type WeeklyDay = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export interface WeeklyScheduleItem {
  id: string;
  day: WeeklyDay;
  timeSlot: string;
  subject: string;
  topic: string;
  durationMinutes: number;
  completed: boolean;
  priority: 'High' | 'Normal';
}

export interface ManzilLectureItem {
  id: string;
  number: number;
  subject: 'Physics' | 'Chemistry' | 'Mathematics';
  chapter: string;
  durationMinutes: number;
  weightageMarks: number;
  difficulty: ChapterDifficulty;
  videoUrl: string;
}

export interface PlannerDayTask {
  day: number;
  phase: 'Phase 1: Foundation & High-Yield' | 'Phase 2: Core Mastery' | 'Phase 3: Full Revision & CBT';
  physicsTopic: string;
  chemistryTopic: string;
  mathsTopic: string;
  targetHours: number;
  targetMarksValue: number;
}

export interface LectureWatchRecord {
  watched: boolean;
  lastPositionSeconds: number;
  watchedSeconds: number;
  durationSeconds: number;
  updatedAtIso: string;
}

export interface UserProgressData {
  userId: string;
  plannerCompletedDays: number[];
  weeklySchedule: WeeklyScheduleItem[];
  manzilProgress: Record<string, { watched: boolean; watchedMinutes: number }>;
  lectureWatchState: Record<string, LectureWatchRecord>;
  bookmarkedMaterials: string[];
  recentMaterials: string[];
  focusSessionsMinutes: number;
  updatedAtIso: string;
}

export interface PlatformModuleSpec {
  id: string;
  indexLabel: string;
  title: string;
  route: RoutePath;
  summary: string;
  plannedCapabilities: string[];
  firebaseDependency: string;
}
