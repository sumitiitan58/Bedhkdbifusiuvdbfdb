import type { MockTestRecord, TestQuestionRecord } from '../types';
import { getDefaultExamInstructions } from '../utils/examPresets';

const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;

type DppQuestionSpec = {
  q: number;
  page: number;
  topic: string;
  type: 'single-mcq' | 'multi-mcq' | 'integer';
  correctOptionIndices?: number[];
  numericalAnswer?: string;
  positiveMarks: number;
  negativeMarks: number;
};

export const DPP_UNITS_DIMENSIONS_75_RECORD: MockTestRecord = {
  id: "dpp-phy-units-dimensions-75",
  title: 'Units & Dimensions — 75 Quality Questions (JEE Main & Advanced DPP)',
  slug: "units-and-dimensions-jee-main-advanced-dpp-75-questions",
  seoDescription: 'Practice 75 high-yield JEE Main & Advanced Physics DPP questions on Units, Dimensions, Significant Figures, Error Analysis, Vernier Calipers & Screw Gauge for Class 11 JEE and JEE Dropper on PREPSKM.IN with instant CBT scoring and step-by-step solutions.',
  destination: 'dpp',
  cohortId: 'class-11-jee',
  cohortIds: ['class-11-jee', 'jee-dropper'],
  subjectId: 'subj-physics',
  chapterId: 'chap-jee-phy-01',
  examCategory: 'Chapter-Wise DPP (JEE Main & Advanced)',
  examType: 'JEE Main',
  syllabus: [
    {
      subject: 'Physics',
      chapters: [
        'Units & Fundamental Quantities',
        'Dimensional Formulae & Physical Constants',
        'Principle of Homogeneity & Transcendental Functions',
        'Deducing Relations & Non-Standard Fundamental Systems',
        'Significant Figures & Rounding Off',
        'Error Analysis & Propagation',
        'Measuring Instruments (Vernier Calipers & Screw Gauge)',
      ],
    },
  ],
  instructions: getDefaultExamInstructions({
    examType: 'JEE Main',
    durationMinutes: 120,
    positiveMarks: 4,
    negativeMarks: 1,
    negativeMarkingEnabled: true,
    totalQuestions: 75,
  }),
  subjectRanges: [{ subjectName: 'Physics', startQ: 1, endQ: 75 }],
  totalQuestions: 75,
  totalMarks: 300,
  durationMinutes: 120,
  positiveMarks: 4,
  negativeMarks: 1,
  negativeMarkingEnabled: true,
  showSolutionsAfterSubmit: true,
  status: 'published',
  createdAtIso: '2026-11-21T23:30:00.000Z',
};

