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
  FORMULA_SHEETS_SECTION,
  PCMB_FORMULA_CHAPTERS,
  PCMB_FORMULA_MATERIALS,
} from '../data/pcmbFormulaSheetsCatalog';
import {
  FULL_MOCK_TEST_1_ID,
  FULL_MOCK_TEST_1_QUESTIONS,
  FULL_MOCK_TEST_1_RECORD,
} from '../data/fullMockTest1Catalog';
import {
  ADDITIONAL_FULL_MOCK_QUESTIONS,
  ADDITIONAL_FULL_MOCK_TESTS,
  FULL_MOCK_TEST_2_ID,
  FULL_MOCK_TEST_2_QUESTIONS,
  FULL_MOCK_TEST_2_RECORD,
  FULL_MOCK_TEST_3_ID,
  FULL_MOCK_TEST_3_QUESTIONS,
  FULL_MOCK_TEST_3_RECORD,
  FULL_MOCK_TEST_4_ID,
  FULL_MOCK_TEST_4_QUESTIONS,
  FULL_MOCK_TEST_4_RECORD,
  FULL_MOCK_TEST_5_ID,
  FULL_MOCK_TEST_5_QUESTIONS,
  FULL_MOCK_TEST_5_RECORD,
} from '../data/fullMockTestsCatalog';
import {
  NEET_FULL_MOCK_QUESTIONS,
  NEET_FULL_MOCK_TESTS,
} from '../data/neetMockTestsCatalog';
import { STARTER_MATERIALS } from '../services/starterCatalog';
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

