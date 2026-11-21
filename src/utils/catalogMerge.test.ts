import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  CONCISE_NOTES_SECTION,
  JEE_CONCISE_CHAPTERS,
  JEE_CONCISE_MATERIALS,
} from '../data/jeeConciseNotesCatalog';
import {
  FULL_MOCK_TEST_1_ID,
  FULL_MOCK_TEST_1_QUESTIONS,
  FULL_MOCK_TEST_1_RECORD,
} from '../data/fullMockTest1Catalog';
import {
  filterChaptersByCohort,
  filterMaterialsByCohort,
  filterSubjectsByCohort,
  filterTestsByCohort,
  getTestCohortIds,
  mergeClassGroups,
  mergeOfficialJeeCatalog,
  mergeOfficialMockTests,
  testMatchesCohort,
} from './catalogMerge';
import {
  buildMaterialSeoSummary,
  buildMockTestSeoSummary,
  buildSitemapXml,
  CANONICAL_ORIGIN,
  generateCleanSlug,
  getHierarchicalMaterialPath,
  getHierarchicalMockTestPath,
  getMaterialRoutePath,
  resolveSubjectSlug,
  stripChapterNumberPrefix,
} from './seoHelpers';
import type { ChapterRecord, ClassGroupRecord, MockTestRecord, StudyMaterialRecord, SubjectRecord } from '../types';

test('JEE Concise Notes catalog contains all 82 chapters and 82 verified PDFs on disk', () => {
  assert.equal(JEE_CONCISE_CHAPTERS.length, 82);
  assert.equal(JEE_CONCISE_MATERIALS.length, 82);

  const phyCount = JEE_CONCISE_CHAPTERS.filter((c) => c.subjectId === 'subj-physics').length;
  const chemCount = JEE_CONCISE_CHAPTERS.filter((c) => c.subjectId === 'subj-chemistry').length;
  const mathCount = JEE_CONCISE_CHAPTERS.filter((c) => c.subjectId === 'subj-mathematics').length;

  assert.equal(phyCount, 27);
  assert.equal(chemCount, 28);
  assert.equal(mathCount, 27);

  for (const mat of JEE_CONCISE_MATERIALS) {
    assert.equal(mat.sectionName, CONCISE_NOTES_SECTION.name);
    assert.ok(mat.slug && mat.slug.length > 5);
    assert.equal(mat.isPublished, true);
    assert.ok(mat.fileUrl.startsWith('/assets/aistudio/'));
    const diskPath = path.join(process.cwd(), 'public', mat.fileUrl);
    assert.equal(fs.existsSync(diskPath), true, `Missing PDF on disk: ${diskPath}`);
    const header = fs.readFileSync(diskPath).subarray(0, 5).toString('utf8');
    assert.equal(header, '%PDF-', `Invalid PDF header for ${diskPath}`);
  }
});

test('mergeOfficialJeeCatalog preserves custom Firestore classes/subjects and remaps subject IDs cleanly', () => {
  const customClassGroups: ClassGroupRecord[] = [
    {
      id: 'cg-custom-olympiad',
      name: 'Olympiad & KVPY',
      order: 1,
      subClasses: [
        {
          id: 'olympiad-senior',
          label: 'Senior Olympiad',
          shortLabel: 'Olympiad',
          stream: 'Competitive',
          focusSummary: 'INPhO, INChO, INMO',
          subjects: ['Physics', 'Chemistry', 'Mathematics'],
        },
      ],
    },
  ];
  const mergedGroups = mergeClassGroups(customClassGroups);
  const subIds = mergedGroups.flatMap((g) => g.subClasses.map((s) => s.id));
  assert.ok(subIds.includes('olympiad-senior'));
  assert.ok(subIds.includes('class-11-jee'));
  assert.ok(subIds.includes('class-12-jee'));

  const customSubjects: SubjectRecord[] = [
    { id: 'custom-phy-id', name: 'Physics', code: 'PHY', order: 1, cohorts: ['olympiad-senior'] },
    { id: 'custom-bio-id', name: 'Biology', code: 'BIO', order: 2, cohorts: ['class-12-neet'] },
  ];

  const merged = mergeOfficialJeeCatalog({
    subjects: customSubjects,
    sections: [],
    chapters: [],
    materials: [],
  });

  // Physics remapped to custom-phy-id rather than duplicated
  const physicsSubjects = merged.subjects.filter((s) => s.name === 'Physics');
  assert.equal(physicsSubjects.length, 1);
  assert.equal(physicsSubjects[0].id, 'custom-phy-id');
  assert.ok(physicsSubjects[0].cohorts.includes('class-11-jee'));
  assert.ok(physicsSubjects[0].cohorts.includes('olympiad-senior'));

  // Physics chapters point to custom-phy-id
  const phyChapter = merged.chapters.find((c) => c.id === 'chap-jee-phy-01');
  assert.equal(phyChapter?.subjectId, 'custom-phy-id');
  assert.ok(merged.sections.some((s) => s.name === 'Concise Notes'));
});

