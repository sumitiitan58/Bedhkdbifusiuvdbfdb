import type { ManzilLectureItem, PlannerDayTask } from '../types';

/**
 * 78 Manzil One-Shot Lecture Tracker (26 Physics + 26 Chemistry + 26 Mathematics = 78 Chapters)
 * Total JEE Main 300-Mark Weightage Distribution: 100 Physics + 100 Chemistry + 100 Mathematics = 300 Marks
 */
const PHYSICS_CHAPTERS: [string, number, number, 'Easy' | 'Moderate' | 'Tough'][] = [
  ['Units, Dimensions & Error Analysis', 95, 4, 'Easy'],
  ['Kinematics (1D & 2D Motion)', 135, 4, 'Easy'],
  ['Laws of Motion & Friction', 140, 4, 'Moderate'],
  ['Work, Energy & Power', 120, 4, 'Easy'],
  ['Center of Mass & Collisions', 130, 2, 'Moderate'],
  ['Rotational Motion', 180, 4, 'Tough'],
  ['Gravitation', 110, 4, 'Easy'],
  ['Mechanical Properties of Solids', 75, 2, 'Easy'],
  ['Fluid Mechanics', 135, 4, 'Moderate'],
  ['Thermal Properties & Calorimetry', 100, 2, 'Easy'],
  ['Kinetic Theory of Gases & Thermodynamics', 155, 8, 'Easy'],
  ['Oscillations (SHM)', 125, 4, 'Moderate'],
  ['Waves & Sound', 120, 2, 'Moderate'],
  ['Electrostatics & Gauss Law', 175, 4, 'Moderate'],
  ['Capacitance', 115, 4, 'Moderate'],
  ['Current Electricity', 160, 8, 'Easy'],
  ['Moving Charges & Magnetism', 150, 4, 'Moderate'],
  ['Magnetism & Matter', 75, 2, 'Easy'],
  ['Electromagnetic Induction', 130, 4, 'Moderate'],
  ['Alternating Current', 110, 4, 'Easy'],
  ['Electromagnetic Waves', 65, 2, 'Easy'],
  ['Ray Optics & Optical Instruments', 165, 4, 'Moderate'],
  ['Wave Optics (YDSE & Diffraction)', 120, 4, 'Easy'],
  ['Dual Nature of Radiation & Matter', 95, 4, 'Easy'],
  ['Atoms & Nuclei', 115, 4, 'Easy'],
  ['Semiconductor Electronics', 120, 4, 'Easy'],
];

const CHEMISTRY_CHAPTERS: [string, number, number, 'Easy' | 'Moderate' | 'Tough'][] = [
  ['Some Basic Concepts of Chemistry (Mole)', 125, 4, 'Easy'],
  ['Structure of Atom', 145, 4, 'Easy'],
  ['Classification of Elements & Periodicity', 100, 2, 'Easy'],
  ['Chemical Bonding & Molecular Structure', 175, 8, 'Easy'],
  ['Chemical Thermodynamics', 155, 4, 'Moderate'],
  ['Chemical Equilibrium', 110, 2, 'Easy'],
  ['Ionic Equilibrium', 165, 4, 'Tough'],
  ['Redox Reactions', 80, 2, 'Easy'],
  ['Solutions & Colligative Properties', 130, 4, 'Easy'],
  ['Electrochemistry', 155, 4, 'Moderate'],
  ['Chemical Kinetics', 135, 4, 'Easy'],
  ['p-Block Elements (Group 13–18)', 160, 4, 'Moderate'],
  ['d & f-Block Elements', 120, 4, 'Easy'],
  ['Coordination Compounds', 165, 8, 'Easy'],
  ['General Organic Chemistry (GOC)', 185, 8, 'Moderate'],
  ['Isomerism (Structural & Stereo)', 150, 2, 'Moderate'],
  ['Hydrocarbons (Alkanes, Alkenes, Alkynes)', 155, 4, 'Moderate'],
  ['Haloalkanes & Haloarenes', 135, 4, 'Moderate'],
  ['Alcohols, Phenols & Ethers', 145, 4, 'Moderate'],
  ['Aldehydes & Ketones', 160, 4, 'Tough'],
  ['Carboxylic Acids & Derivatives', 110, 2, 'Moderate'],
  ['Amines & Diazonium Salts', 125, 4, 'Easy'],
  ['Biomolecules', 105, 4, 'Easy'],
  ['Practical Organic & Salt Analysis', 115, 2, 'Moderate'],
  ['Purification & Quantitative Analysis', 75, 2, 'Easy'],
  ['Organic Named Reactions Synthesis', 120, 2, 'Moderate'],
];