const DPP_UNITS_DIMENSIONS_SPECS: DppQuestionSpec[] = [
  { q: 1, page: 1, topic: "Derived SI Units", type: "single-mcq", correctOptionIndices: [1], positiveMarks: 4, negativeMarks: 1 },
  { q: 2, page: 1, topic: "Astronomical Units", type: "single-mcq", correctOptionIndices: [0], positiveMarks: 4, negativeMarks: 1 },
  { q: 3, page: 1, topic: "Unit Conversion", type: "single-mcq", correctOptionIndices: [0], positiveMarks: 4, negativeMarks: 1 },
  { q: 4, page: 1, topic: "New System of Units", type: "single-mcq", correctOptionIndices: [1], positiveMarks: 4, negativeMarks: 1 },
  { q: 5, page: 2, topic: "Nuclear & Microscopic Units", type: "single-mcq", correctOptionIndices: [0], positiveMarks: 4, negativeMarks: 1 },
  { q: 6, page: 2, topic: "Fundamental vs Derived", type: "multi-mcq", correctOptionIndices: [1, 2, 3], positiveMarks: 4, negativeMarks: 2 },
  { q: 7, page: 2, topic: "Angle & Solid Angle", type: "single-mcq", correctOptionIndices: [2], positiveMarks: 4, negativeMarks: 1 },
  { q: 8, page: 2, topic: "Unit Conversion (Power)", type: "integer", numericalAnswer: "10", positiveMarks: 4, negativeMarks: 0 },
  { q: 9, page: 2, topic: "Parallax & Parsec", type: "single-mcq", correctOptionIndices: [1], positiveMarks: 4, negativeMarks: 1 },
  { q: 10, page: 3, topic: "Non-Standard Base Units", type: "single-mcq", correctOptionIndices: [0], positiveMarks: 4, negativeMarks: 1 },
  { q: 11, page: 3, topic: "Thermal Conductivity", type: "single-mcq", correctOptionIndices: [0], positiveMarks: 4, negativeMarks: 1 },
  { q: 12, page: 3, topic: "Stefan-Boltzmann Constant", type: "single-mcq", correctOptionIndices: [0], positiveMarks: 4, negativeMarks: 1 },
  { q: 13, page: 3, topic: "Permittivity & Permeability", type: "single-mcq", correctOptionIndices: [1], positiveMarks: 4, negativeMarks: 1 },
  { q: 14, page: 3, topic: "EM Time Constants", type: "single-mcq", correctOptionIndices: [3], positiveMarks: 4, negativeMarks: 1 },
  { q: 15, page: 4, topic: "Electromagnetic Energy Density", type: "single-mcq", correctOptionIndices: [0], positiveMarks: 4, negativeMarks: 1 },
  { q: 16, page: 4, topic: "Planck Scale Combinations", type: "single-mcq", correctOptionIndices: [0], positiveMarks: 4, negativeMarks: 1 },
  { q: 17, page: 4, topic: "Viscosity & Reynolds Number", type: "single-mcq", correctOptionIndices: [0], positiveMarks: 4, negativeMarks: 1 },
  { q: 18, page: 4, topic: "Electric Flux & Capacitance", type: "single-mcq", correctOptionIndices: [1], positiveMarks: 4, negativeMarks: 1 },
  { q: 19, page: 4, topic: "Solar Constant & Intensity", type: "single-mcq", correctOptionIndices: [0], positiveMarks: 4, negativeMarks: 1 },
  { q: 20, page: 5, topic: "Fine Structure Constant", type: "single-mcq", correctOptionIndices: [0], positiveMarks: 4, negativeMarks: 1 },
  { q: 21, page: 5, topic: "Magnetic Pole Strength & Moment", type: "single-mcq", correctOptionIndices: [0], positiveMarks: 4, negativeMarks: 1 },
  { q: 22, page: 5, topic: "Matrix Match (Dimensions)", type: "single-mcq", correctOptionIndices: [0], positiveMarks: 4, negativeMarks: 1 },
  { q: 23, page: 5, topic: "Bohr Magneton & Constants", type: "integer", numericalAnswer: "3", positiveMarks: 4, negativeMarks: 0 },
  { q: 24, page: 5, topic: "Self-Inductance & Flux", type: "multi-mcq", correctOptionIndices: [0, 1, 2, 3], positiveMarks: 4, negativeMarks: 2 },
  { q: 25, page: 6, topic: "Van der Waals Equation", type: "single-mcq", correctOptionIndices: [1], positiveMarks: 4, negativeMarks: 1 },
  { q: 26, page: 6, topic: "Exponential Argument", type: "single-mcq", correctOptionIndices: [0], positiveMarks: 4, negativeMarks: 1 },
  { q: 27, page: 6, topic: "Trigonometric Function", type: "single-mcq", correctOptionIndices: [0], positiveMarks: 4, negativeMarks: 1 },
  { q: 28, page: 6, topic: "Logarithmic Function", type: "single-mcq", correctOptionIndices: [0], positiveMarks: 4, negativeMarks: 1 },
  { q: 29, page: 6, topic: "Damped Oscillation", type: "single-mcq", correctOptionIndices: [0], positiveMarks: 4, negativeMarks: 1 },
  { q: 30, page: 7, topic: "Integral Homogeneity", type: "single-mcq", correctOptionIndices: [2], positiveMarks: 4, negativeMarks: 1 },
  { q: 31, page: 7, topic: "Boltzmann Factor", type: "single-mcq", correctOptionIndices: [0], positiveMarks: 4, negativeMarks: 1 },
  { q: 32, page: 7, topic: "Empirical Potential", type: "single-mcq", correctOptionIndices: [0], positiveMarks: 4, negativeMarks: 1 },
  { q: 33, page: 7, topic: "Dimensional Validity Check", type: "multi-mcq", correctOptionIndices: [0, 3], positiveMarks: 4, negativeMarks: 2 },
  { q: 34, page: 7, topic: "Exponential Decay & Power", type: "integer", numericalAnswer: "2", positiveMarks: 4, negativeMarks: 0 },
  { q: 35, page: 8, topic: "Polynomial Velocity", type: "single-mcq", correctOptionIndices: [0], positiveMarks: 4, negativeMarks: 1 },
  { q: 36, page: 8, topic: "Thermodynamic Ratio", type: "single-mcq", correctOptionIndices: [0], positiveMarks: 4, negativeMarks: 1 },
  { q: 37, page: 8, topic: "New Base: E, V, T", type: "single-mcq", correctOptionIndices: [0], positiveMarks: 4, negativeMarks: 1 },
  { q: 38, page: 8, topic: "New Base: F, v, T", type: "single-mcq", correctOptionIndices: [3], positiveMarks: 4, negativeMarks: 1 },
  { q: 39, page: 8, topic: "Oscillating Liquid Drop", type: "single-mcq", correctOptionIndices: [0], positiveMarks: 4, negativeMarks: 1 },
  { q: 40, page: 9, topic: "Poiseuille's Formula", type: "single-mcq", correctOptionIndices: [0], positiveMarks: 4, negativeMarks: 1 },
  { q: 41, page: 9, topic: "Blast Wave Radius (Taylor)", type: "single-mcq", correctOptionIndices: [0], positiveMarks: 4, negativeMarks: 1 },
  { q: 42, page: 9, topic: "New Base: P, ρ, v", type: "single-mcq", correctOptionIndices: [1], positiveMarks: 4, negativeMarks: 1 },
  { q: 43, page: 9, topic: "New Base: G, e, c, h", type: "single-mcq", correctOptionIndices: [0], positiveMarks: 4, negativeMarks: 1 },
  { q: 44, page: 10, topic: "Limitations of Dimensional Analysis", type: "multi-mcq", correctOptionIndices: [0, 1, 2, 3], positiveMarks: 4, negativeMarks: 2 },
  { q: 45, page: 10, topic: "New Base: h, c, G (Length)", type: "single-mcq", correctOptionIndices: [0], positiveMarks: 4, negativeMarks: 1 },
  { q: 46, page: 10, topic: "Reynolds / Terminal Velocity", type: "single-mcq", correctOptionIndices: [0], positiveMarks: 4, negativeMarks: 1 },
  { q: 47, page: 10, topic: "New Base: Momentum, Area, Time", type: "integer", numericalAnswer: "2", positiveMarks: 4, negativeMarks: 0 },
  { q: 48, page: 10, topic: "Electric Field in New Units", type: "single-mcq", correctOptionIndices: [0], positiveMarks: 4, negativeMarks: 1 },
  { q: 49, page: 11, topic: "Counting Significant Figures", type: "single-mcq", correctOptionIndices: [0], positiveMarks: 4, negativeMarks: 1 },
  { q: 50, page: 11, topic: "Addition & Subtraction Rules", type: "single-mcq", correctOptionIndices: [0], positiveMarks: 4, negativeMarks: 1 },
  { q: 51, page: 11, topic: "Multiplication & Division Rules", type: "single-mcq", correctOptionIndices: [2], positiveMarks: 4, negativeMarks: 1 },
  { q: 52, page: 11, topic: "Rounding Off (5-Rule)", type: "single-mcq", correctOptionIndices: [1], positiveMarks: 4, negativeMarks: 1 },
  { q: 53, page: 11, topic: "Combined Operations SF", type: "single-mcq", correctOptionIndices: [1], positiveMarks: 4, negativeMarks: 1 },
  { q: 54, page: 12, topic: "Trailing Zeros Ambiguity", type: "integer", numericalAnswer: "7", positiveMarks: 4, negativeMarks: 0 },
  { q: 55, page: 12, topic: "Power-Law Percentage Error", type: "single-mcq", correctOptionIndices: [0], positiveMarks: 4, negativeMarks: 1 },
  { q: 56, page: 12, topic: "Parallel Resistors Error", type: "single-mcq", correctOptionIndices: [0], positiveMarks: 4, negativeMarks: 1 },
  { q: 57, page: 12, topic: "Simple Pendulum (g)", type: "single-mcq", correctOptionIndices: [0], positiveMarks: 4, negativeMarks: 1 },
  { q: 58, page: 12, topic: "Mean & Mean Absolute Error", type: "single-mcq", correctOptionIndices: [0], positiveMarks: 4, negativeMarks: 1 },
  { q: 59, page: 13, topic: "Differential Calculus Error", type: "single-mcq", correctOptionIndices: [0], positiveMarks: 4, negativeMarks: 1 },
  { q: 60, page: 13, topic: "Searle's Method (Young's Modulus)", type: "single-mcq", correctOptionIndices: [0], positiveMarks: 4, negativeMarks: 1 },
  { q: 61, page: 13, topic: "Resonance Tube Experiment", type: "single-mcq", correctOptionIndices: [0], positiveMarks: 4, negativeMarks: 1 },
  { q: 62, page: 13, topic: "Error in Density of Sphere", type: "integer", numericalAnswer: "5", positiveMarks: 4, negativeMarks: 0 },
  { q: 63, page: 13, topic: "Ohm's Law & Power Dissipation", type: "single-mcq", correctOptionIndices: [0], positiveMarks: 4, negativeMarks: 1 },
  { q: 64, page: 14, topic: "Correlated Error Trap", type: "single-mcq", correctOptionIndices: [0], positiveMarks: 4, negativeMarks: 1 },
  { q: 65, page: 14, topic: "Meter Bridge Error", type: "single-mcq", correctOptionIndices: [0], positiveMarks: 4, negativeMarks: 1 },
  { q: 66, page: 14, topic: "Random vs Systematic Error", type: "multi-mcq", correctOptionIndices: [0, 1, 3], positiveMarks: 4, negativeMarks: 2 },
  { q: 67, page: 14, topic: "Vernier Calipers Least Count", type: "single-mcq", correctOptionIndices: [0], positiveMarks: 4, negativeMarks: 1 },
  { q: 68, page: 15, topic: "Vernier Negative Zero Error", type: "single-mcq", correctOptionIndices: [0], positiveMarks: 4, negativeMarks: 1 },
  { q: 69, page: 15, topic: "Non-Standard Vernier (N+1)", type: "single-mcq", correctOptionIndices: [0], positiveMarks: 4, negativeMarks: 1 },
  { q: 70, page: 15, topic: "Reversed / Extended Vernier", type: "single-mcq", correctOptionIndices: [0], positiveMarks: 4, negativeMarks: 1 },
  { q: 71, page: 15, topic: "Screw Gauge Pitch & LC", type: "single-mcq", correctOptionIndices: [0], positiveMarks: 4, negativeMarks: 1 },
  { q: 72, page: 16, topic: "Screw Gauge Positive Zero Error", type: "single-mcq", correctOptionIndices: [0], positiveMarks: 4, negativeMarks: 1 },
  { q: 73, page: 16, topic: "Screw Gauge Negative Zero Error", type: "integer", numericalAnswer: "3.50", positiveMarks: 4, negativeMarks: 0 },
  { q: 74, page: 16, topic: "Multiple-Rotation Pitch", type: "single-mcq", correctOptionIndices: [0], positiveMarks: 4, negativeMarks: 1 },
  { q: 75, page: 16, topic: "Vernier + Error Synthesis", type: "single-mcq", correctOptionIndices: [0], positiveMarks: 4, negativeMarks: 1 },
];

