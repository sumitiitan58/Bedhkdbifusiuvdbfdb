import type { MockTestRecord, TestQuestionRecord } from '../types';
import { getDefaultExamInstructions } from '../utils/examPresets';
import { renderPhysicsQuestionWithDiagramUrl } from '../utils/physicsDiagramSvgs';
import {
  CH01_UNITS_MEASUREMENTS_QS,
  CH02_MOTION_STRAIGHT_LINE_QS,
  CH03_MOTION_PLANE_QS,
  type RawDppQuestionTuple,
} from './class11PhysicsDppPart1';
import {
  CH04_LAWS_OF_MOTION_QS,
  CH05_WORK_ENERGY_POWER_QS,
  CH06_ROTATIONAL_MOTION_QS,
  CH07_GRAVITATION_QS,
  CH08_SOLIDS_QS,
  CH09_FLUIDS_QS,
  CH10_THERMAL_PROPERTIES_QS,
  CH11_THERMODYNAMICS_QS,
  CH12_KINETIC_THEORY_QS,
  CH13_OSCILLATIONS_QS,
  CH14_WAVES_QS,
} from './class11PhysicsDppPart2';

interface Class11PhysicsChapterDppSpec {
  id: string;
  slug: string;
  chapterNumber: number;
  chapterId: string;
  chapterDisplayName: string;
  title: string;
  seoDescription: string;
  durationMinutes: number;
  preserveOptionOrder?: boolean;
  topics: string[];
  questions: RawDppQuestionTuple[];
}

const CLASS_11_COHORTS = ['class-11-jee', 'class-11-neet', 'jee-dropper', 'neet-dropper'];

