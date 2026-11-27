import type { MockTestRecord, StudentCohortId, TestQuestionRecord } from '../types';
import { getDefaultExamInstructions } from './examPresets';

export type CustomMockCount = 10 | 25 | 45 | 75 | 180;
export type DifficultyMix = 'balanced' | 'high-yield' | 'challenge';

export interface BalancedMockRequest {
  questionCount: CustomMockCount;
  examType: 'JEE Main' | 'NEET UG';
  subjects: string[];
  chapters?: string[];
  difficultyMix?: DifficultyMix;
  aiBalanced?: boolean;
  weakChapters?: string[];
}

export interface BalancedMockSummary {
  test: MockTestRecord;
  questions: TestQuestionRecord[];
  subjectBreakdown: Array<{ subject: string; count: number }>;
}

export interface GenerateDppRequest {
  subjectName: string;
  chapterName: string;
  cohortId: StudentCohortId;
  questionCount: 10 | 15 | 20 | 25;
  difficulty: 'Concept Builder' | 'JEE/NEET Mains' | 'Advanced Tough';
  includeNumerical: boolean;
  subjectId?: string;
  chapterId?: string;
}

export interface GeneratedDppBundle {
  test: MockTestRecord;
  questions: TestQuestionRecord[];
}

export const GENERATED_DPPS_STORAGE_KEY = 'prepskm2_generated_dpps_v1';

/**
 * Computes balanced per-subject question counts summing cleanly to `totalCount`.
 * Example: 10Q across [Physics, Chemistry, Mathematics] => 4, 3, 3; 45Q => 15, 15, 15.
 */
export function computeBalancedSubjectQuota(
  totalCount: number,
  subjects: string[]
): Array<{ subject: string; count: number }> {
  const unique = Array.from(new Set(subjects.filter(Boolean)));
  const active = unique.length > 0 ? unique : ['Physics', 'Chemistry', 'Mathematics'];
  const base = Math.floor(totalCount / active.length);
  const remainder = totalCount % active.length;
  return active.map((subject, idx) => ({
    subject,
    count: base + (idx < remainder ? 1 : 0),
  }));
}

interface ChapterTemplate {
  questionText: string;
  options: [string, string, string, string];
  correctIdx: 0 | 1 | 2 | 3;
  solutionText: string;
  numericalAnswer?: string;
}

interface ChapterSpecificPool {
  subject: 'Physics' | 'Chemistry' | 'Mathematics' | 'Biology';
  keywords: string[];
  templates: ChapterTemplate[];
}

/**
 * Chapter-locked question pools so custom mocks and DPPs strictly match the selected
 * subject AND chapter without cross-topic or cross-subject leakage.
 */