const MATHS_CHAPTERS: [string, number, number, 'Easy' | 'Moderate' | 'Tough'][] = [
  ['Sets, Relations & Functions', 140, 4, 'Easy'],
  ['Quadratic Equations', 125, 4, 'Easy'],
  ['Complex Numbers', 150, 4, 'Tough'],
  ['Sequences & Series', 135, 4, 'Easy'],
  ['Permutations & Combinations', 155, 4, 'Tough'],
  ['Binomial Theorem', 125, 4, 'Moderate'],
  ['Straight Lines', 135, 4, 'Moderate'],
  ['Circles', 145, 4, 'Moderate'],
  ['Parabola', 130, 2, 'Moderate'],
  ['Ellipse & Hyperbola', 150, 4, 'Tough'],
  ['Trigonometric Ratios & Equations', 120, 2, 'Moderate'],
  ['Inverse Trigonometric Functions', 105, 2, 'Easy'],
  ['Matrices', 120, 4, 'Easy'],
  ['Determinants', 130, 4, 'Easy'],
  ['Limits, Continuity & Differentiability', 165, 4, 'Moderate'],
  ['Method of Differentiation', 110, 2, 'Easy'],
  ['Application of Derivatives (AOD)', 170, 4, 'Tough'],
  ['Indefinite Integration', 155, 2, 'Tough'],
  ['Definite Integration', 165, 8, 'Moderate'],
  ['Area Under Curves', 110, 4, 'Easy'],
  ['Differential Equations', 135, 4, 'Easy'],
  ['Vector Algebra', 145, 4, 'Easy'],
  ['Three-Dimensional Geometry', 175, 8, 'Easy'],
  ['Statistics', 85, 4, 'Easy'],
  ['Probability', 150, 4, 'Moderate'],
  ['Mixed Calculus & Algebra Revision', 120, 2, 'Tough'],
];

export const MANZIL_78_LECTURES: ManzilLectureItem[] = [
  ...PHYSICS_CHAPTERS.map(([chapter, durationMinutes, weightageMarks, difficulty], idx) => ({
    id: `manzil-phy-${idx + 1}`,
    number: idx + 1,
    subject: 'Physics' as const,
    chapter,
    durationMinutes,
    weightageMarks,
    difficulty,
    videoUrl: `https://www.youtube.com/results?search_query=JEE+Manzil+${encodeURIComponent(chapter)}+Physics`,
  })),
  ...CHEMISTRY_CHAPTERS.map(([chapter, durationMinutes, weightageMarks, difficulty], idx) => ({
    id: `manzil-chem-${idx + 1}`,
    number: 27 + idx,
    subject: 'Chemistry' as const,
    chapter,
    durationMinutes,
    weightageMarks,
    difficulty,
    videoUrl: `https://www.youtube.com/results?search_query=JEE+Manzil+${encodeURIComponent(chapter)}+Chemistry`,
  })),
  ...MATHS_CHAPTERS.map(([chapter, durationMinutes, weightageMarks, difficulty], idx) => ({
    id: `manzil-math-${idx + 1}`,
    number: 53 + idx,
    subject: 'Mathematics' as const,
    chapter,
    durationMinutes,
    weightageMarks,
    difficulty,
    videoUrl: `https://www.youtube.com/results?search_query=JEE+Manzil+${encodeURIComponent(chapter)}+Maths`,
  })),
];

/**
 * 60-Day Structured Study Planner covering all high-yield Physics, Chemistry & Mathematics chapters
 * across 3 progressive 20-day phases.
 */
export const PLANNER_60_DAYS: PlannerDayTask[] = Array.from({ length: 60 }, (_, idx) => {
  const day = idx + 1;
  const phase: PlannerDayTask['phase'] =
    day <= 20
      ? 'Phase 1: Foundation & High-Yield'
      : day <= 40
        ? 'Phase 2: Core Mastery'
        : 'Phase 3: Full Revision & CBT';

  if (day <= 26) {
    return {
      day,
      phase,
      physicsTopic: PHYSICS_CHAPTERS[idx][0],
      chemistryTopic: CHEMISTRY_CHAPTERS[idx][0],
      mathsTopic: MATHS_CHAPTERS[idx][0],
      targetHours: day <= 20 ? 6 : 7,
      targetMarksValue:
        PHYSICS_CHAPTERS[idx][2] + CHEMISTRY_CHAPTERS[idx][2] + MATHS_CHAPTERS[idx][2],
    };
  }

  if (day <= 45) {
    const revIdx = (day - 27) % 26;
    return {
      day,
      phase,
      physicsTopic: `PYQ Sprint: ${PHYSICS_CHAPTERS[revIdx][0]}`,
      chemistryTopic: `NCERT & PYQs: ${CHEMISTRY_CHAPTERS[revIdx][0]}`,
      mathsTopic: `DPP Drill: ${MATHS_CHAPTERS[revIdx][0]}`,
      targetHours: 7,
      targetMarksValue: 12,
    };
  }

  const mockNum = day - 45;
  return {
    day,
    phase,
    physicsTopic: `Full CBT Mock #${mockNum} — Physics Error Audit`,
    chemistryTopic: `Full CBT Mock #${mockNum} — NCERT Formula Recall`,
    mathsTopic: `Full CBT Mock #${mockNum} — Timed Problem Review`,
    targetHours: 8,
    targetMarksValue: 16,
  };
});