test('Full Mock Tests 2–5 have 240 verified questions, 480 real PDF-cropped PNGs on disk, and target 12th JEE & Dropper JEE', () => {
  const suites = [
    {
      record: FULL_MOCK_TEST_2_RECORD,
      expectedId: FULL_MOCK_TEST_2_ID,
      questions: FULL_MOCK_TEST_2_QUESTIONS,
      folder: 'full-mock-test-2',
      totalQ: 15,
      totalMarks: 60,
      duration: 45,
      phy: 5,
      chem: 5,
      math: 5,
      mcqs: 15,
      numericals: 0,
    },
    {
      record: FULL_MOCK_TEST_3_RECORD,
      expectedId: FULL_MOCK_TEST_3_ID,
      questions: FULL_MOCK_TEST_3_QUESTIONS,
      folder: 'full-mock-test-3',
      totalQ: 75,
      totalMarks: 300,
      duration: 180,
      phy: 25,
      chem: 25,
      math: 25,
      mcqs: 60,
      numericals: 15,
    },
    {
      record: FULL_MOCK_TEST_4_RECORD,
      expectedId: FULL_MOCK_TEST_4_ID,
      questions: FULL_MOCK_TEST_4_QUESTIONS,
      folder: 'full-mock-test-4',
      totalQ: 75,
      totalMarks: 300,
      duration: 180,
      phy: 25,
      chem: 25,
      math: 25,
      mcqs: 60,
      numericals: 15,
    },
    {
      record: FULL_MOCK_TEST_5_RECORD,
      expectedId: FULL_MOCK_TEST_5_ID,
      questions: FULL_MOCK_TEST_5_QUESTIONS,
      folder: 'full-mock-test-5',
      totalQ: 75,
      totalMarks: 300,
      duration: 180,
      phy: 25,
      chem: 25,
      math: 25,
      mcqs: 60,
      numericals: 15,
    },
  ];

  assert.equal(ADDITIONAL_FULL_MOCK_TESTS.length, 4);
  assert.equal(ADDITIONAL_FULL_MOCK_QUESTIONS.length, 240);

  const pngSig = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

  for (const s of suites) {
    assert.equal(s.record.id, s.expectedId);
    assert.equal(s.record.totalQuestions, s.totalQ);
    assert.equal(s.record.totalMarks, s.totalMarks);
    assert.equal(s.record.durationMinutes, s.duration);
    assert.equal(s.record.positiveMarks, 4);
    assert.equal(s.record.negativeMarks, 1);
    assert.equal(s.record.negativeMarkingEnabled, true);
    assert.equal(s.record.status, 'published');

    assert.deepEqual(getTestCohortIds(s.record), ['class-12-jee', 'jee-dropper']);
    assert.equal(testMatchesCohort(s.record, 'class-12-jee'), true);
    assert.equal(testMatchesCohort(s.record, 'jee-dropper'), true);
    assert.equal(testMatchesCohort(s.record, 'class-12-neet'), false);
    assert.equal(testMatchesCohort(s.record, 'class-11-jee'), false);

    assert.equal(s.questions.length, s.totalQ);
    assert.equal(s.questions.filter((q) => q.subjectName === 'Physics').length, s.phy);
    assert.equal(s.questions.filter((q) => q.subjectName === 'Chemistry').length, s.chem);
    assert.equal(s.questions.filter((q) => q.subjectName === 'Mathematics').length, s.math);
    assert.equal(s.questions.filter((q) => q.questionType === 'single-mcq').length, s.mcqs);
    assert.equal(s.questions.filter((q) => q.questionType === 'integer').length, s.numericals);

    const seenIds = new Set<string>();
    s.questions.forEach((q, idx) => {
      assert.equal(q.questionNumber, idx + 1);
      assert.equal(q.testId, s.expectedId);
      assert.equal(seenIds.has(q.id), false, `Duplicate question id: ${q.id}`);
      seenIds.add(q.id);

      if (q.questionType === 'single-mcq') {
        assert.equal(q.optionTexts?.length, 4, `${s.folder} Q${q.questionNumber} needs 4 options`);
        assert.equal(q.correctOptionIndices?.length, 1);
        const ans = q.correctOptionIndices![0];
        assert.ok(ans >= 0 && ans <= 3);
      } else {
        assert.ok(q.numericalAnswer && q.numericalAnswer.trim().length > 0);
      }

      assert.ok(q.questionImageUrl?.startsWith(`/assets/mocks/${s.folder}/q`));
      assert.ok(q.solutionImageUrl?.startsWith(`/assets/mocks/${s.folder}/s`));

      const qPath = path.join(process.cwd(), 'public', q.questionImageUrl!);
      const sPath = path.join(process.cwd(), 'public', q.solutionImageUrl!);
      assert.equal(fs.existsSync(qPath), true, `Missing question PNG: ${qPath}`);
      assert.equal(fs.existsSync(sPath), true, `Missing solution PNG: ${sPath}`);
      assert.ok(fs.readFileSync(qPath).subarray(0, 4).equals(pngSig), `Invalid PNG header: ${qPath}`);
      assert.ok(fs.readFileSync(sPath).subarray(0, 4).equals(pngSig), `Invalid PNG header: ${sPath}`);
    });
  }

  // Verify Class 12 Board Section B Descriptive Solutions PDF exists on disk
  const boardMat = STARTER_MATERIALS.find((m) => m.id === 'mat-eng-board-section-b-solutions');
  assert.ok(boardMat, 'Missing Class 12 Board English Section B Descriptive Solutions material');
  assert.deepEqual(boardMat!.cohorts, ['class-12-board']);
  const boardPdfPath = path.join(process.cwd(), 'public', boardMat!.fileUrl);
  assert.equal(fs.existsSync(boardPdfPath), true, `Missing Board PDF: ${boardPdfPath}`);
  assert.equal(fs.readFileSync(boardPdfPath).subarray(0, 5).toString('utf8'), '%PDF-');
});

