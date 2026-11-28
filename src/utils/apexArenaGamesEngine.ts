export type ArenaSubject = 'Physics' | 'Chemistry' | 'Maths' | 'Biology';

export const SUBJECT_THEME: Record<
  ArenaSubject,
  { border: string; glow: string; badge: string; accent: string; hexFill: string }
> = {
  Physics: {
    border: 'border-sky-400/50',
    glow: 'shadow-[0_0_24px_rgba(56,189,248,0.28)]',
    badge: 'bg-sky-400/15 text-sky-300 border-sky-400/30',
    accent: '#38bdf8',
    hexFill: 'rgba(56, 189, 248, 0.22)',
  },
  Chemistry: {
    border: 'border-purple-400/50',
    glow: 'shadow-[0_0_24px_rgba(192,132,252,0.28)]',
    badge: 'bg-purple-400/15 text-purple-300 border-purple-400/30',
    accent: '#c084fc',
    hexFill: 'rgba(192, 132, 252, 0.22)',
  },
  Maths: {
    border: 'border-amber-400/50',
    glow: 'shadow-[0_0_24px_rgba(251,191,36,0.28)]',
    badge: 'bg-amber-400/15 text-amber-300 border-amber-400/30',
    accent: '#fbbf24',
    hexFill: 'rgba(251, 191, 36, 0.22)',
  },
  Biology: {
    border: 'border-emerald-400/50',
    glow: 'shadow-[0_0_24px_rgba(52,211,153,0.28)]',
    badge: 'bg-emerald-400/15 text-emerald-300 border-emerald-400/30',
    accent: '#34d399',
    hexFill: 'rgba(52, 211, 153, 0.22)',
  },
};

/* ============================================================================
   GAME 1: FORMULA CLASH — TACTICAL CARD BATTLE
   ============================================================================ */
export interface FormulaClashCard {
  id: string;
  name: string;
  subject: ArenaSubject;
  cost: number; // 1..4
  kind: 'attack' | 'shield';
  power: number; // e.g., 25 DMG or +20 Shield
  formulaHint: string;
  rarity: 'Standard' | 'Rare';
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  conceptNote: string;
}

export const FORMULA_CLASH_DECK: FormulaClashCard[] = [
  {
    id: 'fc-momentum',
    name: 'Conservation of Momentum',
    subject: 'Physics',
    cost: 2,
    kind: 'attack',
    power: 24,
    formulaHint: 'm₁u₁ + m₂u₂ = m₁v₁ + m₂v₂',
    rarity: 'Standard',
    question: 'A 2 kg block moving at 6 m/s sticks to a stationary 4 kg block. Common speed is:',
    options: ['1 m/s', '2 m/s', '3 m/s', '4 m/s'],
    correctIndex: 1,
    conceptNote: 'v = (2×6)/(2+4) = 12/6 = 2 m/s (momentum conserved with zero external impulse).',
  },
  {
    id: 'fc-markovnikov',
    name: "Markovnikov's Rule",
    subject: 'Chemistry',
    cost: 2,
    kind: 'attack',
    power: 25,
    formulaHint: 'R-CH=CH₂ + HBr → R-CH(Br)-CH₃',
    rarity: 'Standard',
    question: 'Major product of propene + HBr (in absence of peroxide) is:',
    options: ['1-Bromopropane', '2-Bromopropane', '1,2-Dibromopropane', 'Propane'],
    correctIndex: 1,
    conceptNote: 'H⁺ adds to terminal CH₂ giving the more stable 2° carbocation → 2-Bromopropane.',
  },
  {
    id: 'fc-gauss',
    name: "Gauss's Flux Shield",
    subject: 'Physics',
    cost: 2,
    kind: 'shield',
    power: 22,
    formulaHint: 'Φ = ∮ E·dA = q_in / ε₀',
    rarity: 'Standard',
    question: 'Net electric flux through a closed cube enclosing charge +q and -q is:',
    options: ['2q/ε₀', 'q/ε₀', 'Zero', 'q/6ε₀'],
    correctIndex: 2,
    conceptNote: 'Net enclosed charge q_in = +q - q = 0, so net flux Φ = 0 regardless of geometry.',
  },
  {
    id: 'fc-kings',
    name: "King's Property Strike",
    subject: 'Maths',
    cost: 3,
    kind: 'attack',
    power: 30,
    formulaHint: '∫ₐᵇ f(x)dx = ∫ₐᵇ f(a+b-x)dx',
    rarity: 'Rare',
    question: 'Value of ∫₀^(π/2) [sin x / (sin x + cos x)] dx equals:',
    options: ['π/2', 'π/4', 'π/8', '1'],
    correctIndex: 1,
    conceptNote: 'Adding I and I with x → π/2 - x gives 2I = ∫₀^(π/2) 1 dx = π/2 ⇒ I = π/4.',
  },
  {
    id: 'fc-bohr',
    name: 'Bohr Effect Barrier',
    subject: 'Biology',
    cost: 1,
    kind: 'shield',
    power: 16,
    formulaHint: '↑pCO₂, ↑H⁺ → Right Shift (O₂ Unloading)',
    rarity: 'Standard',
    question: 'Active metabolizing tissues shift the oxyhaemoglobin dissociation curve to the:',
    options: ['Left', 'Right', 'Upward vertically', 'No shift'],
    correctIndex: 1,
    conceptNote: 'High CO₂, high H⁺, and higher temperature favor O₂ dissociation (Right shift).',
  },
  {
    id: 'fc-vsepr',
    name: 'VSEPR Lone-Pair Beam',
    subject: 'Chemistry',
    cost: 2,
    kind: 'attack',
    power: 22,
    formulaHint: 'LP-LP > LP-BP > BP-BP repulsion',
    rarity: 'Standard',
    question: 'Molecular shape of XeF₄ (4 bond pairs + 2 lone pairs) is:',
    options: ['Tetrahedral', 'See-saw', 'Square Planar', 'Trigonal Bipyramidal'],
    correctIndex: 2,
    conceptNote: '6 electron domains (sp³d²) with 2 axial lone pairs produce a Square Planar geometry.',
  },
  {
    id: 'fc-escape',
    name: 'Escape Velocity Surge',
    subject: 'Physics',
    cost: 3,
    kind: 'attack',
    power: 28,
    formulaHint: 'v_e = √(2GM / R) = √2 · v_o',
    rarity: 'Rare',
    question: 'Ratio of escape velocity to orbital velocity near Earth surface is:',
    options: ['2', '√2', '1/√2', '4'],
    correctIndex: 1,
    conceptNote: 'v_e = √(2gR) and v_o = √(gR), so v_e / v_o = √2 ≈ 1.414.',
  },
  {
    id: 'fc-lhopital',
    name: "L'Hôpital Limit Breaker",
    subject: 'Maths',
    cost: 1,
    kind: 'attack',
    power: 18,
    formulaHint: 'lim (x→0) (sin ax)/x = a',
    rarity: 'Standard',
    question: 'Evaluate lim (x→0) (1 - cos 2x) / x²:',
    options: ['0', '1', '2', '4'],
    correctIndex: 2,
    conceptNote: '1 - cos 2x = 2 sin²x; dividing by x² gives 2(sin x / x)² → 2.',
  },
  {
    id: 'fc-atp',
    name: 'ATP Synthase Recharge',
    subject: 'Biology',
    cost: 2,
    kind: 'shield',
    power: 24,
    formulaHint: 'H⁺ gradient across inner mitochondrial membrane',
    rarity: 'Standard',
    question: 'Chemiosmotic ATP synthesis in mitochondria is driven directly by:',
    options: ['Na⁺ pump', 'Proton (H⁺) gradient', 'Cl⁻ diffusion', 'Direct glucose splitting'],
    correctIndex: 1,
    conceptNote: 'Protons flow down their electrochemical gradient through F₀–F₁ ATP synthase.',
  },
  {
    id: 'fc-lechatelier',
    name: 'Le Chatelier Counter',
    subject: 'Chemistry',
    cost: 3,
    kind: 'shield',
    power: 28,
    formulaHint: 'N₂ + 3H₂ ⇌ 2NH₃ (ΔH < 0)',
    rarity: 'Rare',
    question: 'For Haber process (Δn_g = -2, exothermic), higher ammonia yield is favored by:',
    options: ['Low P, High T', 'High P, Low T', 'Low P, Low T', 'Inert gas at constant V'],
    correctIndex: 1,
    conceptNote: 'High pressure shifts toward fewer moles (2 vs 4); lower temperature favors exothermic forward reaction.',
  },
  {
    id: 'fc-faraday',
    name: 'Faraday Induction Bolt',
    subject: 'Physics',
    cost: 4,
    kind: 'attack',
    power: 35,
    formulaHint: 'ε = -N (dΦ_B / dt)',
    rarity: 'Rare',
    question: 'Flux in a 10-turn coil drops from 0.5 Wb to 0.1 Wb in 0.2 s. Induced EMF magnitude is:',
    options: ['2 V', '10 V', '20 V', '40 V'],
    correctIndex: 2,
    conceptNote: '|ε| = 10 × (0.5 - 0.1) / 0.2 = 10 × 2 = 20 V.',
  },
  {
    id: 'fc-euler',
    name: 'Euler Matrix Guard',
    subject: 'Maths',
    cost: 2,
    kind: 'shield',
    power: 20,
    formulaHint: 'det(kA) = kⁿ det(A) for n×n matrix',
    rarity: 'Standard',
    question: 'If A is a 3×3 matrix with |A| = 5, then |2A| equals:',
    options: ['10', '20', '40', '80'],
    correctIndex: 2,
    conceptNote: 'For a 3×3 matrix, |2A| = 2³|A| = 8 × 5 = 40.',
  },
];