const CHAPTER_LOCKED_POOLS: ChapterSpecificPool[] = [
  {
    subject: 'Physics',
    keywords: ['kinematics', 'motion in a straight line', 'motion in a plane', 'projectile'],
    templates: [
      {
        questionText:
          'A particle starts from rest under constant acceleration $a$. What is the ratio of the distance covered in the 2nd second to the distance covered in the 1st second?',
        options: ['3 : 1', '2 : 1', '4 : 1', '1 : 2'],
        correctIdx: 0,
        solutionText:
          'Using $S_n = u + \\frac{a}{2}(2n - 1)$ with $u = 0$: $S_2 / S_1 = (2\\cdot 2 - 1)/(2\\cdot 1 - 1) = 3 : 1$.',
        numericalAnswer: '3',
      },
      {
        questionText:
          'A projectile is launched from horizontal ground with speed $u$ at angle $45^\\circ$. The ratio of its horizontal range $R$ to maximum height $H$ is:',
        options: ['4 : 1', '2 : 1', '1 : 1', '√2 : 1'],
        correctIdx: 0,
        solutionText:
          '$R = \\frac{u^2 \\sin 2\\theta}{g} = \\frac{u^2}{g}$ and $H = \\frac{u^2 \\sin^2\\theta}{2g} = \\frac{u^2}{4g}$, giving $R/H = 4$.',
        numericalAnswer: '4',
      },
      {
        questionText:
          'The position of a particle moving along the x-axis varies with time as $x(t) = 3t^2 - 6t + 4$ (in meters). At what time $t$ is its instantaneous velocity zero?',
        options: ['1 s', '2 s', '0.5 s', '3 s'],
        correctIdx: 0,
        solutionText:
          '$v = \\frac{dx}{dt} = 6t - 6 = 0 \\implies t = 1\\text{ s}$.',
        numericalAnswer: '1',
      },
    ],
  },
  {
    subject: 'Physics',
    keywords: ['units', 'dimensions', 'measurement', 'error'],
    templates: [
      {
        questionText:
          'Which pair of physical quantities possesses identical SI dimensions?',
        options: [
          'Torque and Work ($ML^2T^{-2}$)',
          'Impulse and Force ($MLT^{-2}$)',
          'Pressure and Surface Tension',
          'Angular momentum and Linear momentum',
        ],
        correctIdx: 0,
        solutionText:
          'Both Torque ($\\vec{r}\\times\\vec{F}$) and Work ($\\vec{F}\\cdot\\vec{s}$) have dimensions $[ML^2T^{-2}]$.',
        numericalAnswer: '2',
      },
      {
        questionText:
          'If the percentage error in measuring the radius of a sphere is $2\\%$, the maximum percentage error in calculating its volume $V = \\frac{4}{3}\\pi r^3$ is:',
        options: ['6%', '2%', '4%', '8%'],
        correctIdx: 0,
        solutionText:
          '$\\frac{\\Delta V}{V} \\times 100\\% = 3 \\left(\\frac{\\Delta r}{r}\\times 100\\%\\right) = 3 \\times 2\\% = 6\\%$.',
        numericalAnswer: '6',
      },
      {
        questionText:
          'The dimensional formula of Planck’s constant $h$ (from $E = h\\nu$) matches that of:',
        options: ['Angular momentum', 'Linear momentum', 'Torque', 'Power'],
        correctIdx: 0,
        solutionText:
          '$[h] = [E/\\nu] = [ML^2T^{-2}]/[T^{-1}] = [ML^2T^{-1}]$, which is identical to angular momentum $mvr$.',
        numericalAnswer: '1',
      },
    ],
  },
  {
    subject: 'Physics',
    keywords: ['laws of motion', 'newton', 'friction', 'dynamics'],
    templates: [
      {
        questionText:
          'Two blocks of masses $2\\text{ kg}$ and $3\\text{ kg}$ are connected by a light string on a smooth horizontal table and pulled by $20\\text{ N}$ on the $3\\text{ kg}$ block. The tension in the connecting string is:',
        options: ['8 N', '12 N', '10 N', '20 N'],
        correctIdx: 0,
        solutionText:
          'Common acceleration $a = \\frac{20}{2+3} = 4\\text{ m/s}^2$. Tension pulls the $2\\text{ kg}$ block: $T = 2 \\times 4 = 8\\text{ N}$.',
        numericalAnswer: '8',
      },
      {
        questionText:
          'A block of mass $5\\text{ kg}$ rests on a rough horizontal floor ($\\mu_s = 0.4$, $g = 10\\text{ m/s}^2$). If a horizontal force of $12\\text{ N}$ is applied, the static friction acting on the block is:',
        options: ['12 N', '20 N', '8 N', '0 N'],
        correctIdx: 0,
        solutionText:
          'Limiting static friction $f_{\\max} = \\mu_s mg = 0.4 \\times 5 \\times 10 = 20\\text{ N}$. Since applied force $12\\text{ N} < 20\\text{ N}$, friction self-adjusts to $12\\text{ N}$.',
        numericalAnswer: '12',
      },
    ],
  },
  {
    subject: 'Physics',
    keywords: ['work', 'energy', 'power'],
    templates: [
      {
        questionText:
          'If the linear momentum $p$ of a moving body is increased by $100\\%$, its kinetic energy $K = p^2/(2m)$ increases by:',
        options: ['300%', '100%', '200%', '400%'],
        correctIdx: 0,
        solutionText:
          'New momentum $p\' = 2p \\implies K\' = (2p)^2/(2m) = 4K$. Percentage increase $= \\frac{4K - K}{K}\\times 100\\% = 300\\%$.',
        numericalAnswer: '300',
      },
      {
        questionText:
          'A spring of stiffness $k = 200\\text{ N/m}$ is stretched from $x = 0$ to $x = 0.1\\text{ m}$. The elastic potential energy stored in the spring is:',
        options: ['1 J', '2 J', '0.5 J', '10 J'],
        correctIdx: 0,
        solutionText:
          '$U = \\frac{1}{2}kx^2 = \\frac{1}{2}(200)(0.1)^2 = 1\\text{ J}$.',
        numericalAnswer: '1',
      },
    ],
  },
  {
    subject: 'Physics',
    keywords: ['rotational', 'torque', 'moment of inertia', 'angular'],
    templates: [
      {
        questionText:
          'A uniform solid sphere of mass $M$ and radius $R$ rolls without slipping with linear speed $v$. What fraction of its total kinetic energy is rotational?',
        options: ['2 / 7', '2 / 5', '5 / 7', '1 / 3'],
        correctIdx: 0,
        solutionText:
          'For a solid sphere $I = \\frac{2}{5}MR^2$. $K_{\\text{rot}}/K_{\\text{tot}} = \\frac{2/5}{1 + 2/5} = \\frac{2}{7}$.',
        numericalAnswer: '7',
      },
      {
        questionText:
          'By the parallel axis theorem, the moment of inertia of a uniform thin rod (mass $M$, length $L$) about an axis perpendicular to the rod passing through one end is:',
        options: ['ML² / 3', 'ML² / 12', 'ML² / 2', 'ML² / 4'],
        correctIdx: 0,
        solutionText:
          '$I = I_{\\text{cm}} + M(L/2)^2 = \\frac{ML^2}{12} + \\frac{ML^2}{4} = \\frac{ML^2}{3}$.',
        numericalAnswer: '3',
      },
    ],
  },
  {
    subject: 'Physics',
    keywords: ['electrostatics', 'gauss', 'electric field', 'capacitor', 'potential'],
    templates: [
      {
        questionText:
          'A point charge $q$ is placed at the center of a cube of side $a$. By Gauss’s Law, the electric flux passing through any one face of the cube is:',
        options: ['q / (6ε₀)', 'q / ε₀', 'q / (4ε₀)', 'q / (2ε₀)'],
        correctIdx: 0,
        solutionText:
          'Total flux through all 6 symmetric faces is $q/\\varepsilon_0$, so flux through one face is $q/(6\\varepsilon_0)$.',
        numericalAnswer: '6',
      },
      {
        questionText:
          'Three identical capacitors each of capacitance $C = 6\\,\\mu\\text{F}$ are connected in series. The equivalent capacitance of the combination is:',
        options: ['2 μF', '18 μF', '3 μF', '6 μF'],
        correctIdx: 0,
        solutionText:
          'For $n$ identical capacitors in series, $C_{\\text{eq}} = C/n = 6/3 = 2\\,\\mu\\text{F}$.',
        numericalAnswer: '2',
      },
    ],
  },
  {
    subject: 'Physics',
    keywords: ['current', 'electricity', 'circuit', 'resistor', 'kirchhoff'],
    templates: [
      {
        questionText:
          'Two identical resistors $R = 12\\,\\Omega$ are first connected in series and then in parallel across the same battery $V$. The ratio of power dissipated $P_{\\text{parallel}} / P_{\\text{series}}$ is:',
        options: ['4 : 1', '2 : 1', '1 : 4', '1 : 2'],
        correctIdx: 0,
        solutionText:
          '$R_s = 2R$ and $R_p = R/2$. Since $P = V^2/R_{\\text{eq}}$, $P_p / P_s = R_s / R_p = 4 : 1$.',
        numericalAnswer: '4',
      },
      {
        questionText:
          'A cylindrical metallic wire of resistance $4\\,\\Omega$ is stretched uniformly to double its original length at constant volume. Its new resistance is:',
        options: ['16 Ω', '8 Ω', '2 Ω', '4 Ω'],
        correctIdx: 0,
        solutionText:
          'At constant volume $R \\propto L^2$. Doubling length multiplies resistance by $2^2 = 4$, giving $16\\,\\Omega$.',
        numericalAnswer: '16',
      },
    ],
  },
  {
    subject: 'Physics',
    keywords: ['optics', 'lens', 'mirror', 'refraction', 'prism'],
    templates: [
      {
        questionText:
          'A convex lens of focal length $20\\text{ cm}$ forms a real image of the same size as the object. The distance between the object and its real image is:',
        options: ['80 cm', '40 cm', '20 cm', '60 cm'],
        correctIdx: 0,
        solutionText:
          'Same-size real image forms when $u = -2f = -40\\text{ cm}$ and $v = +2f = +40\\text{ cm}$; total separation $= 4f = 80\\text{ cm}$.',
        numericalAnswer: '80',
      },
      {
        questionText:
          'When a light ray travels from a denser medium ($n_1 = 2$) into air ($n_2 = 1$), the critical angle for total internal reflection is:',
        options: ['30°', '45°', '60°', '90°'],
        correctIdx: 0,
        solutionText:
          '$\\sin i_c = \\frac{n_2}{n_1} = \\frac{1}{2} \\implies i_c = 30^\\circ$.',
        numericalAnswer: '30',
      },
    ],
  },
  {
    subject: 'Physics',
    keywords: ['shm', 'oscillation', 'wave', 'pendulum', 'sound'],
    templates: [
      {
        questionText:
          'A spring-block oscillator has time period $T = 2\\pi\\sqrt{m/k}$. If the mass $m$ becomes $4m$ while $k$ stays unchanged, the new time period is:',
        options: ['2T', '4T', 'T / 2', '√2 T'],
        correctIdx: 0,
        solutionText:
          'Since $T \\propto \\sqrt{m}$, quadrupling mass multiplies time period by $\\sqrt{4} = 2$.',
        numericalAnswer: '2',
      },
      {
        questionText:
          'In simple harmonic motion of amplitude $A$, at what displacement $x$ from the mean position is kinetic energy equal to potential energy?',
        options: ['A / √2', 'A / 2', 'A / 4', '√3 A / 2'],
        correctIdx: 0,
        solutionText:
          '$\\frac{1}{2}k(A^2 - x^2) = \\frac{1}{2}kx^2 \\implies 2x^2 = A^2 \\implies x = A/\\sqrt{2}$.',
        numericalAnswer: '2',
      },
    ],
  },
  {
    subject: 'Chemistry',
    keywords: ['thermodynamics', 'enthalpy', 'entropy', 'gibbs'],
    templates: [
      {
        questionText:
          'Under constant temperature $T$ and pressure $P$, which thermodynamic criterion strictly guarantees reaction spontaneity?',
        options: [
          '$\\Delta G = \\Delta H - T\\Delta S < 0$',
          '$\\Delta H > 0$ alone guarantees spontaneity',
          '$\\Delta S_{\\text{system}} < 0$ is always spontaneous',
          '$\\Delta G = 0$ indicates an irreversible reaction',
        ],
        correctIdx: 0,
        solutionText:
          'At constant $T$ and $P$, Gibbs free energy change $\\Delta G = \\Delta H - T\\Delta S$ must be negative for a spontaneous process.',
        numericalAnswer: '0',
      },
      {
        questionText:
          'For an ideal gas undergoing a reversible isothermal expansion from volume $V_1$ to $V_2$, the internal energy change $\\Delta U$ equals:',
        options: ['0', 'nRT ln(V₂/V₁)', '-nRT ln(V₂/V₁)', 'nC_v ΔT > 0'],
        correctIdx: 0,
        solutionText:
          'Internal energy $U$ of an ideal gas depends solely on temperature; for an isothermal process $\\Delta T = 0 \\implies \\Delta U = 0$.',
        numericalAnswer: '0',
      },
    ],
  },
  {
    subject: 'Chemistry',
    keywords: ['kinetics', 'rate', 'order', 'half-life', 'arrhenius'],
    templates: [
      {
        questionText:
          'A first-order chemical reaction completes $75\\%$ in $40\\text{ min}$. What is its half-life $t_{1/2}$?',
        options: ['20 min', '10 min', '30 min', '15 min'],
        correctIdx: 0,
        solutionText:
          'For first-order kinetics, $75\\%$ completion takes $2\\,t_{1/2}$. Thus $t_{1/2} = 40 / 2 = 20\\text{ min}$.',
        numericalAnswer: '20',
      },
      {
        questionText:
          'For a zero-order reaction, how does the half-life $t_{1/2}$ depend on the initial reactant concentration $[A]_0$?',
        options: [
          'Directly proportional to $[A]_0$',
          'Independent of $[A]_0$',
          'Inversely proportional to $[A]_0$',
          'Proportional to $[A]_0^2$',
        ],
        correctIdx: 0,
        solutionText:
          'For a zero-order reaction, $t_{1/2} = \\frac{[A]_0}{2k}$, so it is directly proportional to $[A]_0$.',
        numericalAnswer: '1',
      },
    ],
  },
  {
    subject: 'Chemistry',
    keywords: ['equilibrium', 'ph', 'buffer', 'le chatelier', 'ionic'],
    templates: [
      {
        questionText:
          'In a reversible reaction at constant temperature, if the reaction quotient $Q_c < K_c$, the system shifts spontaneously in which direction?',
        options: [
          'Forward direction (toward products)',
          'Backward direction (toward reactants)',
          'Remains strictly static',
          'Equilibrium constant $K_c$ decreases',
        ],
        correctIdx: 0,
        solutionText:
          'When $Q_c < K_c$, product ratio is below equilibrium value, so net reaction proceeds forward until $Q_c = K_c$.',
        numericalAnswer: '1',
      },
      {
        questionText:
          'What is the pH of a $10^{-3}\\text{ M}$ aqueous solution of $HCl$ at $298\\text{ K}$?',
        options: ['3', '11', '1', '7'],
        correctIdx: 0,
        solutionText:
          'Strong acid $HCl$ dissociates completely: $[H^+] = 10^{-3}\\text{ M} \\implies \\text{pH} = -\\log_{10}(10^{-3}) = 3$.',
        numericalAnswer: '3',
      },
    ],
  },
  {
    subject: 'Chemistry',
    keywords: ['bonding', 'vsepr', 'hybridization', 'molecular orbital', 'dipole'],
    templates: [
      {
        questionText:
          'According to VSEPR theory, what is the molecular geometry of $SF_4$ (4 bond pairs and 1 lone pair on central sulfur)?',
        options: ['See-saw', 'Tetrahedral', 'Square planar', 'Trigonal pyramidal'],
        correctIdx: 0,
        solutionText:
          'Five electron domains ($sp^3d$) with 1 equatorial lone pair produce a see-saw molecular geometry.',
        numericalAnswer: '4',
      },
      {
        questionText:
          'According to Molecular Orbital Theory, the bond order and magnetic nature of the $O_2$ molecule are:',
        options: [
          'Bond order 2, paramagnetic',
          'Bond order 2, diamagnetic',
          'Bond order 2.5, paramagnetic',
          'Bond order 1.5, diamagnetic',
        ],
        correctIdx: 0,
        solutionText:
          '$O_2$ has bond order $\\frac{10-6}{2} = 2$ and two unpaired electrons in degenerate $\\pi^*2p$ orbitals, making it paramagnetic.',
        numericalAnswer: '2',
      },
    ],
  },
  {
    subject: 'Chemistry',
    keywords: ['organic', 'goc', 'hydrocarbon', 'aldehyde', 'alcohol', 'haloalkane', 'amine'],
    templates: [
      {
        questionText:
          'Which carbocation intermediate is most stabilized by hyperconjugation and $+I$ inductive effect?',
        options: [
          'Tertiary $(CH_3)_3C^+$ (9 α-H)',
          'Secondary $(CH_3)_2CH^+$ (6 α-H)',
          'Primary $CH_3CH_2^+$ (3 α-H)',
          'Methyl $CH_3^+$ (0 α-H)',
        ],
        correctIdx: 0,
        solutionText:
          'Greater number of $\\alpha$-hydrogens provides stronger hyperconjugative delocalization: $3^\\circ > 2^\\circ > 1^\\circ > \\text{methyl}$.',
        numericalAnswer: '9',
      },
      {
        questionText:
          'In an $S_N2$ nucleophilic substitution reaction with a chiral alkyl halide substrate, the stereochemical outcome is:',
        options: [
          'Complete Walden inversion of configuration',
          '100% retention of configuration',
          'Racemic 50:50 mixture via carbocation',
          'Elimination to an alkene exclusively',
        ],
        correctIdx: 0,
        solutionText:
          '$S_N2$ proceeds via a single concerted backside attack transition state, causing inversion of stereochemical configuration.',
        numericalAnswer: '2',
      },
    ],
  },
  {
    subject: 'Chemistry',
    keywords: ['mole', 'stoichiometry', 'atomic', 'solution', 'molarity'],
    templates: [
      {
        questionText:
          'How many moles of $O_2$ are required for complete combustion of $2\\text{ mol}$ of methane ($CH_4 + 2O_2 \\to CO_2 + 2H_2O$)?',
        options: ['4 mol', '2 mol', '1 mol', '6 mol'],
        correctIdx: 0,
        solutionText:
          '1 mol $CH_4$ reacts with 2 mol $O_2$, so 2 mol $CH_4$ requires $2 \\times 2 = 4\\text{ mol}$ of $O_2$.',
        numericalAnswer: '4',
      },
    ],
  },
  {
    subject: 'Mathematics',
    keywords: ['quadratic', 'algebra', 'equation', 'complex'],
    templates: [
      {
        questionText:
          'If $\\alpha$ and $\\beta$ are the roots of $x^2 - 7x + 12 = 0$, then the value of $\\alpha^2 + \\beta^2$ is:',
        options: ['25', '49', '13', '37'],
        correctIdx: 0,
        solutionText:
          '$\\alpha + \\beta = 7$ and $\\alpha\\beta = 12$. Hence $\\alpha^2 + \\beta^2 = (\\alpha + \\beta)^2 - 2\\alpha\\beta = 49 - 24 = 25$.',
        numericalAnswer: '25',
      },
    ],
  },
  {
    subject: 'Mathematics',
    keywords: ['integration', 'integral', 'definite', 'area'],
    templates: [
      {
        questionText:
          'Evaluate the definite integral $I = \\int_0^{\\pi/2} \\frac{\\cos x}{\\sin x + \\cos x}\\,dx$:',
        options: ['π / 4', 'π / 2', '1', '0'],
        correctIdx: 0,
        solutionText:
          'Using King’s property $x \\mapsto \\pi/2 - x$, $2I = \\int_0^{\\pi/2} 1\\,dx = \\pi/2 \\implies I = \\pi/4$.',
        numericalAnswer: '4',
      },
    ],
  },
  {
    subject: 'Mathematics',
    keywords: ['derivative', 'differentiation', 'calculus', 'maxima', 'minima', 'limit'],
    templates: [
      {
        questionText:
          'For $f(x) = x^3 - 3x^2 + 4$, the local minimum value of $f(x)$ occurs at $x = 2$ and equals:',
        options: ['0', '4', '-2', '2'],
        correctIdx: 0,
        solutionText:
          '$f\'(x) = 3x(x - 2) = 0$ at $x = 0, 2$; $f\'\'(2) = 6 > 0$ (local min), and $f(2) = 8 - 12 + 4 = 0$.',
        numericalAnswer: '0',
      },
    ],
  },
  {
    subject: 'Mathematics',
    keywords: ['permutation', 'combination', 'probability', 'binomial'],
    templates: [
      {
        questionText:
          'In how many ways can a committee of 3 students be selected from 6 distinct candidates?',
        options: ['20', '15', '18', '120'],
        correctIdx: 0,
        solutionText:
          '$\\binom{6}{3} = \\frac{6 \\times 5 \\times 4}{3 \\times 2 \\times 1} = 20$.',
        numericalAnswer: '20',
      },
    ],
  },
  {
    subject: 'Mathematics',
    keywords: ['line', 'circle', 'conic', 'coordinate', 'vector', '3d'],
    templates: [
      {
        questionText:
          'What is the shortest perpendicular distance from the origin $(0,0)$ to the straight line $3x + 4y - 15 = 0$?',
        options: ['3 units', '5 units', '15 units', '4 units'],
        correctIdx: 0,
        solutionText:
          '$d = \\frac{|3(0) + 4(0) - 15|}{\\sqrt{3^2 + 4^2}} = \\frac{15}{5} = 3\\text{ units}$.',
        numericalAnswer: '3',
      },
    ],
  },
  {
    subject: 'Biology',
    keywords: ['cell', 'cycle', 'division', 'mitosis', 'meiosis'],
    templates: [
      {
        questionText:
          'Which pair of cell organelles is semi-autonomous and possesses its own circular DNA and 70S ribosomes?',
        options: ['Mitochondria & Chloroplast', 'Golgi Apparatus & ER', 'Lysosome & Vacuole', 'Peroxisome & Ribosome'],
        correctIdx: 0,
        solutionText:
          'Both mitochondria and chloroplasts possess circular DNA and 70S prokaryotic-type ribosomes.',
        numericalAnswer: '70',
      },
      {
        questionText:
          'During meiotic cell division, crossing over between non-sister chromatids of homologous chromosomes occurs in:',
        options: ['Pachytene of Prophase I', 'Zygotene of Prophase I', 'Metaphase II', 'Anaphase I'],
        correctIdx: 0,
        solutionText:
          'Recombination nodules appear and recombinase mediates crossing over during Pachytene of Prophase I.',
        numericalAnswer: '1',
      },
    ],
  },
  {
    subject: 'Biology',
    keywords: ['genetics', 'inheritance', 'molecular', 'dna', 'rna', 'biotech'],
    templates: [
      {
        questionText:
          'Which enzyme catalyzes RNA synthesis from a DNA template strand during transcription?',
        options: ['DNA-dependent RNA polymerase', 'RNA-dependent DNA polymerase', 'DNA ligase', 'Topoisomerase'],
        correctIdx: 0,
        solutionText:
          'DNA-dependent RNA polymerase polymerizes nucleotides strictly in the $5\' \\to 3\'$ direction along the $3\' \\to 5\'$ template strand.',
        numericalAnswer: '5',
      },
      {
        questionText:
          'What is the classic Mendelian dihybrid phenotypic ratio in the $F_2$ generation under independent assortment?',
        options: ['9 : 3 : 3 : 1', '3 : 1', '1 : 2 : 1', '1 : 1 : 1 : 1'],
        correctIdx: 0,
        solutionText:
          'Independent assortment of two heterozygous traits yields the $9 : 3 : 3 : 1$ phenotypic ratio.',
        numericalAnswer: '9',
      },
    ],
  },
  {
    subject: 'Biology',
    keywords: ['photosynthesis', 'plant', 'respiration', 'calvin'],
    templates: [
      {
        questionText:
          'How many ATP and NADPH molecules are consumed in the Calvin Cycle to fix 1 molecule of $CO_2$?',
        options: ['3 ATP and 2 NADPH', '2 ATP and 3 NADPH', '18 ATP and 12 NADPH', '1 ATP and 1 NADPH'],
        correctIdx: 0,
        solutionText:
          'Fixing 1 $CO_2$ requires 3 ATP and 2 NADPH (so 1 glucose = 6 $CO_2$ takes 18 ATP and 12 NADPH).',
        numericalAnswer: '3',
      },
    ],
  },
  {
    subject: 'Biology',
    keywords: ['human', 'physiology', 'breathing', 'circulation', 'neural', 'endocrine', 'excretion'],
    templates: [
      {
        questionText:
          'In human respiratory physiology, which combination of factors in active tissues shifts the oxygen-haemoglobin dissociation curve to the right (Bohr effect)?',
        options: [
          'High pCO₂, high H⁺ concentration, and higher temperature',
          'Low pCO₂, low H⁺ concentration, and lower temperature',
          'High pO₂ and alkaline blood pH',
          'Low temperature and low 2,3-BPG levels',
        ],
        correctIdx: 0,
        solutionText:
          'Elevated $pCO_2$, increased $H^+$ (lower pH), and higher temperature promote $O_2$ dissociation from oxyhaemoglobin in tissues.',
        numericalAnswer: '1',
      },
    ],
  },
];

