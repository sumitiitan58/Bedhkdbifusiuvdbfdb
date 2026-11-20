import type { ClassGroupRecord, PlatformModuleSpec, StudentCohort } from '../types';

export const STARTER_CLASS_GROUPS: ClassGroupRecord[] = [
  {
    id: 'grp-class-9',
    name: 'Class 9',
    order: 1,
    subClasses: [
      {
        id: 'class-9',
        label: 'Class 9 Foundation',
        shortLabel: 'Class 9',
        stream: 'Foundation',
        focusSummary: 'Early conceptual foundation in Mathematics and Science aligned with NCERT & Olympiads.',
        subjects: ['Mathematics', 'Science', 'Physics', 'Chemistry'],
      },
    ],
  },
  {
    id: 'grp-class-10',
    name: 'Class 10',
    order: 2,
    subClasses: [
      {
        id: 'class-10',
        label: 'Class 10 Board + Foundation',
        shortLabel: 'Class 10',
        stream: 'Foundation',
        focusSummary: 'Board exam mastery alongside analytical bridge problems for Class 11 JEE & NEET.',
        subjects: ['Mathematics', 'Physics', 'Chemistry', 'Biology'],
      },
    ],
  },
  {
    id: 'grp-class-11',
    name: 'Class 11',
    order: 3,
    subClasses: [
      {
        id: 'class-11-board',
        label: 'Class 11 Board',
        shortLabel: 'Class 11 Board',
        stream: 'Board',
        focusSummary: 'Step-by-step NCERT derivations, school exams, and rock-solid Class 11 fundamentals.',
        subjects: ['Physics', 'Chemistry', 'Mathematics', 'Biology'],
      },
      {
        id: 'class-11-jee',
        label: 'Class 11 JEE',
        shortLabel: 'Class 11 JEE',
        stream: 'JEE',
        focusSummary: 'Two-year roadmap covering JEE Main & Advanced mechanics, algebra, and physical chemistry.',
        subjects: ['Physics', 'Chemistry', 'Mathematics'],
      },
      {
        id: 'class-11-neet',
        label: 'Class 11 NEET',
        shortLabel: 'Class 11 NEET',
        stream: 'NEET',
        focusSummary: 'NCERT line-by-line Biology mastery combined with medical Physics & Chemistry problem speed.',
        subjects: ['Physics', 'Chemistry', 'Biology'],
      },
    ],
  },
  {
    id: 'grp-class-12',
    name: 'Class 12',
    order: 4,
    subClasses: [
      {
        id: 'class-12-board',
        label: 'Class 12 Board',
        shortLabel: 'Class 12 Board',
        stream: 'Board',
        focusSummary: 'Complete board syllabus revision, structured answer writing, and sample paper drills.',
        subjects: ['Physics', 'Chemistry', 'Mathematics', 'Biology'],
      },
      {
        id: 'class-12-jee',
        label: 'Class 12 JEE',
        shortLabel: 'Class 12 JEE',
        stream: 'JEE',
        focusSummary: 'Class 12 syllabus completion synchronized with Class 11 revision and NTA CBT mocks.',
        subjects: ['Physics', 'Chemistry', 'Mathematics'],
      },
      {
        id: 'class-12-neet',
        label: 'Class 12 NEET',
        shortLabel: 'Class 12 NEET',
        stream: 'NEET',
        focusSummary: 'High-accuracy Biology + NCERT Organic/Inorganic + timed NEET UG CBT mock series.',
        subjects: ['Physics', 'Chemistry', 'Biology'],
      },
    ],
  },
  {
    id: 'grp-dropper',
    name: 'Droppers',
    order: 5,
    subClasses: [
      {
        id: 'jee-dropper',
        label: 'JEE Droppers',
        shortLabel: 'JEE Droppers',
        stream: 'JEE',
        focusSummary: 'Intensive full-syllabus recovery, timed CBT practice, chapter-wise DPPs, and error analysis.',
        subjects: ['Physics', 'Chemistry', 'Mathematics'],
      },
      {
        id: 'neet-dropper',
        label: 'NEET Droppers',
        shortLabel: 'NEET Droppers',
        stream: 'NEET',
        focusSummary: 'Focused 680+ score strategy with NCERT active recall, daily DPPs, and 180-Q NEET mocks.',
        subjects: ['Physics', 'Chemistry', 'Biology'],
      },
    ],
  },
];