export const RARE_UNLOCKABLE_CARDS = FORMULA_CLASH_DECK.filter((c) => c.rarity === 'Rare');

export interface FormulaClashResolution {
  effectivePower: number;
  isCritical: boolean;
  fizzled: boolean;
  label: string;
}

export function resolveFormulaClashCard(
  card: FormulaClashCard,
  isCorrect: boolean,
  answerSeconds: number
): FormulaClashResolution {
  if (!isCorrect) {
    const chip = card.kind === 'attack' ? Math.round(card.power * 0.2) : 0;
    return {
      effectivePower: chip,
      isCritical: false,
      fizzled: true,
      label: card.kind === 'attack' ? `Fizzled! (${chip} chip DMG)` : 'Shield Fizzled!',
    };
  }
  const isCritical = answerSeconds <= 5;
  const effectivePower = isCritical ? Math.round(card.power * 1.5) : card.power;
  return {
    effectivePower,
    isCritical,
    fizzled: false,
    label: isCritical
      ? `CRITICAL HIT! 1.5× (${effectivePower} ${card.kind === 'attack' ? 'DMG' : 'Shield'})`
      : `Direct Hit! (${effectivePower} ${card.kind === 'attack' ? 'DMG' : 'Shield'})`,
  };
}

export function nextTurnEnergy(currentMaxEnergy: number): number {
  return Math.min(10, currentMaxEnergy + 1);
}

/* ============================================================================
   GAME 2: CONCEPT LINK — FAST CHAIN REACTION CARDS
   ============================================================================ */
export type ConceptCardType = 'normal' | 'plus2' | 'skip' | 'wild';

export interface ConceptLinkCard {
  id: string;
  subject: ArenaSubject;
  chapterTag: string;
  title: string;
  cardType: ConceptCardType;
  linkPrompt: string;
  linkAnswer: string;
  linkOptions: [string, string, string];
}