const SUBJECT_FALLBACK_TEMPLATES: Record<string, ChapterTemplate[]> = {
  Physics: CHAPTER_LOCKED_POOLS.filter((p) => p.subject === 'Physics').flatMap((p) => p.templates),
  Chemistry: CHAPTER_LOCKED_POOLS.filter((p) => p.subject === 'Chemistry').flatMap((p) => p.templates),
  Mathematics: CHAPTER_LOCKED_POOLS.filter((p) => p.subject === 'Mathematics').flatMap((p) => p.templates),
  Biology: CHAPTER_LOCKED_POOLS.filter((p) => p.subject === 'Biology').flatMap((p) => p.templates),
};

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Deterministically shuffles MCQ optionTexts (and optionImageUrls if present) using Fisher-Yates
 * and remaps correctOptionIndices so correct answers distribute evenly across A, B, C, and D
 * instead of defaulting to Option A (index 0).
 */
export function shuffleQuestionOptions(
  question: TestQuestionRecord,
  seedInput: string | number
): TestQuestionRecord {
  if (
    question.questionType === 'integer' ||
    !Array.isArray(question.optionTexts) ||
    question.optionTexts.length < 2
  ) {
    return question;
  }

  const n = question.optionTexts.length;
  const order = Array.from({ length: n }, (_, i) => i);
  let state = hashSeed(`${seedInput}:${question.id}:${question.questionNumber}`);

  for (let i = n - 1; i > 0; i -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const j = state % (i + 1);
    const tmp = order[i];
    order[i] = order[j];
    order[j] = tmp;
  }

  const nextOptionTexts = order.map((oldIdx) => question.optionTexts![oldIdx]);
  const nextOptionImages =
    Array.isArray(question.optionImageUrls) && question.optionImageUrls.length === n
      ? order.map((oldIdx) => question.optionImageUrls![oldIdx])
      : question.optionImageUrls;

  const oldCorrectSet = new Set(question.correctOptionIndices ?? [0]);
  const nextCorrectIndices: number[] = [];
  order.forEach((oldIdx, newIdx) => {
    if (oldCorrectSet.has(oldIdx)) {
      nextCorrectIndices.push(newIdx);
    }
  });

  return {
    ...question,
    optionTexts: nextOptionTexts,
    optionImageUrls: nextOptionImages,
    correctOptionIndices: nextCorrectIndices.length > 0 ? nextCorrectIndices : [0],
  };
}

