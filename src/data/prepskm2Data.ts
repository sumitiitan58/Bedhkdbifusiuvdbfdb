export interface FormulaCheckItem {
  id: string;
  subject: 'Physics' | 'Chemistry' | 'Mathematics' | 'Biology';
  chapter: string;
  examTag: string;
  prompt: string;
  formulaStem: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface ReactionChainStep {
  fromCompound: string;
  toCompound: string;
  correctReagent: string;
  options: string[];
  hint: string;
}

export interface ReactionChainLevel {
  id: string;
  title: string;
  examTag: string;
  chapter: string;
  steps: ReactionChainStep[];
}

export interface FormulaBlitzQuestion {
  id: string;
  subject: 'Physics' | 'Mathematics';
  chapter: string;
  title: string;
  equationWithBlank: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface NcertLineTrapQuestion {
  id: string;
  subject: 'Biology' | 'Chemistry';
  chapter: string;
  sourceRef: string;
  tokens: string[];
  wrongTokenIndex: number;
  correctReplacement: string;
  explanation: string;
}

export interface PaperScannerQuestion {
  id: string;
  qNo: number;
  subject: 'Physics' | 'Chemistry' | 'Mathematics' | 'Biology';
  chapter: string;
  snippet: string;
  estimatedMinutes: number;
  difficulty: 'Easy' | 'Moderate' | 'Trap / Lengthy';
  optimalTag: 'solve-now' | 'round-2' | 'skip-trap';
  strategyNote: string;
}

export type MasteryStageKey = 'theory' | 'dpp' | 'pyqs' | 'rev1' | 'rev2';

export interface MasteryChapterItem {
  id: string;
  subject: 'Physics' | 'Chemistry' | 'Mathematics' | 'Biology';
  name: string;
  classLevel: 'Class 11' | 'Class 12';
  weightageMarks: number;
  exams: Array<'JEE Main' | 'JEE Adv' | 'NEET UG' | 'Boards'>;
}

export interface MentorProfile {
  id: string;
  name: string;
  headline: string;
  collegeBadge: string;
  airLabel: string;
  examFocus: 'JEE' | 'NEET' | 'Foundation';
  specialties: string[];
  rating: number;
  sessionsCompleted: number;
  pricePer15MinInr: number;
  languages: string[];
  avatarUrl: string;
  availableNow: boolean;
  bio: string;
}

export interface ForumPost {
  id: string;
  category: 'Physics' | 'Chemistry' | 'Maths' | 'NEET Biology' | 'Strategy' | 'General';
  title: string;
  body: string;
  authorName: string;
  authorCohort: string;
  createdAtLabel: string;
  upvotes: number;
  imageUrl?: string;
  replies: Array<{
    id: string;
    authorName: string;
    isVerifiedMentor: boolean;
    mentorBadge?: string;
    body: string;
    createdAtLabel: string;
  }>;
}

export interface PeerAspirant {
  id: string;
  name: string;
  targetExam: 'JEE Main 2027' | 'JEE Adv 2027' | 'NEET UG 2027' | 'Dropper Batch';
  dailyHoursGoal: number;
  city: string;
  state: string;
  strongSubject: string;
  weakSubject: string;
  streakDays: number;
}

export interface BatchChatMessage {
  id: string;
  room: 'JEE 2027' | 'NEET 2027' | 'Dropper Batch';
  sender: string;
  cohortTag: string;
  text: string;
  timestamp: string;
  isMentor?: boolean;
}

// ============================================================================
// 1. DAILY 1-MINUTE FORMULA CHECK (POKE-ABLE HOME WIDGET)
// ============================================================================
export const DAILY_FORMULA_CHECKS: FormulaCheckItem[] = [
  {
    id: 'fc-1',
    subject: 'Physics',
    chapter: 'Gravitation',
    examTag: 'JEE Main & NEET High-Yield',
    prompt: 'Escape velocity from a planet of mass M and radius R is:',
    formulaStem: 'vₑ = √( ___ / R )',
    options: ['2GM', 'GM', 'GM/2', '4GM'],
    correctIndex: 0,
    explanation: 'By energy conservation, ½mvₑ² = GMm/R ⇒ vₑ = √(2GM/R) = √(2gR). Notice orbital velocity is √(GM/R), so vₑ = √2 · vₒ.',
  },
  {
    id: 'fc-2',
    subject: 'Physics',
    chapter: 'Rotational Dynamics',
    examTag: 'JEE Main PYQ Favorite',
    prompt: 'Moment of inertia of a solid sphere about its tangent is:',
    formulaStem: 'I_tangent = ( ___ ) MR²',
    options: ['7/5', '2/5', '5/3', '3/2'],
    correctIndex: 0,
    explanation: 'By Parallel Axis Theorem: I_tangent = I_cm + MR² = (2/5)MR² + MR² = (7/5)MR².',
  },
  {
    id: 'fc-3',
    subject: 'Chemistry',
    chapter: 'Chemical Kinetics',
    examTag: 'JEE & NEET Direct Formula',
    prompt: 'For a first-order reaction, half-life t₁/₂ equals:',
    formulaStem: 't₁/₂ = ___ / k',
    options: ['0.693', '1 / [A]₀', '[A]₀ / 2', '2.303'],
    correctIndex: 0,
    explanation: 'First-order half-life is independent of initial concentration: t₁/₂ = ln(2)/k ≈ 0.693/k.',
  },
  {
    id: 'fc-4',
    subject: 'Mathematics',
    chapter: 'Definite Integration',
    examTag: 'JEE Main King Property',
    prompt: 'Value of ∫₀^(π/2) [sinⁿx / (sinⁿx + cosⁿx)] dx for any real n is:',
    formulaStem: 'I = ___',
    options: ['π / 4', 'π / 2', '1 / 2', 'π / 8'],
    correctIndex: 0,
    explanation: 'Using King’s Property f(a+b-x): I + I = ∫₀^(π/2) 1 dx = π/2 ⇒ I = π/4.',
  },
  {
    id: 'fc-5',
    subject: 'Biology',
    chapter: 'Molecular Basis of Inheritance',
    examTag: 'NEET NCERT Line',
    prompt: 'In DNA replication, the enzyme that seals Okazaki fragments on the lagging strand is:',
    formulaStem: 'Okazaki fragments + ___ → continuous strand',
    options: ['DNA Ligase', 'DNA Helicase', 'RNA Primase', 'Topoisomerase'],
    correctIndex: 0,
    explanation: 'Discontinuously synthesized fragments (Okazaki fragments) on the 3′→5′ template are joined by DNA Ligase.',
  },
];

// ============================================================================
// 2. ARENA GAME 1: REACTION CHAIN DUEL (4-STEP ORGANIC/INORGANIC CHAINS)
// ============================================================================
export const REACTION_CHAIN_LEVELS: ReactionChainLevel[] = [
  {
    id: 'rc-1',
    title: 'Alcohol to Alkene & Carbonyl Synthesis',
    examTag: 'JEE Main Organic',
    chapter: 'Aldehydes, Ketones & Alcohols',
    steps: [
      {
        fromCompound: 'CH₃CH₂OH (Ethanol)',
        toCompound: 'CH₃CHO (Ethanal)',
        correctReagent: 'PCC / CH₂Cl₂',
        options: ['PCC / CH₂Cl₂', 'KMnO₄ / H⁺ (hot)', 'LiAlH₄', 'Conc. H₂SO₄, 443K'],
        hint: 'Needs mild oxidation that stops at aldehyde without over-oxidizing to carboxylic acid.',
      },
      {
        fromCompound: 'CH₃CHO (Ethanal)',
        toCompound: 'CH₃CH(OH)CH₂CHO (Aldol)',
        correctReagent: 'Dil. NaOH',
        options: ['Dil. NaOH', 'Conc. NaOH (50%)', 'O₃ / Zn-H₂O', 'Br₂ / FeBr₃'],
        hint: 'Ethanal has α-hydrogens — undergoes Aldol addition in dilute alkali.',
      },
      {
        fromCompound: 'CH₃CH(OH)CH₂CHO',
        toCompound: 'CH₃CH=CHCHO (Crotonaldehyde)',
        correctReagent: 'Δ (Heat, -H₂O)',
        options: ['Δ (Heat, -H₂O)', 'NaBH₄', 'H₂ / Lindlar', 'SOCl₂'],
        hint: 'β-hydroxy aldehyde loses water on gentle heating to give α,β-unsaturated aldehyde.',
      },
      {
        fromCompound: 'CH₃CH=CHCHO',
        toCompound: 'CH₃CH=CHCH₂OH',
        correctReagent: 'NaBH₄ / EtOH',
        options: ['NaBH₄ / EtOH', 'H₂ / Ni (excess)', 'K₂Cr₂O₇ / H⁺', 'O₃ / H₂O₂'],
        hint: 'Selective reduction of -CHO to -CH₂OH without reducing the C=C double bond.',
      },
    ],
  },
  {
    id: 'rc-2',
    title: 'Benzene to Phenol & Salicylaldehyde Ladder',
    examTag: 'JEE Adv & NEET Organic',
    chapter: 'Aromatic Compounds',
    steps: [
      {
        fromCompound: 'C₆H₆ (Benzene)',
        toCompound: 'C₆H₅NO₂ (Nitrobenzene)',
        correctReagent: 'Conc. HNO₃ + Conc. H₂SO₄',
        options: ['Conc. HNO₃ + Conc. H₂SO₄', 'Dil. HNO₃', 'NaNO₂ / HCl', 'NH₃ / Δ'],
        hint: 'Electrophilic nitration using nitronium ion (NO₂⁺).',
      },
      {
        fromCompound: 'C₆H₅NO₂',
        toCompound: 'C₆H₅NH₂ (Aniline)',
        correctReagent: 'Sn / HCl (or Fe / HCl)',
        options: ['Sn / HCl (or Fe / HCl)', 'KMnO₄ / OH⁻', 'CrO₂Cl₂', 'Br₂ / H₂O'],
        hint: 'Acidic metal reduction converts aromatic nitro group cleanly to primary amine.',
      },
      {
        fromCompound: 'C₆H₅NH₂',
        toCompound: 'C₆H₅N₂⁺Cl⁻ (Diazonium Salt)',
        correctReagent: 'NaNO₂ + HCl (0–5°C)',
        options: ['NaNO₂ + HCl (0–5°C)', 'HNO₃ (hot)', 'CHCl₃ + KOH', 'H₃PO₂'],
        hint: 'Ice-cold diazotization keeps the benzene diazonium chloride stable.',
      },
      {
        fromCompound: 'C₆H₅OH (Phenol)',
        toCompound: 'o-Hydroxybenzaldehyde (Salicylaldehyde)',
        correctReagent: 'CHCl₃ + aq. NaOH, then H⁺',
        options: ['CHCl₃ + aq. NaOH, then H⁺', 'CO₂ + NaOH (400K)', 'CH₃Cl / Anhyd. AlCl₃', 'PCC'],
        hint: 'Reimer-Tiemann formylation via dichlorocarbene (:CCl₂) intermediate.',
      },
    ],
  },
];

// ============================================================================
// 3. ARENA GAME 2: FORMULA BLITZ (PHYSICS & MATHS)
// ============================================================================
export const FORMULA_BLITZ_QUESTIONS: FormulaBlitzQuestion[] = [
  {
    id: 'fb-1',
    subject: 'Physics',
    chapter: 'Electrostatics',
    title: 'Electric Field of Infinite Sheet',
    equationWithBlank: 'E = σ / ( ___ )',
    options: ['2ε₀', 'ε₀', '4πε₀', '2πε₀'],
    correctIndex: 0,
    explanation: 'For a thin infinite non-conducting sheet of charge density σ, E = σ / (2ε₀), independent of distance.',
  },
  {
    id: 'fb-2',
    subject: 'Physics',
    chapter: 'SHM & Oscillations',
    title: 'Time Period of Simple Pendulum',
    equationWithBlank: 'T = 2π √( ___ )',
    options: ['L / g', 'g / L', 'm / k', '2L / g'],
    correctIndex: 0,
    explanation: 'Small-angle simple pendulum period is T = 2π√(L/g), independent of bob mass.',
  },
  {
    id: 'fb-3',
    subject: 'Mathematics',
    chapter: 'Calculus — Limits',
    title: 'Standard Exponential Limit',
    equationWithBlank: 'lim (x→0) (1 + ax)^(b/x) = ___',
    options: ['e^(ab)', 'e^(a/b)', 'ab', 'e^(a+b)'],
    correctIndex: 0,
    explanation: 'For 1^∞ form, limit equals e^(lim x→0 (ax · b/x)) = e^(ab).',
  },
  {
    id: 'fb-4',
    subject: 'Physics',
    chapter: 'Modern Physics',
    title: 'de Broglie Wavelength for Electron (V volts)',
    equationWithBlank: 'λ (in Å) ≈ ___ / √V',
    options: ['12.27', '6.63', '1.227', '12400'],
    correctIndex: 0,
    explanation: 'For an electron accelerated through potential difference V, λ ≈ 12.27 / √V Å.',
  },
  {
    id: 'fb-5',
    subject: 'Physics',
    chapter: 'Thermodynamics',
    title: 'Carnot Engine Efficiency',
    equationWithBlank: 'η = 1 − ( ___ )',
    options: ['T_sink / T_source', 'T_source / T_sink', 'Q_source / Q_sink', 'P_2 / P_1'],
    correctIndex: 0,
    explanation: 'Carnot efficiency η = 1 − T₂/T₁ where temperatures are strictly in Kelvin.',
  },
  {
    id: 'fb-6',
    subject: 'Mathematics',
    chapter: 'Coordinate Geometry',
    title: 'Focal Chord Segment Relation (y² = 4ax)',
    equationWithBlank: '1/SP + 1/SQ = ___',
    options: ['1 / a', '2 / a', '4a', '1 / (2a)'],
    correctIndex: 0,
    explanation: 'The semi-latus rectum (2a) is the harmonic mean of focal chord segments SP and SQ ⇒ 1/SP + 1/SQ = 1/a.',
  },
  {
    id: 'fb-7',
    subject: 'Physics',
    chapter: 'Magnetism',
    title: 'Magnetic Field at Center of Circular Loop',
    equationWithBlank: 'B = μ₀I / ( ___ )',
    options: ['2R', '2πR', '4πR', 'R'],
    correctIndex: 0,
    explanation: 'By Biot-Savart law, B at center of a single circular loop of radius R is μ₀I / (2R).',
  },
  {
    id: 'fb-8',
    subject: 'Mathematics',
    chapter: '3D Geometry',
    title: 'Shortest Distance Between Skew Lines',
    equationWithBlank: 'd = |(a₂ − a₁) · (b₁ × b₂)| / ___',
    options: ['|b₁ × b₂|', '|b₁ · b₂|', '|a₂ − a₁|', '|b₁| · |b₂|'],
    correctIndex: 0,
    explanation: 'Projection of (a₂ − a₁) onto unit normal (b₁ × b₂)/|b₁ × b₂| gives the shortest distance.',
  },
];

// ============================================================================
// 4. ARENA GAME 3: NCERT LINE-TRAP (TAP THE SINGLE WRONG WORD)
// ============================================================================
export const NCERT_LINE_TRAP_QUESTIONS: NcertLineTrapQuestion[] = [
  {
    id: 'nlt-1',
    subject: 'Biology',
    chapter: 'Plant Kingdom',
    sourceRef: 'NCERT Class 11 Bio Ch. 3',
    tokens: ['In', 'gymnosperms,', 'the', 'ovules', 'are', 'completely', 'enclosed', 'by', 'an', 'ovary', 'wall.'],
    wrongTokenIndex: 6,
    correctReplacement: 'NOT enclosed (naked)',
    explanation: 'Gymnosperms literally mean "naked seeds" — ovules are NOT enclosed by any ovary wall and remain exposed before and after fertilization.',
  },
  {
    id: 'nlt-2',
    subject: 'Chemistry',
    chapter: 'Chemical Bonding',
    sourceRef: 'NCERT Class 11 Chem Ch. 4',
    tokens: ['According', 'to', 'MOT,', 'the', 'O₂', 'molecule', 'is', 'diamagnetic', 'with', 'bond', 'order', '2.'],
    wrongTokenIndex: 7,
    correctReplacement: 'paramagnetic',
    explanation: 'O₂ has 2 unpaired electrons in degenerate π*2px and π*2py antibonding orbitals, making it paramagnetic.',
  },
  {
    id: 'nlt-3',
    subject: 'Biology',
    chapter: 'Cell: The Unit of Life',
    sourceRef: 'NCERT Class 11 Bio Ch. 8',
    tokens: ['Ribosomes', 'are', 'double-membrane', 'bound', 'granular', 'structures', 'composed', 'of', 'RNA', 'and', 'proteins.'],
    wrongTokenIndex: 2,
    correctReplacement: 'non-membrane (naked)',
    explanation: 'NCERT emphasizes ribosomes are NOT surrounded by any membrane (present in both prokaryotes and eukaryotes).',
  },
  {
    id: 'nlt-4',
    subject: 'Chemistry',
    chapter: 'd- and f-Block Elements',
    sourceRef: 'NCERT Class 12 Chem Ch. 4',
    tokens: ['Zinc,', 'cadmium,', 'and', 'mercury', 'are', 'strictly', 'regarded', 'as', 'transition', 'elements', 'by', 'IUPAC.'],
    wrongTokenIndex: 6,
    correctReplacement: 'NOT regarded',
    explanation: 'Zn, Cd, Hg have completely filled d¹⁰ orbitals in ground state and common oxidation states, so they are NOT regarded as transition metals.',
  },
  {
    id: 'nlt-5',
    subject: 'Biology',
    chapter: 'Human Physiology — Breathing',
    sourceRef: 'NCERT Class 11 Bio Ch. 14',
    tokens: ['Binding', 'of', 'oxygen', 'with', 'haemoglobin', 'in', 'alveoli', 'is', 'favoured', 'by', 'high', 'H⁺', 'concentration.'],
    wrongTokenIndex: 10,
    correctReplacement: 'low',
    explanation: 'In alveoli, oxyhaemoglobin formation is favoured by high pO₂, low pCO₂, LOW H⁺ concentration (higher pH), and lower temperature.',
  },
  {
    id: 'nlt-6',
    subject: 'Chemistry',
    chapter: 'Biomolecules',
    sourceRef: 'NCERT Class 12 Chem Ch. 10',
    tokens: ['Sucrose', 'is', 'a', 'reducing', 'sugar', 'because', 'glycosidic', 'linkage', 'joins', 'C1-α-glucose', 'and', 'C2-β-fructose.'],
    wrongTokenIndex: 3,
    correctReplacement: 'non-reducing',
    explanation: 'Both reducing groups (C1 of glucose and C2 of fructose) are tied up in the glycosidic bond, making sucrose a NON-reducing sugar.',
  },
];

// ============================================================================
// 5. ARENA GAME 5: 15-MINUTE PAPER SCANNER TRAINER (30 MIXED QUESTIONS)
// ============================================================================
export const PAPER_SCANNER_QUESTIONS: PaperScannerQuestion[] = [
  { id: 'ps-1', qNo: 1, subject: 'Physics', chapter: 'Units & Dimensions', snippet: 'Find dimensional formula of permittivity ε₀ in terms of M, L, T, A.', estimatedMinutes: 1.0, difficulty: 'Easy', optimalTag: 'solve-now', strategyNote: 'Direct dimensional recall — guaranteed +4 in <60s.' },
  { id: 'ps-2', qNo: 2, subject: 'Physics', chapter: 'Rotational Dynamics', snippet: 'A composite rod with variable density ρ(x)=ρ₀(1+x²/L²) collides inelastically with a moving wedge on a frictionless incline; find post-collision angular impulse.', estimatedMinutes: 5.5, difficulty: 'Trap / Lengthy', optimalTag: 'skip-trap', strategyNote: 'Multi-variable integral + coupled wedge constraints — classic Round-1 time sink.' },
  { id: 'ps-3', qNo: 3, subject: 'Physics', chapter: 'Modern Physics', snippet: 'Threshold wavelength for a metal is 5000 Å. Find stopping potential when light of 2500 Å falls on it.', estimatedMinutes: 1.2, difficulty: 'Easy', optimalTag: 'solve-now', strategyNote: 'One-line Einstein photoelectric equation using hc = 12400 eV·Å.' },
  { id: 'ps-4', qNo: 4, subject: 'Physics', chapter: 'Current Electricity', snippet: 'Find equivalent resistance between A and B in a symmetric 6-resistor Wheatstone bridge with R = 4Ω.', estimatedMinutes: 1.5, difficulty: 'Easy', optimalTag: 'solve-now', strategyNote: 'Balanced bridge cancels middle resistor immediately.' },
  { id: 'ps-5', qNo: 5, subject: 'Physics', chapter: 'Electrostatics', snippet: 'Two coaxial rings of radius R carry +Q and -2Q separated by √3R; calculate work done moving q from center of ring 1 to midpoint.', estimatedMinutes: 2.5, difficulty: 'Moderate', optimalTag: 'round-2', strategyNote: 'Straightforward potential subtraction V_f − V_i, needs clean algebra in Round 2.' },
  { id: 'ps-6', qNo: 6, subject: 'Physics', chapter: 'Ray Optics', snippet: 'A light ray enters a liquid with refractive index n(y) = n₀√(1+αy); derive exact trajectory equation and horizontal shift at y=H.', estimatedMinutes: 5.0, difficulty: 'Trap / Lengthy', optimalTag: 'skip-trap', strategyNote: 'Continuous Snell’s law differential equation — leave unless time remains.' },
  { id: 'ps-7', qNo: 7, subject: 'Physics', chapter: 'Thermodynamics', snippet: 'Monoatomic ideal gas expands isobarically absorbing 200 J heat. Find work done by gas.', estimatedMinutes: 1.0, difficulty: 'Easy', optimalTag: 'solve-now', strategyNote: 'W/Q = R/C_p = 2/5 ⇒ W = 80 J in 30 seconds.' },
  { id: 'ps-8', qNo: 8, subject: 'Physics', chapter: 'Gravitation', snippet: 'Height above Earth surface where acceleration due to gravity drops to g/4.', estimatedMinutes: 0.8, difficulty: 'Easy', optimalTag: 'solve-now', strategyNote: 'g/(1+h/R)² = g/4 ⇒ h = R instantly.' },
  { id: 'ps-9', qNo: 9, subject: 'Physics', chapter: 'EMI & AC Circuits', snippet: 'Series LCR circuit with R=30Ω, X_L=80Ω, X_C=40Ω connected to 200V RMS; find average power dissipated.', estimatedMinutes: 2.2, difficulty: 'Moderate', optimalTag: 'round-2', strategyNote: '3-4-5 impedance triangle (Z=50Ω), quick Round 2 calculation.' },
  { id: 'ps-10', qNo: 10, subject: 'Physics', chapter: 'Semiconductors', snippet: 'Identify logic gate equivalent to two NAND gates wired with tied inputs feeding an OR output.', estimatedMinutes: 1.0, difficulty: 'Easy', optimalTag: 'solve-now', strategyNote: 'Truth table takes 25 seconds — high accuracy.' },
  { id: 'ps-11', qNo: 11, subject: 'Chemistry', chapter: 'Chemical Bonding', snippet: 'Arrange O₂⁺, O₂, O₂⁻, O₂²⁻ in decreasing order of bond length using MOT.', estimatedMinutes: 0.9, difficulty: 'Easy', optimalTag: 'solve-now', strategyNote: 'Bond order 2.5, 2.0, 1.5, 1.0 — inverse of bond length.' },
  { id: 'ps-12', qNo: 12, subject: 'Chemistry', chapter: 'Ionic Equilibrium', snippet: 'Calculate exact pH of a 10⁻⁷ M H₂SO₄ + 10⁻⁶ M weak diprotic acid buffer considering water auto-ionization cubic equation.', estimatedMinutes: 5.5, difficulty: 'Trap / Lengthy', optimalTag: 'skip-trap', strategyNote: 'Cubic ionic equilibrium approximation trap — high negative-marking risk.' },
  { id: 'ps-13', qNo: 13, subject: 'Chemistry', chapter: 'Coordination Compounds', snippet: 'Hybridisation and magnetic moment of [Ni(CN)₄]²⁻ vs [NiCl₄]²⁻.', estimatedMinutes: 1.0, difficulty: 'Easy', optimalTag: 'solve-now', strategyNote: 'Classic NCERT strong-field dsp² (0 BM) vs weak-field sp³ (2.83 BM).' },
  { id: 'ps-14', qNo: 14, subject: 'Chemistry', chapter: 'Aldehydes & Ketones', snippet: 'Which of benzaldehyde, acetaldehyde, formaldehyde gives a positive Cannizzaro reaction?', estimatedMinutes: 0.7, difficulty: 'Easy', optimalTag: 'solve-now', strategyNote: 'Check absence of α-H — under 20 seconds.' },
  { id: 'ps-15', qNo: 15, subject: 'Chemistry', chapter: 'Electrochemistry', snippet: 'Given E° values for 3 half-cells, compute equilibrium constant log₁₀K_c at 298K using Nernst equation.', estimatedMinutes: 2.5, difficulty: 'Moderate', optimalTag: 'round-2', strategyNote: 'Clean arithmetic with 0.0591/n, worth doing in Round 2.' },
  { id: 'ps-16', qNo: 16, subject: 'Chemistry', chapter: 'Chemical Kinetics', snippet: 'For a first-order reaction, 75% completes in 40 min. Time required for 87.5% completion?', estimatedMinutes: 1.0, difficulty: 'Easy', optimalTag: 'solve-now', strategyNote: '75% = 2 half-lives ⇒ t₁/₂ = 20m ⇒ 87.5% = 3 half-lives = 60m.' },
  { id: 'ps-17', qNo: 17, subject: 'Chemistry', chapter: 'Thermochemistry', snippet: 'Multi-step Born-Haber cycle with 6 enthalpy values and temperature-dependent Kirchhoff ΔC_p integration.', estimatedMinutes: 4.5, difficulty: 'Trap / Lengthy', optimalTag: 'skip-trap', strategyNote: 'Heavy sign-error calculation trap during Round 1.' },
  { id: 'ps-18', qNo: 18, subject: 'Chemistry', chapter: 'Biomolecules', snippet: 'Identify the essential amino acid and vitamin deficiency causing pernicious anaemia.', estimatedMinutes: 0.6, difficulty: 'Easy', optimalTag: 'solve-now', strategyNote: 'Pure NCERT factual recall (Vitamin B₁₂).' },
  { id: 'ps-19', qNo: 19, subject: 'Chemistry', chapter: 'Solutions', snippet: '0.1 M BaCl₂ shows 80% dissociation; calculate van’t Hoff factor i and osmotic pressure ratio.', estimatedMinutes: 2.0, difficulty: 'Moderate', optimalTag: 'round-2', strategyNote: 'i = 1 + (3−1)(0.8) = 2.6 — solid Round 2 numerical.' },
  { id: 'ps-20', qNo: 20, subject: 'Chemistry', chapter: 'Organic Mechanism', snippet: 'Predict stereochemical major product of 5-step sequential Wittig + Diels-Alder + Baeyer-Villiger sequence.', estimatedMinutes: 4.8, difficulty: 'Trap / Lengthy', optimalTag: 'skip-trap', strategyNote: 'High cognitive load multi-step stereochem; save for very end.' },
  { id: 'ps-21', qNo: 21, subject: 'Mathematics', chapter: 'Matrices & Determinants', snippet: 'If A is a 3×3 matrix with |A| = 4, find |2·adj(A)|.', estimatedMinutes: 1.1, difficulty: 'Easy', optimalTag: 'solve-now', strategyNote: '2³ · |A|² = 8 × 16 = 128 — instant +4.' },
  { id: 'ps-22', qNo: 22, subject: 'Mathematics', chapter: 'Definite Integration', snippet: 'Evaluate ∫₀^(π/2) dx / (1 + tan²⁰²⁷x).', estimatedMinutes: 0.8, difficulty: 'Easy', optimalTag: 'solve-now', strategyNote: 'Direct King’s Property ⇒ π/4.' },
  { id: 'ps-23', qNo: 23, subject: 'Mathematics', chapter: 'Complex Numbers', snippet: 'Find locus of z satisfying arg((z-1)/(z+i)) = π/3 and maximize |z - 3 - 4i| on the minor arc.', estimatedMinutes: 4.5, difficulty: 'Trap / Lengthy', optimalTag: 'skip-trap', strategyNote: 'Geometric arc boundary checks eat 4–5 min easily.' },
  { id: 'ps-24', qNo: 24, subject: 'Mathematics', chapter: 'Vectors & 3D', snippet: 'Find shortest distance between two given Cartesian lines in R³.', estimatedMinutes: 2.4, difficulty: 'Moderate', optimalTag: 'round-2', strategyNote: 'Standard determinant formula — reliable Round 2 score.' },
  { id: 'ps-25', qNo: 25, subject: 'Mathematics', chapter: 'Probability', snippet: 'Bayes theorem on 3 urns with sequential drawing without replacement and conditional variance.', estimatedMinutes: 4.2, difficulty: 'Trap / Lengthy', optimalTag: 'skip-trap', strategyNote: 'Fraction explosion without replacement — classic time trap.' },
  { id: 'ps-26', qNo: 26, subject: 'Mathematics', chapter: 'Sequences & Series', snippet: 'Sum of infinite geometric progression with a = 6 and r = 1/3.', estimatedMinutes: 0.7, difficulty: 'Easy', optimalTag: 'solve-now', strategyNote: 'a/(1−r) = 6/(2/3) = 9 in 15 seconds.' },
  { id: 'ps-27', qNo: 27, subject: 'Mathematics', chapter: 'Differential Equations', snippet: 'Solve linear first-order ODE dy/dx + (2/x)y = x³ with y(1) = 1.', estimatedMinutes: 2.2, difficulty: 'Moderate', optimalTag: 'round-2', strategyNote: 'Integrating factor x² makes it clean in Round 2.' },
  { id: 'ps-28', qNo: 28, subject: 'Mathematics', chapter: 'Binomial Theorem', snippet: 'Find term independent of x in (2x² − 1/x)⁹.', estimatedMinutes: 1.5, difficulty: 'Easy', optimalTag: 'solve-now', strategyNote: '18 − 3r = 0 ⇒ r = 6 — quick and foolproof.' },
  { id: 'ps-29', qNo: 29, subject: 'Mathematics', chapter: 'Conic Sections', snippet: 'Find common tangents to circle x²+y²=4 and hyperbola x²/9 − y²/4 = 1 and area of quadrilateral formed.', estimatedMinutes: 4.8, difficulty: 'Trap / Lengthy', optimalTag: 'skip-trap', strategyNote: 'Heavy coordinate algebra — skip in Round 1.' },
  { id: 'ps-30', qNo: 30, subject: 'Mathematics', chapter: 'Statistics', snippet: 'If mean of 5 observations is 12 and variance is 4, find new variance when each observation is multiplied by 3.', estimatedMinutes: 0.7, difficulty: 'Easy', optimalTag: 'solve-now', strategyNote: 'New variance = 3² × 4 = 36 instantly.' },
];

// ============================================================================
// 6. 5-STAGE CHAPTER MASTERY PLANNER DIRECTORY (48 CHAPTERS ACROSS PCMB)
// ============================================================================
export const MASTERY_CHAPTERS_48: MasteryChapterItem[] = [
  // Physics (14)
  { id: 'm-phy-1', subject: 'Physics', name: 'Units, Dimensions & Errors', classLevel: 'Class 11', weightageMarks: 8, exams: ['JEE Main', 'NEET UG', 'Boards'] },
  { id: 'm-phy-2', subject: 'Physics', name: 'Kinematics (1D & 2D Projectile)', classLevel: 'Class 11', weightageMarks: 8, exams: ['JEE Main', 'NEET UG', 'Boards'] },
  { id: 'm-phy-3', subject: 'Physics', name: 'Laws of Motion & Friction', classLevel: 'Class 11', weightageMarks: 8, exams: ['JEE Main', 'JEE Adv', 'NEET UG'] },
  { id: 'm-phy-4', subject: 'Physics', name: 'Work, Energy & Power', classLevel: 'Class 11', weightageMarks: 8, exams: ['JEE Main', 'JEE Adv', 'NEET UG'] },
  { id: 'm-phy-5', subject: 'Physics', name: 'Rotational Dynamics & COM', classLevel: 'Class 11', weightageMarks: 12, exams: ['JEE Main', 'JEE Adv', 'NEET UG'] },
  { id: 'm-phy-6', subject: 'Physics', name: 'Gravitation', classLevel: 'Class 11', weightageMarks: 8, exams: ['JEE Main', 'NEET UG'] },
  { id: 'm-phy-7', subject: 'Physics', name: 'Thermodynamics & KTG', classLevel: 'Class 11', weightageMarks: 12, exams: ['JEE Main', 'JEE Adv', 'NEET UG'] },
  { id: 'm-phy-8', subject: 'Physics', name: 'SHM & Waves', classLevel: 'Class 11', weightageMarks: 8, exams: ['JEE Main', 'NEET UG'] },
  { id: 'm-phy-9', subject: 'Physics', name: 'Electrostatics & Capacitors', classLevel: 'Class 12', weightageMarks: 12, exams: ['JEE Main', 'JEE Adv', 'NEET UG', 'Boards'] },
  { id: 'm-phy-10', subject: 'Physics', name: 'Current Electricity', classLevel: 'Class 12', weightageMarks: 12, exams: ['JEE Main', 'NEET UG', 'Boards'] },
  { id: 'm-phy-11', subject: 'Physics', name: 'Moving Charges & Magnetism', classLevel: 'Class 12', weightageMarks: 12, exams: ['JEE Main', 'JEE Adv', 'NEET UG'] },
  { id: 'm-phy-12', subject: 'Physics', name: 'EMI & Alternating Current', classLevel: 'Class 12', weightageMarks: 8, exams: ['JEE Main', 'NEET UG', 'Boards'] },
  { id: 'm-phy-13', subject: 'Physics', name: 'Ray & Wave Optics', classLevel: 'Class 12', weightageMarks: 12, exams: ['JEE Main', 'JEE Adv', 'NEET UG', 'Boards'] },
  { id: 'm-phy-14', subject: 'Physics', name: 'Modern Physics & Semiconductors', classLevel: 'Class 12', weightageMarks: 16, exams: ['JEE Main', 'NEET UG', 'Boards'] },

  // Chemistry (12)
  { id: 'm-chem-1', subject: 'Chemistry', name: 'Mole Concept & Stoichiometry', classLevel: 'Class 11', weightageMarks: 8, exams: ['JEE Main', 'NEET UG'] },
  { id: 'm-chem-2', subject: 'Chemistry', name: 'Atomic Structure', classLevel: 'Class 11', weightageMarks: 8, exams: ['JEE Main', 'NEET UG'] },
  { id: 'm-chem-3', subject: 'Chemistry', name: 'Chemical Bonding & MOT', classLevel: 'Class 11', weightageMarks: 12, exams: ['JEE Main', 'JEE Adv', 'NEET UG'] },
  { id: 'm-chem-4', subject: 'Chemistry', name: 'Chemical Thermodynamics', classLevel: 'Class 11', weightageMarks: 12, exams: ['JEE Main', 'JEE Adv', 'NEET UG'] },
  { id: 'm-chem-5', subject: 'Chemistry', name: 'Chemical & Ionic Equilibrium', classLevel: 'Class 11', weightageMarks: 12, exams: ['JEE Main', 'JEE Adv', 'NEET UG'] },
  { id: 'm-chem-6', subject: 'Chemistry', name: 'GOC & Hydrocarbons', classLevel: 'Class 11', weightageMarks: 16, exams: ['JEE Main', 'JEE Adv', 'NEET UG'] },
  { id: 'm-chem-7', subject: 'Chemistry', name: 'Solutions & Colligative Properties', classLevel: 'Class 12', weightageMarks: 8, exams: ['JEE Main', 'NEET UG', 'Boards'] },
  { id: 'm-chem-8', subject: 'Chemistry', name: 'Electrochemistry', classLevel: 'Class 12', weightageMarks: 12, exams: ['JEE Main', 'JEE Adv', 'NEET UG', 'Boards'] },
  { id: 'm-chem-9', subject: 'Chemistry', name: 'Chemical Kinetics', classLevel: 'Class 12', weightageMarks: 8, exams: ['JEE Main', 'NEET UG', 'Boards'] },
  { id: 'm-chem-10', subject: 'Chemistry', name: 'Coordination Compounds', classLevel: 'Class 12', weightageMarks: 12, exams: ['JEE Main', 'JEE Adv', 'NEET UG', 'Boards'] },
  { id: 'm-chem-11', subject: 'Chemistry', name: 'Aldehydes, Ketones & Carboxylic Acids', classLevel: 'Class 12', weightageMarks: 12, exams: ['JEE Main', 'JEE Adv', 'NEET UG', 'Boards'] },
  { id: 'm-chem-12', subject: 'Chemistry', name: 'Amines & Biomolecules', classLevel: 'Class 12', weightageMarks: 12, exams: ['JEE Main', 'NEET UG', 'Boards'] },

  // Mathematics (12)
  { id: 'm-math-1', subject: 'Mathematics', name: 'Quadratic Equations & Complex Numbers', classLevel: 'Class 11', weightageMarks: 8, exams: ['JEE Main', 'JEE Adv'] },
  { id: 'm-math-2', subject: 'Mathematics', name: 'Sequences & Series', classLevel: 'Class 11', weightageMarks: 8, exams: ['JEE Main', 'JEE Adv'] },
  { id: 'm-math-3', subject: 'Mathematics', name: 'Permutations, Combinations & Binomial', classLevel: 'Class 11', weightageMarks: 12, exams: ['JEE Main', 'JEE Adv'] },
  { id: 'm-math-4', subject: 'Mathematics', name: 'Straight Lines & Circles', classLevel: 'Class 11', weightageMarks: 8, exams: ['JEE Main', 'JEE Adv'] },
  { id: 'm-math-5', subject: 'Mathematics', name: 'Conic Sections (Parabola, Ellipse, Hyperbola)', classLevel: 'Class 11', weightageMarks: 12, exams: ['JEE Main', 'JEE Adv'] },
  { id: 'm-math-6', subject: 'Mathematics', name: 'Matrices & Determinants', classLevel: 'Class 12', weightageMarks: 12, exams: ['JEE Main', 'JEE Adv', 'Boards'] },
  { id: 'm-math-7', subject: 'Mathematics', name: 'Limits, Continuity & Differentiability', classLevel: 'Class 12', weightageMarks: 12, exams: ['JEE Main', 'JEE Adv', 'Boards'] },
  { id: 'm-math-8', subject: 'Mathematics', name: 'Application of Derivatives', classLevel: 'Class 12', weightageMarks: 12, exams: ['JEE Main', 'JEE Adv', 'Boards'] },
  { id: 'm-math-9', subject: 'Mathematics', name: 'Definite & Indefinite Integration', classLevel: 'Class 12', weightageMarks: 12, exams: ['JEE Main', 'JEE Adv', 'Boards'] },
  { id: 'm-math-10', subject: 'Mathematics', name: 'Differential Equations & Area', classLevel: 'Class 12', weightageMarks: 8, exams: ['JEE Main', 'Boards'] },
  { id: 'm-math-11', subject: 'Mathematics', name: 'Vectors & 3D Geometry', classLevel: 'Class 12', weightageMarks: 16, exams: ['JEE Main', 'JEE Adv', 'Boards'] },
  { id: 'm-math-12', subject: 'Mathematics', name: 'Probability & Statistics', classLevel: 'Class 12', weightageMarks: 8, exams: ['JEE Main', 'Boards'] },

  // Biology (10)
  { id: 'm-bio-1', subject: 'Biology', name: 'Biological Classification & Plant Kingdom', classLevel: 'Class 11', weightageMarks: 20, exams: ['NEET UG', 'Boards'] },
  { id: 'm-bio-2', subject: 'Biology', name: 'Cell: Unit of Life & Cell Cycle', classLevel: 'Class 11', weightageMarks: 24, exams: ['NEET UG', 'Boards'] },
  { id: 'm-bio-3', subject: 'Biology', name: 'Photosynthesis & Plant Respiration', classLevel: 'Class 11', weightageMarks: 16, exams: ['NEET UG', 'Boards'] },
  { id: 'm-bio-4', subject: 'Biology', name: 'Human Physiology (Breathing & Circulation)', classLevel: 'Class 11', weightageMarks: 24, exams: ['NEET UG', 'Boards'] },
  { id: 'm-bio-5', subject: 'Biology', name: 'Neural Control & Chemical Coordination', classLevel: 'Class 11', weightageMarks: 20, exams: ['NEET UG', 'Boards'] },
  { id: 'm-bio-6', subject: 'Biology', name: 'Human Reproduction & Sexual Reproduction in Plants', classLevel: 'Class 12', weightageMarks: 24, exams: ['NEET UG', 'Boards'] },
  { id: 'm-bio-7', subject: 'Biology', name: 'Principles of Inheritance & Variation', classLevel: 'Class 12', weightageMarks: 24, exams: ['NEET UG', 'Boards'] },
  { id: 'm-bio-8', subject: 'Biology', name: 'Molecular Basis of Inheritance', classLevel: 'Class 12', weightageMarks: 28, exams: ['NEET UG', 'Boards'] },
  { id: 'm-bio-9', subject: 'Biology', name: 'Biotechnology Principles & Applications', classLevel: 'Class 12', weightageMarks: 24, exams: ['NEET UG', 'Boards'] },
  { id: 'm-bio-10', subject: 'Biology', name: 'Ecology, Ecosystems & Biodiversity', classLevel: 'Class 12', weightageMarks: 24, exams: ['NEET UG', 'Boards'] },
];

// ============================================================================
// 7. VERIFIED MENTOR DIRECTORY (WITH GENERATED STUDIO PORTRAITS)
// ============================================================================
export const VERIFIED_MENTORS: MentorProfile[] = [
  {
    id: 'mentor-arjun',
    name: 'Arjun Sharma',
    headline: 'Physics & Rotational Mechanics Specialist',
    collegeBadge: 'IIT Bombay (B.Tech CSE)',
    airLabel: 'JEE Adv AIR 42',
    examFocus: 'JEE',
    specialties: ['Rotational Dynamics', 'Electrodynamics', 'Exam Temperament & Paper Scanning'],
    rating: 4.96,
    sessionsCompleted: 640,
    pricePer15MinInr: 149,
    languages: ['English', 'Hinglish'],
    avatarUrl: '/src/assets/images/mentor_jee_physics_1795708120102.jpg',
    availableNow: true,
    bio: 'Helps JEE Main & Advanced aspirants jump from 120 to 190+ by eliminating Round-1 time sinks and mastering visual free-body shortcuts.',
  },
  {
    id: 'mentor-anjali',
    name: 'Dr. Anjali Sharma',
    headline: 'NCERT Line-by-Line Biology & NEET Strategy',
    collegeBadge: 'AIIMS New Delhi (MBBS)',
    airLabel: 'NEET UG AIR 18',
    examFocus: 'NEET',
    specialties: ['NCERT Line-Trap Mastery', 'Genetics & Biotech', '660+ Score Blueprint'],
    rating: 4.98,
    sessionsCompleted: 810,
    pricePer15MinInr: 149,
    languages: ['English', 'Hindi', 'Hinglish'],
    avatarUrl: '/src/assets/images/mentor_neet_bio_1795708120636.jpg',
    availableNow: true,
    bio: 'Guided 120+ students to Government MBBS seats using spaced-repetition NCERT drills and 35-minute Biology completion pacing.',
  },
  {
    id: 'mentor-rohan',
    name: 'Rohan Kulkarni',
    headline: 'Organic Mechanisms & Physical Chemistry',
    collegeBadge: 'IIT Delhi (Chemical Engg.)',
    airLabel: 'JEE Adv AIR 115',
    examFocus: 'JEE',
    specialties: ['Reaction Chain Maps', 'Chemical & Ionic Equilibrium', 'Inorganic NCERT'],
    rating: 4.93,
    sessionsCompleted: 495,
    pricePer15MinInr: 129,
    languages: ['English', 'Hinglish', 'Marathi'],
    avatarUrl: '/src/assets/images/mentor_jee_chem_1795708121048.jpg',
    availableNow: true,
    bio: 'Turns dreaded Organic named reactions into 4-step logical reagent ladders so students score 85+/100 in JEE Chemistry consistently.',
  },
  {
    id: 'mentor-meera',
    name: 'Meera Nair',
    headline: 'Calculus, Vectors & Class 9–12 Foundation',
    collegeBadge: 'IIT Madras (Electrical Engg.)',
    airLabel: 'JEE Adv AIR 87',
    examFocus: 'Foundation',
    specialties: ['Calculus & 3D Geometry', 'Board + JEE Balancing', 'Backlog Clearance'],
    rating: 4.95,
    sessionsCompleted: 530,
    pricePer15MinInr: 129,
    languages: ['English', 'Hinglish'],
    avatarUrl: '/src/assets/images/mentor_maths_strategy_1795708121459.jpg',
    availableNow: false,
    bio: 'Specializes in realistic 60-day backlog recovery plans for Class 11/12 & Foundation students juggling school boards and competitive tests.',
  },
];

// ============================================================================
// 8. STRUCTURED DOUBT FORUM, BATCH CHAT & PEER STUDY FINDER
// ============================================================================
export const INITIAL_FORUM_POSTS: ForumPost[] = [
  {
    id: 'fp-1',
    category: 'Physics',
    title: 'When does static friction point forward on a rolling cylinder going up an incline?',
    body: 'I always confuse the direction of static friction during pure rolling without slipping on an incline (going up vs coming down). Is there a 10-second rule without writing 3 equations?',
    authorName: 'Kabir Verma',
    authorCohort: 'JEE 2027',
    createdAtLabel: '24m ago',
    upvotes: 38,
    replies: [
      {
        id: 'rep-1',
        authorName: 'Arjun Sharma',
        isVerifiedMentor: true,
        mentorBadge: 'IIT Bombay · AIR 42',
        body: 'Yes! For pure rolling on an incline under gravity alone (no external torque at axle), static friction ALWAYS acts UP the incline — whether the cylinder rolls up or down! Why? Gravity pulls CM down the slope, so friction must provide the opposing torque/retardation to keep a = αR satisfied.',
        createdAtLabel: '12m ago',
      },
    ],
  },
  {
    id: 'fp-2',
    category: 'NEET Biology',
    title: 'NCERT Line-Trap check: Does Taq polymerase stay active during denaturation at 94°C?',
    body: 'Mock test marked my statement wrong when I said Taq polymerase denatures slightly at 94°C. What is the exact NCERT Class 12 Biotech line?',
    authorName: 'Tanya Gupta',
    authorCohort: 'NEET 2027',
    createdAtLabel: '1h ago',
    upvotes: 29,
    replies: [
      {
        id: 'rep-2',
        authorName: 'Dr. Anjali Sharma',
        isVerifiedMentor: true,
        mentorBadge: 'AIIMS Delhi · AIR 18',
        body: 'NCERT Ch. 11 verbatim: Thermostable DNA polymerase isolated from Thermus aquaticus "remains active during the high temperature induced denaturation of double stranded DNA." Never pick options claiming partial denaturation!',
        createdAtLabel: '41m ago',
      },
    ],
  },
  {
    id: 'fp-3',
    category: 'Strategy',
    title: 'Stuck at 128–136 in JEE Main mocks — losing 14 marks to negative marking every paper',
    body: 'My Physics & Chemistry concepts are fine, but whenever 2 hard Maths questions appear back-to-back I panic and guess 4–5 MCQs quickly. How do I stop this?',
    authorName: 'Rohan Mehta',
    authorCohort: 'Dropper Batch',
    createdAtLabel: '3h ago',
    upvotes: 45,
    replies: [
      {
        id: 'rep-3',
        authorName: 'Meera Nair',
        isVerifiedMentor: true,
        mentorBadge: 'IIT Madras · AIR 87',
        body: 'That is textbook Negative-Marking Tilt. Practice the 15-Minute Paper Scanner in Prepskm Arena 3x this week and enforce a hard 90-second rule: if a question does not show a clear path in 90s, tag Yellow and move on immediately.',
        createdAtLabel: '2h ago',
      },
    ],
  },
];

export const INITIAL_BATCH_MESSAGES: BatchChatMessage[] = [
  { id: 'bc-1', room: 'JEE 2027', sender: 'Aarav D.', cohortTag: 'Kota', text: 'Just cleared Electrostatics + Capacitors DPP with 88% accuracy! Who wants to do a 50-min Focus Block on Rotational Dynamics?', timestamp: '06:12 PM' },
  { id: 'bc-2', room: 'JEE 2027', sender: 'Arjun Sharma', cohortTag: 'Verified Mentor', text: 'Tip for tonight’s JEE 2027 sprint: Finish at least 15 PYQs of Current Electricity before checking solutions.', timestamp: '06:18 PM', isMentor: true },
  { id: 'bc-3', room: 'NEET 2027', sender: 'Diya C.', cohortTag: 'Kolkata', text: 'Scored 6/6 on NCERT Line-Trap today! The gymnosperm ovule trap got me last week, never again.', timestamp: '06:05 PM' },
  { id: 'bc-4', room: 'NEET 2027', sender: 'Dr. Anjali Sharma', cohortTag: 'Verified Mentor', text: 'Remember: 340+ in Biology is the fastest bridge to 650+ total. Do 20 min of Molecular Basis flashcards daily.', timestamp: '06:21 PM', isMentor: true },
  { id: 'bc-5', room: 'Dropper Batch', sender: 'Karthik S.', cohortTag: 'Chennai', text: 'Cleared 8 backlog items from Chemical Equilibrium this week using the 5-Stage Mastery Planner. Sunday Weakness Killer mock at 9 AM!', timestamp: '05:54 PM' },
];

export const PEER_ASPIRANTS: PeerAspirant[] = [
  { id: 'peer-1', name: 'Siddharth Rao', targetExam: 'JEE Main 2027', dailyHoursGoal: 8, city: 'Hyderabad', state: 'Telangana', strongSubject: 'Physics', weakSubject: 'Organic Chemistry', streakDays: 18 },
  { id: 'peer-2', name: 'Anushka Joshi', targetExam: 'NEET UG 2027', dailyHoursGoal: 9, city: 'Pune', state: 'Maharashtra', strongSubject: 'Biology', weakSubject: 'Physics Mechanics', streakDays: 24 },
  { id: 'peer-3', name: 'Devansh Tiwari', targetExam: 'JEE Adv 2027', dailyHoursGoal: 10, city: 'Kota', state: 'Rajasthan', strongSubject: 'Mathematics', weakSubject: 'Inorganic Chemistry', streakDays: 31 },
  { id: 'peer-4', name: 'Nandini Iyer', targetExam: 'NEET UG 2027', dailyHoursGoal: 7, city: 'Bengaluru', state: 'Karnataka', strongSubject: 'Chemistry', weakSubject: 'Ray Optics', streakDays: 14 },
  { id: 'peer-5', name: 'Harshvardhan Singh', targetExam: 'Dropper Batch', dailyHoursGoal: 11, city: 'Lucknow', state: 'Uttar Pradesh', strongSubject: 'Physics', weakSubject: 'Calculus', streakDays: 27 },
  { id: 'peer-6', name: 'Ishita Sen', targetExam: 'JEE Main 2027', dailyHoursGoal: 6, city: 'Kolkata', state: 'West Bengal', strongSubject: 'Chemistry', weakSubject: '3D Geometry', streakDays: 12 },
];