const CONCEPT_CARD_TEMPLATES: Omit<ConceptLinkCard, 'id'>[] = [
  {
    subject: 'Physics',
    chapterTag: 'Magnetism',
    title: 'Magnetic Flux Density',
    cardType: 'normal',
    linkPrompt: 'SI Unit: Tesla',
    linkAnswer: 'Magnetic Field B',
    linkOptions: ['Magnetic Field B', 'Electric Flux Φ', 'Inductance L'],
  },
  {
    subject: 'Physics',
    chapterTag: 'Electrostatics',
    title: 'Gauss Flux Law',
    cardType: 'normal',
    linkPrompt: 'Unit: N·m²/C',
    linkAnswer: 'Electric Flux',
    linkOptions: ['Electric Flux', 'Capacitance', 'Current Density'],
  },
  {
    subject: 'Physics',
    chapterTag: 'Optics',
    title: 'Snell Refraction',
    cardType: 'skip',
    linkPrompt: 'Skip Turn · n₁sinθ₁ = n₂sinθ₂',
    linkAnswer: 'Refraction Law',
    linkOptions: ['Refraction Law', 'Diffraction', 'Brewster Angle'],
  },
  {
    subject: 'Physics',
    chapterTag: 'Magnetism',
    title: 'Lenz Law Counter',
    cardType: 'plus2',
    linkPrompt: '+2 Doubt Trap · Opposes Flux Change',
    linkAnswer: 'Energy Conservation',
    linkOptions: ['Energy Conservation', 'Charge Conservation', 'Hooke Law'],
  },
  {
    subject: 'Chemistry',
    chapterTag: 'Organic',
    title: 'Aldol Condensation',
    cardType: 'normal',
    linkPrompt: 'Requires α-Hydrogen',
    linkAnswer: 'β-Hydroxy Aldehyde',
    linkOptions: ['β-Hydroxy Aldehyde', 'Alkane', 'Ester'],
  },
  {
    subject: 'Chemistry',
    chapterTag: 'Bonding',
    title: 'Hybridization sp³d²',
    cardType: 'normal',
    linkPrompt: '6 Bonding Domains',
    linkAnswer: 'Octahedral',
    linkOptions: ['Octahedral', 'Tetrahedral', 'Linear'],
  },
  {
    subject: 'Chemistry',
    chapterTag: 'Organic',
    title: 'Cannizzaro Trap',
    cardType: 'plus2',
    linkPrompt: '+2 Doubt Trap · No α-Hydrogen',
    linkAnswer: 'Disproportionation',
    linkOptions: ['Disproportionation', 'Elimination', 'Polymerization'],
  },
  {
    subject: 'Chemistry',
    chapterTag: 'Thermodynamics',
    title: 'Gibbs Free Energy',
    cardType: 'skip',
    linkPrompt: 'Skip Turn · ΔG < 0',
    linkAnswer: 'Spontaneous Process',
    linkOptions: ['Spontaneous Process', 'Equilibrium', 'Non-Spontaneous'],
  },
  {
    subject: 'Maths',
    chapterTag: 'Calculus',
    title: 'Integration by Parts',
    cardType: 'normal',
    linkPrompt: 'ILATE Priority Rule',
    linkAnswer: '∫u dv = uv - ∫v du',
    linkOptions: ['∫u dv = uv - ∫v du', 'd(uv) = u dv', 'Chain Rule'],
  },
  {
    subject: 'Maths',
    chapterTag: 'Vectors',
    title: 'Scalar Triple Product',
    cardType: 'normal',
    linkPrompt: '[a b c] = 0 Means',
    linkAnswer: 'Coplanar Vectors',
    linkOptions: ['Coplanar Vectors', 'Parallel Only', 'Unit Vectors'],
  },
  {
    subject: 'Maths',
    chapterTag: 'Calculus',
    title: 'Mean Value Skip',
    cardType: 'skip',
    linkPrompt: "Skip Turn · f'(c) = [f(b)-f(a)]/(b-a)",
    linkAnswer: 'Lagrange MVT',
    linkOptions: ['Lagrange MVT', 'Binomial Theorem', 'Bayes Rule'],
  },
  {
    subject: 'Maths',
    chapterTag: 'Matrices',
    title: 'Singular Matrix Trap',
    cardType: 'plus2',
    linkPrompt: '+2 Doubt Trap · det(A) = 0',
    linkAnswer: 'Non-Invertible',
    linkOptions: ['Non-Invertible', 'Orthogonal', 'Identity'],
  },
  {
    subject: 'Biology',
    chapterTag: 'Genetics',
    title: 'Lac Operon Switch',
    cardType: 'normal',
    linkPrompt: 'Inducer Molecule',
    linkAnswer: 'Allolactose',
    linkOptions: ['Allolactose', 'Tryptophan', 'Histone'],
  },
  {
    subject: 'Biology',
    chapterTag: 'Physiology',
    title: 'SA Node Pacemaker',
    cardType: 'normal',
    linkPrompt: 'Right Atrium Upper Wall',
    linkAnswer: '70–75 impulses/min',
    linkOptions: ['70–75 impulses/min', '20 impulses/min', '120 impulses/min'],
  },
  {
    subject: 'Biology',
    chapterTag: 'Genetics',
    title: 'Okazaki Fragments',
    cardType: 'skip',
    linkPrompt: 'Skip Turn · Lagging Strand Joiner',
    linkAnswer: 'DNA Ligase',
    linkOptions: ['DNA Ligase', 'Helicase', 'Primase'],
  },
  {
    subject: 'Biology',
    chapterTag: 'Physiology',
    title: 'Nephron Countercurrent',
    cardType: 'plus2',
    linkPrompt: '+2 Doubt Trap · Loop of Henle',
    linkAnswer: 'Concentrated Urine',
    linkOptions: ['Concentrated Urine', 'Bile Secretion', 'Gas Exchange'],
  },
  {
    subject: 'Physics',
    chapterTag: 'NCERT Core',
    title: 'Wild NCERT Card',
    cardType: 'wild',
    linkPrompt: 'Switch to ANY Subject Color!',
    linkAnswer: 'Universal Mastery',
    linkOptions: ['Universal Mastery', 'Locked Color', 'Skip Only'],
  },
  {
    subject: 'Chemistry',
    chapterTag: 'NCERT Core',
    title: 'Wild NCERT Card',
    cardType: 'wild',
    linkPrompt: 'Switch to ANY Subject Color!',
    linkAnswer: 'Universal Mastery',
    linkOptions: ['Universal Mastery', 'Locked Color', 'Skip Only'],
  },
];

export function buildConceptLinkDeck(): ConceptLinkCard[] {
  const deck: ConceptLinkCard[] = [];
  let seq = 1;
  for (let copy = 0; copy < 2; copy++) {
    for (const tpl of CONCEPT_CARD_TEMPLATES) {
      deck.push({ ...tpl, id: `cl-${seq++}` });
    }
  }
  return deck;
}

