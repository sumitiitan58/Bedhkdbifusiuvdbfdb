export type EscapeDifficulty = 'JEE Main' | 'JEE Advanced';
export type EscapeEdition = 'cyber-lab' | 'khandahar';

export interface CyberPeriodicPuzzle {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  concept: string;
  hint: string;
  digit: number;
}

export interface CyberMixingPuzzle {
  id: string;
  prompt: string;
  reagents: string[];
  correctReagentIndex: number;
  equationDisplay: string;
  speciesLabels: [string, string, string];
  targetCoefficients: [number, number, number];
  concept: string;
  hint: string;
  digit: number;
}

export interface CyberOrganicStep {
  stepLabel: string;
  prompt: string;
  options: string[];
  correctIndex: number;
}

export interface CyberOrganicPuzzle {
  id: string;
  title: string;
  steps: [CyberOrganicStep, CyberOrganicStep, CyberOrganicStep];
  concept: string;
  hint: string;
  digit: number;
}

export interface CyberLaserPuzzle {
  id: string;
  question: string;
  unit: string;
  expectedValue: number;
  tolerance: number;
  concept: string;
  hint: string;
  digit: number;
}

export interface CyberFinalOverridePuzzle {
  id: string;
  prompt: string;
  equationDisplay: string;
  speciesLabels: [string, string, string];
  targetCoefficients: [number, number, number];
  concept: string;
}

export interface CyberLabRunState {
  difficulty: EscapeDifficulty;
  timeRemainingSec: number;
  oxygenPercent: number;
  score: number;
  attempts: number;
  correctCount: number;
  hintsRemaining: number;
  digits: [number | null, number | null, number | null, number | null];
  inventory: {
    labKeycard: boolean;
    catalystVial: boolean;
    ventChip: boolean;
    laserPass: boolean;
  };
  solvedStations: {
    periodicSafe: boolean;
    mixingBench: boolean;
    fumeHood: boolean;
    laserTerminal: boolean;
    blastDoor: boolean;
  };
  puzzles: {
    periodic: CyberPeriodicPuzzle;
    mixing: CyberMixingPuzzle;
    organic: CyberOrganicPuzzle;
    laser: CyberLaserPuzzle;
    override: CyberFinalOverridePuzzle;
  };
  status: 'playing' | 'escaped' | 'failed';
  failReason?: string;
}

export interface KhandaharClueQuestion {
  slotIndex: number;
  doorName: string;
  doorType: 'rusted-iron' | 'charred-oak' | 'stone-arch' | 'alchemist-vault' | 'blast-core';
  question: string;
  options: string[];
  correctIndex: number;
  digit: number;
  spokenHint: string;
  concept: string;
}

export interface KhandaharChamberState {
  level: 1 | 2 | 3;
  chamberTitle: string;
  difficultyLabel: string;
  timeRemainingSec: number;
  score: number;
  attempts: number;
  correctCount: number;
  passcode: [number, number, number, number];
  unlockedHints: [string | null, string | null, string | null, string | null];
  unlockedDigits: [number | null, number | null, number | null, number | null];
  solvedSlots: [boolean, boolean, boolean, boolean];
  clues: KhandaharClueQuestion[];
  status: 'playing' | 'escaped' | 'detonated';
}