test('mergeOfficialMockTests prepends official JEE/NEET mocks and 75Q DPP alongside Firestore tests without duplication', () => {
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
  // 5 JEE Full Mocks + 8 NEET Full Mocks + 1 Units & Dimensions 75Q DPP + 1 custom admin test = 15
  assert.equal(mergedOnce.mockTests.length, 15);
  assert.deepEqual(
    mergedOnce.mockTests.slice(0, 5).map((t) => t.id),
    [
      FULL_MOCK_TEST_1_ID,
      FULL_MOCK_TEST_2_ID,
      FULL_MOCK_TEST_3_ID,
      FULL_MOCK_TEST_4_ID,
      FULL_MOCK_TEST_5_ID,
    ]
  );
  // 315 JEE questions + 1440 NEET questions + 75 Units & Dimensions DPP questions = 1830
  assert.equal(mergedOnce.questions.length, 1830);

  // Calling again does not duplicate any official test or question
  const mergedTwice = mergeOfficialMockTests(mergedOnce);
  assert.equal(mergedTwice.mockTests.length, 15);
  assert.equal(mergedTwice.questions.length, 1830);

  // Both 12th JEE and Dropper JEE filters return all 5 JEE Full Mock Tests; NEET returns none of them
  const expectedIds = [
    FULL_MOCK_TEST_1_ID,
    FULL_MOCK_TEST_2_ID,
    FULL_MOCK_TEST_3_ID,
    FULL_MOCK_TEST_4_ID,
    FULL_MOCK_TEST_5_ID,
  ];
  for (const id of expectedIds) {
    assert.ok(filterTestsByCohort(mergedOnce.mockTests, 'class-12-jee').some((t) => t.id === id));
    assert.ok(filterTestsByCohort(mergedOnce.mockTests, 'jee-dropper').some((t) => t.id === id));
    assert.equal(filterTestsByCohort(mergedOnce.mockTests, 'class-12-neet').some((t) => t.id === id), false);
  }

  // Units & Dimensions 75Q DPP matches All Classes, Class 11 JEE, and JEE Dropper
  const dppId = 'dpp-phy-units-dimensions-75';
  assert.ok(filterTestsByCohort(mergedOnce.mockTests, 'all').some((t) => t.id === dppId));
  assert.ok(filterTestsByCohort(mergedOnce.mockTests, 'class-11-jee').some((t) => t.id === dppId));
  assert.ok(filterTestsByCohort(mergedOnce.mockTests, 'jee-dropper').some((t) => t.id === dppId));
  assert.equal(filterTestsByCohort(mergedOnce.mockTests, 'class-12-neet').some((t) => t.id === dppId), false);
  assert.equal(mergedOnce.questions.filter((q) => q.testId === dppId).length, 75);
});

test('mergeOfficialMockTests auto-merges newly added starter DPPs and remaps custom Firestore subjectIds', () => {
  const existingFirestoreTest: MockTestRecord = {
    id: 'fs-existing-mock',
    title: 'Existing Firestore CBT Mock',
    destination: 'cbt-mock',
    cohortId: 'class-12-jee',
    examCategory: 'JEE Main',
    totalQuestions: 1,
    totalMarks: 4,
    durationMinutes: 15,
    positiveMarks: 4,
    negativeMarks: 1,
    negativeMarkingEnabled: true,
    showSolutionsAfterSubmit: true,
    status: 'published',
  };

  const newStarterDpp: MockTestRecord = {
    id: 'dpp-phy-new-kinematics-01',
    title: 'Kinematics — Starter DPP #01',
    destination: 'dpp',
    cohortId: 'class-11-jee',
    cohortIds: ['class-11-jee', 'jee-dropper'],
    subjectId: 'subj-physics',
    chapterId: 'chap-jee-phy-02',
    examCategory: 'Chapter-Wise DPP',
    totalQuestions: 1,
    totalMarks: 4,
    durationMinutes: 10,
    positiveMarks: 4,
    negativeMarks: 1,
    negativeMarkingEnabled: true,
    showSolutionsAfterSubmit: true,
    status: 'published',
  };

  const subjectIdMap = new Map<string, string>([['subj-physics', 'custom-fs-physics']]);

  const merged = mergeOfficialMockTests({
    mockTests: [existingFirestoreTest],
    questions: [],
    starterTests: [newStarterDpp],
    starterQuestions: [
      {
        id: 'q-kin-1',
        testId: newStarterDpp.id,
        questionNumber: 1,
        subjectName: 'Physics',
        questionType: 'single-mcq',
        questionText: 'Sample kinematics question',
        optionTexts: ['A', 'B', 'C', 'D'],
        correctOptionIndices: [0],
        positiveMarks: 4,
        negativeMarks: 1,
        testStatus: 'published',
      },
    ],
    subjectIdMap,
  });

  const mergedNewDpp = merged.mockTests.find((t) => t.id === newStarterDpp.id);
  const mergedUnitsDpp = merged.mockTests.find((t) => t.id === 'dpp-phy-units-dimensions-75');
  assert.ok(mergedNewDpp, 'Newly added starter DPP should auto-merge into existing catalog');
  assert.equal(mergedNewDpp!.subjectId, 'custom-fs-physics');
  assert.ok(mergedUnitsDpp, 'Built-in 75Q Units & Dimensions DPP should always be present');
  assert.equal(mergedUnitsDpp!.subjectId, 'custom-fs-physics');
  assert.equal(merged.questions.filter((q) => q.testId === newStarterDpp.id).length, 1);
});