function stripSyntheticQuestionPrefixes(text: string): string {
  return text
    .replace(/^\s*\[(?:Custom Mock|AI Balanced|Concept Builder|JEE\/NEET Mains|Advanced Tough)\]\s*/gi, '')
    .trim();
}

function selectTemplatesForSubjectAndChapter(
  subjectName: string,
  chapterName: string
): ChapterTemplate[] {
  const normalizedSubj = subjectName.trim().toLowerCase();
  const normalizedChap = chapterName.trim().toLowerCase();

  if (normalizedChap) {
    const matchedPools = CHAPTER_LOCKED_POOLS.filter(
      (pool) =>
        pool.subject.toLowerCase() === normalizedSubj &&
        pool.keywords.some((kw) => normalizedChap.includes(kw))
    );
    if (matchedPools.length > 0) {
      return matchedPools.flatMap((p) => p.templates);
    }
  }

  return SUBJECT_FALLBACK_TEMPLATES[subjectName] ?? SUBJECT_FALLBACK_TEMPLATES.Physics;
}

function chapterMatchesSelection(
  questionChapter: string | undefined,
  selectedChapters: string[]
): boolean {
  if (selectedChapters.length === 0) return true;
  if (!questionChapter) return false;
  const qLower = questionChapter.toLowerCase();
  return selectedChapters.some((sel) => {
    const sLower = sel.toLowerCase().trim();
    if (!sLower) return false;
    if (qLower === sLower || qLower.includes(sLower) || sLower.includes(qLower)) {
      return true;
    }
    const primaryToken = sLower.split(/[\s,&-]+/).find((tok) => tok.length >= 4);
    return Boolean(primaryToken && qLower.includes(primaryToken));
  });
}