export const HANDWRITTEN_FORMULA_SHEETS = {
  Physical: [
    'Ideal Gas: PV = nRT  (R = 8.314 J mol⁻¹ K⁻¹ = 0.0821 L atm mol⁻¹ K⁻¹)',
    'First-Order Kinetics: t₁/₂ = 0.693 / k  |  k = (2.303 / t) log([A]₀/[A])',
    'Nernst Equation (298 K): E = E° − (0.0591 / n) log Q',
    'Gibbs Free Energy: ΔG° = −nFE° = −2.303 RT log K',
    'pH of Buffer (Henderson): pH = pKₐ + log([Salt]/[Acid])',
  ],
  Organic: [
    'Aldol Condensation: 2 R-CH₂-CHO + dil. NaOH → β-hydroxy aldehyde → α,β-unsaturated aldehyde',
    'Cannizzaro Reaction: Aldehydes without α-H + conc. NaOH → Alcohol + Carboxylate salt',
    'Ozonolysis (Reductive): R₂C=CR\'₂ + O₃ / Zn-H₂O → R₂C=O + O=CR\'₂',
    'Hofmann Bromamide: R-CONH₂ + Br₂ + 4 NaOH → R-NH₂ (one carbon less)',
    'Sandmeyer: Ar-N₂⁺Cl⁻ + CuCl/HCl → Ar-Cl  |  CuCN/KCN → Ar-CN',
  ],
  Inorganic: [
    'CrO₅ Butterfly Structure: Two peroxo (-O-O-) bridges → Oxidation state of Cr = +6',
    'VSEPR: XeF₄ (sp³d², 2 LP) = Square Planar | SF₆ (sp³d²) = Octahedral | ClF₃ = T-shaped',
    'Spin-only Magnetic Moment: μ = √[n(n + 2)] BM  (n = unpaired electrons)',
    'Crystal Field (Octahedral): t₂g (−0.4 Δ₀) and e_g (+0.6 Δ₀); CN⁻/CO are strong-field ligands',
    'KMnO₄ n-factor: Acidic = 5 (Mn²⁺), Neutral = 3 (MnO₂), Strongly Alkaline = 1 (MnO₄²⁻)',
  ],
} as const;

function seededPick<T>(arr: readonly T[], seed: number): T {
  const idx = Math.abs(Math.floor(seed)) % arr.length;
  return arr[idx];
}

const PERIODIC_POOL: Record<EscapeDifficulty, CyberPeriodicPuzzle[]> = {
  'JEE Main': [
    {
      id: 'per-m1',
      question: 'What is the oxidation state of Chromium (Cr) in blue butterfly peroxide CrO₅?',
      options: ['+4', '+6', '+8', '+10'],
      correctIndex: 1,
      concept: 'Redox & Peroxo Linkages (CrO₅)',
      hint: 'CrO₅ has two peroxide (-O-O-) bonds (−1 each) and one oxo (=O) bond (−2).',
      digit: 6,
    },
    {
      id: 'per-m2',
      question: 'How many unpaired electrons are present in high-spin [Fe(H₂O)₆]²⁺ (Z of Fe = 26)?',
      options: ['2', '3', '4', '5'],
      correctIndex: 2,
      concept: 'Coordination Compounds & CFT',
      hint: 'Fe²⁺ is 3d⁶; H₂O is a weak-field ligand giving t₂g⁴ e_g².',
      digit: 4,
    },
    {
      id: 'per-m3',
      question: 'In acidic medium, the n-factor of KMnO₄ as an oxidizing agent (MnO₄⁻ → Mn²⁺) is:',
      options: ['1', '3', '5', '7'],
      correctIndex: 2,
      concept: 'd-Block Oxidizing Power',
      hint: 'Manganese drops from +7 in MnO₄⁻ to +2 in Mn²⁺.',
      digit: 5,
    },
  ],
  'JEE Advanced': [
    {
      id: 'per-a1',
      question: 'Total number of P–O–P linkages present in cyclic trimetaphosphoric acid (HPO₃)₃ is:',
      options: ['2', '3', '4', '6'],
      correctIndex: 1,
      concept: 'p-Block Oxoacids of Phosphorus',
      hint: 'Three PO₄ tetrahedra share corners to form a 6-membered alternating P–O ring.',
      digit: 3,
    },
    {
      id: 'per-a2',
      question: 'Number of lone pairs on the central Xenon atom in square-planar XeF₄ is:',
      options: ['1', '2', '3', '0'],
      correctIndex: 1,
      concept: 'VSEPR Theory & Noble Gases',
      hint: 'Xe has 8 valence e⁻; 4 form σ bonds with F, leaving 4 non-bonding e⁻.',
      digit: 2,
    },
    {
      id: 'per-a3',
      question: 'Total number of stereoisomers (including optical) of [Co(en)₂Cl₂]⁺ is:',
      options: ['2', '3', '4', '5'],
      correctIndex: 1,
      concept: 'Isomerism in Coordination Complexes',
      hint: 'Trans is optically inactive (1), while Cis exists as a d/l enantiomeric pair (2).',
      digit: 3,
    },
  ],
};