export function flattenClassGroupsToCohorts(groups: ClassGroupRecord[]): StudentCohort[] {
  const result: StudentCohort[] = [];
  for (const g of groups) {
    for (const sub of g.subClasses ?? []) {
      result.push({
        ...sub,
        classGroupId: g.id,
        classGroupName: g.name,
      });
    }
  }
  return result;
}

export const STUDENT_COHORTS: StudentCohort[] = flattenClassGroupsToCohorts(STARTER_CLASS_GROUPS);

export const PLATFORM_MODULES: PlatformModuleSpec[] = [
  {
    id: 'materials',
    indexLabel: '01',
    title: 'Chapter Materials & Notes',
    route: '/materials',
    summary: 'Open any chapter to explore admin-curated PDFs, formula sheets, PYQs, and chapter videos with thumbnails.',
    plannedCapabilities: [
      'Chapter-first layout with custom admin sections',
      'Instant PDF notes, formula sheets, and video lessons',
      'SEO-structured chapter pages with bookmarks',
    ],
    firebaseDependency: 'Cloud Firestore',
  },
  {
    id: 'profile',
    indexLabel: '02',
    title: 'Student Profile & Cloud Sync',
    route: '/profile',
    summary: 'Customize your avatar, target JEE/NEET year, active Class/Sub-Class track, and Google Cloud backup.',
    plannedCapabilities: [
      'Instant profile photo upload & target exam settings',
      'One-tap switching between Class 9–12 Board, JEE & NEET',
      'Weekly schedule & test history synced across devices',
    ],
    firebaseDependency: 'Firebase Auth + Cloud Firestore',
  },
  {
    id: 'cbt-mocks',
    indexLabel: '03',
    title: 'NTA CBT Mock Tests',
    route: '/cbt-mocks',
    summary: 'Exam-grade CBT room with JEE/NEET-specific instructions, Syllabus viewer, Exit Warnings, and graphical reports.',
    plannedCapabilities: [
      'View Syllabus & exam-specific instructions pre-test',
      'Live Exam Room-Exit warning guard & focus score',
      'Interactive post-test Recharts performance graphs',
    ],
    firebaseDependency: 'Cloud Firestore',
  },
  {
    id: 'dpp',
    indexLabel: '04',
    title: 'Chapter-Wise DPPs',
    route: '/dpp',
    summary: 'Daily Practice Problems calibrated by difficulty tier to reinforce every chapter immediately.',
    plannedCapabilities: [
      'Topic-wise daily problem sets with instant solutions',
      'Single MCQ, Multi-MCQ, and Integer/Numerical formats',
      'Accuracy & time-per-question pacing diagnostics',
    ],
    firebaseDependency: 'Cloud Firestore',
  },
  {
    id: 'analytics',
    indexLabel: '05',
    title: 'Student Performance Analytics',
    route: '/analytics',
    summary: 'Deep subject mastery radar, pacing breakdowns, Exam IQ trends, and weak-chapter priority queues.',
    plannedCapabilities: [
      'Subject Mastery Radar & score progression graphs',
      'Too Fast / Optimal / Too Slow pacing diagnostics',
      'Exam focus integrity & room-exit log tracking',
    ],
    firebaseDependency: 'Cloud Firestore',
  },
  {
    id: 'admin',
    indexLabel: '06',
    title: 'Admin Content Console',
    route: '/admin',
    summary: 'Manage Classes & Sub-Classes, scoped Chapter Sections, instant PDF/Video uploads, and CBT papers.',
    plannedCapabilities: [
      'Dynamic Class & Sub-Class builder (Board / JEE / NEET)',
      'Scoped Sections across All, Multiple Subjects, or Chapters',
      'Instant non-hanging uploads with full Edit & Delete',
    ],
    firebaseDependency: 'Firebase Auth + Firestore Rules',
  },
];