test('strict cohort isolation prevents JEE files from leaking into NEET, Board, or Custom Classes', () => {
  const subjects: SubjectRecord[] = [
    { id: 's-math', name: 'Mathematics', code: 'MATH', order: 1, cohorts: ['class-11-jee', 'class-12-jee'] },
    { id: 's-bio', name: 'Biology', code: 'BIO', order: 2, cohorts: ['class-11-neet', 'class-12-neet'] },
    { id: 's-olympiad', name: 'Astrophysics', code: 'ASTRO', order: 3, cohorts: ['custom-class-1'] },
  ];

  assert.deepEqual(filterSubjectsByCohort(subjects, 'class-11-jee').map((s) => s.id), ['s-math']);
  assert.deepEqual(filterSubjectsByCohort(subjects, 'class-12-neet').map((s) => s.id), ['s-bio']);
  assert.deepEqual(filterSubjectsByCohort(subjects, 'custom-class-1').map((s) => s.id), ['s-olympiad']);

  const chapters: ChapterRecord[] = [
    { id: 'c1', subjectId: 's-math', name: 'Sets', order: 1, cohorts: ['class-11-jee'], weightageMarks: 4, difficulty: 'Easy' },
    { id: 'c2', subjectId: 's-bio', name: 'Genetics', order: 1, cohorts: ['class-12-neet'], weightageMarks: 16, difficulty: 'Moderate' },
  ];
  assert.equal(filterChaptersByCohort(chapters, 'class-12-neet').length, 1);
  assert.equal(filterChaptersByCohort(chapters, 'class-12-neet')[0].id, 'c2');

  const materials: StudyMaterialRecord[] = [
    ...JEE_CONCISE_MATERIALS.slice(0, 5),
    {
      id: 'mat-neet-only',
      title: 'NEET Genetics Sheet',
      subjectId: 's-bio',
      chapterId: 'c2',
      sectionName: 'Short Notes',
      resourceType: 'Short Notes',
      cohorts: ['class-12-neet'],
      fileUrl: '/test.pdf',
    },
  ];
  assert.equal(filterMaterialsByCohort(materials, 'class-12-neet').length, 1);
  assert.equal(filterMaterialsByCohort(materials, 'class-12-neet')[0].id, 'mat-neet-only');
  assert.equal(filterMaterialsByCohort(materials, 'class-11-board').length, 0);

  const tests: MockTestRecord[] = [
    {
      id: 't1',
      title: 'JEE Mock',
      destination: 'cbt-mock',
      cohortId: 'class-12-jee',
      examCategory: 'JEE Main',
      totalQuestions: 10,
      totalMarks: 40,
      durationMinutes: 30,
      positiveMarks: 4,
      negativeMarks: 1,
      negativeMarkingEnabled: true,
      showSolutionsAfterSubmit: true,
      status: 'published',
    },
    {
      id: 't2',
      title: 'NEET Mock',
      destination: 'cbt-mock',
      cohortId: 'class-12-neet',
      examCategory: 'NEET UG',
      totalQuestions: 10,
      totalMarks: 40,
      durationMinutes: 30,
      positiveMarks: 4,
      negativeMarks: 1,
      negativeMarkingEnabled: true,
      showSolutionsAfterSubmit: true,
      status: 'published',
    },
  ];
  assert.deepEqual(filterTestsByCohort(tests, 'class-12-jee').map((t) => t.id), ['t1']);
  assert.deepEqual(filterTestsByCohort(tests, 'class-12-neet').map((t) => t.id), ['t2']);
});