const MIXING_POOL: Record<EscapeDifficulty, CyberMixingPuzzle[]> = {
  'JEE Main': [
    {
      id: 'mix-m1',
      prompt: 'Select the oxidizing acid reagent and balance the copper-nitric acid neutralization.',
      reagents: ['H₂O (Water)', 'NH₃ (Ammonia)', 'HCl (Hydrochloric Acid)'],
      correctReagentIndex: 1,
      equationDisplay: 'a N₂ + b H₂ → c NH₃ (Haber Catalyst Synthesis)',
      speciesLabels: ['a (N₂)', 'b (H₂)', 'c (NH₃)'],
      targetCoefficients: [1, 3, 2],
      concept: 'Stoichiometry & Haber Process',
      hint: '1 mole N₂ reacts with 3 moles H₂ to yield 2 moles NH₃.',
      digit: 2,
    },
    {
      id: 'mix-m2',
      prompt: 'Choose the catalyst reagent for peroxide decomposition and balance the equation.',
      reagents: ['MnO₂ Catalyst', 'NaCl Brine', 'Dry Ether'],
      correctReagentIndex: 0,
      equationDisplay: 'a H₂O₂ → b H₂O + c O₂',
      speciesLabels: ['a (H₂O₂)', 'b (H₂O)', 'c (O₂)'],
      targetCoefficients: [2, 2, 1],
      concept: 'Stoichiometry & Redox Decomposition',
      hint: 'Balance oxygen atoms carefully: 2 H₂O₂ produces 2 H₂O and 1 O₂.',
      digit: 2,
    },
  ],
  'JEE Advanced': [
    {
      id: 'mix-a1',
      prompt: 'Select the strong dehydrating agent and balance thermite oxide reduction.',
      reagents: ['Al Powder (Thermite)', 'CaCO₃ Chalk', 'CCl₄ Solvent'],
      correctReagentIndex: 0,
      equationDisplay: 'a Fe₂O₃ + b Al → c Fe + Al₂O₃',
      speciesLabels: ['a (Fe₂O₃)', 'b (Al)', 'c (Fe)'],
      targetCoefficients: [1, 2, 2],
      concept: 'Metallurgy & Thermite Stoichiometry',
      hint: '1 Fe₂O₃ needs 2 Al to form 1 Al₂O₃ and release 2 Fe.',
      digit: 2,
    },
    {
      id: 'mix-a2',
      prompt: 'Pick the reagent for Ostwald ammonia oxidation and balance NO synthesis.',
      reagents: ['Pt/Rh Gauze Catalyst', 'Zn/HCl Amalgam', 'LiAlH₄'],
      correctReagentIndex: 0,
      equationDisplay: 'a Fe + b H₂O(steam) → Fe₃O₄ + c H₂',
      speciesLabels: ['a (Fe)', 'b (H₂O)', 'c (H₂)'],
      targetCoefficients: [3, 4, 4],
      concept: 'Redox Balancing (Steam-Iron)',
      hint: 'Fe₃O₄ requires 3 Fe and 4 O atoms, releasing 4 H₂.',
      digit: 4,
    },
  ],
};

