import type { TestAttemptRecord, TestQuestionRecord } from '../types';

export type MistakeErrorTag =
  | 'calculation-error'
  | 'formula-forgotten'
  | 'question-misread'
  | 'weak-concept';

export interface MistakeErrorTagOption {
  id: MistakeErrorTag;
  label: string;
  shortLabel: string;
  colorClass: string;
}

export const MISTAKE_ERROR_TAG_OPTIONS: MistakeErrorTagOption[] = [
  {
    id: 'calculation-error',
    label: '[Calculation Error]',
    shortLabel: 'Calculation Error',
    colorClass: 'border-[#F27B13]/50 bg-[#F27B13]/15 text-[#F27B13]',
  },
  {
    id: 'formula-forgotten',
    label: '[Formula Forgotten]',
    shortLabel: 'Formula Forgotten',
    colorClass: 'border-[#00B4FF]/50 bg-[#00B4FF]/15 text-[#00B4FF]',
  },
  {
    id: 'question-misread',
    label: '[Question Misread]',
    shortLabel: 'Question Misread',
    colorClass: 'border-amber-400/50 bg-amber-500/15 text-amber-400',
  },
  {
    id: 'weak-concept',
    label: '[Weak Concept]',
    shortLabel: 'Weak Concept',
    colorClass: 'border-[#F43F5E]/50 bg-[#F43F5E]/15 text-[#F43F5E]',
  },
];

export interface XpLevelProgress {
  level: number;
  xpPerLevel: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progressPercent: number;
}

export function getLevelFromXp(seasonXp: number, xpPerLevel = 250): XpLevelProgress {
  const safeXp = Math.max(0, Math.floor(seasonXp));
  const safeStep = Math.max(50, xpPerLevel);
  const level = Math.floor(safeXp / safeStep) + 1;
  const currentLevelXp = safeXp % safeStep;
  return {
    level,
    xpPerLevel: safeStep,
    currentLevelXp,
    nextLevelXp: safeStep,
    progressPercent: Math.round((currentLevelXp / safeStep) * 100),
  };
}

export interface PercentileRangeBand {
  low: number;
  high: number;
  label: string;
  bandSummary: string;
}

export function computeExpectedPercentileRange(
  predictedPercentile: number,
  examCategory = 'JEE Main'
): PercentileRangeBand {
  const clamped = Math.max(1, Math.min(99.98, predictedPercentile));
  const halfSpread = clamped >= 99 ? 0.22 : clamped >= 95 ? 0.45 : clamped >= 85 ? 0.9 : 1.5;
  const low = Number(Math.max(1, clamped - halfSpread).toFixed(2));
  const high = Number(Math.min(99.99, clamped + halfSpread).toFixed(2));
  const isNeet = examCategory.toLowerCase().includes('neet');
  const bandSummary = isNeet
    ? clamped >= 99
      ? 'Top Govt. MBBS / AIIMS Competitive Band'
      : clamped >= 95
        ? 'State Quota Govt. Medical Target Band'
        : 'High-Growth Score Recovery Band'
    : clamped >= 99
      ? 'Top NIT CSE / IIIT-H / JEE Adv Top-5k Band'
      : clamped >= 96
        ? 'Core NIT / IIIT Branch & Safe JEE Adv Cutoff Band'
        : 'Rapid +35 Marks Jump Opportunity Band';

  return {
    low,
    high,
    label: `${low.toFixed(2)}%ile – ${high.toFixed(2)}%ile`,
    bandSummary,
  };
}

export interface UniquePyqConceptGroup {
  id: string;
  conceptTitle: string;
  frequencyCount: number;
  yearsLabel: string;
  examTag: string;
  representativeQuestion: string;
  formulaLatex: string;
  answer: string;
  shortcutTip: string;
}

export interface NcertXrayMapping {
  id: string;
  ncertRef: string;
  ncertLine: string;
  highlightedPhrase: string;
  pyqExamYear: string;
  pyqPrompt: string;
  pyqAnswer: string;
  trapNote: string;
}