const CHAPTER_SPECS: Class11PhysicsChapterDppSpec[] = [
  {
    id: 'dpp-phy11-ch01-units-measurements',
    slug: 'class-11-physics-ch01-units-and-measurements-dpp',
    chapterNumber: 1,
    chapterId: 'chap-jee-phy-01',
    chapterDisplayName: 'Units and Measurements',
    title: 'Ch 01: Units & Measurements — Complete JEE Main DPP (100 Qs)',
    seoDescription:
      'Solve 100 cropped JEE Main Class 11 Physics DPP questions on Units, Dimensional Analysis, Significant Figures, Error Analysis, Vernier Calipers & Screw Gauge with clean image options and step-by-step solutions.',
    durationMinutes: 120,
    preserveOptionOrder: true,
    topics: [
      'SI Units & Non-Standard Systems',
      'Dimensional Formulae & Physical Constants',
      'Principle of Homogeneity & Deducing Relations',
      'Significant Figures & Rounding Off',
      'Error Analysis & Propagation',
      'Vernier Calipers & Micrometer Screw Gauge',
    ],
    questions: CH01_UNITS_MEASUREMENTS_QS,
  },
  {
    id: 'dpp-phy11-ch02-motion-straight-line',
    slug: 'class-11-physics-ch02-motion-in-a-straight-line-dpp',
    chapterNumber: 2,
    chapterId: 'chap-jee-phy-02',
    chapterDisplayName: 'Motion in a Straight Line',
    title: 'Ch 02: Motion in a Straight Line — Chapter DPP (30 Qs)',
    seoDescription:
      'Practice 30 cropped JEE Main Class 11 Physics DPP questions on 1D Kinematics, Calculus Motion, Free Fall, Relative Velocity & Kinematics Graphs (v-t, a-t, x-t, v-x) with step-by-step solutions.',
    durationMinutes: 45,
    topics: [
      'Average Speed & Velocity',
      'Calculus Kinematics (dx/dt, dv/dt)',
      'Uniform Acceleration & Free Fall',
      'v–t, a–t, x–t & v–x Graphs',
      '1D Relative Motion & Pursuit',
    ],
    questions: CH02_MOTION_STRAIGHT_LINE_QS,
  },
  {
    id: 'dpp-phy11-ch03-motion-plane',
    slug: 'class-11-physics-ch03-motion-in-a-plane-dpp',
    chapterNumber: 3,
    chapterId: 'chap-jee-phy-02',
    chapterDisplayName: 'Motion in a Plane',
    title: 'Ch 03: Motion in a Plane — Chapter DPP (30 Qs)',
    seoDescription:
      'Practice 30 cropped JEE Main Class 11 Physics DPP questions on Vector Algebra, Projectile Motion, River-Boat, Rain-Man Relative Velocity & Circular Motion with clean diagrams and solutions.',
    durationMinutes: 45,
    topics: [
      'Vector Addition, Dot & Cross Products',
      'Horizontal & Oblique Projectile Motion',
      'River-Boat & Rain-Man Relative Motion',
      'Uniform & Non-Uniform Circular Motion',
    ],
    questions: CH03_MOTION_PLANE_QS,
  },
  {
    id: 'dpp-phy11-ch04-laws-of-motion',
    slug: 'class-11-physics-ch04-laws-of-motion-dpp',
    chapterNumber: 4,
    chapterId: 'chap-jee-phy-03',
    chapterDisplayName: 'Laws of Motion',
    title: 'Ch 04: Laws of Motion — Chapter DPP (30 Qs)',
    seoDescription:
      'Solve 30 cropped JEE Main Class 11 Physics DPP questions on Newton’s Laws, Atwood Pulley Systems, Inclined Planes, Friction, Pseudo Forces & Banking of Roads.',
    durationMinutes: 45,
    topics: [
      'Free Body Diagrams & Connected Blocks',
      'Atwood Pulley & String Constraints',
      'Static & Kinetic Friction, Two-Block Problems',
      'Pseudo Force, Conical Pendulum & Banked Roads',
    ],
    questions: CH04_LAWS_OF_MOTION_QS,
  },
  {
    id: 'dpp-phy11-ch05-work-energy-power',
    slug: 'class-11-physics-ch05-work-energy-and-power-dpp',
    chapterNumber: 5,
    chapterId: 'chap-jee-phy-04',
    chapterDisplayName: 'Work, Energy and Power',
    title: 'Ch 05: Work, Energy & Power — Chapter DPP (25 Qs)',
    seoDescription:
      'Practice 25 cropped JEE Main Class 11 Physics DPP questions on Variable Force F-x Graphs, Work-Energy Theorem, Springs, Conservative Fields, Vertical Circular Motion & Collisions.',
    durationMinutes: 40,
    topics: [
      'Work by Constant & Variable Forces (F–x Graph)',
      'Work-Energy Theorem & Spring Energy',
      'Conservative Forces & Potential Energy Curves',
      'Vertical Circular Motion, Power & Collisions',
    ],
    questions: CH05_WORK_ENERGY_POWER_QS,
  },
  {
    id: 'dpp-phy11-ch06-rotational-motion',
    slug: 'class-11-physics-ch06-rotational-motion-dpp',
    chapterNumber: 6,
    chapterId: 'chap-jee-phy-06',
    chapterDisplayName: 'System of Particles & Rotational Motion',
    title: 'Ch 06: Rotational Motion — Chapter DPP (20 Qs)',
    seoDescription:
      'Solve 20 cropped JEE Main Class 11 Physics DPP questions on Centre of Mass, Moment of Inertia, Parallel/Perpendicular Axis Theorems, Torque, Hinged Rod & Pure Rolling.',
    durationMinutes: 35,
    topics: [
      'Centre of Mass & Cavity Problems',
      'Moment of Inertia & Axis Theorems',
      'Torque, Hinged Rod & Angular Momentum',
      'Pure Rolling & Rolling Kinetic Energy',
    ],
    questions: CH06_ROTATIONAL_MOTION_QS,
  },
  {
    id: 'dpp-phy11-ch07-gravitation',
    slug: 'class-11-physics-ch07-gravitation-dpp',
    chapterNumber: 7,
    chapterId: 'chap-jee-phy-07',
    chapterDisplayName: 'Gravitation',
    title: 'Ch 07: Gravitation — Chapter DPP (14 Qs)',
    seoDescription:
      'Practice 14 cropped JEE Main Class 11 Physics DPP questions on Variation of g, Gravitational Potential, Escape Velocity, Orbital Satellites & Kepler’s Laws.',
    durationMinutes: 25,
    topics: [
      'Variation of g with Altitude & Depth',
      'Gravitational Field & Shell Potential',
      'Escape Velocity & Orbital Satellites',
      'Kepler’s Laws & Binding Energy',
    ],
    questions: CH07_GRAVITATION_QS,
  },
  {
    id: 'dpp-phy11-ch08-solids',
    slug: 'class-11-physics-ch08-mechanical-properties-of-solids-dpp',
    chapterNumber: 8,
    chapterId: 'chap-jee-phy-08',
    chapterDisplayName: 'Mechanical Properties of Solids',
    title: 'Ch 08: Mechanical Properties of Solids — Chapter DPP (14 Qs)',
    seoDescription:
      'Solve 14 cropped JEE Main Class 11 Physics DPP questions on Young’s Modulus, Bulk & Shear Moduli, Elastic Energy Density, Thermal Stress & Poisson’s Ratio.',
    durationMinutes: 25,
    topics: [
      'Hooke’s Law & Young’s Modulus',
      'Bulk & Shear Moduli, Elastic Relations',
      'Elastic Energy Density & Self-Weight Elongation',
      'Thermal Stress & Breaking Length',
    ],
    questions: CH08_SOLIDS_QS,
  },
  {
    id: 'dpp-phy11-ch09-fluids',
    slug: 'class-11-physics-ch09-mechanical-properties-of-fluids-dpp',
    chapterNumber: 9,
    chapterId: 'chap-jee-phy-09',
    chapterDisplayName: 'Mechanical Properties of Fluids',
    title: 'Ch 09: Mechanical Properties of Fluids — Chapter DPP (14 Qs)',
    seoDescription:
      'Practice 14 cropped JEE Main Class 11 Physics DPP questions on Hydrostatics, Buoyancy, Bernoulli’s Equation, Torricelli Efflux, Viscosity & Surface Tension.',
    durationMinutes: 25,
    topics: [
      'Hydrostatics, Hydraulic Lift & Buoyancy',
      'Continuity, Bernoulli & Torricelli Efflux',
      'Stokes’ Viscosity & Terminal Velocity',
      'Surface Tension, Bubbles & Capillarity',
    ],
    questions: CH09_FLUIDS_QS,
  },
  {
    id: 'dpp-phy11-ch10-thermal-properties',
    slug: 'class-11-physics-ch10-thermal-properties-of-matter-dpp',
    chapterNumber: 10,
    chapterId: 'chap-jee-phy-10',
    chapterDisplayName: 'Thermal Properties of Matter',
    title: 'Ch 10: Thermal Properties of Matter — Chapter DPP (14 Qs)',
    seoDescription:
      'Solve 14 cropped JEE Main Class 11 Physics DPP questions on Thermal Expansion, Calorimetry Mixtures, Conduction, Stefan-Boltzmann, Wien’s Law & Newton Cooling.',
    durationMinutes: 25,
    topics: [
      'Thermometry & Thermal Expansion',
      'Calorimetry & Phase-Change Mixtures',
      'Heat Conduction & Series Thermal Resistance',
      'Stefan-Boltzmann, Wien & Newton Cooling Laws',
    ],
    questions: CH10_THERMAL_PROPERTIES_QS,
  },
  {
    id: 'dpp-phy11-ch11-thermodynamics',
    slug: 'class-11-physics-ch11-thermodynamics-dpp',
    chapterNumber: 11,
    chapterId: 'chap-jee-phy-11',
    chapterDisplayName: 'Thermodynamics',
    title: 'Ch 11: Thermodynamics — Chapter DPP (14 Qs)',
    seoDescription:
      'Practice 14 cropped JEE Main Class 11 Physics DPP questions on First Law, P-V Cyclic Processes, Isothermal/Adiabatic/Polytropic Work & Carnot Engines.',
    durationMinutes: 25,
    topics: [
      'First Law & P–V Cyclic Diagrams',
      'Isothermal, Adiabatic & Polytropic Processes',
      'Mayer’s Relation & Molar Heat Capacities',
      'Carnot Engine Efficiency & Refrigerator COP',
    ],
    questions: CH11_THERMODYNAMICS_QS,
  },
  {
    id: 'dpp-phy11-ch12-kinetic-theory',
    slug: 'class-11-physics-ch12-kinetic-theory-dpp',
    chapterNumber: 12,
    chapterId: 'chap-jee-phy-11',
    chapterDisplayName: 'Kinetic Theory of Gases',
    title: 'Ch 12: Kinetic Theory of Gases — Chapter DPP (14 Qs)',
    seoDescription:
      'Solve 14 cropped JEE Main Class 11 Physics DPP questions on RMS/Average/Most Probable Speeds, Equipartition of Energy, Degrees of Freedom, Gas Mixtures & Mean Free Path.',
    durationMinutes: 25,
    topics: [
      'Ideal Gas Pressure & Kinetic Energy Density',
      'v_rms, v_avg & v_mp Speed Distributions',
      'Degrees of Freedom & Adiabatic Index of Mixtures',
      'Mean Free Path & Equipartition',
    ],
    questions: CH12_KINETIC_THEORY_QS,
  },
  {
    id: 'dpp-phy11-ch13-oscillations',
    slug: 'class-11-physics-ch13-oscillations-shm-dpp',
    chapterNumber: 13,
    chapterId: 'chap-jee-phy-12',
    chapterDisplayName: 'Oscillations (SHM)',
    title: 'Ch 13: Oscillations (SHM) — Chapter DPP (14 Qs)',
    seoDescription:
      'Practice 14 cropped JEE Main Class 11 Physics DPP questions on SHM Kinematics, Phase, Spring Combinations, Simple & Physical Pendulums, Energy & Superposition.',
    durationMinutes: 25,
    topics: [
      'SHM Kinematics, Phase & Phasors',
      'Series & Parallel Spring-Block Systems',
      'Simple, Seconds & Physical Pendulums',
      'SHM Energy Distribution & Superposition',
    ],
    questions: CH13_OSCILLATIONS_QS,
  },
  {
    id: 'dpp-phy11-ch14-waves',
    slug: 'class-11-physics-ch14-waves-and-sound-dpp',
    chapterNumber: 14,
    chapterId: 'chap-jee-phy-13',
    chapterDisplayName: 'Waves & Sound',
    title: 'Ch 14: Waves & Sound — Chapter DPP (14 Qs)',
    seoDescription:
      'Solve 14 cropped JEE Main Class 11 Physics DPP questions on Progressive Waves, String Speed, Standing Wave Harmonics, Organ Pipes, Beats & Doppler Effect.',
    durationMinutes: 25,
    topics: [
      'Progressive Wave Equations & Phase Difference',
      'Transverse Waves on Strings & Speed of Sound',
      'Standing Waves, Harmonics & Organ Pipes',
      'Beats, Resonance Tube & Doppler Effect',
    ],
    questions: CH14_WAVES_QS,
  },
];