function synthesizeQuestionForSubject(
  subjectName: string,
  chapterName: string,
  templateIndex: number,
  questionNumber: number,
  testId: string,
  asNumerical: boolean
): TestQuestionRecord {
  const bank = selectTemplatesForSubjectAndChapter(subjectName, chapterName);
  const tpl = bank[templateIndex % bank.length];
  const cleanChapter = chapterName.trim() || `${subjectName} Core Concepts`;
  const prompt = stripSyntheticQuestionPrefixes(tpl.questionText.replace(/\{chapter\}/g, cleanChapter));

  const baseQuestion: TestQuestionRecord = {
    id: `${testId}-gen-q-${questionNumber}`,
    testId,
    questionNumber,
    subjectName,
    chapterName: cleanChapter,
    questionType: asNumerical ? 'integer' : 'single-mcq',
    questionText: prompt,
    optionTexts: asNumerical ? [] : [...tpl.options],
    correctOptionIndices: asNumerical ? undefined : [tpl.correctIdx],
    numericalAnswer: asNumerical ? tpl.numericalAnswer ?? '4' : undefined,
    solutionText: tpl.solutionText,
    positiveMarks: 4,
    negativeMarks: asNumerical ? 0 : 1,
    testStatus: 'published',
  };

  return shuffleQuestionOptions(baseQuestion, `${testId}-${questionNumber}-${templateIndex}`);
}