const ORGANIC_POOL: Record<EscapeDifficulty, CyberOrganicPuzzle[]> = {
  'JEE Main': [
    {
      id: 'org-m1',
      title: 'Synthesize Aniline → Chlorobenzene → Phenol Pathway',
      steps: [
        {
          stepLabel: 'Step 1: Diazotization',
          prompt: 'Convert Aniline (C₆H₅NH₂) at 0–5°C into Benzene Diazonium Chloride using:',
          options: ['NaNO₂ + HCl', 'Br₂ / FeBr₃', 'KMnO₄ / H⁺'],
          correctIndex: 0,
        },
        {
          stepLabel: 'Step 2: Sandmeyer Reaction',
          prompt: 'Replace –N₂⁺Cl⁻ with –Cl using Sandmeyer reagent:',
          options: ['CuCl / HCl', 'NaBH₄ / EtOH', 'O₃ / Zn-H₂O'],
          correctIndex: 0,
        },
        {
          stepLabel: 'Step 3: Dow Process',
          prompt: 'Convert Chlorobenzene to Phenol at 623 K, 300 atm followed by H⁺:',
          options: ['NaOH (aq) then H⁺', 'PCl₅', 'SOCl₂'],
          correctIndex: 0,
        },
      ],
      concept: 'Diazonium & Sandmeyer Organic Chain',
      hint: 'Diazotization uses NaNO₂ + HCl (0–5°C), Sandmeyer uses CuCl/HCl, Dow uses NaOH.',
      digit: 7,
    },
    {
      id: 'org-m2',
      title: 'Aldol & Cannizzaro Fume Scrubbing Sequence',
      steps: [
        {
          stepLabel: 'Step 1: Rosenmund Reduction',
          prompt: 'Convert Benzoyl Chloride (PhCOCl) selectively to Benzaldehyde (PhCHO):',
          options: ['H₂, Pd-BaSO₄', 'LiAlH₄ (excess)', 'Conc. HNO₃'],
          correctIndex: 0,
        },
        {
          stepLabel: 'Step 2: Cannizzaro Check',
          prompt: 'Treating Benzaldehyde (no α-H) with conc. NaOH yields:',
          options: ['Benzyl alcohol + Sodium benzoate', 'Cinnamaldehyde', 'Benzoic anhydride'],
          correctIndex: 0,
        },
        {
          stepLabel: 'Step 3: Hofmann Bromamide',
          prompt: 'Benzamide + Br₂ + 4 NaOH produces which primary amine?',
          options: ['Aniline (PhNH₂)', 'Benzylamine (PhCH₂NH₂)', 'Nitrobenzene'],
          correctIndex: 0,
        },
      ],
      concept: 'Carbonyl & Amine Named Reactions',
      hint: 'Rosenmund uses Pd-BaSO₄; Cannizzaro disproportionates PhCHO; Hofmann steps down 1 carbon.',
      digit: 8,
    },
  ],
  'JEE Advanced': [
    {
      id: 'org-a1',
      title: 'Multi-Step Aromatic Rearrangement Scrubber',
      steps: [
        {
          stepLabel: 'Step 1: Reimer-Tiemann',
          prompt: 'Phenol + CHCl₃ + aq. NaOH followed by H⁺ introduces which ortho group?',
          options: ['–CHO (Salicylaldehyde)', '–COOH (Salicylic acid)', '–CN'],
          correctIndex: 0,
        },
        {
          stepLabel: 'Step 2: Perkin / Knoevenagel',
          prompt: 'Which intermediate carbene drives Reimer-Tiemann formylation?',
          options: [':CCl₂ (Dichlorocarbene)', ':CH₂ (Methylene)', 'CCl₃⁺ carbocation'],
          correctIndex: 0,
        },
        {
          stepLabel: 'Step 3: Kolbe Electrolysis',
          prompt: 'Electrolysis of aqueous CH₃COONa yields which alkane at the anode?',
          options: ['Ethane (C₂H₆)', 'Methane (CH₄)', 'Propane (C₃H₈)'],
          correctIndex: 0,
        },
      ],
      concept: 'Carbene Intermediates & Kolbe Synthesis',
      hint: 'Reimer-Tiemann proceeds via :CCl₂ to give –CHO; Kolbe dimerizes CH₃· radicals to ethane.',
      digit: 9,
    },
  ],
};