export interface FlipFormulaCardItem {
  id: string;
  conceptPrompt: string;
  formulaLatex: string;
  shortcutTrick: string;
  unitOrCondition: string;
}

export interface ChapterStudyPack {
  uniquePyqGroups: UniquePyqConceptGroup[];
  ncertXrayMappings: NcertXrayMapping[];
  flipFormulaCards: FlipFormulaCardItem[];
}

export function getChapterStudyPack(
  chapterName: string,
  subjectName: string
): ChapterStudyPack {
  const sub = subjectName.toLowerCase();
  const ch = chapterName.trim() || 'Core Chapter';

  if (sub.includes('chem')) {
    return {
      uniquePyqGroups: [
        {
          id: 'chem-pyq-1',
          conceptTitle: `${ch} — Reagent Selectivity & Major Product Trap`,
          frequencyCount: 8,
          yearsLabel: '2019, 2020, 2022, 2023, 2024, 2025',
          examTag: 'JEE Main & NEET',
          representativeQuestion:
            'Which reagent selectively reduces an aldehyde (-CHO) to a primary alcohol (-CH₂OH) without touching an isolated C=C double bond?',
          formulaLatex: '\\text{R-CH=CH-CHO} \\xrightarrow{\\text{NaBH}_4/\\text{EtOH}} \\text{R-CH=CH-CH}_2\\text{OH}',
          answer: 'NaBH₄ in Ethanol (mild chemoselective hydride donor)',
          shortcutTip: 'NaBH₄ spares C=C, esters, and nitro groups; LiAlH₄ reduces almost everything.',
        },
        {
          id: 'chem-pyq-2',
          conceptTitle: 'Rate Law, Half-Life & Temperature Dependence',
          frequencyCount: 6,
          yearsLabel: '2020, 2021, 2023, 2024, 2025',
          examTag: 'JEE Main Numerical',
          representativeQuestion:
            'For a first-order reaction, how does the time required for 99.9% completion compare to its half-life t₁/₂?',
          formulaLatex: 't_{99.9\\%} = \\frac{2.303}{k}\\log(10^3) \\approx 10\\,t_{1/2}',
          answer: 't₉₉.₉% ≈ 10 × t₁/₂ (exact factor: 9.966)',
          shortcutTip: 'Memorize the 1st-order golden ladder: t₇₅% = 2t₅₀%, t₉₀% = 3.32t₅₀%, t₉₉.₉% = 10t₅₀%.',
        },
        {
          id: 'chem-pyq-3',
          conceptTitle: 'Hybridization, Lone Pairs & VSEPR Geometry',
          frequencyCount: 7,
          yearsLabel: '2018, 2020, 2021, 2022, 2024',
          examTag: 'NEET & JEE',
          representativeQuestion:
            'Identify the molecular geometry and number of 90° bond angles in XeF₄ and BrF₅.',
          formulaLatex: '\\text{SN} = \\frac{1}{2}(V + M - C + A)',
          answer: 'XeF₄: Square planar (4 × 90°); BrF₅: Square pyramidal (0 exact 90° due to lone-pair repulsion)',
          shortcutTip: 'Lone pair on axial position compresses all equatorial-axial angles below 90°.',
        },
      ],
      ncertXrayMappings: [
        {
          id: 'chem-xray-1',
          ncertRef: 'NCERT Class 12 Chem Part II · Aldehydes & Ketones',
          ncertLine:
            'Aldehydes lacking an α-hydrogen atom undergo self-oxidation and reduction (disproportionation) on heating with concentrated alkali.',
          highlightedPhrase: 'lacking an α-hydrogen atom',
          pyqExamYear: 'JEE Main 2024 & NEET 2023',
          pyqPrompt: 'Which among HCHO, CH₃CHO, (CH₃)₃C-CHO, and C₆H₅CHO does NOT give Cannizzaro reaction?',
          pyqAnswer: 'CH₃CHO (it has 3 α-hydrogens, so it gives Aldol condensation instead).',
          trapNote: 'Students often forget trimethylacetaldehyde ((CH₃)₃C-CHO) has zero α-H and DOES give Cannizzaro!',
        },
        {
          id: 'chem-xray-2',
          ncertRef: 'NCERT Class 12 Chem Part I · Coordination Compounds',
          ncertLine:
            'Strong field ligands cause pairing of electrons leading to inner-orbital (d²sp³) low-spin octahedral complexes.',
          highlightedPhrase: 'inner-orbital (d²sp³) low-spin',
          pyqExamYear: 'JEE Main 2025 (Jan Shift 2)',
          pyqPrompt: 'Find the spin-only magnetic moment (BM) of [Fe(CN)₆]⁴⁻ vs [Fe(H₂O)₆]²⁺.',
          pyqAnswer: '[Fe(CN)₆]⁴⁻ = 0 BM (diamagnetic, t₂g⁶); [Fe(H₂O)₆]²⁺ = √24 ≈ 4.90 BM (4 unpaired e⁻).',
          trapNote: 'Check oxidation state of Fe first (+2 vs +3) before counting unpaired electrons.',
        },
      ],
      flipFormulaCards: [
        {
          id: 'chem-fc-1',
          conceptPrompt: 'First-Order Half-Life & Arrhenius Equation',
          formulaLatex: 't_{1/2} = \\frac{0.693}{k}, \\quad \\ln\\frac{k_2}{k_1} = \\frac{E_a}{R}\\left(\\frac{1}{T_1} - \\frac{1}{T_2}\\right)',
          shortcutTrick: 'Always convert T to Kelvin and match R = 8.314 J/mol·K with Ea in Joules.',
          unitOrCondition: 'First-order k unit: s⁻¹',
        },
        {
          id: 'chem-fc-2',
          conceptPrompt: 'Nernst Equation at 298 K',
          formulaLatex: 'E_{\\text{cell}} = E^\\circ_{\\text{cell}} - \\frac{0.0591}{n}\\log Q',
          shortcutTrick: 'At equilibrium E_cell = 0 ⇒ log K_c = (n · E°_cell) / 0.0591.',
          unitOrCondition: 'Use 0.06/n only if exam explicitly states 2.303RT/F = 0.06.',
        },
        {
          id: 'chem-fc-3',
          conceptPrompt: 'Depression in Freezing Point with van’t Hoff Factor',
          formulaLatex: '\\Delta T_f = i \\cdot K_f \\cdot m',
          shortcutTrick: 'For strong electrolyte dissociation: i = 1 + (n − 1)α; association: i = 1 − (1 − 1/n)α.',
          unitOrCondition: 'Molality m uses kg of SOLVENT, never solution.',
        },
      ],
    };
  }

  if (sub.includes('math')) {
    return {
      uniquePyqGroups: [
        {
          id: 'math-pyq-1',
          conceptTitle: `${ch} — King’s Property Symmetry Integral`,
          frequencyCount: 9,
          yearsLabel: '2019, 2020, 2021, 2022, 2023, 2024, 2025',
          examTag: 'JEE Main & Adv Favorite',
          representativeQuestion:
            'Evaluate I = ∫[0 to π/2] (sinⁿx) / (sinⁿx + cosⁿx) dx for any real exponent n.',
          formulaLatex: '\\int_a^b f(x)\\,dx = \\int_a^b f(a+b-x)\\,dx \\implies I = \\frac{b-a}{2}',
          answer: 'π / 4 (independent of n)',
          shortcutTip: 'Whenever f(x) + f(a + b − x) = 1, the integral equals (b − a) / 2 in 3 seconds.',
        },
        {
          id: 'math-pyq-2',
          conceptTitle: '1^∞ Indeterminate Exponential Limit',
          frequencyCount: 7,
          yearsLabel: '2019, 2021, 2022, 2023, 2025',
          examTag: 'JEE Main',
          representativeQuestion:
            'Find lim (x → 0) [ (1 + ax)^(b/x) ] where a, b are non-zero constants.',
          formulaLatex: '\\lim_{x\\to c} [f(x)]^{g(x)} = e^{\\lim_{x\\to c} (f(x)-1)\\cdot g(x)}',
          answer: 'e^(ab)',
          shortcutTip: 'Verify base → 1 and exponent → ∞ first, then directly evaluate (base − 1) × power.',
        },
        {
          id: 'math-pyq-3',
          conceptTitle: 'Shortest Distance Between Skew Lines (3D Vectors)',
          frequencyCount: 8,
          yearsLabel: '2020, 2021, 2022, 2023, 2024, 2025',
          examTag: 'JEE Main Guaranteed +4',
          representativeQuestion:
            'Compute shortest distance between r = a₁ + λb₁ and r = a₂ + μb₂ in 3D space.',
          formulaLatex: 'd = \\frac{|(\\vec{a}_2 - \\vec{a}_1) \\cdot (\\vec{b}_1 \\times \\vec{b}_2)|}{|\\vec{b}_1 \\times \\vec{b}_2|}',
          answer: 'Scalar triple product divided by magnitude of cross product',
          shortcutTip: 'If b₁ ∥ b₂ (parallel lines), switch immediately to |(a₂ − a₁) × b| / |b|.',
        },
      ],
      ncertXrayMappings: [
        {
          id: 'math-xray-1',
          ncertRef: 'NCERT Class 12 Maths · Integrals Property P₄',
          ncertLine:
            'Property P₄ transforms definite integrals over [0, a] by substituting x → a − x, collapsing asymmetric denominators.',
          highlightedPhrase: 'substituting x → a − x',
          pyqExamYear: 'JEE Main 2025 (Jan Shift 1)',
          pyqPrompt: 'Evaluate ∫[0 to π] (x sin x) / (1 + cos²x) dx.',
          pyqAnswer: 'π² / 4 (adding I + I eliminates x from numerator immediately).',
          trapNote: 'Remember to divide by 2 at the very end — forgetting 2I → I is the #1 JEE Main silly error!',
        },
        {
          id: 'math-xray-2',
          ncertRef: 'NCERT Class 12 Maths · Matrices & Determinants',
          ncertLine:
            'For any non-singular square matrix A of order n, A · adj(A) = |A| · Iₙ and |adj(A)| = |A|^(n−1).',
          highlightedPhrase: '|adj(A)| = |A|^(n−1)',
          pyqExamYear: 'JEE Main 2024 (Apr Shift 2)',
          pyqPrompt: 'If A is a 3×3 matrix with |A| = 2, find |adj(adj(2A))|.',
          pyqAnswer: '|2A| = 2³·2 = 16; |adj(adj(M))| = |M|^((n−1)²) = 16⁴ = 2¹⁶.',
          trapNote: 'Scalar k inside |kA| pulls out as kⁿ (where n is matrix order), NOT k!',
        },
      ],
      flipFormulaCards: [
        {
          id: 'math-fc-1',
          conceptPrompt: 'Leibniz Rule (Differentiation Under Integral Sign)',
          formulaLatex: '\\frac{d}{dx}\\int_{g(x)}^{h(x)} f(t)\\,dt = f(h(x))h\'(x) - f(g(x))g\'(x)',
          shortcutTrick: 'Pair with L’Hôpital’s rule on 0/0 integral limits to solve in under 20 seconds.',
          unitOrCondition: 'f must be continuous on [g(x), h(x)]',
        },
        {
          id: 'math-fc-2',
          conceptPrompt: 'Focal Chord Harmonic Mean Relation (Parabola y² = 4ax)',
          formulaLatex: '\\frac{1}{SP} + \\frac{1}{SQ} = \\frac{1}{a}, \\quad t_1 t_2 = -1',
          shortcutTrick: 'Length of focal chord = a(t + 1/t)² ≥ 4a (minimum is Latus Rectum).',
          unitOrCondition: 'Valid for any chord passing through focus (a, 0)',
        },
        {
          id: 'math-fc-3',
          conceptPrompt: 'Determinant of Nested Adjoints (Order n)',
          formulaLatex: '|\\text{adj}(\\text{adj}(A))| = |A|^{(n-1)^2}',
          shortcutTrick: 'For k nested adjoints, exponent is simply (n − 1)^k.',
          unitOrCondition: 'Requires |A| ≠ 0',
        },
      ],
    };
  }

  if (sub.includes('bio')) {
    return {
      uniquePyqGroups: [
        {
          id: 'bio-pyq-1',
          conceptTitle: `${ch} — NCERT Assertion-Reason Exception Trap`,
          frequencyCount: 9,
          yearsLabel: '2019, 2020, 2021, 2022, 2023, 2024, 2025',
          examTag: 'NEET UG High-Yield',
          representativeQuestion:
            'In gymnosperms, are ovules enclosed by an ovary wall before or after fertilization?',
          formulaLatex: '\\text{Gymnosperms} \\implies \\text{Naked Ovules (No Ovary Wall)}',
          answer: 'Neither before nor after fertilization — seeds remain exposed (naked).',
          shortcutTip: 'Double fertilization is unique to Angiosperms; gymnosperm endosperm is haploid (n).',
        },
        {
          id: 'bio-pyq-2',
          conceptTitle: 'Hardy-Weinberg Allele & Heterozygote Frequency',
          frequencyCount: 6,
          yearsLabel: '2019, 2021, 2022, 2024, 2025',
          examTag: 'NEET Genetics',
          representativeQuestion:
            'If recessive phenotype frequency (q²) is 0.09 in a population at equilibrium, find heterozygote carrier frequency.',
          formulaLatex: 'p + q = 1, \\quad p^2 + 2pq + q^2 = 1 \\implies 2pq = 0.42',
          answer: 'q = 0.3, p = 0.7 ⇒ 2pq = 2(0.7)(0.3) = 0.42 (42%)',
          shortcutTip: 'Always take √(q²) first to get q; never plug q² directly into 2pq!',
        },
      ],
      ncertXrayMappings: [
        {
          id: 'bio-xray-1',
          ncertRef: 'NCERT Class 11 Bio · Ch. 3 Plant Kingdom (p. 38)',
          ncertLine:
            'The gymnosperms are plants in which the ovules are not enclosed by any ovary wall and remain exposed, both before and after fertilisation.',
          highlightedPhrase: 'not enclosed by any ovary wall',
          pyqExamYear: 'NEET UG 2024 & 2022',
          pyqPrompt: 'Identify the incorrect statement regarding Gymnosperms vs Angiosperms.',
          pyqAnswer: 'Statement claiming gymnosperm ovules become enclosed after fertilization is FALSE.',
          trapNote: 'NTA loves flipping a single word ("not enclosed" → "enclosed") verbatim from NCERT.',
        },
        {
          id: 'bio-xray-2',
          ncertRef: 'NCERT Class 12 Bio · Ch. 11 Biotechnology (p. 199)',
          ncertLine:
            'In gel electrophoresis, DNA fragments separate according to their size through sieving effect provided by the agarose gel toward the anode.',
          highlightedPhrase: 'toward the anode',
          pyqExamYear: 'NEET UG 2025 & 2023',
          pyqPrompt: 'Why do smaller DNA fragments move farther toward the positive electrode (anode)?',
          pyqAnswer: 'DNA is negatively charged (phosphate backbone) and smaller bands face less agarose matrix drag.',
          trapNote: 'Ethidium bromide stained DNA appears bright ORANGE under UV light — never blue or green!',
        },
      ],
      flipFormulaCards: [
        {
          id: 'bio-fc-1',
          conceptPrompt: 'Hardy-Weinberg Genetic Equilibrium',
          formulaLatex: 'p + q = 1, \\quad p^2 + 2pq + q^2 = 1',
          shortcutTrick: 'p² = homozygous dominant, 2pq = carriers, q² = recessive phenotype.',
          unitOrCondition: 'Requires no mutation, migration, drift, or selection.',
        },
        {
          id: 'bio-fc-2',
          conceptPrompt: 'Respiratory Quotient (RQ) Values (NCERT Table)',
          formulaLatex: '\\text{RQ} = \\frac{\\text{CO}_2\\text{ evolved}}{\\text{O}_2\\text{ consumed}}',
          shortcutTrick: 'Carbs = 1.0 · Proteins = 0.9 · Fats (Tripalmitin) = 0.7 · Organic acids > 1.',
          unitOrCondition: 'Anaerobic respiration RQ = ∞ (zero O₂ consumed).',
        },
        {
          id: 'bio-fc-3',
          conceptPrompt: 'Net Primary Productivity (NPP) Ecosystem Equation',
          formulaLatex: '\\text{NPP} = \\text{GPP} - R',
          shortcutTrick: 'NPP is the available biomass consumed by heterotrophs (herbivores & decomposers).',
          unitOrCondition: 'Oceans cover 70% area yet contribute only ~55 billion tons/yr.',
        },
      ],
    };
  }

  // Default: Physics (works cleanly for Electrostatics, Rotational Motion, Modern Physics, etc.)
  return {
    uniquePyqGroups: [
      {
        id: 'phy-pyq-1',
        conceptTitle: `${ch} — Symmetry & Superposition Shortcut`,
        frequencyCount: 8,
        yearsLabel: '2019, 2020, 2021, 2022, 2024, 2025',
        examTag: 'JEE Main & NEET Classic',
        representativeQuestion:
          'A thin infinite non-conducting sheet carries uniform surface charge density σ. Find electric field magnitude at distance r.',
        formulaLatex: 'E_{\\text{sheet}} = \\frac{\\sigma}{2\\varepsilon_0} \\quad (\\text{independent of } r)',
        answer: 'σ / (2ε₀) — constant everywhere perpendicular to the sheet',
        shortcutTip: 'For a thick conducting plate surface, drop the 2: E = σ / ε₀.',
      },
      {
        id: 'phy-pyq-2',
        conceptTitle: 'Pure Rolling Down an Incline (Acceleration & Friction)',
        frequencyCount: 7,
        yearsLabel: '2019, 2021, 2022, 2023, 2024',
        examTag: 'JEE Main +4 Guaranteed',
        representativeQuestion:
          'Compare pure rolling accelerations of a solid sphere, solid cylinder, and thin ring down the same rough incline θ.',
        formulaLatex: 'a = \\frac{g\\sin\\theta}{1 + \\frac{k^2}{R^2}}',
        answer: 'Solid sphere (k²/R² = 2/5) wins every race; ring (k²/R² = 1) finishes last.',
        shortcutTip: 'Smaller k²/R² ⇒ larger acceleration ⇒ shorter time ⇒ lower minimum μ required.',
      },
      {
        id: 'phy-pyq-3',
        conceptTitle: 'de Broglie Wavelength & Accelerating Potential',
        frequencyCount: 9,
        yearsLabel: '2018, 2020, 2021, 2023, 2024, 2025',
        examTag: 'Modern Physics Express',
        representativeQuestion:
          'An electron is accelerated from rest through potential difference V = 100 V. Find its de Broglie wavelength.',
        formulaLatex: '\\lambda_e \\approx \\frac{12.27}{\\sqrt{V}}\\,\\text{Å}',
        answer: '12.27 / √100 = 1.227 Å',
        shortcutTip: 'Ratio λ_p / λ_α = √(m_α q_α / m_p q_p) = √(4 × 2) = 2√2 for same accelerating V.',
      },
    ],
    ncertXrayMappings: [
      {
        id: 'phy-xray-1',
        ncertRef: 'NCERT Class 12 Physics · Ch. 1 §1.15 Gauss Law',
        ncertLine:
          'The electric field inside a uniformly charged thin spherical shell is zero at all interior points, while outside it behaves as if all charge is concentrated at the center.',
        highlightedPhrase: 'zero at all interior points',
        pyqExamYear: 'JEE Main 2024 & NEET 2023',
        pyqPrompt: 'Plot E vs r and V vs r from r = 0 to r = 3R for a charged conducting sphere of radius R.',
        pyqAnswer: 'Inside (r < R): E = 0, but Potential V is CONSTANT = kQ/R (NOT zero!).',
        trapNote: 'Biggest exam trap: E = 0 inside does NOT mean V = 0; V stays flat at surface value kQ/R.',
      },
      {
        id: 'phy-xray-2',
        ncertRef: 'NCERT Class 11 Physics · Ch. 7 Rotational Motion',
        ncertLine:
          'If the total external torque acting on a system of particles is zero, the total angular momentum of the system remains conserved.',
        highlightedPhrase: 'total external torque ... is zero',
        pyqExamYear: 'JEE Main 2025 (Jan Shift 2)',
        pyqPrompt: 'A child walks from the rim to the center of a frictionless turntable. What happens to ω and K.E.?',
        pyqAnswer: 'I decreases ⇒ ω increases (L = Iω const), and K.E. = L²/(2I) INCREASES (work done by child).',
        trapNote: 'Angular momentum is conserved, NOT kinetic energy — internal muscular work increases K.E.!',
      },
    ],
    flipFormulaCards: [
      {
        id: 'phy-fc-1',
        conceptPrompt: 'Escape Velocity vs Orbital Velocity (Gravitation)',
        formulaLatex: 'v_e = \\sqrt{\\frac{2GM}{R}} = \\sqrt{2}\\,v_o',
        shortcutTrick: 'Near Earth surface: v_o ≈ 7.9 km/s and v_e ≈ 11.2 km/s (independent of mass & launch angle).',
        unitOrCondition: 'Assumes negligible air drag & launch from radius R.',
      },
      {
        id: 'phy-fc-2',
        conceptPrompt: 'Parallel Axis Theorem (Moment of Inertia)',
        formulaLatex: 'I = I_{\\text{cm}} + Md^2',
        shortcutTrick: 'Solid sphere about tangent: 2/5 MR² + MR² = 7/5 MR²; Disc about tangent in plane: 5/4 MR².',
        unitOrCondition: 'd MUST be perpendicular distance from Center of Mass axis.',
      },
      {
        id: 'phy-fc-3',
        conceptPrompt: 'Magnetic Field at Center of Circular Loop & Arc',
        formulaLatex: 'B = \\frac{\\mu_0 I}{2R} \\cdot \\frac{\\theta}{2\\pi}',
        shortcutTrick: 'Full loop (θ=2π): μ₀I/(2R); Semicircle (θ=π): μ₀I/(4R).',
        unitOrCondition: 'θ must be in radians.',
      },
    ],
  };
}