/**
 * Builds a balanced Custom Mock Test (10, 25, 45, 75, or 180 Qs) across selected subjects,
 * strictly enforcing subject & chapter matching, clean unprefixed stems, and randomized A/B/C/D options.
 */
export function buildBalancedCustomMock(
  request: BalancedMockRequest,
  allBankQuestions: TestQuestionRecord[]
): BalancedMockSummary {
  const quotas = computeBalancedSubjectQuota(request.questionCount, request.subjects);
  const weakSet = new Set((request.weakChapters ?? []).map((c) => c.toLowerCase()));
  const selectedChapters = (request.chapters ?? []).map((c) => c.trim()).filter(Boolean);
  const testId = `custom-${request.aiBalanced ? 'ai-balanced' : 'manual'}-${request.questionCount}q-${Date.now()}`;

  const builtQuestions: TestQuestionRecord[] = [];
  const durationMinutes =
    request.questionCount === 10
      ? 20
      : request.questionCount === 25
        ? 50
        : request.questionCount === 45
          ? 90
          : request.questionCount === 75
            ? 180
            : 200;

  let qNum = 1;
  for (const { subject, count } of quotas) {
    let subPool = allBankQuestions.filter((q) => {
      if (q.subjectName.toLowerCase() !== subject.toLowerCase()) return false;
      if (selectedChapters.length > 0 && !chapterMatchesSelection(q.chapterName, selectedChapters)) {
        return false;
      }
      return true;
    });

    if (request.aiBalanced && weakSet.size > 0) {
      subPool = [...subPool].sort((a, b) => {
        const aWeak = a.chapterName && weakSet.has(a.chapterName.toLowerCase()) ? 0 : 1;
        const bWeak = b.chapterName && weakSet.has(b.chapterName.toLowerCase()) ? 0 : 1;
        return aWeak - bWeak;
      });
    }

    const natQuota = request.examType === 'JEE Main' && count >= 10 ? Math.max(1, Math.floor(count * 0.2)) : 0;

    for (let i = 0; i < count; i += 1) {
      const wantNat = natQuota > 0 && i >= count - natQuota;
      const base = subPool[i];
      if (base) {
        const cleanedBase: TestQuestionRecord = {
          ...base,
          id: `${testId}-q-${qNum}-${base.id}`,
          testId,
          questionNumber: qNum,
          subjectName: subject,
          questionText: stripSyntheticQuestionPrefixes(base.questionText ?? ''),
          questionType: wantNat ? 'integer' : base.questionType,
          numericalAnswer: wantNat ? base.numericalAnswer || '5' : base.numericalAnswer,
        };
        builtQuestions.push(shuffleQuestionOptions(cleanedBase, `${testId}-${qNum}`));
      } else {
        const chosenChapter =
          selectedChapters.length > 0
            ? selectedChapters[i % selectedChapters.length]
            : `${subject} Core Syllabus`;
        builtQuestions.push(
          synthesizeQuestionForSubject(
            subject,
            chosenChapter,
            i,
            qNum,
            testId,
            wantNat
          )
        );
      }
      qNum += 1;
    }
  }

  const subjectSummary = quotas.map((q) => q.subject).join(' · ');
  const chapterHeadline =
    selectedChapters.length > 0
      ? selectedChapters.slice(0, 2).join(', ') + (selectedChapters.length > 2 ? ` +${selectedChapters.length - 2}` : '')
      : subjectSummary;

  const test: MockTestRecord = {
    id: testId,
    title: `${request.examType} ${request.questionCount}Q Practice — ${chapterHeadline}`,
    slug: `custom-${request.questionCount}q-${Date.now()}`,
    destination: 'cbt-mock',
    cohortId: request.examType === 'NEET UG' ? 'class-12-neet' : 'class-12-jee',
    examCategory: request.examType,
    examType: request.examType,
    totalQuestions: builtQuestions.length,
    totalMarks: builtQuestions.length * 4,
    durationMinutes,
    positiveMarks: 4,
    negativeMarks: 1,
    negativeMarkingEnabled: true,
    showSolutionsAfterSubmit: true,
    status: 'published',
    syllabus: quotas.map((q) => ({
      subject: q.subject,
      chapters:
        selectedChapters.length > 0
          ? selectedChapters
          : [`${q.subject} Syllabus (${q.count} Qs)`],
    })),
    instructions: getDefaultExamInstructions({
      examType: request.examType,
      durationMinutes,
      positiveMarks: 4,
      negativeMarks: 1,
      negativeMarkingEnabled: true,
      totalQuestions: builtQuestions.length,
    }),
    createdAtIso: new Date().toISOString(),
  };

  return {
    test,
    questions: builtQuestions,
    subjectBreakdown: quotas,
  };
}