const LASER_POOL: Record<EscapeDifficulty, CyberLaserPuzzle[]> = {
  'JEE Main': [
    {
      id: 'las-m1',
      question: 'Calculate the pH of a 0.001 M aqueous HCl solution at 298 K (strong acid, complete dissociation).',
      unit: 'pH',
      expectedValue: 3,
      tolerance: 0.05,
      concept: 'Ionic Equilibrium — Strong Acid pH',
      hint: '[H⁺] = 10⁻³ M, so pH = −log₁₀(10⁻³) = 3.',
      digit: 3,
    },
    {
      id: 'las-m2',
      question: 'A first-order reaction has rate constant k = 0.0693 s⁻¹. Find its half-life t₁/₂ in seconds.',
      unit: 's',
      expectedValue: 10,
      tolerance: 0.2,
      concept: 'Chemical Kinetics — First-Order Half-Life',
      hint: 'Use t₁/₂ = 0.693 / k = 0.693 / 0.0693.',
      digit: 9,
    },
    {
      id: 'las-m3',
      question: 'How many moles of electrons (Faradays) are needed to deposit 2 moles of Cu from CuSO₄(aq)?',
      unit: 'F',
      expectedValue: 4,
      tolerance: 0.05,
      concept: 'Electrochemistry — Faraday Laws',
      hint: 'Cu²⁺ + 2e⁻ → Cu, so 2 moles Cu need 2 × 2 = 4 Faradays.',
      digit: 4,
    },
  ],
  'JEE Advanced': [
    {
      id: 'las-a1',
      question: 'For a Daniell cell with E° = 1.10 V at 298 K and [Zn²⁺]/[Cu²⁺] = 100, find E_cell (use 0.06/2).',
      unit: 'V',
      expectedValue: 1.04,
      tolerance: 0.03,
      concept: 'Electrochemistry — Nernst Equation',
      hint: 'E = 1.10 − (0.06/2) log(100) = 1.10 − 0.03 × 2 = 1.04 V.',
      digit: 4,
    },
    {
      id: 'las-a2',
      question: 'For an acidic buffer with pKₐ = 4.75 and [Salt]/[Acid] = 10, compute the exact pH.',
      unit: 'pH',
      expectedValue: 5.75,
      tolerance: 0.05,
      concept: 'Henderson-Hasselbalch Buffer Equation',
      hint: 'pH = pKₐ + log(10) = 4.75 + 1 = 5.75.',
      digit: 5,
    },
  ],
};

const OVERRIDE_POOL: CyberFinalOverridePuzzle[] = [
  {
    id: 'ovr-1',
    prompt: 'Balance the Hydraulic Fuel Cell override equation to depressurize the blast door:',
    equationDisplay: 'a CH₄ + b O₂ → CO₂ + c H₂O',
    speciesLabels: ['a (CH₄)', 'b (O₂)', 'c (H₂O)'],
    targetCoefficients: [1, 2, 2],
    concept: 'Combustion Stoichiometry Override',
  },
  {
    id: 'ovr-2',
    prompt: 'Balance the Ammonia Emergency Neutralizer to unlock the Hydraulic Blast Door:',
    equationDisplay: 'a H₂ + b O₂ → c H₂O',
    speciesLabels: ['a (H₂)', 'b (O₂)', 'c (H₂O)'],
    targetCoefficients: [2, 1, 2],
    concept: 'Hydrogen Fuel Cell Balancing',
  },
];

export function createCyberLabRun(
  difficulty: EscapeDifficulty,
  seed = Date.now()
): CyberLabRunState {
  const periodic = seededPick(PERIODIC_POOL[difficulty], seed);
  const mixing = seededPick(MIXING_POOL[difficulty], seed + 3);
  const organic = seededPick(ORGANIC_POOL[difficulty], seed + 7);
  const laser = seededPick(LASER_POOL[difficulty], seed + 11);
  const override = seededPick(OVERRIDE_POOL, seed + 13);

  return {
    difficulty,
    timeRemainingSec: 600, // 10:00 countdown
    oxygenPercent: 100,
    score: 0,
    attempts: 0,
    correctCount: 0,
    hintsRemaining: 3,
    digits: [null, null, null, null],
    inventory: {
      labKeycard: false,
      catalystVial: false,
      ventChip: false,
      laserPass: false,
    },
    solvedStations: {
      periodicSafe: false,
      mixingBench: false,
      fumeHood: false,
      laserTerminal: false,
      blastDoor: false,
    },
    puzzles: { periodic, mixing, organic, laser, override },
    status: 'playing',
  };
}