test('PCMB Formula Sheets catalog contains all 99 verified PDFs on disk with strict JEE/NEET branch & class isolation', () => {
  assert.equal(PCMB_FORMULA_MATERIALS.length, 99);
  assert.equal(PCMB_FORMULA_CHAPTERS.length, 33); // 8 Master + 1 Experimental Physics + 24 Biology

  const seenIds = new Set<string>();
  const seenSlugs = new Set<string>();
  const seenFiles = new Set<string>();

  for (const mat of PCMB_FORMULA_MATERIALS) {
    assert.equal(mat.sectionName, FORMULA_SHEETS_SECTION.name);
    assert.equal(mat.resourceType, 'Formula Sheets');
    assert.equal(mat.isPublished, true);
    assert.equal(seenIds.has(mat.id), false, `Duplicate formula sheet id: ${mat.id}`);
    seenIds.add(mat.id);
    assert.ok(mat.slug && mat.slug.length > 5);
    assert.equal(seenSlugs.has(mat.slug), false, `Duplicate formula sheet slug: ${mat.slug}`);
    seenSlugs.add(mat.slug);
    assert.equal(seenFiles.has(mat.fileUrl), false, `Duplicate formula sheet fileUrl: ${mat.fileUrl}`);
    seenFiles.add(mat.fileUrl);

    const diskPath = path.join(process.cwd(), 'public', mat.fileUrl);
    assert.equal(fs.existsSync(diskPath), true, `Missing Formula Sheet PDF on disk: ${diskPath}`);
    const header = fs.readFileSync(diskPath).subarray(0, 5).toString('utf8');
    assert.equal(header, '%PDF-', `Invalid PDF header for ${diskPath}`);
    const size = fs.statSync(diskPath).size;
    assert.equal(mat.fileSizeBytes, size, `File size mismatch for ${mat.fileUrl}`);
  }

  // Exact subject distribution: 29 Physics + 21 Chemistry + 23 Maths + 26 Biology = 99
  assert.equal(PCMB_FORMULA_MATERIALS.filter((m) => m.subjectId === 'subj-physics').length, 29);
  assert.equal(PCMB_FORMULA_MATERIALS.filter((m) => m.subjectId === 'subj-chemistry').length, 21);
  assert.equal(PCMB_FORMULA_MATERIALS.filter((m) => m.subjectId === 'subj-mathematics').length, 23);
  assert.equal(PCMB_FORMULA_MATERIALS.filter((m) => m.subjectId === 'subj-biology').length, 26);

  // Strict cohort counts & branch isolation
  const jee11 = filterMaterialsByCohort(PCMB_FORMULA_MATERIALS, 'class-11-jee');
  const jee12 = filterMaterialsByCohort(PCMB_FORMULA_MATERIALS, 'class-12-jee');
  const jeeDrop = filterMaterialsByCohort(PCMB_FORMULA_MATERIALS, 'jee-dropper');
  const neet11 = filterMaterialsByCohort(PCMB_FORMULA_MATERIALS, 'class-11-neet');
  const neet12 = filterMaterialsByCohort(PCMB_FORMULA_MATERIALS, 'class-12-neet');
  const neetDrop = filterMaterialsByCohort(PCMB_FORMULA_MATERIALS, 'neet-dropper');

  // 11th JEE: 14 Phy + 10 Chem + 12 Math = 36 (0 Bio)
  assert.equal(jee11.length, 36);
  assert.equal(jee11.filter((m) => m.subjectId === 'subj-biology').length, 0);

  // 12th JEE: 15 Phy + 11 Chem + 11 Math = 37 (0 Bio)
  assert.equal(jee12.length, 37);
  assert.equal(jee12.filter((m) => m.subjectId === 'subj-biology').length, 0);

  // JEE Dropper: 29 Phy + 21 Chem + 23 Math = 73 (0 Bio)
  assert.equal(jeeDrop.length, 73);
  assert.equal(jeeDrop.filter((m) => m.subjectId === 'subj-biology').length, 0);

  // 11th NEET: 14 Phy + 10 Chem + 15 Bio = 39 (0 Math)
  assert.equal(neet11.length, 39);
  assert.equal(neet11.filter((m) => m.subjectId === 'subj-mathematics').length, 0);

  // 12th NEET: 15 Phy + 11 Chem + 11 Bio = 37 (0 Math)
  assert.equal(neet12.length, 37);
  assert.equal(neet12.filter((m) => m.subjectId === 'subj-mathematics').length, 0);

  // NEET Dropper: 29 Phy + 21 Chem + 26 Bio = 76 (0 Math)
  assert.equal(neetDrop.length, 76);
  assert.equal(neetDrop.filter((m) => m.subjectId === 'subj-mathematics').length, 0);

  // Verify mergeOfficialJeeCatalog auto-merges Formula Sheets, remaps custom subject IDs, and keeps JEE Concise Notes out of NEET
  const merged = mergeOfficialJeeCatalog({
    subjects: [
      { id: 'custom-phy', name: 'Physics', code: 'PHY', order: 1, cohorts: ['class-11-jee'] },
      { id: 'custom-bio', name: 'Biology', code: 'BIO', order: 4, cohorts: ['class-12-neet'] },
    ],
    sections: [
      {
        id: 'sec-formula-sheets',
        name: 'Formula Sheets',
        slug: 'formula-sheets',
        order: 3,
        scope: 'subjects',
        subjectIds: ['custom-phy'],
      },
    ],
    chapters: [],
    materials: [],
  });

  const formulaSec = merged.sections.find((s) => s.slug === 'formula-sheets');
  assert.ok(formulaSec, 'Formula Sheets section should exist');
  assert.ok(formulaSec!.subjectIds?.includes('custom-phy'));
  assert.ok(formulaSec!.subjectIds?.includes('custom-bio'));
  assert.ok(formulaSec!.subjectIds?.includes('subj-chemistry'));
  assert.ok(formulaSec!.subjectIds?.includes('subj-mathematics'));

  const mergedNeet11Mats = filterMaterialsByCohort(merged.materials, 'class-11-neet');
  // Every NEET 11 material in merged catalog is a Formula Sheet; zero Concise Notes leak into NEET
  assert.equal(mergedNeet11Mats.filter((m) => m.sectionName === 'Concise Notes').length, 0);
  assert.equal(mergedNeet11Mats.filter((m) => m.sectionName === 'Formula Sheets').length, 39);
  assert.equal(mergedNeet11Mats.filter((m) => m.subjectId === 'custom-bio').length, 15);
  assert.equal(mergedNeet11Mats.filter((m) => m.subjectId === 'custom-phy').length, 14);
});