export interface MissedConceptVideoLink {
  id: string;
  subjectName: string;
  chapterName: string;
  missedCount: number;
  videoTitle: string;
  timestampLabel: string;
  route: string;
}

const CONCEPT_VIDEO_CATALOG: Array<{
  keyword: string;
  videoTitle: string;
  timestampLabel: string;
}> = [
  {
    keyword: 'electrostat',
    videoTitle: 'Gauss Law, Shell Potential & Dipole Traps — Rapid Fix',
    timestampLabel: '14:20',
  },
  {
    keyword: 'rotat',
    videoTitle: 'Rolling Motion, Torque & Angular Momentum One-Shot',
    timestampLabel: '22:15',
  },
  {
    keyword: 'modern',
    videoTitle: 'Photoelectric Effect & de Broglie Numericals',
    timestampLabel: '09:40',
  },
  {
    keyword: 'organic',
    videoTitle: 'Aldol, Cannizzaro & Selective Reagent Map',
    timestampLabel: '18:05',
  },
  {
    keyword: 'aldehyde',
    videoTitle: 'Carbonyl Mechanism & Named Reactions Sprint',
    timestampLabel: '16:30',
  },
  {
    keyword: 'kinetic',
    videoTitle: 'First-Order Half-Life & Arrhenius Shortcuts',
    timestampLabel: '11:50',
  },
  {
    keyword: 'integrat',
    videoTitle: 'King’s Property & Definite Integral Traps',
    timestampLabel: '26:10',
  },
  {
    keyword: 'calcul',
    videoTitle: 'Limits 1^∞ Form & Leibniz Rule Fast Revision',
    timestampLabel: '19:45',
  },
  {
    keyword: 'genetic',
    videoTitle: 'Hardy-Weinberg & Linkage Pedigree NCERT Drill',
    timestampLabel: '15:10',
  },
  {
    keyword: 'plant',
    videoTitle: 'Plant Kingdom NCERT Line-by-Line Exceptions',
    timestampLabel: '12:35',
  },
];