export function applyCyberLabPenalty(state: CyberLabRunState): CyberLabRunState {
  const nextTime = Math.max(0, state.timeRemainingSec - 20);
  const nextO2 = Math.max(0, state.oxygenPercent - 10);
  const failed = nextTime <= 0 || nextO2 <= 0;
  return {
    ...state,
    timeRemainingSec: nextTime,
    oxygenPercent: nextO2,
    attempts: state.attempts + 1,
    status: failed ? 'failed' : state.status,
    failReason: failed
      ? nextO2 <= 0
        ? 'Oxygen Integrity depleted to 0% in Sector 7.'
        : 'Containment timer expired before blast door override.'
      : state.failReason,
  };
}

export function checkStoichiometryBalance(
  input: [number, number, number],
  target: [number, number, number]
): boolean {
  return (
    input[0] === target[0] &&
    input[1] === target[1] &&
    input[2] === target[2]
  );
}

export function checkNumericalAnswer(
  rawInput: string,
  expected: number,
  tolerance: number
): boolean {
  const parsed = Number.parseFloat(rawInput.trim());
  if (!Number.isFinite(parsed)) return false;
  return Math.abs(parsed - expected) <= tolerance;
}

export function computeEscapeRank(state: CyberLabRunState): {
  rank: 'S' | 'A' | 'B';
  accuracyPercent: number;
  conceptsMastered: string[];
} {
  const accuracyPercent =
    state.attempts > 0
      ? Math.round((state.correctCount / state.attempts) * 100)
      : 100;
  const rank: 'S' | 'A' | 'B' =
    accuracyPercent >= 85 && state.timeRemainingSec >= 240 && state.oxygenPercent >= 80
      ? 'S'
      : accuracyPercent >= 65 && state.oxygenPercent >= 50
        ? 'A'
        : 'B';
  const conceptsMastered = [
    state.puzzles.periodic.concept,
    state.puzzles.mixing.concept,
    state.puzzles.organic.concept,
    state.puzzles.laser.concept,
    state.puzzles.override.concept,
  ];
  return { rank, accuracyPercent, conceptsMastered };
}

// ==========================================
// KHANDAHAR (RUINED BUILDING) EDITION
// ==========================================

interface KhandaharTemplate {
  question: string;
  options: string[];
  correctIndex: number;
  digit: number;
  spokenHint: string;
  concept: string;
}

