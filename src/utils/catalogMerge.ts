import type {
  ChapterRecord,
  ClassGroupRecord,
  MockTestRecord,
  SectionRecord,
  StudyMaterialRecord,
  SubjectRecord,
  TestQuestionRecord,
} from '../types';
import {
  CONCISE_NOTES_SECTION,
  JEE_CONCISE_CHAPTERS,
  JEE_CONCISE_MATERIALS,
} from '../data/jeeConciseNotesCatalog';
import {
  FULL_MOCK_TEST_1_QUESTIONS,
  FULL_MOCK_TEST_1_RECORD,
} from '../data/fullMockTest1Catalog';
import {
  ADDITIONAL_FULL_MOCK_QUESTIONS,
  ADDITIONAL_FULL_MOCK_TESTS,
} from '../data/fullMockTestsCatalog';
import {
  NEET_FULL_MOCK_QUESTIONS,
  NEET_FULL_MOCK_TESTS,
} from '../data/neetMockTestsCatalog';
import {
  DPP_UNITS_DIMENSIONS_75_QUESTIONS,
  DPP_UNITS_DIMENSIONS_75_RECORD,
} from '../data/dppUnitsDimensionsCatalog';
import { STARTER_CLASS_GROUPS } from '../services/platformRegistry';

function normalizeName(str: string): string {
  return str.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ');
}

function ensureCohorts(existing: string[], required: string[]): string[] {
  const set = new Set(existing);
  for (const r of required) set.add(r);
  return Array.from(set);
}

/**
 * Ensures Class 11 JEE, Class 12 JEE, and JEE Dropper always exist alongside
 * any custom Class Groups created by the Admin in Firestore.
 */