export function shuffleCards<T>(items: T[], rng: () => number = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function canPlayConceptCard(
  card: ConceptLinkCard,
  centerCard: ConceptLinkCard,
  activeSubject: ArenaSubject
): { playable: boolean; matchType: 'wild' | 'subject' | 'chapter' | 'link-challenge' } {
  if (card.cardType === 'wild') {
    return { playable: true, matchType: 'wild' };
  }
  if (card.subject === activeSubject) {
    return { playable: true, matchType: 'subject' };
  }
  if (card.chapterTag === centerCard.chapterTag) {
    return { playable: true, matchType: 'chapter' };
  }
  // Any non-matching card can still be played by solving its Link Challenge!
  return { playable: true, matchType: 'link-challenge' };
}

/* ============================================================================
   GAME 3: KAUN BANEGA TOPPER — 15-STEP HOT-SEAT LADDER
   ============================================================================ */
export type KbtTier = 1 | 2 | 3;

export interface KbtQuestion {
  id: string;
  tier: KbtTier;
  subject: ArenaSubject;
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  buddyHint: string; // Never reveals the option letter!
  explanation: string;
}

export const KBT_LADDER_XP: readonly number[] = [
  100,    // Q1
  200,    // Q2
  300,    // Q3
  500,    // Q4
  1000,   // Q5 — Safe Haven 1
  2000,   // Q6
  3500,   // Q7
  5000,   // Q8
  7500,   // Q9
  10000,  // Q10 — Safe Haven 2
  15000,  // Q11
  22000,  // Q12
  30000,  // Q13
  40000,  // Q14
  50000,  // Q15 — Grand Prize + Topper Crown Badge
];

export function getKbtTimeLimitSeconds(stepIndex: number): number | null {
  if (stepIndex < 5) return 30;  // Q1-5: 30s
  if (stepIndex < 10) return 45; // Q6-10: 45s
  return null;                   // Q11-15: Untimed
}

export function getKbtTierForStep(stepIndex: number): KbtTier {
  if (stepIndex < 5) return 1;
  if (stepIndex < 10) return 2;
  return 3;
}

export function getKbtSafeHavenXp(completedStepsCount: number): number {
  if (completedStepsCount >= 15) return 50000;
  if (completedStepsCount >= 10) return 10000;
  if (completedStepsCount >= 5) return 1000;
  return 0;
}

export const KBT_QUESTION_BANK: KbtQuestion[] = [
  // TIER 1: NCERT FOUNDATION (Q1-Q5 + Flip backups)
  {
    id: 'kbt-t1-1',
    tier: 1,
    subject: 'Physics',
    question: 'What is the SI unit of electric potential difference?',
    options: ['Ampere', 'Volt', 'Coulomb', 'Ohm'],
    correctIndex: 1,
    buddyHint: 'Socho work done per unit positive charge — joule per coulomb ko kis scientist ke naam par rakha gaya hai?',
    explanation: 'Electric potential difference V = W/q has SI unit J/C, known as Volt (V).',
  },
  {
    id: 'kbt-t1-2',
    tier: 1,
    subject: 'Chemistry',
    question: 'Which gas is evolved when zinc granules react with dilute hydrochloric acid?',
    options: ['Oxygen', 'Chlorine', 'Hydrogen', 'Nitrogen'],
    correctIndex: 2,
    buddyHint: 'Zinc acid se zyada reactive metal hai, toh woh acid ke H⁺ ions ko displace karke pop-sound wali gas banata hai.',
    explanation: 'Zn + 2HCl → ZnCl₂ + H₂↑ (Hydrogen gas).',
  },
  {
    id: 'kbt-t1-3',
    tier: 1,
    subject: 'Biology',
    question: 'Which organelle is called the powerhouse of the cell because it synthesizes ATP?',
    options: ['Golgi Apparatus', 'Ribosome', 'Mitochondria', 'Lysosome'],
    correctIndex: 2,
    buddyHint: 'Double-membrane organelle jisme cristae aur Krebs cycle dono chalte hain!',
    explanation: 'Mitochondria generate most of the cell’s ATP via oxidative phosphorylation.',
  },
  {
    id: 'kbt-t1-4',
    tier: 1,
    subject: 'Maths',
    question: 'The derivative of sin(x) with respect to x is:',
    options: ['cos(x)', '-cos(x)', 'tan(x)', '-sin(x)'],
    correctIndex: 0,
    buddyHint: 'x = 0 par sin(x) ka slope +1 hota hai, aur konsa trig function 0 par +1 value deta hai?',
    explanation: 'd/dx [sin(x)] = cos(x).',
  },
  {
    id: 'kbt-t1-5',
    tier: 1,
    subject: 'Physics',
    question: 'At constant temperature, the pressure of a fixed mass of ideal gas is inversely proportional to volume. This is:',
    options: ["Charles's Law", "Boyle's Law", "Avogadro's Law", "Dalton's Law"],
    correctIndex: 1,
    buddyHint: 'Isothermal relation PV = constant — yaad rakho "Boyle boils at constant T"!',
    explanation: "Boyle's Law states P ∝ 1/V at constant temperature and moles.",
  },
  {
    id: 'kbt-t1-6',
    tier: 1,
    subject: 'Chemistry',
    question: 'The pH of pure neutral water at 298 K is:',
    options: ['5', '6', '7', '8'],
    correctIndex: 2,
    buddyHint: 'Kw = 10⁻¹⁴ at 298 K, so [H⁺] = 10⁻⁷ M. Negative log le lo!',
    explanation: 'At 298 K, [H⁺] = 10⁻⁷ M ⇒ pH = -log(10⁻⁷) = 7.',
  },
  // TIER 2: JEE MAIN / NEET STANDARD (Q6-Q10 + Flip backups)
  {
    id: 'kbt-t2-1',
    tier: 2,
    subject: 'Physics',
    question: 'A projectile is fired at 45° with speed u. Its horizontal range R is:',
    options: ['u²/2g', 'u²/g', '2u²/g', 'u²/4g'],
    correctIndex: 1,
    buddyHint: 'Range ka formula u² sin(2θ) / g hota hai. θ = 45° dalne par sin(90°) ki value dekho!',
    explanation: 'R = u² sin(90°)/g = u²/g (maximum horizontal range).',
  },
  {
    id: 'kbt-t2-2',
    tier: 2,
    subject: 'Chemistry',
    question: 'Which of the following molecules has zero net dipole moment despite polar bonds?',
    options: ['NH₃', 'H₂O', 'BF₃', 'SO₂'],
    correctIndex: 2,
    buddyHint: 'Symmetric trigonal planar geometry jisme teeno bond dipoles 120° par ek doosre ko cancel kar dete hain.',
    explanation: 'BF₃ is symmetrical trigonal planar (sp²) with zero lone pairs, so net μ = 0.',
  },
  {
    id: 'kbt-t2-3',
    tier: 2,
    subject: 'Maths',
    question: 'The sum of infinite geometric series 1 + 1/2 + 1/4 + 1/8 + ... equals:',
    options: ['1.5', '2', '2.5', '4'],
    correctIndex: 1,
    buddyHint: 'Infinite GP ka formula S = a / (1 - r) use karo, jahan a = 1 aur r = 1/2 hai.',
    explanation: 'S∞ = 1 / (1 - 1/2) = 2.',
  },
  {
    id: 'kbt-t2-4',
    tier: 2,
    subject: 'Biology',
    question: 'Which enzyme joins Okazaki fragments on the lagging strand during DNA replication?',
    options: ['DNA Helicase', 'RNA Primase', 'DNA Ligase', 'Topoisomerase'],
    correctIndex: 2,
    buddyHint: 'Molecular glue ki tarah phosphodiester bond seal karne wale enzyme ka naam socho!',
    explanation: 'DNA Ligase seals nicks between Okazaki fragments by forming phosphodiester bonds.',
  },
  {
    id: 'kbt-t2-5',
    tier: 2,
    subject: 'Physics',
    question: 'Two resistors of 6 Ω and 3 Ω are connected in parallel. Their equivalent resistance is:',
    options: ['9 Ω', '4.5 Ω', '2 Ω', '1.5 Ω'],
    correctIndex: 2,
    buddyHint: 'Parallel combination mein product upon sum use karo — equivalent resistance hamesha smallest resistor se chhota hota hai!',
    explanation: 'R_eq = (6 × 3) / (6 + 3) = 18 / 9 = 2 Ω.',
  },
  {
    id: 'kbt-t2-6',
    tier: 2,
    subject: 'Chemistry',
    question: 'According to Hund’s rule, how many unpaired electrons are present in a ground-state Nitrogen (Z=7) atom?',
    options: ['1', '2', '3', '5'],
    correctIndex: 2,
    buddyHint: 'Configuration 1s² 2s² 2p³ hai — teeno 2p orbitals pehle singly fill honge!',
    explanation: '2p³ occupies px¹, py¹, pz¹ with parallel spins → 3 unpaired electrons.',
  },
  // TIER 3: ADVANCED MULTI-CONCEPT (Q11-Q15 + Flip backups)
  {
    id: 'kbt-t3-1',
    tier: 3,
    subject: 'Physics',
    question: 'A solid sphere rolls without slipping down an incline of angle θ. Its linear acceleration is:',
    options: ['(5/7) g sinθ', '(2/3) g sinθ', '(1/2) g sinθ', '(3/5) g sinθ'],
    correctIndex: 0,
    buddyHint: 'Rolling acceleration a = g sinθ / (1 + I/mR²). Solid sphere ke liye I = 2/5 mR² put karo!',
    explanation: 'a = g sinθ / (1 + 2/5) = (5/7) g sinθ.',
  },
  {
    id: 'kbt-t3-2',
    tier: 3,
    subject: 'Chemistry',
    question: 'In an S_N2 reaction of an optically active alkyl halide, the stereochemical outcome is:',
    options: ['Complete retention', 'Racemization', 'Walden inversion', 'Elimination only'],
    correctIndex: 2,
    buddyHint: 'Nucleophile backside se attack karta hai, jaise tez hawa mein chhaata (umbrella) ulta ho jata hai!',
    explanation: 'Backside attack in concerted S_N2 causes 100% Walden inversion of configuration.',
  },
  {
    id: 'kbt-t3-3',
    tier: 3,
    subject: 'Maths',
    question: 'If ω is a non-real cube root of unity, then the value of (1 + ω - ω²)³ is:',
    options: ['-8', '8', '0', '-1'],
    correctIndex: 0,
    buddyHint: 'Identity 1 + ω + ω² = 0 se 1 + ω ko -ω² replace karo, aur phir (-2ω²)³ simplify karo (yaad rakhna ω³ = 1)!',
    explanation: '1 + ω = -ω², so (-2ω²)³ = -8 ω⁶ = -8(1) = -8.',
  },
  {
    id: 'kbt-t3-4',
    tier: 3,
    subject: 'Physics',
    question: 'The de Broglie wavelength of an electron accelerated through potential V volts is approximately:',
    options: ['12.27 / √V Å', '1.227 / V Å', '6.63 / √V Å', '12.27 × √V Å'],
    correctIndex: 0,
    buddyHint: 'λ = h / √(2meV) — Angstrom mein famous 12.27 shortcut denominator mein square root of V ke saath aata hai!',
    explanation: 'For electrons, λ ≈ 12.27 / √V Å.',
  },
  {
    id: 'kbt-t3-5',
    tier: 3,
    subject: 'Chemistry',
    question: 'For a first-order reaction, the ratio of time required for 99.9% completion to its half-life t₁/₂ is closest to:',
    options: ['5', '10', '20', '3.3'],
    correctIndex: 1,
    buddyHint: '99.9% complete matlab 1/1000 remaining, aur 2¹⁰ = 1024 hota hai — toh kitni half-lives lagenge?',
    explanation: 't_99.9% = (2.303/k) log(1000) = 3 × (2.303/k) ≈ 10 × t₁/₂.',
  },
  {
    id: 'kbt-t3-6',
    tier: 3,
    subject: 'Maths',
    question: 'The area bounded by parabola y² = 4ax and its latus rectum x = a is:',
    options: ['(4/3) a²', '(8/3) a²', '2a²', '(16/3) a²'],
    correctIndex: 1,
    buddyHint: 'Symmetry use karo: 2 × ∫₀ᵃ 2√(ax) dx calculate karo, power 3/2 aayegi!',
    explanation: 'Area = 2 ∫₀ᵃ 2√a √x dx = 4√a · (2/3) a^(3/2) = (8/3) a².',
  },
];

export function applyFiftyFifty(correctIndex: number): number[] {
  const wrong = [0, 1, 2, 3].filter((idx) => idx !== correctIndex);
  return wrong.slice(0, 2);
}

export function generatePeerPoll(correctIndex: number, tier: KbtTier): [number, number, number, number] {
  const rightPct = tier === 1 ? 74 : tier === 2 ? 58 : 46;
  const remaining = 100 - rightPct;
  const a = Math.round(remaining * 0.45);
  const b = Math.round(remaining * 0.35);
  const c = remaining - a - b;
  const wrongPcts = [a, b, c];
  const poll: [number, number, number, number] = [0, 0, 0, 0];
  let wIdx = 0;
  for (let i = 0; i < 4; i++) {
    if (i === correctIndex) poll[i] = rightPct;
    else poll[i] = wrongPcts[wIdx++];
  }
  return poll;
}

/* ============================================================================
   GAME 4: SYLLABUS DOMINION — HEX TERRITORY CONQUEST
   ============================================================================ */
export type DominionRegionId =
  | 'mechanics-valley'
  | 'electrodynamics-citadel'
  | 'organic-fortress'
  | 'calculus-peaks'
  | 'physiology-basin';

export interface DominionQuestion {
  prompt: string;
  options: [string, string, string, string];
  correctIndex: number;
  note: string;
}

export interface DominionHexTile {
  id: string;
  regionId: DominionRegionId;
  regionName: string;
  subject: ArenaSubject;
  chapterName: string;
  x: number; // SVG center x
  y: number; // SVG center y
  neighbors: string[];
  isHomeBase?: boolean;
  skirmish: [DominionQuestion, DominionQuestion, DominionQuestion];
  bossPyq: DominionQuestion;
}

export const DOMINION_REGIONS: Array<{
  id: DominionRegionId;
  name: string;
  subject: ArenaSubject;
  bonusLabel: string;
}> = [
  { id: 'mechanics-valley', name: 'Mechanics Valley', subject: 'Physics', bonusLabel: '+15% Physics XP' },
  { id: 'electrodynamics-citadel', name: 'Electrodynamics Citadel', subject: 'Physics', bonusLabel: '+15% EM XP' },
  { id: 'organic-fortress', name: 'Organic Fortress', subject: 'Chemistry', bonusLabel: '+15% Chemistry XP' },
  { id: 'calculus-peaks', name: 'Calculus Peaks', subject: 'Maths', bonusLabel: '+15% Maths XP' },
  { id: 'physiology-basin', name: 'Human Physiology Basin', subject: 'Biology', bonusLabel: '+15% Biology XP' },
];

export const SYLLABUS_DOMINION_HEXES: DominionHexTile[] = [
  // Region 1: Mechanics Valley (Home Base + 2 adjacent)
  {
    id: 'mech-1',
    regionId: 'mechanics-valley',
    regionName: 'Mechanics Valley',
    subject: 'Physics',
    chapterName: 'Kinematics Base',
    x: 110,
    y: 120,
    neighbors: ['mech-2', 'mech-3', 'calc-1'],
    isHomeBase: true,
    skirmish: [
      { prompt: 'Area under a velocity-time graph gives:', options: ['Acceleration', 'Displacement', 'Force', 'Jerk'], correctIndex: 1, note: '∫v dt = Δx (Displacement).' },
      { prompt: 'A ball dropped from rest falls how far in 2 s (g = 10 m/s²)?', options: ['10 m', '20 m', '40 m', '5 m'], correctIndex: 1, note: 's = ½gt² = ½(10)(4) = 20 m.' },
      { prompt: 'At highest point of vertical throw, acceleration is:', options: ['0', 'g downward', 'g upward', '2g'], correctIndex: 1, note: 'Gravity g acts continuously downward even at v = 0.' },
    ],
    bossPyq: {
      prompt: '[Boss PYQ] A particle covers half its journey at 40 km/h and half at 60 km/h. Average speed is:',
      options: ['50 km/h', '48 km/h', '52 km/h', '45 km/h'],
      correctIndex: 1,
      note: 'Equal distances → harmonic mean: 2v₁v₂/(v₁+v₂) = 4800/100 = 48 km/h.',
    },
  },
  {
    id: 'mech-2',
    regionId: 'mechanics-valley',
    regionName: 'Mechanics Valley',
    subject: 'Physics',
    chapterName: 'Laws of Motion',
    x: 206,
    y: 72,
    neighbors: ['mech-1', 'mech-3', 'em-1'],
    skirmish: [
      { prompt: 'Newton’s First Law defines:', options: ['Momentum', 'Inertia', 'Impulse', 'Torque'], correctIndex: 1, note: 'First Law is the Law of Inertia.' },
      { prompt: 'Net force needed to move a 5 kg mass at constant 4 m/s is:', options: ['20 N', '5 N', '0 N', '1.25 N'], correctIndex: 2, note: 'Constant velocity ⇒ a = 0 ⇒ F_net = 0.' },
      { prompt: 'Limiting friction depends on:', options: ['Contact area', 'Normal reaction N', 'Velocity', 'Color'], correctIndex: 1, note: 'f_max = μ_s N, independent of apparent area.' },
    ],
    bossPyq: {
      prompt: '[Boss PYQ] Two masses 2 kg & 3 kg hang over a frictionless pulley. Acceleration (g = 10 m/s²) is:',
      options: ['2 m/s²', '4 m/s²', '5 m/s²', '1 m/s²'],
      correctIndex: 0,
      note: 'a = (m₂ - m₁)g / (m₁ + m₂) = (1×10)/5 = 2 m/s².',
    },
  },
  {
    id: 'mech-3',
    regionId: 'mechanics-valley',
    regionName: 'Mechanics Valley',
    subject: 'Physics',
    chapterName: 'Rotational Dynamics',
    x: 206,
    y: 168,
    neighbors: ['mech-1', 'mech-2', 'em-2', 'calc-1'],
    skirmish: [
      { prompt: 'Moment of inertia of a thin ring (M, R) about central perpendicular axis:', options: ['½MR²', 'MR²', '⅖MR²', '⅔MR²'], correctIndex: 1, note: 'All mass lies at distance R → I = MR².' },
      { prompt: 'Rotational analogue of linear momentum p is:', options: ['Torque τ', 'Angular momentum L', 'Power', 'Angular speed'], correctIndex: 1, note: 'L = Iω mirrors p = mv.' },
      { prompt: 'If external torque is zero, which quantity stays conserved?', options: ['Kinetic energy always', 'Angular momentum L', 'Angular acceleration', 'Force'], correctIndex: 1, note: 'τ_ext = dL/dt = 0 ⇒ L = constant.' },
    ],
    bossPyq: {
      prompt: '[Boss PYQ] A dancer pulls arms inward reducing I to half. Rotational kinetic energy becomes:',
      options: ['Half', 'Double', 'Quadruple', 'Unchanged'],
      correctIndex: 1,
      note: 'K = L²/(2I); with L constant and I → I/2, K doubles.',
    },
  },

  // Region 2: Electrodynamics Citadel
  {
    id: 'em-1',
    regionId: 'electrodynamics-citadel',
    regionName: 'Electrodynamics Citadel',
    subject: 'Physics',
    chapterName: 'Electrostatics',
    x: 302,
    y: 72,
    neighbors: ['mech-2', 'em-2', 'org-1'],
    skirmish: [
      { prompt: 'Electric field inside a static hollow conducting shell is:', options: ['kQ/R²', 'Zero', 'Infinite', 'Constant non-zero'], correctIndex: 1, note: 'Electrostatic shielding ⇒ E_inside = 0.' },
      { prompt: 'Work done moving charge q on an equipotential surface is:', options: ['qV', 'Zero', 'qEd', '½qV'], correctIndex: 1, note: 'ΔV = 0 ⇒ W = qΔV = 0.' },
      { prompt: 'Dielectric slab inserted into isolated charged capacitor makes capacitance:', options: ['Increase K times', 'Decrease K times', 'Zero', 'Unchanged'], correctIndex: 0, note: 'C’ = K C.' },
    ],
    bossPyq: {
      prompt: '[Boss PYQ] Potential on surface of conducting sphere of radius R is V. Potential at r = R/2 is:',
      options: ['V/2', '2V', 'V', '0'],
      correctIndex: 2,
      note: 'Since E = 0 inside conductor, potential stays constant = V throughout the interior.',
    },
  },
  {
    id: 'em-2',
    regionId: 'electrodynamics-citadel',
    regionName: 'Electrodynamics Citadel',
    subject: 'Physics',
    chapterName: 'Current & Magnetism',
    x: 302,
    y: 168,
    neighbors: ['mech-3', 'em-1', 'org-2', 'calc-2'],
    skirmish: [
      { prompt: 'Magnetic force on a stationary charge in uniform B-field is:', options: ['qvB', 'Zero', 'qE', 'qv/B'], correctIndex: 1, note: 'F = q(v × B); at v = 0, F = 0.' },
      { prompt: 'Kirchhoff’s junction rule expresses conservation of:', options: ['Energy', 'Charge', 'Momentum', 'Mass'], correctIndex: 1, note: 'ΣI_in = ΣI_out follows charge conservation.' },
      { prompt: 'Work done by magnetic Lorentz force on a moving charge is always:', options: ['Positive', 'Negative', 'Zero', 'qvBt'], correctIndex: 2, note: 'F ⊥ v always, so magnetic force does zero work.' },
    ],
    bossPyq: {
      prompt: '[Boss PYQ] A wire is stretched to double its length (volume constant). Its new resistance is:',
      options: ['2R', '4R', 'R/2', '8R'],
      correctIndex: 1,
      note: 'R ∝ L² at constant volume → (2)² R = 4R.',
    },
  },

  // Region 3: Organic Fortress
  {
    id: 'org-1',
    regionId: 'organic-fortress',
    regionName: 'Organic Fortress',
    subject: 'Chemistry',
    chapterName: 'GOC & Isomerism',
    x: 398,
    y: 72,
    neighbors: ['em-1', 'org-2', 'bio-1'],
    skirmish: [
      { prompt: 'Stability order of carbocations is:', options: ['1° > 2° > 3°', '3° > 2° > 1°', 'Methyl > 3°', 'All equal'], correctIndex: 1, note: 'Hyperconjugation and +I effect stabilize 3° carbocations most.' },
      { prompt: 'Which species is aromatic by Hückel’s (4n+2)π rule?', options: ['Cyclobutadiene', 'Benzene', 'Cyclooctatetraene', 'Cyclopentadiene'], correctIndex: 1, note: 'Benzene is cyclic, planar, conjugated with 6π electrons (n=1).' },
      { prompt: 'Number of σ bonds in benzene (C₆H₆) is:', options: ['6', '9', '12', '15'], correctIndex: 2, note: '6 C–C σ + 6 C–H σ = 12 σ bonds.' },
    ],
    bossPyq: {
      prompt: '[Boss PYQ] Strongest acid among the following is:',
      options: ['CH₃COOH', 'ClCH₂COOH', 'Cl₂CHCOOH', 'CCl₃COOH'],
      correctIndex: 3,
      note: 'Three strong -I chlorine groups maximally stabilize the trichloroacetate conjugate base.',
    },
  },
  {
    id: 'org-2',
    regionId: 'organic-fortress',
    regionName: 'Organic Fortress',
    subject: 'Chemistry',
    chapterName: 'Carbonyls & Amines',
    x: 398,
    y: 168,
    neighbors: ['em-2', 'org-1', 'bio-2'],
    skirmish: [
      { prompt: 'Tollens’ reagent gives a silver mirror test with:', options: ['Aldehydes', 'Alkanes', 'Ketones', 'Ethers'], correctIndex: 0, note: 'Aldehydes reduce [Ag(NH₃)₂]⁺ to metallic Ag mirror.' },
      { prompt: 'Carbylamine test is positive ONLY for:', options: ['1° Amines', '2° Amines', '3° Amines', 'Amides'], correctIndex: 0, note: 'Only primary aliphatic/aromatic amines form foul-smelling isocyanides.' },
      { prompt: 'Formaldehyde (HCHO) undergoes Cannizzaro reaction because it has:', options: ['No α-H', '3 α-H', 'A benzene ring', 'High boiling point'], correctIndex: 0, note: 'Aldehydes lacking α-hydrogen undergo Cannizzaro disproportionation.' },
    ],
    bossPyq: {
      prompt: '[Boss PYQ] Reagent that reduces R-COCl selectively to R-CHO (Rosenmund reduction):',
      options: ['LiAlH₄', 'H₂ / Pd-BaSO₄', 'NaBH₄', 'Zn-Hg / HCl'],
      correctIndex: 1,
      note: 'Poisoned Lindlar-like Pd/BaSO₄ stops reduction cleanly at the aldehyde stage.',
    },
  },

  // Region 4: Calculus Peaks
  {
    id: 'calc-1',
    regionId: 'calculus-peaks',
    regionName: 'Calculus Peaks',
    subject: 'Maths',
    chapterName: 'Limits & Continuity',
    x: 158,
    y: 262,
    neighbors: ['mech-1', 'mech-3', 'calc-2'],
    skirmish: [
      { prompt: 'Value of lim (x→0) (eˣ - 1) / x is:', options: ['0', '1', 'e', '∞'], correctIndex: 1, note: 'Standard exponential limit equals 1.' },
      { prompt: 'f(x) = |x| is NOT differentiable at:', options: ['x = 1', 'x = -1', 'x = 0', 'Everywhere'], correctIndex: 2, note: 'Sharp corner at x = 0: LHD = -1 ≠ RHD = +1.' },
      { prompt: 'Derivative of ln(x) is:', options: ['1/x', 'x', 'eˣ', 'ln(x)/x'], correctIndex: 0, note: 'd/dx[ln x] = 1/x for x > 0.' },
    ],
    bossPyq: {
      prompt: '[Boss PYQ] lim (x→∞) (1 + 2/x)ˣ equals:',
      options: ['e', 'e²', '2e', '1'],
      correctIndex: 1,
      note: 'lim (1 + k/x)ˣ = eᵏ ⇒ e².',
    },
  },
  {
    id: 'calc-2',
    regionId: 'calculus-peaks',
    regionName: 'Calculus Peaks',
    subject: 'Maths',
    chapterName: 'Definite Integrals',
    x: 254,
    y: 262,
    neighbors: ['calc-1', 'em-2', 'bio-2'],
    skirmish: [
      { prompt: 'For an odd function f(-x) = -f(x), ∫₋ₐᵃ f(x) dx equals:', options: ['2∫₀ᵃ f(x)dx', '0', 'a²', '1'], correctIndex: 1, note: 'Symmetric integral of any odd function is identically 0.' },
      { prompt: '∫ 1/(1+x²) dx equals:', options: ['sin⁻¹x + C', 'tan⁻¹x + C', 'ln(1+x²) + C', 'sec⁻¹x + C'], correctIndex: 1, note: 'Standard inverse tangent antiderivative.' },
      { prompt: '∫₀¹ x² dx equals:', options: ['1/2', '1/3', '1/4', '1'], correctIndex: 1, note: '[x³/3]₀¹ = 1/3.' },
    ],
    bossPyq: {
      prompt: '[Boss PYQ] ∫₋₁¹ (x³ cos x + 1) dx equals:',
      options: ['0', '1', '2', 'π'],
      correctIndex: 2,
      note: 'x³ cos x is odd (integral = 0); ∫₋₁¹ 1 dx = 2.',
    },
  },

  // Region 5: Human Physiology Basin
  {
    id: 'bio-1',
    regionId: 'physiology-basin',
    regionName: 'Human Physiology Basin',
    subject: 'Biology',
    chapterName: 'Breathing & Circulation',
    x: 494,
    y: 120,
    neighbors: ['org-1', 'bio-2'],
    skirmish: [
      { prompt: 'Normal human tidal volume (TV) at rest is about:', options: ['500 mL', '1200 mL', '2500 mL', '4500 mL'], correctIndex: 0, note: 'NCERT: Tidal Volume ≈ 500 mL per breath.' },
      { prompt: 'Lub sound of heartbeat is caused by closure of:', options: ['Semilunar valves', 'AV (tricuspid & bicuspid) valves', 'Aorta', 'Vena cava'], correctIndex: 1, note: 'First heart sound (Lub) = AV valve closure at ventricular systole.' },
      { prompt: 'Blood group with NO antigens on RBC surface is:', options: ['AB', 'A', 'B', 'O'], correctIndex: 3, note: 'Group O lacks A and B antigens (universal RBC donor).' },
    ],
    bossPyq: {
      prompt: '[Boss PYQ] Vital Capacity (VC) equals:',
      options: ['TV + IRV', 'ERV + TV + IRV', 'RV + ERV', 'TV + RV'],
      correctIndex: 1,
      note: 'VC = ERV + TV + IRV (max air exhaled after deepest inspiration).',
    },
  },
  {
    id: 'bio-2',
    regionId: 'physiology-basin',
    regionName: 'Human Physiology Basin',
    subject: 'Biology',
    chapterName: 'Neural & Endocrine',
    x: 350,
    y: 262,
    neighbors: ['calc-2', 'org-2', 'bio-1'],
    skirmish: [
      { prompt: 'Resting membrane potential of a neuron is maintained primarily by:', options: ['Na⁺-K⁺ ATPase pump', 'Ca²⁺ channel', 'Hemoglobin', 'Insulin'], correctIndex: 0, note: 'Pumps 3 Na⁺ out and 2 K⁺ in per ATP hydrolyzed.' },
      { prompt: 'Hormone secreted by pancreatic β-cells to lower blood glucose:', options: ['Glucagon', 'Insulin', 'Cortisol', 'Adrenaline'], correctIndex: 1, note: 'Insulin promotes glycogenesis and cellular glucose uptake.' },
      { prompt: 'Thermoregulation center of the human brain is the:', options: ['Cerebellum', 'Hypothalamus', 'Medulla', 'Pons'], correctIndex: 1, note: 'Hypothalamus controls body temperature, hunger, and thirst.' },
    ],
    bossPyq: {
      prompt: '[Boss PYQ] Depolarization phase of an action potential is caused by rapid influx of:',
      options: ['K⁺ ions', 'Na⁺ ions', 'Cl⁻ ions', 'Mg²⁺ ions'],
      correctIndex: 1,
      note: 'Voltage-gated Na⁺ channels open rapidly, driving membrane potential positive.',
    },
  },
];

export function isHexAttackable(
  hexId: string,
  ownedHexIds: readonly string[],
  hexes: readonly DominionHexTile[] = SYLLABUS_DOMINION_HEXES
): boolean {
  if (ownedHexIds.includes(hexId)) return false;
  const tile = hexes.find((h) => h.id === hexId);
  if (!tile) return false;
  return tile.neighbors.some((n) => ownedHexIds.includes(n));
}

export type SkirmishOutcome = 'captured' | 'damaged' | 'repelled';

export function resolveSkirmishOutcome(correctCount: number): SkirmishOutcome {
  if (correctCount >= 3) return 'captured';
  if (correctCount === 2) return 'damaged';
  return 'repelled';
}

export function getDominatedRegions(
  ownedHexIds: readonly string[],
  hexes: readonly DominionHexTile[] = SYLLABUS_DOMINION_HEXES
): DominionRegionId[] {
  const ownedSet = new Set(ownedHexIds);
  const byRegion = new Map<DominionRegionId, DominionHexTile[]>();
  for (const h of hexes) {
    const arr = byRegion.get(h.regionId) ?? [];
    arr.push(h);
    byRegion.set(h.regionId, arr);
  }
  const dominated: DominionRegionId[] = [];
  for (const [regionId, regionHexes] of byRegion.entries()) {
    if (regionHexes.length > 0 && regionHexes.every((h) => ownedSet.has(h.id))) {
      dominated.push(regionId);
    }
  }
  return dominated;
}