const KHANDAHAR_POOLS: Record<1 | 2 | 3, KhandaharTemplate[]> = {
  1: [
    {
      question: 'What is the atomic number of Carbon, the backbone of organic chemistry?',
      options: ['4', '6', '8', '12'],
      correctIndex: 1,
      digit: 6,
      spokenHint: 'Correct! Digit 1 is 6 — the atomic number of Carbon.',
      concept: 'Atomic Structure — Carbon',
    },
    {
      question: 'Pure neutral water at 298 K has a pH value equal to:',
      options: ['5', '6', '7', '8'],
      correctIndex: 2,
      digit: 7,
      spokenHint: 'Well done! Digit 2 is 7 — the neutral pH of pure water.',
      concept: 'Acids, Bases & pH Scale',
    },
    {
      question: 'How many covalent bonds does a single Carbon atom form in Methane (CH₄)?',
      options: ['2', '3', '4', '6'],
      correctIndex: 2,
      digit: 4,
      spokenHint: 'Brilliant! Digit 3 is 4 — the tetravalency of Carbon.',
      concept: 'Chemical Bonding — Tetravalency',
    },
    {
      question: 'What is the atomic number of Oxygen (O), vital for breathing in this ruin?',
      options: ['6', '7', '8', '9'],
      correctIndex: 2,
      digit: 8,
      spokenHint: 'Awesome! Digit 4 is 8 — the atomic number of Oxygen.',
      concept: 'Periodic Table Fundamentals',
    },
    {
      question: 'How many hydrogen atoms are in one molecule of Ammonia (NH₃)?',
      options: ['2', '3', '4', '5'],
      correctIndex: 1,
      digit: 3,
      spokenHint: 'Sharp work! This code digit is 3 — three hydrogens in NH₃.',
      concept: 'Molecular Formulae',
    },
  ],
  2: [
    {
      question: 'What is the oxidation number of Sulfur in Sulfuric Acid (H₂SO₄)?',
      options: ['+4', '+5', '+6', '+2'],
      correctIndex: 2,
      digit: 6,
      spokenHint: 'Correct! The digit is 6 — Sulfur sits at +6 in H₂SO₄.',
      concept: 'Redox Oxidation States',
    },
    {
      question: 'How many π-bonds exist inside one Benzene ring (C₆H₆)?',
      options: ['2', '3', '4', '6'],
      correctIndex: 1,
      digit: 3,
      spokenHint: 'Great job! The digit is 3 — three delocalized pi bonds in Benzene.',
      concept: 'Aromaticity & Bonding',
    },
    {
      question: 'What is the bond order of the Nitrogen molecule (N₂) from Molecular Orbital Theory?',
      options: ['1', '2', '3', '4'],
      correctIndex: 2,
      digit: 3,
      spokenHint: 'Unlocked! The digit is 3 — triple bond order of dinitrogen.',
      concept: 'Molecular Orbital Theory',
    },
    {
      question: 'In the n-factor of KMnO₄ in acidic solution (MnO₄⁻ → Mn²⁺), how many electrons are gained?',
      options: ['3', '4', '5', '7'],
      correctIndex: 2,
      digit: 5,
      spokenHint: 'Right! The digit is 5 — five electrons transferred in acidic KMnO₄.',
      concept: 'Volumetric Redox Titrations',
    },
    {
      question: 'Number of σ-bonds around the central Phosphorus in PCl₅ (trigonal bipyramidal) is:',
      options: ['3', '4', '5', '6'],
      correctIndex: 2,
      digit: 5,
      spokenHint: 'Correct! The digit is 5 — five P–Cl sigma bonds in PCl₅.',
      concept: 'VSEPR & Hybridization',
    },
  ],
  3: [
    {
      question: 'How many geometric + optical stereoisomers exist for octahedral [Co(en)₂Cl₂]⁺?',
      options: ['2', '3', '4', '6'],
      correctIndex: 1,
      digit: 3,
      spokenHint: 'Precision mastery! The vault digit is 3 — cis d/l pair plus trans.',
      concept: 'JEE Adv Coordination Stereoisomerism',
    },
    {
      question: 'In P₄O₁₀ (phosphorus pentoxide), how many P=O terminal double bonds exist?',
      options: ['2', '4', '6', '8'],
      correctIndex: 1,
      digit: 4,
      spokenHint: 'Confirmed! The vault digit is 4 — four terminal P=O bonds in P₄O₁₀.',
      concept: 'p-Block Oxide Cage Structures',
    },
    {
      question: 'The number of radial nodes in a 4s orbital (n − l − 1) equals:',
      options: ['1', '2', '3', '4'],
      correctIndex: 2,
      digit: 3,
      spokenHint: 'Exact! The vault digit is 3 — three radial nodes in a 4s orbital.',
      concept: 'Quantum Mechanical Atomic Model',
    },
    {
      question: 'Maximum number of unpaired electrons in Cr (Z = 24, [Ar] 3d⁵ 4s¹) ground state is:',
      options: ['4', '5', '6', '7'],
      correctIndex: 2,
      digit: 6,
      spokenHint: 'Disarm clue secured! The digit is 6 — six unpaired electrons in Chromium.',
      concept: 'Electronic Configuration Exceptions',
    },
    {
      question: 'How many chiral centers are present in open-chain D-Glucose?',
      options: ['2', '3', '4', '5'],
      correctIndex: 2,
      digit: 4,
      spokenHint: 'Unlocked! The vault digit is 4 — four chiral carbons in open-chain D-Glucose.',
      concept: 'Biomolecules & Stereochemistry',
    },
  ],
};