/**
 * Deterministically rotates MCQ options for chapters where raw source options
 * place the answer at index 0, ensuring realistic A/B/C/D answer distribution
 * while keeping option text values strictly clean and unaltered.
 */
function distributeMcqOptions(
  opts: [string, string, string, string],
  ans: 0 | 1 | 2 | 3,
  seed: number,
  preserveOrder: boolean
): { optionTexts: [string, string, string, string]; correctIndex: number } {
  if (preserveOrder) {
    return { optionTexts: [...opts] as [string, string, string, string], correctIndex: ans };
  }
  const shift = seed % 4;
  const rotated: [string, string, string, string] = [
    opts[(0 - shift + 4) % 4],
    opts[(1 - shift + 4) % 4],
    opts[(2 - shift + 4) % 4],
    opts[(3 - shift + 4) % 4],
  ];
  const correctIndex = (ans + shift) % 4;
  return { optionTexts: rotated, correctIndex };
}

export const CLASS_11_PHYSICS_DPP_TESTS: MockTestRecord[] = CHAPTER_SPECS.map((spec) => {
  const totalQuestions = spec.questions.length;
  return {
    id: spec.id,
    title: spec.title,
    slug: spec.slug,
    seoDescription: spec.seoDescription,
    destination: 'dpp',
    cohortId: 'class-11-jee',
    cohortIds: CLASS_11_COHORTS,
    subjectId: 'subj-physics',
    chapterId: spec.chapterId,
    examCategory: 'Chapter-Wise DPP (Class 11 Physics)',
    examType: 'JEE Main',
    syllabus: [{ subject: 'Physics', chapters: spec.topics }],
    instructions: getDefaultExamInstructions({
      examType: 'JEE Main',
      durationMinutes: spec.durationMinutes,
      positiveMarks: 4,
      negativeMarks: 1,
      negativeMarkingEnabled: true,
      totalQuestions,
    }),
    subjectRanges: [{ subjectName: 'Physics', startQ: 1, endQ: totalQuestions }],
    totalQuestions,
    totalMarks: totalQuestions * 4,
    durationMinutes: spec.durationMinutes,
    positiveMarks: 4,
    negativeMarks: 1,
    negativeMarkingEnabled: true,
    showSolutionsAfterSubmit: true,
    status: 'published',
    createdAtIso: `2026-11-25T${String(8 + Math.floor(spec.chapterNumber / 2)).padStart(2, '0')}:${String((spec.chapterNumber % 2) * 30).padStart(2, '0')}:00.000Z`,
  };
});