export function mergeClassGroups(
  fsClassGroups: ClassGroupRecord[],
  starterGroups: ClassGroupRecord[] = STARTER_CLASS_GROUPS
): ClassGroupRecord[] {
  if (fsClassGroups.length === 0) return starterGroups;

  const byId = new Map<string, ClassGroupRecord>();
  const existingSubIds = new Set<string>();

  for (const g of fsClassGroups) {
    byId.set(g.id, { ...g, subClasses: [...g.subClasses] });
    for (const sc of g.subClasses) existingSubIds.add(sc.id);
  }

  // Only ensure required JEE cohorts exist if missing from Firestore
  const requiredSubIds = new Set(['class-11-jee', 'class-12-jee', 'jee-dropper']);
  for (const sg of starterGroups) {
    const missingRequired = sg.subClasses.filter(
      (sc) => requiredSubIds.has(sc.id) && !existingSubIds.has(sc.id)
    );
    if (missingRequired.length === 0) continue;

    const existingGroup =
      byId.get(sg.id) ??
      Array.from(byId.values()).find((g) => normalizeName(g.name) === normalizeName(sg.name));

    if (existingGroup) {
      existingGroup.subClasses = [...existingGroup.subClasses, ...missingRequired];
    } else {
      byId.set(sg.id, { ...sg, subClasses: [...sg.subClasses] });
    }
    for (const sc of missingRequired) existingSubIds.add(sc.id);
  }

  return Array.from(byId.values()).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/**
 * Non-destructively merges Firestore subjects, sections, chapters, and materials
 * with the official 82-chapter JEE Concise Notes catalog.
 * If the admin recreated Physics / Chemistry / Mathematics under custom subject IDs,
 * official JEE chapters & notes automatically remap to those subject IDs so nothing duplicates.
 */
export function mergeOfficialJeeCatalog(params: {
  subjects: SubjectRecord[];
  sections: SectionRecord[];
  chapters: ChapterRecord[];
  materials: StudyMaterialRecord[];
}) {
  const officialSubjectDefs: Array<{
    id: 'subj-physics' | 'subj-chemistry' | 'subj-mathematics';
    name: string;
    code: string;
    order: number;
    aliases: string[];
  }> = [
    { id: 'subj-physics', name: 'Physics', code: 'PHY', order: 1, aliases: ['physics', 'phy'] },
    { id: 'subj-chemistry', name: 'Chemistry', code: 'CHEM', order: 2, aliases: ['chemistry', 'chem'] },
    { id: 'subj-mathematics', name: 'Mathematics', code: 'MATH', order: 3, aliases: ['mathematics', 'maths', 'math'] },
  ];

  const mergedSubjects = params.subjects.map((s) => ({ ...s, cohorts: [...s.cohorts] }));
  const subjectIdMap = new Map<string, string>();

  for (const def of officialSubjectDefs) {
    let matched =
      mergedSubjects.find((s) => s.id === def.id) ??
      mergedSubjects.find((s) => {
        const norm = normalizeName(s.name);
        return def.aliases.includes(norm) || def.aliases.includes(normalizeName(s.code));
      });

    if (matched) {
      matched.cohorts = ensureCohorts(matched.cohorts, ['class-11-jee', 'class-12-jee', 'jee-dropper']);
      subjectIdMap.set(def.id, matched.id);
    } else {
      const created: SubjectRecord = {
        id: def.id,
        name: def.name,
        code: def.code,
        order: def.order,
        cohorts: ['class-11-jee', 'class-12-jee', 'jee-dropper'],
      };
      mergedSubjects.push(created);
      subjectIdMap.set(def.id, def.id);
    }
  }

  mergedSubjects.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  // Merge Concise Notes section
  const mergedSections = params.sections.map((s) => ({ ...s }));
  const hasConciseSection = mergedSections.some(
    (s) =>
      s.id === CONCISE_NOTES_SECTION.id ||
      normalizeName(s.name) === normalizeName(CONCISE_NOTES_SECTION.name) ||
      s.slug === CONCISE_NOTES_SECTION.slug
  );
  const resolvedConciseSubjectIds = officialSubjectDefs.map((d) => subjectIdMap.get(d.id) ?? d.id);
  if (!hasConciseSection) {
    mergedSections.unshift({
      ...CONCISE_NOTES_SECTION,
      subjectIds: resolvedConciseSubjectIds,
    });
  }
  mergedSections.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  // Merge 82 JEE chapters (don't overwrite admin edits with same ID)
  const chapterById = new Map<string, ChapterRecord>();
  for (const ch of params.chapters) {
    chapterById.set(ch.id, ch);
  }
  for (const offCh of JEE_CONCISE_CHAPTERS) {
    if (!chapterById.has(offCh.id)) {
      chapterById.set(offCh.id, {
        ...offCh,
        subjectId: subjectIdMap.get(offCh.subjectId) ?? offCh.subjectId,
      });
    }
  }
  const mergedChapters = Array.from(chapterById.values()).sort((a, b) => {
    if (a.subjectId !== b.subjectId) return a.subjectId.localeCompare(b.subjectId);
    return (a.order ?? 0) - (b.order ?? 0);
  });

  // Merge 82 Concise Notes PDFs
  const matById = new Map<string, StudyMaterialRecord>();
  for (const m of params.materials) {
    matById.set(m.id, m);
  }
  for (const offMat of JEE_CONCISE_MATERIALS) {
    if (!matById.has(offMat.id)) {
      matById.set(offMat.id, {
        ...offMat,
        subjectId: subjectIdMap.get(offMat.subjectId) ?? offMat.subjectId,
      });
    }
  }
  const mergedMaterials = Array.from(matById.values());

  return {
    subjects: mergedSubjects,
    sections: mergedSections,
    chapters: mergedChapters,
    materials: mergedMaterials,
    subjectIdMap,
  };
}

/**
 * Strict Class / Sub-Class Isolation filters:
 * - A JEE-tagged subject/chapter/material/test is NEVER visible in NEET or Board or another Class.
 * - A NEET-tagged or Custom-Class-tagged upload is ONLY visible to that exact sub-class cohort.
 */
export function filterSubjectsByCohort(
  subjects: SubjectRecord[],
  selectedCohort: string
): SubjectRecord[] {
  if (!selectedCohort || selectedCohort === 'all') return subjects;
  return subjects.filter((s) => Array.isArray(s.cohorts) && s.cohorts.includes(selectedCohort));
}

export function filterChaptersByCohort(
  chapters: ChapterRecord[],
  selectedCohort: string
): ChapterRecord[] {
  if (!selectedCohort || selectedCohort === 'all') return chapters;
  return chapters.filter((ch) => Array.isArray(ch.cohorts) && ch.cohorts.includes(selectedCohort));
}

export function filterMaterialsByCohort(
  materials: StudyMaterialRecord[],
  selectedCohort: string
): StudyMaterialRecord[] {
  if (!selectedCohort || selectedCohort === 'all') return materials;
  return materials.filter((m) => Array.isArray(m.cohorts) && m.cohorts.includes(selectedCohort));
}

export function getTestCohortIds(
  test: Pick<MockTestRecord, 'cohortId' | 'cohortIds'>
): string[] {
  const seen = new Set<string>();
  if (test.cohortId) seen.add(test.cohortId);
  if (Array.isArray(test.cohortIds)) {
    for (const id of test.cohortIds) {
      if (id) seen.add(id);
    }
  }
  return Array.from(seen);
}

export function testMatchesCohort(
  test: Pick<MockTestRecord, 'cohortId' | 'cohortIds'>,
  selectedCohort: string
): boolean {
  if (!selectedCohort || selectedCohort === 'all') return true;
  return getTestCohortIds(test).includes(selectedCohort);
}

export function filterTestsByCohort(
  tests: MockTestRecord[],
  selectedCohort: string
): MockTestRecord[] {
  if (!selectedCohort || selectedCohort === 'all') return tests;
  return tests.filter((t) => testMatchesCohort(t, selectedCohort));
}

/**
 * Non-destructively merges Firestore/cached mock tests & questions with:
 * - Official built-in full-syllabus JEE & NEET cropped mock tests
 * - Official built-in chapter DPPs (including the 75Q Units & Dimensions JEE Physics DPP)
 * - Any newly added starter DPPs from starterCatalog.ts (destination === 'dpp')
 *
 * Existing Firestore/admin-edited tests and user progress are never overwritten or wiped.
 */
export function mergeOfficialMockTests(params: {
  mockTests: MockTestRecord[];
  questions: TestQuestionRecord[];
  starterTests?: MockTestRecord[];
  starterQuestions?: TestQuestionRecord[];
  subjectIdMap?: Map<string, string>;
}): {
  mockTests: MockTestRecord[];
  questions: TestQuestionRecord[];
} {
  const starterDpps = (params.starterTests ?? []).filter((t) => t.destination === 'dpp');
  const starterDppIds = new Set(starterDpps.map((t) => t.id));
  const starterDppQuestions = (params.starterQuestions ?? []).filter((q) =>
    starterDppIds.has(q.testId)
  );

  // Deduplicate candidate official + starter DPP records while preserving deterministic order
  const candidateTests: MockTestRecord[] = [];
  const seenCandidateTestIds = new Set<string>();
  const rawCandidateTests: MockTestRecord[] = [
    FULL_MOCK_TEST_1_RECORD,
    ...ADDITIONAL_FULL_MOCK_TESTS,
    ...NEET_FULL_MOCK_TESTS,
    DPP_UNITS_DIMENSIONS_75_RECORD,
    ...starterDpps,
  ];
  for (const t of rawCandidateTests) {
    if (!seenCandidateTestIds.has(t.id)) {
      seenCandidateTestIds.add(t.id);
      candidateTests.push(t);
    }
  }

  const candidateQuestions: TestQuestionRecord[] = [];
  const seenCandidateQIds = new Set<string>();
  const rawCandidateQuestions: TestQuestionRecord[] = [
    ...FULL_MOCK_TEST_1_QUESTIONS,
    ...ADDITIONAL_FULL_MOCK_QUESTIONS,
    ...NEET_FULL_MOCK_QUESTIONS,
    ...DPP_UNITS_DIMENSIONS_75_QUESTIONS,
    ...starterDppQuestions,
  ];
  for (const q of rawCandidateQuestions) {
    if (!seenCandidateQIds.has(q.id)) {
      seenCandidateQIds.add(q.id);
      candidateQuestions.push(q);
    }
  }

  const remapSubjectId = (test: MockTestRecord): MockTestRecord => {
    if (!test.subjectId || !params.subjectIdMap) return test;
    const mapped = params.subjectIdMap.get(test.subjectId);
    return mapped && mapped !== test.subjectId ? { ...test, subjectId: mapped } : test;
  };

  const existingTestIds = new Set(params.mockTests.map((t) => t.id));
  const missingOfficialTests = candidateTests
    .filter((t) => !existingTestIds.has(t.id))
    .map(remapSubjectId);
  const mergedTests = [...missingOfficialTests, ...params.mockTests];

  const missingTestIdSet = new Set(missingOfficialTests.map((t) => t.id));
  const existingQuestionIds = new Set(params.questions.map((q) => q.id));
  const testIdsWithQuestions = new Set(params.questions.map((q) => q.testId));

  const missingOfficialQuestions = candidateQuestions.filter(
    (q) =>
      !existingQuestionIds.has(q.id) &&
      (missingTestIdSet.has(q.testId) || !testIdsWithQuestions.has(q.testId))
  );
  const mergedQuestions = [...missingOfficialQuestions, ...params.questions];

  return {
    mockTests: mergedTests,
    questions: mergedQuestions,
  };
}