const LEVEL_DOOR_META: Record<
  1 | 2 | 3,
  {
    title: string;
    difficultyLabel: string;
    timerSec: number;
    doors: Array<{ name: string; type: KhandaharClueQuestion['doorType'] }>;
  }
> = {
  1: {
    title: 'Level 1 — Outer Ruined Hall',
    difficultyLabel: 'Easy / Foundation',
    timerSec: 420,
    doors: [
      { name: 'Rusted Iron Gate', type: 'rusted-iron' },
      { name: 'Charred Oak Door', type: 'charred-oak' },
      { name: 'Crumbling Stone Arch', type: 'stone-arch' },
      { name: 'Shattered Cellar Hatch', type: 'rusted-iron' },
    ],
  },
  2: {
    title: 'Level 2 — Alchemical Sanctum',
    difficultyLabel: 'Moderate / JEE Main',
    timerSec: 360,
    doors: [
      { name: 'Alchemist Vault Door', type: 'alchemist-vault' },
      { name: 'Mossy Crypt Portal', type: 'stone-arch' },
      { name: 'Charred Oak Door', type: 'charred-oak' },
      { name: 'Copper Seal Gate', type: 'rusted-iron' },
    ],
  },
  3: {
    title: 'Level 3 — Reactor Blast Vault',
    difficultyLabel: 'Hard / JEE Advanced',
    timerSec: 300,
    doors: [
      { name: 'Blast Core Door', type: 'blast-core' },
      { name: 'Alchemist Vault Door', type: 'alchemist-vault' },
      { name: 'Rusted Iron Gate', type: 'rusted-iron' },
      { name: 'Crumbling Stone Arch', type: 'stone-arch' },
    ],
  },
};

export function createKhandaharRun(level: 1 | 2 | 3, seed = Date.now()): KhandaharChamberState {
  const pool = [...KHANDAHAR_POOLS[level]];
  // Deterministic shuffle based on seed so every fresh run randomizes questions & passcode
  let s = Math.abs(Math.floor(seed)) + 17;
  for (let i = pool.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) % 4294967296;
    const j = s % (i + 1);
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }

  const chosen = pool.slice(0, 4);
  const meta = LEVEL_DOOR_META[level];
  const clues: KhandaharClueQuestion[] = chosen.map((tpl, idx) => ({
    slotIndex: idx,
    doorName: meta.doors[idx].name,
    doorType: meta.doors[idx].type,
    question: tpl.question,
    options: tpl.options,
    correctIndex: tpl.correctIndex,
    digit: tpl.digit,
    spokenHint: tpl.spokenHint,
    concept: tpl.concept,
  }));

  const passcode: [number, number, number, number] = [
    clues[0].digit,
    clues[1].digit,
    clues[2].digit,
    clues[3].digit,
  ];

  return {
    level,
    chamberTitle: meta.title,
    difficultyLabel: meta.difficultyLabel,
    timeRemainingSec: meta.timerSec,
    score: 0,
    attempts: 0,
    correctCount: 0,
    passcode,
    unlockedHints: [null, null, null, null],
    unlockedDigits: [null, null, null, null],
    solvedSlots: [false, false, false, false],
    clues,
    status: 'playing',
  };
}

export function verifyKhandaharPasscode(
  state: KhandaharChamberState,
  enteredCode: string
): { success: boolean; nextState: KhandaharChamberState; voiceLine: string } {
  const expected = state.passcode.join('');
  const cleaned = enteredCode.replace(/\D/g, '').slice(0, 4);
  if (cleaned === expected) {
    return {
      success: true,
      nextState: {
        ...state,
        status: 'escaped',
        score: state.score + 500 + Math.round(state.timeRemainingSec * 2),
      },
      voiceLine:
        'Lock disarmed! The child survivor is safe and the ruined chamber gate is open!',
    };
  }
  return {
    success: false,
    nextState: {
      ...state,
      status: 'detonated',
    },
    voiceLine: 'Boom! Wrong code! Explosion triggered. You are dead!',
  };
}