export function getMissedConceptVideoTimestamps(
  attempt: TestAttemptRecord,
  questions: TestQuestionRecord[]
): MissedConceptVideoLink[] {
  const qMap = new Map(questions.map((q) => [q.id, q]));
  const missedBuckets = new Map<string, { subjectName: string; chapterName: string; count: number }>();

  for (const t of attempt.questionTimings ?? []) {
    if (t.answered && t.isCorrect) continue;
    const q = qMap.get(t.questionId);
    const subjectName = (t.subjectName || q?.subjectName || 'Core').trim();
    const chapterName = (t.chapterName || q?.chapterName || 'High-Yield Concepts').trim();
    const key = `${subjectName}::${chapterName}`;
    const cur = missedBuckets.get(key) ?? { subjectName, chapterName, count: 0 };
    cur.count += 1;
    missedBuckets.set(key, cur);
  }

  const sorted = Array.from(missedBuckets.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  if (sorted.length === 0) {
    return [
      {
        id: 'vid-default-1',
        subjectName: 'Physics',
        chapterName: 'Electrostatics & Gauss Law',
        missedCount: 1,
        videoTitle: 'Gauss Law, Shell Potential & Dipole Traps — Rapid Fix',
        timestampLabel: '14:20',
        route: '/lectures?q=Electrostatics&t=860',
      },
      {
        id: 'vid-default-2',
        subjectName: 'Chemistry',
        chapterName: 'Aldehydes & Ketones',
        missedCount: 1,
        videoTitle: 'Aldol, Cannizzaro & Selective Reagent Map',
        timestampLabel: '18:05',
        route: '/lectures?q=Organic&t=1085',
      },
    ];
  }

  return sorted.map((item, idx) => {
    const hay = `${item.chapterName} ${item.subjectName}`.toLowerCase();
    const match = CONCEPT_VIDEO_CATALOG.find((c) => hay.includes(c.keyword));
    const timestampLabel = match?.timestampLabel ?? `${10 + idx * 4}:15`;
    const [m, s] = timestampLabel.split(':').map(Number);
    const sec = (m || 10) * 60 + (s || 0);
    return {
      id: `vid-missed-${idx}-${item.chapterName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      subjectName: item.subjectName,
      chapterName: item.chapterName,
      missedCount: item.count,
      videoTitle: match?.videoTitle ?? `${item.chapterName} — Error-Proof Concept Revision`,
      timestampLabel,
      route: `/lectures?q=${encodeURIComponent(item.chapterName)}&t=${sec}`,
    };
  });
}
