import type { MockTestRecord, TestQuestionRecord } from '../types';
import { getDefaultExamInstructions } from '../utils/examPresets';

export const FULL_MOCK_TEST_2_ID = 'cbt-jee-full-mock-test-2';
export const FULL_MOCK_TEST_3_ID = 'cbt-jee-full-mock-test-3';
export const FULL_MOCK_TEST_4_ID = 'cbt-jee-full-mock-test-4';
export const FULL_MOCK_TEST_5_ID = 'cbt-jee-full-mock-test-5';

interface CompactQuestionSpec {
  q: number;
  subject: 'Physics' | 'Chemistry' | 'Mathematics';
  chapter: string;
  page: number;
  /** 0=A, 1=B, 2=C, 3=D for MCQ; string for numerical/integer */
  ans: 0 | 1 | 2 | 3 | string;
  options?: [string, string, string, string];
  summary?: string;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;

function buildQuestionsFromSpecs(params: {
  testId: string;
  prefix: string;
  assetFolder: string;
  testLabel: string;
  specs: CompactQuestionSpec[];
}): TestQuestionRecord[] {
  const { testId, prefix, assetFolder, testLabel, specs } = params;
  return specs.map((spec) => {
    const num = String(spec.q).padStart(2, '0');
    const isMcq = typeof spec.ans === 'number';
    const base: TestQuestionRecord = {
      id: `q-${prefix}-${num}`,
      testId,
      questionNumber: spec.q,
      subjectName: spec.subject,
      chapterName: spec.chapter,
      questionType: isMcq ? 'single-mcq' : 'integer',
      questionText: spec.summary
        ? `${testLabel} · Q${spec.q} (${spec.subject} — ${spec.chapter}): ${spec.summary}`
        : `${testLabel} · Q${spec.q} (${spec.subject} — ${spec.chapter}). Refer to the cropped question paper image.`,
      questionImageUrl: `/assets/mocks/${assetFolder}/q${num}.png`,
      solutionText: isMcq
        ? `Correct Option: (${OPTION_LETTERS[spec.ans as 0 | 1 | 2 | 3]}). Refer to the cropped step-by-step solution image for ${spec.subject} — ${spec.chapter}.`
        : `Correct Numerical Answer: ${spec.ans}. Refer to the cropped step-by-step solution image for ${spec.subject} — ${spec.chapter}.`,
      solutionImageUrl: `/assets/mocks/${assetFolder}/s${num}.png`,
      sourcePageNumber: spec.page,
      positiveMarks: 4,
      negativeMarks: 1,
      testStatus: 'published',
    };

    if (isMcq) {
      base.optionTexts = spec.options ?? ['Option A', 'Option B', 'Option C', 'Option D'];
      base.correctOptionIndices = [spec.ans as 0 | 1 | 2 | 3];
    } else {
      base.numericalAnswer = String(spec.ans);
    }

    return base;
  });
}

// ============================================================================
// FULL MOCK TEST 2 — High-Yield Full-Pattern (15 MCQs · 60 Marks · 45 Min)
// Source: JEE_Main_Full_Pattern_Mock_Test_with_Solutions_4ae75a72.pdf
// ============================================================================
export const FULL_MOCK_TEST_2_RECORD: MockTestRecord = {
  id: FULL_MOCK_TEST_2_ID,
  title: 'High-Yield Mini Mock #2 — 15Q / 45m',
  slug: 'full-mock-test-2-jee-main-full-pattern',
  seoDescription:
    'Attempt Full Mock Test 2 (JEE Main High-Yield Full-Pattern) for Class 12 JEE & JEE Dropper on PREPSKM.IN — 15 high-yield cropped conceptual questions (Physics, Chemistry & Mathematics), 60 marks, 45 minutes, +4/-1 marking with exact step-by-step cropped solutions.',
  destination: 'cbt-mock',
  cohortId: 'class-12-jee',
  cohortIds: ['class-12-jee', 'jee-dropper'],
  examCategory: 'JEE Main Full-Pattern High-Yield Mock (NTA Pattern)',
  examType: 'JEE Main',
  syllabus: [
    {
      subject: 'Physics',
      chapters: [
        'Rotational Mechanics & Work-Energy',
        'Electrostatics & Capacitors',
        'Modern Physics (Photoelectric Effect)',
        'Thermodynamics',
        'Current Electricity',
      ],
    },
    {
      subject: 'Chemistry',
      chapters: [
        'Chemical Bonding & Molecular Orbital Theory',
        'Organic Chemistry (Aldol & Cannizzaro)',
        'Chemical Kinetics',
        'Coordination Compounds',
        'Electrochemistry',
      ],
    },
    {
      subject: 'Mathematics',
      chapters: [
        "Definite Integration (King's Property)",
        'Matrices & Determinants',
        '3D Geometry (Shortest Distance)',
        'Complex Numbers',
        'Sequences & Series',
      ],
    },
  ],
  instructions: getDefaultExamInstructions({
    examType: 'JEE Main',
    durationMinutes: 45,
    positiveMarks: 4,
    negativeMarks: 1,
    negativeMarkingEnabled: true,
    totalQuestions: 15,
  }),
  subjectRanges: [
    { subjectName: 'Physics', startQ: 1, endQ: 5 },
    { subjectName: 'Chemistry', startQ: 6, endQ: 10 },
    { subjectName: 'Mathematics', startQ: 11, endQ: 15 },
  ],
  totalQuestions: 15,
  totalMarks: 60,
  durationMinutes: 45,
  positiveMarks: 4,
  negativeMarks: 1,
  negativeMarkingEnabled: true,
  showSolutionsAfterSubmit: true,
  status: 'published',
  createdAtIso: '2026-11-21T08:15:00.000Z',
};

const FULL_MOCK_TEST_2_SPECS: CompactQuestionSpec[] = [
  { q: 1, subject: 'Physics', chapter: 'Rotational Mechanics & Work-Energy', page: 1, ans: 1, options: ['1 : 1', '2 : 1', '3 : 2', '5 : 2'] },
  { q: 2, subject: 'Physics', chapter: 'Electrostatics & Capacitors', page: 1, ans: 1, options: ['4ε₀A / 3d', '8ε₀A / 3d', '2ε₀A / d', '5ε₀A / 2d'] },
  { q: 3, subject: 'Physics', chapter: 'Modern Physics — Photoelectric Effect', page: 2, ans: 0, options: ['3λ', '4λ', '2λ', '5λ'] },
  { q: 4, subject: 'Physics', chapter: 'Thermodynamics', page: 2, ans: 1, options: ['(3/2) P₀V₀', '(5/2) P₀V₀', '(7/2) P₀V₀', '2 P₀V₀'] },
  { q: 5, subject: 'Physics', chapter: 'Current Electricity', page: 2, ans: 1, options: ['240', '300', '320', '180'] },
  { q: 6, subject: 'Chemistry', chapter: 'Chemical Bonding & MOT', page: 3, ans: 2, options: ['O₂⁻', 'N₂⁻', 'NO⁺', 'C₂²⁻'] },
  { q: 7, subject: 'Chemistry', chapter: 'Aldol & Cannizzaro Reactions', page: 3, ans: 1, options: ['Crossed Cannizzaro reaction', 'Claisen-Schmidt condensation', 'Perkin reaction', 'Benzoin condensation'] },
  { q: 8, subject: 'Chemistry', chapter: 'Chemical Kinetics', page: 4, ans: 1, options: ['45 min', '60 min', '80 min', '90 min'] },
  { q: 9, subject: 'Chemistry', chapter: 'Coordination Compounds', page: 4, ans: 2, options: ['2 and 0', '4 and 1', '2 and 1', '4 and 0'] },
  { q: 10, subject: 'Chemistry', chapter: 'Electrochemistry', page: 4, ans: 2, options: ['1', '3', '4', '5'] },
  { q: 11, subject: 'Mathematics', chapter: "Definite Integration — King's Property", page: 5, ans: 1, options: ['π / 2', 'π / 4', 'π / 6', 'π / 8'] },
  { q: 12, subject: 'Mathematics', chapter: 'Matrices & Determinants', page: 5, ans: 1, options: ['2⁹', '2¹⁰', '2¹¹', '2¹²'] },
  { q: 13, subject: 'Mathematics', chapter: '3D Geometry — Shortest Distance', page: 5, ans: 0, options: ['3 / √19', '6 / √19', '2 / √19', '4 / √19'] },
  { q: 14, subject: 'Mathematics', chapter: 'Complex Numbers', page: 6, ans: 0, options: ['10', '12', '8', '14'] },
  { q: 15, subject: 'Mathematics', chapter: 'Sequences & Series', page: 6, ans: 0, options: ['35 / 16', '33 / 16', '31 / 16', '37 / 16'] },
];

export const FULL_MOCK_TEST_2_QUESTIONS: TestQuestionRecord[] = buildQuestionsFromSpecs({
  testId: FULL_MOCK_TEST_2_ID,
  prefix: 'fmt2',
  assetFolder: 'full-mock-test-2',
  testLabel: 'Full Mock Test 2',
  specs: FULL_MOCK_TEST_2_SPECS,
});

// ============================================================================
// FULL MOCK TEST 3 — JEE Main Full Syllabus (75 Qs · 300 Marks · 180 Min)
// Source: Jee_Main_Mock_Test_03_0a6f71cd.pdf
// ============================================================================
export const FULL_MOCK_TEST_3_RECORD: MockTestRecord = {
  id: FULL_MOCK_TEST_3_ID,
  title: 'Full Mock Test 3',
  slug: 'full-mock-test-3-jee-main-2027',
  seoDescription:
    'Attempt Full Mock Test 3 (JEE Main Full Syllabus Side-by-Side Q&A Edition) for Class 12 JEE & JEE Dropper on PREPSKM.IN — 75 cropped questions (60 MCQs + 15 Numericals), 300 marks, 180 minutes, +4/-1 marking with exact step-by-step cropped solutions.',
  destination: 'cbt-mock',
  cohortId: 'class-12-jee',
  cohortIds: ['class-12-jee', 'jee-dropper'],
  examCategory: 'JEE Main 2027 Full Syllabus (NTA Pattern)',
  examType: 'JEE Main',
  syllabus: [
    {
      subject: 'Physics',
      chapters: [
        'Kinematics, Laws of Motion, WEP & Rotational Motion',
        'Gravitation, Fluids, Thermal Physics, SHM & Waves',
        'Electrostatics, Capacitors, Current Electricity & Magnetism',
        'EMI, AC, Ray & Wave Optics, Modern Physics & Logic Gates',
      ],
    },
    {
      subject: 'Chemistry',
      chapters: [
        'Mole Concept, Atomic Structure, Bonding & Solutions',
        'Thermodynamics, Ionic Equilibrium, Electrochemistry & Kinetics',
        'Periodic Trends, p/d/f-Block, Coordination & Qualitative Analysis',
        'GOC, Hydrocarbons, Haloalkanes, Alcohols, Carbonyls, Amines & Biomolecules',
      ],
    },
    {
      subject: 'Mathematics',
      chapters: [
        'Quadratics, Complex Numbers, Sequences, P&C, Matrices & Probability',
        'Statistics, Functions, Limits, Continuity & AOD',
        'Definite Integration, Area Under Curves & Differential Equations',
        'Straight Lines, Ellipse, Hyperbola, Vectors, 3D Geometry & Trigonometry',
      ],
    },
  ],
  instructions: getDefaultExamInstructions({
    examType: 'JEE Main',
    durationMinutes: 180,
    positiveMarks: 4,
    negativeMarks: 1,
    negativeMarkingEnabled: true,
    totalQuestions: 75,
  }),
  subjectRanges: [
    { subjectName: 'Physics', startQ: 1, endQ: 25 },
    { subjectName: 'Chemistry', startQ: 26, endQ: 50 },
    { subjectName: 'Mathematics', startQ: 51, endQ: 75 },
  ],
  totalQuestions: 75,
  totalMarks: 300,
  durationMinutes: 180,
  positiveMarks: 4,
  negativeMarks: 1,
  negativeMarkingEnabled: true,
  showSolutionsAfterSubmit: true,
  status: 'published',
  createdAtIso: '2026-11-21T08:16:00.000Z',
};

const FULL_MOCK_TEST_3_SPECS: CompactQuestionSpec[] = [
  // Physics Section A (MCQs: Q1–Q20)
  { q: 1, subject: 'Physics', chapter: 'Kinematics', page: 2, ans: 0 },
  { q: 2, subject: 'Physics', chapter: 'Laws of Motion', page: 2, ans: 0 },
  { q: 3, subject: 'Physics', chapter: 'Work, Energy & Power', page: 2, ans: 0 },
  { q: 4, subject: 'Physics', chapter: 'Rotational Motion', page: 2, ans: 0 },
  { q: 5, subject: 'Physics', chapter: 'Gravitation', page: 2, ans: 0 },
  { q: 6, subject: 'Physics', chapter: 'Fluid Mechanics', page: 2, ans: 0 },
  { q: 7, subject: 'Physics', chapter: 'Thermal Physics', page: 3, ans: 0 },
  { q: 8, subject: 'Physics', chapter: 'Waves & Sound', page: 3, ans: 0 },
  { q: 9, subject: 'Physics', chapter: 'Electrostatics', page: 3, ans: 0 },
  { q: 10, subject: 'Physics', chapter: 'Current Electricity', page: 3, ans: 0 },
  { q: 11, subject: 'Physics', chapter: 'Moving Charges & Magnetism', page: 3, ans: 0 },
  { q: 12, subject: 'Physics', chapter: 'Electromagnetic Induction', page: 3, ans: 0 },
  { q: 13, subject: 'Physics', chapter: 'Alternating Current', page: 3, ans: 0 },
  { q: 14, subject: 'Physics', chapter: 'Ray Optics', page: 4, ans: 0 },
  { q: 15, subject: 'Physics', chapter: 'Wave Optics', page: 4, ans: 0 },
  { q: 16, subject: 'Physics', chapter: 'Modern Physics', page: 4, ans: 1 },
  { q: 17, subject: 'Physics', chapter: 'Atomic Physics', page: 4, ans: 0 },
  { q: 18, subject: 'Physics', chapter: 'Logic Gates', page: 4, ans: 0 },
  { q: 19, subject: 'Physics', chapter: 'Magnetism & Matter', page: 4, ans: 1 },
  { q: 20, subject: 'Physics', chapter: 'Capacitors', page: 4, ans: 0 },
  // Physics Section B (Numericals: Q21–Q25)
  { q: 21, subject: 'Physics', chapter: 'Simple Harmonic Motion', page: 5, ans: '4' },
  { q: 22, subject: 'Physics', chapter: 'Electrostatics', page: 5, ans: '10' },
  { q: 23, subject: 'Physics', chapter: 'Current Electricity', page: 5, ans: '4800' },
  { q: 24, subject: 'Physics', chapter: 'Nuclear Physics', page: 5, ans: '2' },
  { q: 25, subject: 'Physics', chapter: 'Rotational Motion', page: 5, ans: '200' },

  // Chemistry Section A (MCQs: Q26–Q45)
  { q: 26, subject: 'Chemistry', chapter: 'Mole Concept', page: 6, ans: 0 },
  { q: 27, subject: 'Chemistry', chapter: 'Atomic Structure', page: 6, ans: 0 },
  { q: 28, subject: 'Chemistry', chapter: 'Chemical Bonding', page: 6, ans: 0 },
  { q: 29, subject: 'Chemistry', chapter: 'Solutions', page: 6, ans: 0 },
  { q: 30, subject: 'Chemistry', chapter: 'Electrochemistry', page: 6, ans: 0 },
  { q: 31, subject: 'Chemistry', chapter: 'Chemical Kinetics', page: 6, ans: 0 },
  { q: 32, subject: 'Chemistry', chapter: 'Ionic Equilibrium', page: 6, ans: 0 },
  { q: 33, subject: 'Chemistry', chapter: 'Coordination Compounds', page: 7, ans: 0 },
  { q: 34, subject: 'Chemistry', chapter: 'd & f Block Elements', page: 7, ans: 0 },
  { q: 35, subject: 'Chemistry', chapter: 'p-Block Elements', page: 7, ans: 0 },
  { q: 36, subject: 'Chemistry', chapter: 'Periodic Trends', page: 7, ans: 0 },
  { q: 37, subject: 'Chemistry', chapter: 'Qualitative Analysis', page: 7, ans: 0 },
  { q: 38, subject: 'Chemistry', chapter: 'GOC & Aromaticity', page: 7, ans: 0 },
  { q: 39, subject: 'Chemistry', chapter: 'Hydrocarbons', page: 7, ans: 0 },
  { q: 40, subject: 'Chemistry', chapter: 'Haloalkanes', page: 8, ans: 0 },
  { q: 41, subject: 'Chemistry', chapter: 'Alcohols & Ethers', page: 8, ans: 0 },
  { q: 42, subject: 'Chemistry', chapter: 'Aldehydes & Ketones', page: 8, ans: 0 },
  { q: 43, subject: 'Chemistry', chapter: 'Amines', page: 8, ans: 0 },
  { q: 44, subject: 'Chemistry', chapter: 'Biomolecules', page: 8, ans: 0 },
  { q: 45, subject: 'Chemistry', chapter: 'Thermodynamics', page: 8, ans: 0 },
  // Chemistry Section B (Numericals: Q46–Q50)
  { q: 46, subject: 'Chemistry', chapter: 'Mole Concept', page: 8, ans: '2' },
  { q: 47, subject: 'Chemistry', chapter: 'Ionic Equilibrium', page: 9, ans: '3' },
  { q: 48, subject: 'Chemistry', chapter: 'Electrochemistry', page: 9, ans: '12' },
  { q: 49, subject: 'Chemistry', chapter: 'Atomic Structure', page: 9, ans: '18' },
  { q: 50, subject: 'Chemistry', chapter: 'd-Block Elements', page: 9, ans: '7' },

  // Mathematics Section A (MCQs: Q51–Q70)
  { q: 51, subject: 'Mathematics', chapter: 'Quadratic Equations', page: 10, ans: 0 },
  { q: 52, subject: 'Mathematics', chapter: 'Complex Numbers', page: 10, ans: 0 },
  { q: 53, subject: 'Mathematics', chapter: 'Sequences & Series', page: 10, ans: 0 },
  { q: 54, subject: 'Mathematics', chapter: 'Permutations & Combinations', page: 10, ans: 0 },
  { q: 55, subject: 'Mathematics', chapter: 'Matrices & Determinants', page: 10, ans: 0 },
  { q: 56, subject: 'Mathematics', chapter: 'Probability', page: 10, ans: 0 },
  { q: 57, subject: 'Mathematics', chapter: 'Statistics', page: 10, ans: 0 },
  { q: 58, subject: 'Mathematics', chapter: 'Functions', page: 11, ans: 0 },
  { q: 59, subject: 'Mathematics', chapter: 'Limits', page: 11, ans: 0 },
  { q: 60, subject: 'Mathematics', chapter: 'Continuity', page: 11, ans: 0 },
  { q: 61, subject: 'Mathematics', chapter: 'Application of Derivatives', page: 11, ans: 0 },
  { q: 62, subject: 'Mathematics', chapter: 'Definite Integration', page: 11, ans: 0 },
  { q: 63, subject: 'Mathematics', chapter: 'Area Under Curves', page: 11, ans: 0 },
  { q: 64, subject: 'Mathematics', chapter: 'Differential Equations', page: 11, ans: 0 },
  { q: 65, subject: 'Mathematics', chapter: 'Straight Lines', page: 11, ans: 0 },
  { q: 66, subject: 'Mathematics', chapter: 'Ellipse', page: 12, ans: 0 },
  { q: 67, subject: 'Mathematics', chapter: 'Hyperbola', page: 12, ans: 0 },
  { q: 68, subject: 'Mathematics', chapter: 'Vector Algebra', page: 12, ans: 0 },
  { q: 69, subject: 'Mathematics', chapter: '3D Geometry', page: 12, ans: 0 },
  { q: 70, subject: 'Mathematics', chapter: 'Trigonometry', page: 12, ans: 0 },
  // Mathematics Section B (Numericals: Q71–Q75)
  { q: 71, subject: 'Mathematics', chapter: 'Matrices', page: 12, ans: '26' },
  { q: 72, subject: 'Mathematics', chapter: 'Permutations & Combinations', page: 12, ans: '14' },
  { q: 73, subject: 'Mathematics', chapter: 'Limits', page: 12, ans: '12' },
  { q: 74, subject: 'Mathematics', chapter: 'Probability', page: 13, ans: '15' },
  { q: 75, subject: 'Mathematics', chapter: 'Vector Algebra', page: 13, ans: '3' },
];

export const FULL_MOCK_TEST_3_QUESTIONS: TestQuestionRecord[] = buildQuestionsFromSpecs({
  testId: FULL_MOCK_TEST_3_ID,
  prefix: 'fmt3',
  assetFolder: 'full-mock-test-3',
  testLabel: 'Full Mock Test 3',
  specs: FULL_MOCK_TEST_3_SPECS,
});

// ============================================================================
// FULL MOCK TEST 4 — JEE Main Full Syllabus (75 Qs · 300 Marks · 180 Min)
// Source: Jee_Main_Mock_Test_04_4134b7ce.pdf
// ============================================================================
export const FULL_MOCK_TEST_4_RECORD: MockTestRecord = {
  id: FULL_MOCK_TEST_4_ID,
  title: 'Full Mock Test 4',
  slug: 'full-mock-test-4-jee-main-2027',
  seoDescription:
    'Attempt Full Mock Test 4 (JEE Main Full Syllabus Side-by-Side Q&A Edition) for Class 12 JEE & JEE Dropper on PREPSKM.IN — 75 cropped questions (60 MCQs + 15 Numericals), 300 marks, 180 minutes, +4/-1 marking with exact step-by-step cropped solutions.',
  destination: 'cbt-mock',
  cohortId: 'class-12-jee',
  cohortIds: ['class-12-jee', 'jee-dropper'],
  examCategory: 'JEE Main 2027 Full Syllabus (NTA Pattern)',
  examType: 'JEE Main',
  syllabus: [
    {
      subject: 'Physics',
      chapters: [
        'Errors & Measurement, Kinematics, Circular Motion, COM & Rotation',
        'Gravitation, Surface Tension, Fluid Mechanics, Thermodynamics & Waves',
        'Electrostatics, Capacitors, Current Electricity, Magnetism & EMI/AC',
        'Ray & Wave Optics, Modern Physics, Nuclear, Semiconductors & EM Waves',
      ],
    },
    {
      subject: 'Chemistry',
      chapters: [
        'Mole Concept, Atomic Structure, Chemical Bonding & Solutions',
        'Thermodynamics, Chemical Equilibrium, Electrochemistry & Kinetics',
        'Coordination Compounds, d & f Block, p-Block & Periodic Properties',
        'GOC, Isomerism, Hydrocarbons, Haloalkanes, Alcohols, Carbonyls, Amines & Biomolecules',
      ],
    },
    {
      subject: 'Mathematics',
      chapters: [
        'Quadratics, Complex Numbers, Sequences, P&C, Binomial, Matrices & Probability',
        'Functions, Limits, Differentiation, AOD & Statistics',
        'Indefinite & Definite Integration, Area Under Curves & Differential Equations',
        'Straight Lines, Circles, Parabola, Vectors, 3D Geometry & Trigonometry',
      ],
    },
  ],
  instructions: getDefaultExamInstructions({
    examType: 'JEE Main',
    durationMinutes: 180,
    positiveMarks: 4,
    negativeMarks: 1,
    negativeMarkingEnabled: true,
    totalQuestions: 75,
  }),
  subjectRanges: [
    { subjectName: 'Physics', startQ: 1, endQ: 25 },
    { subjectName: 'Chemistry', startQ: 26, endQ: 50 },
    { subjectName: 'Mathematics', startQ: 51, endQ: 75 },
  ],
  totalQuestions: 75,
  totalMarks: 300,
  durationMinutes: 180,
  positiveMarks: 4,
  negativeMarks: 1,
  negativeMarkingEnabled: true,
  showSolutionsAfterSubmit: true,
  status: 'published',
  createdAtIso: '2026-11-21T08:17:00.000Z',
};

const FULL_MOCK_TEST_4_SPECS: CompactQuestionSpec[] = [
  // Physics Section A (MCQs: Q1–Q20)
  { q: 1, subject: 'Physics', chapter: 'Errors & Measurement', page: 2, ans: 0 },
  { q: 2, subject: 'Physics', chapter: 'Kinematics', page: 2, ans: 0 },
  { q: 3, subject: 'Physics', chapter: 'Circular Motion', page: 2, ans: 0 },
  { q: 4, subject: 'Physics', chapter: 'Center of Mass', page: 2, ans: 0 },
  { q: 5, subject: 'Physics', chapter: 'Rotational Motion', page: 2, ans: 0 },
  { q: 6, subject: 'Physics', chapter: 'Gravitation', page: 2, ans: 0 },
  { q: 7, subject: 'Physics', chapter: 'Surface Tension', page: 3, ans: 0 },
  { q: 8, subject: 'Physics', chapter: 'Thermodynamics', page: 3, ans: 0 },
  { q: 9, subject: 'Physics', chapter: 'Waves & Doppler Effect', page: 3, ans: 0 },
  { q: 10, subject: 'Physics', chapter: 'Electrostatics', page: 3, ans: 0 },
  { q: 11, subject: 'Physics', chapter: 'Current Electricity', page: 3, ans: 0 },
  { q: 12, subject: 'Physics', chapter: 'Moving Charges & Magnetism', page: 3, ans: 0 },
  { q: 13, subject: 'Physics', chapter: 'Electromagnetic Induction', page: 3, ans: 0 },
  { q: 14, subject: 'Physics', chapter: 'Alternating Current', page: 4, ans: 0 },
  { q: 15, subject: 'Physics', chapter: 'Ray Optics', page: 4, ans: 0 },
  { q: 16, subject: 'Physics', chapter: 'Wave Optics', page: 4, ans: 0 },
  { q: 17, subject: 'Physics', chapter: 'Modern Physics', page: 4, ans: 0 },
  { q: 18, subject: 'Physics', chapter: 'Nuclear Physics', page: 4, ans: 0 },
  { q: 19, subject: 'Physics', chapter: 'Semiconductors', page: 4, ans: 0 },
  { q: 20, subject: 'Physics', chapter: 'Electromagnetic Waves', page: 4, ans: 0 },
  // Physics Section B (Numericals: Q21–Q25)
  { q: 21, subject: 'Physics', chapter: 'Capacitors', page: 5, ans: '5' },
  { q: 22, subject: 'Physics', chapter: 'Fluid Mechanics', page: 5, ans: '50' },
  { q: 23, subject: 'Physics', chapter: 'Kinematics', page: 5, ans: '18' },
  { q: 24, subject: 'Physics', chapter: 'Current Electricity', page: 5, ans: '2' },
  { q: 25, subject: 'Physics', chapter: 'Optics', page: 5, ans: '30' },

  // Chemistry Section A (MCQs: Q26–Q45)
  { q: 26, subject: 'Chemistry', chapter: 'Mole Concept', page: 6, ans: 0 },
  { q: 27, subject: 'Chemistry', chapter: 'Atomic Structure', page: 6, ans: 0 },
  { q: 28, subject: 'Chemistry', chapter: 'Chemical Bonding', page: 6, ans: 0 },
  { q: 29, subject: 'Chemistry', chapter: 'Thermodynamics', page: 6, ans: 0 },
  { q: 30, subject: 'Chemistry', chapter: 'Chemical Equilibrium', page: 6, ans: 0 },
  { q: 31, subject: 'Chemistry', chapter: 'Electrochemistry', page: 6, ans: 0 },
  { q: 32, subject: 'Chemistry', chapter: 'Chemical Kinetics', page: 7, ans: 0 },
  { q: 33, subject: 'Chemistry', chapter: 'Solutions', page: 7, ans: 0 },
  { q: 34, subject: 'Chemistry', chapter: 'Coordination Compounds', page: 7, ans: 0 },
  { q: 35, subject: 'Chemistry', chapter: 'd & f Block Elements', page: 7, ans: 0 },
  { q: 36, subject: 'Chemistry', chapter: 'p-Block Elements', page: 7, ans: 0 },
  { q: 37, subject: 'Chemistry', chapter: 'GOC & Resonance', page: 7, ans: 0 },
  { q: 38, subject: 'Chemistry', chapter: 'Isomerism', page: 7, ans: 0 },
  { q: 39, subject: 'Chemistry', chapter: 'Hydrocarbons', page: 8, ans: 0 },
  { q: 40, subject: 'Chemistry', chapter: 'Haloalkanes & Haloarenes', page: 8, ans: 0 },
  { q: 41, subject: 'Chemistry', chapter: 'Alcohols & Phenols', page: 8, ans: 0 },
  { q: 42, subject: 'Chemistry', chapter: 'Aldehydes & Ketones', page: 8, ans: 0 },
  { q: 43, subject: 'Chemistry', chapter: 'Amines', page: 8, ans: 0 },
  { q: 44, subject: 'Chemistry', chapter: 'Biomolecules', page: 8, ans: 0 },
  { q: 45, subject: 'Chemistry', chapter: 'Periodic Properties', page: 8, ans: 0 },
  // Chemistry Section B (Numericals: Q46–Q50)
  { q: 46, subject: 'Chemistry', chapter: 'Mole Concept', page: 9, ans: '75' },
  { q: 47, subject: 'Chemistry', chapter: 'Chemical Equilibrium', page: 9, ans: '8' },
  { q: 48, subject: 'Chemistry', chapter: 'Atomic Structure', page: 9, ans: '16' },
  { q: 49, subject: 'Chemistry', chapter: 'Coordination Compounds', page: 9, ans: '2' },
  { q: 50, subject: 'Chemistry', chapter: 'GOC', page: 9, ans: '3' },

  // Mathematics Section A (MCQs: Q51–Q70)
  { q: 51, subject: 'Mathematics', chapter: 'Quadratic Equations', page: 10, ans: 0 },
  { q: 52, subject: 'Mathematics', chapter: 'Complex Numbers', page: 10, ans: 0 },
  { q: 53, subject: 'Mathematics', chapter: 'Sequences & Series', page: 10, ans: 0 },
  { q: 54, subject: 'Mathematics', chapter: 'Permutations & Combinations', page: 10, ans: 0 },
  { q: 55, subject: 'Mathematics', chapter: 'Binomial Theorem', page: 10, ans: 0 },
  { q: 56, subject: 'Mathematics', chapter: 'Matrices & Determinants', page: 10, ans: 0 },
  { q: 57, subject: 'Mathematics', chapter: 'Probability', page: 10, ans: 0 },
  { q: 58, subject: 'Mathematics', chapter: 'Functions', page: 11, ans: 0 },
  { q: 59, subject: 'Mathematics', chapter: 'Limits', page: 11, ans: 0 },
  { q: 60, subject: 'Mathematics', chapter: 'Differentiation', page: 11, ans: 0 },
  { q: 61, subject: 'Mathematics', chapter: 'Application of Derivatives', page: 11, ans: 0 },
  { q: 62, subject: 'Mathematics', chapter: 'Indefinite Integration', page: 11, ans: 0 },
  { q: 63, subject: 'Mathematics', chapter: 'Definite Integration', page: 11, ans: 0 },
  { q: 64, subject: 'Mathematics', chapter: 'Differential Equations', page: 11, ans: 0 },
  { q: 65, subject: 'Mathematics', chapter: 'Circles', page: 11, ans: 0 },
  { q: 66, subject: 'Mathematics', chapter: 'Parabola', page: 12, ans: 0 },
  { q: 67, subject: 'Mathematics', chapter: 'Vector Algebra', page: 12, ans: 0 },
  { q: 68, subject: 'Mathematics', chapter: '3D Geometry', page: 12, ans: 0 },
  { q: 69, subject: 'Mathematics', chapter: 'Trigonometry', page: 12, ans: 0 },
  { q: 70, subject: 'Mathematics', chapter: 'Statistics', page: 12, ans: 0 },
  // Mathematics Section B (Numericals: Q71–Q75)
  { q: 71, subject: 'Mathematics', chapter: 'Area Under Curves', page: 12, ans: '9' },
  { q: 72, subject: 'Mathematics', chapter: 'Matrices', page: 12, ans: '2' },
  { q: 73, subject: 'Mathematics', chapter: 'Permutations & Combinations', page: 12, ans: '35' },
  { q: 74, subject: 'Mathematics', chapter: 'Straight Lines', page: 13, ans: '8' },
  { q: 75, subject: 'Mathematics', chapter: 'Application of Derivatives', page: 13, ans: '20' },
];

export const FULL_MOCK_TEST_4_QUESTIONS: TestQuestionRecord[] = buildQuestionsFromSpecs({
  testId: FULL_MOCK_TEST_4_ID,
  prefix: 'fmt4',
  assetFolder: 'full-mock-test-4',
  testLabel: 'Full Mock Test 4',
  specs: FULL_MOCK_TEST_4_SPECS,
});

// ============================================================================
// FULL MOCK TEST 5 — JEE Main Full Syllabus (75 Qs · 300 Marks · 180 Min)
// Source: Jee_Main_Mock_Test_05_4cf0fd73.pdf
// ============================================================================
export const FULL_MOCK_TEST_5_RECORD: MockTestRecord = {
  id: FULL_MOCK_TEST_5_ID,
  title: 'Full Mock Test 5',
  slug: 'full-mock-test-5-jee-main-2027',
  seoDescription:
    'Attempt Full Mock Test 5 (JEE Main Full Syllabus Side-by-Side Q&A Edition) for Class 12 JEE & JEE Dropper on PREPSKM.IN — 75 cropped questions (60 MCQs + 15 Numericals), 300 marks, 180 minutes, +4/-1 marking with exact step-by-step cropped solutions.',
  destination: 'cbt-mock',
  cohortId: 'class-12-jee',
  cohortIds: ['class-12-jee', 'jee-dropper'],
  examCategory: 'JEE Main 2027 Full Syllabus (NTA Pattern)',
  examType: 'JEE Main',
  syllabus: [
    {
      subject: 'Physics',
      chapters: [
        'Kinematics, Laws of Motion, WEP, Rotational Motion & Gravitation',
        'Fluid Mechanics, Thermodynamics, SHM & Waves',
        'Electrostatics, Capacitors, Current Electricity, Magnetism, EMI & AC',
        'Ray & Wave Optics, Modern Physics, Atomic, Nuclear, Semiconductors & EM Waves',
      ],
    },
    {
      subject: 'Chemistry',
      chapters: [
        'Mole Concept, Atomic Structure, Chemical Bonding & Solutions',
        'Thermodynamics, Ionic Equilibrium, Electrochemistry & Chemical Kinetics',
        'Coordination Compounds, d & f Block, p-Block & Qualitative Analysis',
        'GOC, Hydrocarbons, Haloalkanes, Alcohols, Carbonyls, Carboxylic Acids, Amines & Biomolecules',
      ],
    },
    {
      subject: 'Mathematics',
      chapters: [
        'Quadratics, Complex Numbers, Sequences, P&C, Binomial, Determinants & Probability',
        'Functions, Limits, Differentiation, AOD & Statistics',
        'Indefinite & Definite Integration & Differential Equations',
        'Straight Lines, Circles, Ellipse, Vectors, 3D Geometry & Trigonometry',
      ],
    },
  ],
  instructions: getDefaultExamInstructions({
    examType: 'JEE Main',
    durationMinutes: 180,
    positiveMarks: 4,
    negativeMarks: 1,
    negativeMarkingEnabled: true,
    totalQuestions: 75,
  }),
  subjectRanges: [
    { subjectName: 'Physics', startQ: 1, endQ: 25 },
    { subjectName: 'Chemistry', startQ: 26, endQ: 50 },
    { subjectName: 'Mathematics', startQ: 51, endQ: 75 },
  ],
  totalQuestions: 75,
  totalMarks: 300,
  durationMinutes: 180,
  positiveMarks: 4,
  negativeMarks: 1,
  negativeMarkingEnabled: true,
  showSolutionsAfterSubmit: true,
  status: 'published',
  createdAtIso: '2026-11-21T08:18:00.000Z',
};

const FULL_MOCK_TEST_5_SPECS: CompactQuestionSpec[] = [
  // Physics Section A (MCQs: Q1–Q20)
  { q: 1, subject: 'Physics', chapter: 'Kinematics', page: 2, ans: 0 },
  { q: 2, subject: 'Physics', chapter: 'Laws of Motion', page: 2, ans: 0 },
  { q: 3, subject: 'Physics', chapter: 'Work, Energy & Power', page: 2, ans: 0 },
  { q: 4, subject: 'Physics', chapter: 'Rotational Motion', page: 2, ans: 0 },
  { q: 5, subject: 'Physics', chapter: 'Gravitation', page: 2, ans: 0 },
  { q: 6, subject: 'Physics', chapter: 'Fluid Mechanics', page: 2, ans: 0 },
  { q: 7, subject: 'Physics', chapter: 'Thermodynamics', page: 2, ans: 0 },
  { q: 8, subject: 'Physics', chapter: 'Waves', page: 3, ans: 0 },
  { q: 9, subject: 'Physics', chapter: 'Electrostatics', page: 3, ans: 0 },
  { q: 10, subject: 'Physics', chapter: 'Current Electricity', page: 3, ans: 0 },
  { q: 11, subject: 'Physics', chapter: 'Capacitors', page: 3, ans: 0 },
  { q: 12, subject: 'Physics', chapter: 'Magnetism', page: 3, ans: 0 },
  { q: 13, subject: 'Physics', chapter: 'Alternating Current', page: 3, ans: 0 },
  { q: 14, subject: 'Physics', chapter: 'Ray Optics', page: 3, ans: 0 },
  { q: 15, subject: 'Physics', chapter: 'Wave Optics', page: 4, ans: 0 },
  { q: 16, subject: 'Physics', chapter: 'Modern Physics', page: 4, ans: 0 },
  { q: 17, subject: 'Physics', chapter: 'Nuclear Physics', page: 4, ans: 0 },
  { q: 18, subject: 'Physics', chapter: 'Semiconductors', page: 4, ans: 0 },
  { q: 19, subject: 'Physics', chapter: 'Electromagnetic Waves', page: 4, ans: 0 },
  { q: 20, subject: 'Physics', chapter: 'SHM & Waves', page: 4, ans: 1 },
  // Physics Section B (Numericals: Q21–Q25)
  { q: 21, subject: 'Physics', chapter: 'Work, Energy & Power', page: 4, ans: '400' },
  { q: 22, subject: 'Physics', chapter: 'Current Electricity', page: 5, ans: '400' },
  { q: 23, subject: 'Physics', chapter: 'Electromagnetic Induction', page: 5, ans: '16' },
  { q: 24, subject: 'Physics', chapter: 'Ray Optics', page: 5, ans: '40' },
  { q: 25, subject: 'Physics', chapter: 'Atomic Physics', page: 5, ans: '4' },

  // Chemistry Section A (MCQs: Q26–Q45)
  { q: 26, subject: 'Chemistry', chapter: 'Mole Concept', page: 6, ans: 0 },
  { q: 27, subject: 'Chemistry', chapter: 'Atomic Structure', page: 6, ans: 0 },
  { q: 28, subject: 'Chemistry', chapter: 'Chemical Bonding', page: 6, ans: 0 },
  { q: 29, subject: 'Chemistry', chapter: 'Thermodynamics', page: 6, ans: 0 },
  { q: 30, subject: 'Chemistry', chapter: 'Ionic Equilibrium', page: 6, ans: 0 },
  { q: 31, subject: 'Chemistry', chapter: 'Electrochemistry', page: 6, ans: 0 },
  { q: 32, subject: 'Chemistry', chapter: 'Chemical Kinetics', page: 7, ans: 0 },
  { q: 33, subject: 'Chemistry', chapter: 'Solutions', page: 7, ans: 0 },
  { q: 34, subject: 'Chemistry', chapter: 'Coordination Compounds', page: 7, ans: 0 },
  { q: 35, subject: 'Chemistry', chapter: 'd & f Block Elements', page: 7, ans: 0 },
  { q: 36, subject: 'Chemistry', chapter: 'p-Block Elements', page: 7, ans: 0 },
  { q: 37, subject: 'Chemistry', chapter: 'GOC & Resonance', page: 7, ans: 0 },
  { q: 38, subject: 'Chemistry', chapter: 'Hydrocarbons', page: 7, ans: 0 },
  { q: 39, subject: 'Chemistry', chapter: 'Haloalkanes', page: 8, ans: 0 },
  { q: 40, subject: 'Chemistry', chapter: 'Alcohols & Phenols', page: 8, ans: 0 },
  { q: 41, subject: 'Chemistry', chapter: 'Aldehydes & Ketones', page: 8, ans: 0 },
  { q: 42, subject: 'Chemistry', chapter: 'Carboxylic Acids', page: 8, ans: 0 },
  { q: 43, subject: 'Chemistry', chapter: 'Amines', page: 8, ans: 0 },
  { q: 44, subject: 'Chemistry', chapter: 'Biomolecules', page: 8, ans: 0 },
  { q: 45, subject: 'Chemistry', chapter: 'Qualitative Analysis', page: 8, ans: 1 },
  // Chemistry Section B (Numericals: Q46–Q50)
  { q: 46, subject: 'Chemistry', chapter: 'Chemical Kinetics', page: 9, ans: '60' },
  { q: 47, subject: 'Chemistry', chapter: 'Ionic Equilibrium', page: 9, ans: '12' },
  { q: 48, subject: 'Chemistry', chapter: 'Atomic Structure', page: 9, ans: '5' },
  { q: 49, subject: 'Chemistry', chapter: 'Mole Concept', page: 9, ans: '36' },
  { q: 50, subject: 'Chemistry', chapter: 'Coordination Compounds', page: 9, ans: '0' },

  // Mathematics Section A (MCQs: Q51–Q70)
  { q: 51, subject: 'Mathematics', chapter: 'Quadratic Equations', page: 10, ans: 0 },
  { q: 52, subject: 'Mathematics', chapter: 'Complex Numbers', page: 10, ans: 0 },
  { q: 53, subject: 'Mathematics', chapter: 'Sequences & Series', page: 10, ans: 0 },
  { q: 54, subject: 'Mathematics', chapter: 'Permutations & Combinations', page: 10, ans: 0 },
  { q: 55, subject: 'Mathematics', chapter: 'Binomial Theorem', page: 10, ans: 0 },
  { q: 56, subject: 'Mathematics', chapter: 'Determinants', page: 10, ans: 0 },
  { q: 57, subject: 'Mathematics', chapter: 'Probability', page: 10, ans: 0 },
  { q: 58, subject: 'Mathematics', chapter: 'Functions', page: 10, ans: 0 },
  { q: 59, subject: 'Mathematics', chapter: 'Limits', page: 11, ans: 0 },
  { q: 60, subject: 'Mathematics', chapter: 'Differentiation', page: 11, ans: 0 },
  { q: 61, subject: 'Mathematics', chapter: 'Application of Derivatives', page: 11, ans: 0 },
  { q: 62, subject: 'Mathematics', chapter: 'Indefinite Integration', page: 11, ans: 0 },
  { q: 63, subject: 'Mathematics', chapter: 'Definite Integration', page: 11, ans: 0 },
  { q: 64, subject: 'Mathematics', chapter: 'Differential Equations', page: 11, ans: 0 },
  { q: 65, subject: 'Mathematics', chapter: 'Straight Lines', page: 11, ans: 0 },
  { q: 66, subject: 'Mathematics', chapter: 'Circles', page: 11, ans: 0 },
  { q: 67, subject: 'Mathematics', chapter: 'Ellipse', page: 11, ans: 0 },
  { q: 68, subject: 'Mathematics', chapter: 'Vector Algebra', page: 12, ans: 0 },
  { q: 69, subject: 'Mathematics', chapter: '3D Geometry', page: 12, ans: 0 },
  { q: 70, subject: 'Mathematics', chapter: 'Trigonometry', page: 12, ans: 0 },
  // Mathematics Section B (Numericals: Q71–Q75)
  { q: 71, subject: 'Mathematics', chapter: 'Statistics', page: 12, ans: '12' },
  { q: 72, subject: 'Mathematics', chapter: 'Trigonometry', page: 12, ans: '1' },
  { q: 73, subject: 'Mathematics', chapter: 'Permutations & Combinations', page: 12, ans: '6' },
  { q: 74, subject: 'Mathematics', chapter: 'Definite Integration', page: 12, ans: '2' },
  { q: 75, subject: 'Mathematics', chapter: '3D Geometry', page: 12, ans: '5' },
];

export const FULL_MOCK_TEST_5_QUESTIONS: TestQuestionRecord[] = buildQuestionsFromSpecs({
  testId: FULL_MOCK_TEST_5_ID,
  prefix: 'fmt5',
  assetFolder: 'full-mock-test-5',
  testLabel: 'Full Mock Test 5',
  specs: FULL_MOCK_TEST_5_SPECS,
});

export const ADDITIONAL_FULL_MOCK_TESTS: MockTestRecord[] = [
  FULL_MOCK_TEST_2_RECORD,
  FULL_MOCK_TEST_3_RECORD,
  FULL_MOCK_TEST_4_RECORD,
  FULL_MOCK_TEST_5_RECORD,
];

export const ADDITIONAL_FULL_MOCK_QUESTIONS: TestQuestionRecord[] = [
  ...FULL_MOCK_TEST_2_QUESTIONS,
  ...FULL_MOCK_TEST_3_QUESTIONS,
  ...FULL_MOCK_TEST_4_QUESTIONS,
  ...FULL_MOCK_TEST_5_QUESTIONS,
];