export const CLASS_11_PHYSICS_DPP_QUESTIONS: TestQuestionRecord[] = CHAPTER_SPECS.flatMap(
  (spec) => {
    const chTag = String(spec.chapterNumber).padStart(2, '0');
    return spec.questions.map((raw, idx) => {
      const qNum = idx + 1;
      const qTag = String(qNum).padStart(3, '0');
      const chapterLabel = `${spec.chapterDisplayName} — ${raw.topic}`;
      const questionImageUrl = raw.diagram
        ? renderPhysicsQuestionWithDiagramUrl({
            questionNumber: qNum,
            subjectName: 'Physics',
            chapterName: chapterLabel,
            questionText: raw.q,
            diagramKey: raw.diagram,
          })
        : undefined;

      if (raw.type === 'integer') {
        return {
          id: `q-phy11-ch${chTag}-${qTag}`,
          testId: spec.id,
          questionNumber: qNum,
          subjectName: 'Physics',
          chapterName: chapterLabel,
          questionType: 'integer' as const,
          questionText: raw.q,
          ...(questionImageUrl ? { questionImageUrl } : {}),
          numericalAnswer: raw.ans,
          solutionText: raw.sol,
          sourcePageNumber: Math.ceil(qNum / 5),
          positiveMarks: 4,
          negativeMarks: 0,
          testStatus: 'published' as const,
        };
      }

      const { optionTexts, correctIndex } = distributeMcqOptions(
        raw.opts,
        raw.ans,
        spec.chapterNumber * 7 + qNum,
        Boolean(spec.preserveOptionOrder)
      );

      return {
        id: `q-phy11-ch${chTag}-${qTag}`,
        testId: spec.id,
        questionNumber: qNum,
        subjectName: 'Physics',
        chapterName: chapterLabel,
        questionType: 'single-mcq' as const,
        questionText: raw.q,
        ...(questionImageUrl ? { questionImageUrl } : {}),
        optionTexts,
        correctOptionIndices: [correctIndex],
        solutionText: raw.sol,
        sourcePageNumber: Math.ceil(qNum / 5),
        positiveMarks: 4,
        negativeMarks: 1,
        testStatus: 'published' as const,
      };
    });
  }
);