test('SEO helpers generate clean slugs, PYQ routes, 150-word summaries, and valid sitemap XML', () => {
  assert.equal(generateCleanSlug('Electrostatics Formula Sheet'), 'electrostatics-formula-sheet');
  assert.equal(generateCleanSlug('Work, Energy & Power — JEE!'), 'work-energy-and-power-jee');

  assert.equal(
    getMaterialRoutePath({
      id: 'm1',
      title: 'Chemical Bonding PYQs',
      sectionName: 'Previous Year Questions (PYQs)',
      resourceType: 'Previous Year Questions (PYQs)',
      slug: 'chemical-bonding-pyqs',
    }),
    '/pyqs/chemical-bonding-pyqs'
  );

  const matSummary = buildMaterialSeoSummary({
    title: 'Electrostatics Concise Notes',
    subjectName: 'Physics',
    chapterName: '14. Electrostatics',
    sectionName: 'Concise Notes',
    cohortLabels: ['Class 12 JEE'],
  });
  assert.ok(matSummary.split(/\s+/).length >= 100);

  const testSummary = buildMockTestSeoSummary({
    title: 'JEE Main Mock 1',
    examCategory: 'JEE Main',
    cohortLabel: 'Class 12 JEE',
    durationMinutes: 180,
    totalQuestions: 75,
    totalMarks: 300,
    positiveMarks: 4,
    negativeMarks: 1,
    negativeMarkingEnabled: true,
  });
  assert.ok(testSummary.split(/\s+/).length >= 100);

  assert.equal(CANONICAL_ORIGIN, 'https://prepskm.in');
  assert.equal(resolveSubjectSlug('subj-mathematics'), 'mathematics');
  assert.equal(resolveSubjectSlug('subj-physics'), 'physics');
  assert.equal(stripChapterNumberPrefix('01. Units, Dimensions & Errors'), 'Units, Dimensions & Errors');

  assert.equal(
    getHierarchicalMaterialPath({
      id: 'mat-jee-phy-01',
      title: 'Units, Dimensions & Errors — JEE Concise Notes',
      slug: 'units-dimensions-errors-jee-concise-notes',
      sectionName: 'Concise Notes',
      resourceType: 'Short Notes',
      subjectId: 'subj-physics',
      cohorts: ['class-11-jee', 'jee-dropper'],
    }),
    '/materials/class-11-jee/physics/units-dimensions-errors-jee-concise-notes'
  );

  assert.equal(
    getHierarchicalMockTestPath({
      id: 't-cbt-1',
      title: 'JEE Main Full Mock 1',
      slug: 'jee-main-full-mock-1',
      cohortId: 'class-12-jee',
      examCategory: 'JEE Main',
      destination: 'cbt-mock',
    }),
    '/cbt-mocks/class-12-jee/jee-main-full-mock-1'
  );

  assert.equal(
    getHierarchicalMockTestPath({
      id: 't-dpp-1',
      title: 'Electrostatics DPP 01',
      slug: 'electrostatics-dpp-01',
      cohortId: 'class-12-jee',
      examCategory: 'JEE Main',
      destination: 'dpp',
    }),
    '/dpp/class-12-jee/electrostatics-dpp-01'
  );

  const xml = buildSitemapXml([
    { loc: 'https://prepskm.in/', lastmod: '2026-11-20', priority: '1.0' },
    { loc: 'https://prepskm.in/cbt-mocks', lastmod: '2026-11-20', priority: '0.9' },
    { loc: 'https://prepskm.in/', lastmod: '2026-11-20', priority: '1.0' }, // duplicate
  ]);
  assert.ok(xml.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'));
  assert.equal(xml.match(/<url>/g)?.length, 2);
});

test('Full Mock Test 1 has 75 verified questions, 150 cropped PNGs on disk, and targets 12th JEE & Dropper JEE', () => {
  assert.equal(FULL_MOCK_TEST_1_RECORD.id, FULL_MOCK_TEST_1_ID);
  assert.equal(FULL_MOCK_TEST_1_RECORD.title, 'Full Mock Test 1');
  assert.equal(FULL_MOCK_TEST_1_RECORD.totalQuestions, 75);
  assert.equal(FULL_MOCK_TEST_1_RECORD.totalMarks, 300);
  assert.equal(FULL_MOCK_TEST_1_RECORD.durationMinutes, 180);
  assert.equal(FULL_MOCK_TEST_1_RECORD.positiveMarks, 4);
  assert.equal(FULL_MOCK_TEST_1_RECORD.negativeMarks, 1);
  assert.equal(FULL_MOCK_TEST_1_RECORD.negativeMarkingEnabled, true);
  assert.equal(FULL_MOCK_TEST_1_RECORD.status, 'published');

  // Multi-cohort isolation: matches 12th JEE and Dropper JEE, NOT NEET or Class 11
  assert.deepEqual(getTestCohortIds(FULL_MOCK_TEST_1_RECORD), ['class-12-jee', 'jee-dropper']);
  assert.equal(testMatchesCohort(FULL_MOCK_TEST_1_RECORD, 'class-12-jee'), true);
  assert.equal(testMatchesCohort(FULL_MOCK_TEST_1_RECORD, 'jee-dropper'), true);
  assert.equal(testMatchesCohort(FULL_MOCK_TEST_1_RECORD, 'class-12-neet'), false);
  assert.equal(testMatchesCohort(FULL_MOCK_TEST_1_RECORD, 'class-11-jee'), false);

  assert.equal(FULL_MOCK_TEST_1_QUESTIONS.length, 75);

  const phy = FULL_MOCK_TEST_1_QUESTIONS.filter((q) => q.subjectName === 'Physics');
  const chem = FULL_MOCK_TEST_1_QUESTIONS.filter((q) => q.subjectName === 'Chemistry');
  const math = FULL_MOCK_TEST_1_QUESTIONS.filter((q) => q.subjectName === 'Mathematics');
  assert.equal(phy.length, 25);
  assert.equal(chem.length, 25);
  assert.equal(math.length, 25);

  const mcqs = FULL_MOCK_TEST_1_QUESTIONS.filter((q) => q.questionType === 'single-mcq');
  const numericals = FULL_MOCK_TEST_1_QUESTIONS.filter((q) => q.questionType === 'integer');
  assert.equal(mcqs.length, 60);
  assert.equal(numericals.length, 15);

  const seenIds = new Set<string>();
  const pngSig = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

  FULL_MOCK_TEST_1_QUESTIONS.forEach((q, idx) => {
    assert.equal(q.questionNumber, idx + 1);
    assert.equal(q.testId, FULL_MOCK_TEST_1_ID);
    assert.equal(seenIds.has(q.id), false, `Duplicate question id: ${q.id}`);
    seenIds.add(q.id);

    if (q.questionType === 'single-mcq') {
      assert.equal(q.optionTexts?.length, 4, `Q${q.questionNumber} must have 4 options`);
      assert.equal(q.correctOptionIndices?.length, 1, `Q${q.questionNumber} must have 1 correct option`);
      const ans = q.correctOptionIndices![0];
      assert.ok(ans >= 0 && ans <= 3, `Q${q.questionNumber} answer index out of range`);
    } else {
      assert.ok(q.numericalAnswer && q.numericalAnswer.trim().length > 0, `Q${q.questionNumber} missing numerical answer`);
    }

    assert.ok(q.questionImageUrl?.startsWith('/assets/mocks/full-mock-test-1/q'));
    assert.ok(q.solutionImageUrl?.startsWith('/assets/mocks/full-mock-test-1/s'));

    const qPath = path.join(process.cwd(), 'public', q.questionImageUrl!);
    const sPath = path.join(process.cwd(), 'public', q.solutionImageUrl!);
    assert.equal(fs.existsSync(qPath), true, `Missing question PNG: ${qPath}`);
    assert.equal(fs.existsSync(sPath), true, `Missing solution PNG: ${sPath}`);
    assert.ok(fs.readFileSync(qPath).subarray(0, 4).equals(pngSig), `Invalid PNG header: ${qPath}`);
    assert.ok(fs.readFileSync(sPath).subarray(0, 4).equals(pngSig), `Invalid PNG header: ${sPath}`);
  });
});

test('mergeOfficialMockTests prepends Full Mock Test 1 alongside Firestore tests without duplication', () => {
  const customTest: MockTestRecord = {
    id: 'custom-admin-test-1',
    title: 'Admin Custom Test',
    destination: 'cbt-mock',
    cohortId: 'class-12-jee',
    examCategory: 'JEE Main',
    totalQuestions: 1,
    totalMarks: 4,
    durationMinutes: 10,
    positiveMarks: 4,
    negativeMarks: 1,
    negativeMarkingEnabled: true,
    showSolutionsAfterSubmit: true,
    status: 'published',
  };

  const mergedOnce = mergeOfficialMockTests({ mockTests: [customTest], questions: [] });
  assert.equal(mergedOnce.mockTests.length, 2);
  assert.equal(mergedOnce.mockTests[0].id, FULL_MOCK_TEST_1_ID);
  assert.equal(mergedOnce.questions.length, 75);

  // Calling again does not duplicate Full Mock Test 1 or its 75 questions
  const mergedTwice = mergeOfficialMockTests(mergedOnce);
  assert.equal(mergedTwice.mockTests.length, 2);
  assert.equal(mergedTwice.questions.length, 75);

  // Both 12th JEE and Dropper JEE filters return Full Mock Test 1
  assert.ok(filterTestsByCohort(mergedOnce.mockTests, 'class-12-jee').some((t) => t.id === FULL_MOCK_TEST_1_ID));
  assert.ok(filterTestsByCohort(mergedOnce.mockTests, 'jee-dropper').some((t) => t.id === FULL_MOCK_TEST_1_ID));
  assert.equal(filterTestsByCohort(mergedOnce.mockTests, 'class-12-neet').some((t) => t.id === FULL_MOCK_TEST_1_ID), false);
});