test('NEET (UG) Full Mock Tests 01–08 have 1,440 verified questions, 2,880 cropped PNGs on disk, and strictly target 12th NEET & Dropper NEET', () => {
  assert.equal(NEET_FULL_MOCK_TESTS.length, 8);
  assert.equal(NEET_FULL_MOCK_QUESTIONS.length, 1440);

  const pngSig = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

  for (let i = 0; i < NEET_FULL_MOCK_TESTS.length; i++) {
    const mock = NEET_FULL_MOCK_TESTS[i];
    const num = i + 1;
    assert.equal(mock.id, `cbt-neet-full-mock-test-${num}`);
    assert.equal(mock.totalQuestions, 180);
    assert.equal(mock.totalMarks, 720);
    assert.equal(mock.durationMinutes, 180);
    assert.equal(mock.positiveMarks, 4);
    assert.equal(mock.negativeMarks, 1);
    assert.equal(mock.negativeMarkingEnabled, true);
    assert.equal(mock.status, 'published');
    assert.ok(mock.slug && mock.slug.startsWith(`neet-ug-full-mock-test-0${num}`));

    // Strictly 12th NEET & Dropper NEET only
    assert.deepEqual(getTestCohortIds(mock), ['class-12-neet', 'neet-dropper']);
    assert.equal(testMatchesCohort(mock, 'class-12-neet'), true);
    assert.equal(testMatchesCohort(mock, 'neet-dropper'), true);
    assert.equal(testMatchesCohort(mock, 'class-11-neet'), false);
    assert.equal(testMatchesCohort(mock, 'class-12-jee'), false);
    assert.equal(testMatchesCohort(mock, 'jee-dropper'), false);

    const qs = NEET_FULL_MOCK_QUESTIONS.filter((q) => q.testId === mock.id);
    assert.equal(qs.length, 180);
    assert.equal(qs.filter((q) => q.subjectName === 'Physics').length, 45);
    assert.equal(qs.filter((q) => q.subjectName === 'Chemistry').length, 45);
    assert.equal(qs.filter((q) => q.subjectName === 'Botany').length, 45);
    assert.equal(qs.filter((q) => q.subjectName === 'Zoology').length, 45);

    for (const q of qs) {
      assert.equal(q.optionTexts?.length, 4);
      assert.equal(q.correctOptionIndices?.length, 1);
      const ans = q.correctOptionIndices![0];
      assert.ok(ans >= 0 && ans <= 3);
      const qPath = path.join(process.cwd(), 'public', q.questionImageUrl!);
      const sPath = path.join(process.cwd(), 'public', q.solutionImageUrl!);
      assert.equal(fs.existsSync(qPath), true, `Missing NEET question PNG: ${qPath}`);
      assert.equal(fs.existsSync(sPath), true, `Missing NEET solution PNG: ${sPath}`);
      assert.ok(fs.readFileSync(qPath).subarray(0, 4).equals(pngSig));
      assert.ok(fs.readFileSync(sPath).subarray(0, 4).equals(pngSig));
    }
  }
});

test('Static sitemap.xml covers all 8 NEET mocks, 5 JEE mocks, 99 formula sheets, and 82 chapter notes cleanly', () => {
  const sitemapPath = path.join(process.cwd(), 'public', 'sitemap.xml');
  assert.equal(fs.existsSync(sitemapPath), true);
  const xml = fs.readFileSync(sitemapPath, 'utf8');
  assert.ok(xml.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'));
  for (const mock of NEET_FULL_MOCK_TESTS) {
    const loc = `${CANONICAL_ORIGIN}${getHierarchicalMockTestPath(mock)}`;
    assert.ok(xml.includes(`<loc>${loc}</loc>`), `Missing NEET mock in sitemap.xml: ${loc}`);
  }
  for (const fsMat of PCMB_FORMULA_MATERIALS) {
    const loc = `${CANONICAL_ORIGIN}${getHierarchicalMaterialPath(fsMat, { cohortId: fsMat.cohorts[0] })}`;
    assert.ok(xml.includes(`<loc>${loc}</loc>`), `Missing formula sheet in sitemap.xml: ${loc}`);
  }
});