/**
 * Generates an instant, chapter-locked tailored Chapter DPP practice set for ANY chapter
 * with randomized A/B/C/D options and clean unprefixed stems.
 */
export function generateTailoredChapterDpp(
  request: GenerateDppRequest,
  allBankQuestions: TestQuestionRecord[]
): GeneratedDppBundle {
  const testId = `gen-dpp-${Date.now()}`;
  const cleanChapter = request.chapterName.trim() || `${request.subjectName} Essentials`;
  const lowerSubject = request.subjectName.toLowerCase();

  const exactChapterPool = allBankQuestions.filter(
    (q) =>
      q.subjectName.toLowerCase() === lowerSubject &&
      chapterMatchesSelection(q.chapterName, [cleanChapter])
  );

  const builtQuestions: TestQuestionRecord[] = [];
  const natCount = request.includeNumerical ? Math.max(2, Math.floor(request.questionCount * 0.2)) : 0;

  for (let i = 0; i < request.questionCount; i += 1) {
    const wantNat = natCount > 0 && i >= request.questionCount - natCount;
    const matched = exactChapterPool[i];
    if (matched && !wantNat) {
      const cleaned: TestQuestionRecord = {
        ...matched,
        id: `${testId}-q-${i + 1}`,
        testId,
        questionNumber: i + 1,
        chapterName: cleanChapter,
        questionText: stripSyntheticQuestionPrefixes(matched.questionText ?? ''),
      };
      builtQuestions.push(shuffleQuestionOptions(cleaned, `${testId}-${i + 1}`));
    } else {
      builtQuestions.push(
        synthesizeQuestionForSubject(
          request.subjectName,
          cleanChapter,
          i,
          i + 1,
          testId,
          wantNat
        )
      );
    }
  }

  const durationMinutes = Math.max(15, Math.round(request.questionCount * 2));
  const isNeet = String(request.cohortId).includes('neet');

  const test: MockTestRecord = {
    id: testId,
    title: `${cleanChapter} — Chapter DPP (${request.questionCount}Q · ${request.difficulty})`,
    slug: `dpp-${cleanChapter.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
    destination: 'dpp',
    cohortId: request.cohortId,
    cohortIds: [request.cohortId],
    subjectId: request.subjectId,
    chapterId: request.chapterId,
    examCategory: `${request.subjectName} Chapter DPP`,
    examType: isNeet ? 'NEET UG' : 'JEE Main',
    totalQuestions: builtQuestions.length,
    totalMarks: builtQuestions.length * 4,
    durationMinutes,
    positiveMarks: 4,
    negativeMarks: 1,
    negativeMarkingEnabled: true,
    showSolutionsAfterSubmit: true,
    status: 'published',
    syllabus: [{ subject: request.subjectName, chapters: [cleanChapter] }],
    createdAtIso: new Date().toISOString(),
  };

  return { test, questions: builtQuestions };
}

export function loadSavedGeneratedDpps(): GeneratedDppBundle[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(GENERATED_DPPS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as GeneratedDppBundle[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveGeneratedDppBundle(bundle: GeneratedDppBundle): GeneratedDppBundle[] {
  const existing = loadSavedGeneratedDpps().filter((b) => b.test.id !== bundle.test.id);
  const next = [bundle, ...existing].slice(0, 12);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(GENERATED_DPPS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore storage quota errors
    }
  }
  return next;
}