export const DPP_UNITS_DIMENSIONS_75_QUESTIONS: TestQuestionRecord[] = DPP_UNITS_DIMENSIONS_SPECS.map((spec) => {
  const num = String(spec.q).padStart(2, '0');
  const chapterLabel = `Units & Dimensions — ${spec.topic}`;
  const answerSummary =
    spec.type === 'integer'
      ? `Correct Answer: ${spec.numericalAnswer}`
      : `Correct Option: (${(spec.correctOptionIndices ?? []).map((i) => OPTION_LETTERS[i]).join(', ')})`;
  return {
    id: `q-dpp-ud75-${num}`,
    testId: "dpp-phy-units-dimensions-75",
    questionNumber: spec.q,
    subjectName: 'Physics',
    chapterName: chapterLabel,
    questionType: spec.type,
    questionText: `Units & Dimensions DPP · Q${spec.q} (${spec.topic}). Refer to the cropped question image.`,
    questionImageUrl: `/assets/mocks/dpp-phy-units-dimensions-75/q${num}.png`,
    ...(spec.type === 'integer'
      ? { numericalAnswer: spec.numericalAnswer }
      : { optionTexts: ['Option A', 'Option B', 'Option C', 'Option D'], correctOptionIndices: spec.correctOptionIndices }),
    solutionText: `${answerSummary}. Refer to the step-by-step cropped solution for ${spec.topic}.`,
    solutionImageUrl: `/assets/mocks/dpp-phy-units-dimensions-75/s${num}.png`,
    sourcePageNumber: spec.page,
    positiveMarks: spec.positiveMarks,
    negativeMarks: spec.negativeMarks,
    testStatus: 'published',
  };
});
