export type ApexRivalId = 'vortex' | 'helix' | 'apex-zero';
export type ApexTrackId = 'quantum-clash' | 'synthesis-strike' | 'logic-labyrinth';

export interface ApexRivalProfile {
  id: ApexRivalId;
  name: string;
  title: string;
  elo: number;
  accuracyRate: number; // 0..1
  avgResponseMs: number;
  accentColor: string;
  tagline: string;
}

export interface ApexDuelQuestion {
  id: string;
  track: ApexTrackId;
  subject: 'Physics' | 'Chemistry' | 'Mathematics' | 'Biology';
  chapter: string;
  prompt: string;
  formulaLatex?: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanation: string;
}

export interface PointTradeInput {
  playerPoints: number;
  aiPoints: number;
  playerCorrect: boolean;
  aiCorrect: boolean;
  playerTimeMs: number;
  aiTimeMs: number;
  playerStreak: number;
  roundTimeLimitMs?: number;
}

export interface PointTradeResult {
  nextPlayerPoints: number;
  nextAiPoints: number;
  deltaPlayer: number;
  deltaAi: number;
  nextPlayerStreak: number;
  headline: string;
  verdict: 'player-steal' | 'player-edge' | 'clash-draw' | 'ai-counter' | 'ai-steal';
}

export interface ApexRankTier {
  tierName: string;
  minPoints: number;
  rankIndex: number; // 1..6
  accentClass: string;
}

export const STARTING_DUEL_POINTS = 1000;
export const DUEL_ROUND_LIMIT_MS = 15000;

export const APEX_RIVALS: ApexRivalProfile[] = [
  {
    id: 'vortex',
    name: 'Vortex-AI',
    title: '92%ile Contender Bot',
    elo: 1380,
    accuracyRate: 0.68,
    avgResponseMs: 7800,
    accentColor: '#00B4FF',
    tagline: 'Balanced JEE/NEET pace — ideal for warming up combo steals.',
  },
  {
    id: 'helix',
    name: 'Helix-AI',
    title: '97.5%ile Vanguard Bot',
    elo: 1620,
    accuracyRate: 0.8,
    avgResponseMs: 5600,
    accentColor: '#A855F7',
    tagline: 'Sharp organic & physics instincts — punishes slow hesitation.',
  },
  {
    id: 'apex-zero',
    name: 'Apex-Zero',
    title: 'AIR-100 Grandmaster AI',
    elo: 1940,
    accuracyRate: 0.9,
    avgResponseMs: 4100,
    accentColor: '#F27B13',
    tagline: 'Relentless speed + precision. Out-think it to surge up the Apex Ladder.',
  },
];

export const APEX_RANK_TIERS: ApexRankTier[] = [
  { tierName: 'Spark Initiate', minPoints: 0, rankIndex: 1, accentClass: 'text-slate-300' },
  { tierName: 'Contender II', minPoints: 850, rankIndex: 2, accentClass: 'text-sky-300' },
  { tierName: 'Vanguard I', minPoints: 1000, rankIndex: 3, accentClass: 'text-[#00B4FF]' },
  { tierName: 'Quantum Striker', minPoints: 1180, rankIndex: 4, accentClass: 'text-emerald-400' },
  { tierName: 'Apex Master', minPoints: 1380, rankIndex: 5, accentClass: 'text-amber-300' },
  { tierName: 'Grandmaster', minPoints: 1600, rankIndex: 6, accentClass: 'text-fuchsia-300' },
];

export function getApexRankTier(points: number): ApexRankTier {
  let matched = APEX_RANK_TIERS[0];
  for (const tier of APEX_RANK_TIERS) {
    if (points >= tier.minPoints) matched = tier;
  }
  return matched;
}

/**
 * Dynamic zero-sum point-trading engine for 2-player vs AI Apex Arena battles.
 * Both participants begin at 1,000 points and trade points live based on accuracy & speed.
 */
export function calculatePointTrade(input: PointTradeInput): PointTradeResult {
  const limit = input.roundTimeLimitMs ?? DUEL_ROUND_LIMIT_MS;
  const clampedPlayerMs = Math.max(400, Math.min(limit, input.playerTimeMs));
  const clampedAiMs = Math.max(400, Math.min(limit, input.aiTimeMs));

  const playerSpeedRatio = Math.max(0, 1 - clampedPlayerMs / limit);
  const aiSpeedRatio = Math.max(0, 1 - clampedAiMs / limit);

  let transfer = 0; // positive => player steals from AI, negative => AI steals from player
  let nextStreak = input.playerCorrect ? input.playerStreak + 1 : 0;
  let headline = 'Deadlock — Points Held';
  let verdict: PointTradeResult['verdict'] = 'clash-draw';

  if (input.playerCorrect && !input.aiCorrect) {
    const streakBonus = Math.min(45, input.playerStreak * 15);
    transfer = Math.round(105 + playerSpeedRatio * 55 + streakBonus);
    headline = `Clean Steal! +${transfer} pts drained from AI`;
    verdict = 'player-steal';
  } else if (!input.playerCorrect && input.aiCorrect) {
    transfer = -Math.round(95 + aiSpeedRatio * 50);
    headline = `AI Counter-Steal! ${transfer} pts lost`;
    verdict = 'ai-steal';
  } else if (input.playerCorrect && input.aiCorrect) {
    const timeDiff = clampedAiMs - clampedPlayerMs; // positive => player faster
    if (timeDiff > 250) {
      const speedEdge = Math.min(65, Math.round(25 + (timeDiff / limit) * 90));
      const streakBonus = Math.min(20, input.playerStreak * 6);
      transfer = speedEdge + streakBonus;
      headline = `Speed Advantage! +${transfer} pts traded`;
      verdict = 'player-edge';
    } else if (timeDiff < -250) {
      transfer = -Math.min(55, Math.round(20 + (Math.abs(timeDiff) / limit) * 75));
      headline = `AI Faster on Draw! ${transfer} pts traded`;
      verdict = 'ai-counter';
    } else {
      transfer = 0;
      headline = 'Photo-Finish Tie — 0 pts traded';
      verdict = 'clash-draw';
    }
  } else {
    // Both missed: minor penalty to maintain stakes without unfair wipeout
    transfer = 0;
    nextStreak = 0;
    headline = 'Both Missed — Stalemate (0 pts)';
    verdict = 'clash-draw';
  }

  // Clamp transfer so neither combatant drops below 0
  if (transfer > 0) {
    transfer = Math.min(transfer, input.aiPoints);
  } else if (transfer < 0) {
    transfer = -Math.min(Math.abs(transfer), input.playerPoints);
  }

  return {
    nextPlayerPoints: input.playerPoints + transfer,
    nextAiPoints: input.aiPoints - transfer,
    deltaPlayer: transfer,
    deltaAi: -transfer,
    nextPlayerStreak: nextStreak,
    headline,
    verdict,
  };
}

/**
 * Simulates an AI opponent answer with deterministic-friendly variance around the rival's profile.
 */
export function simulateAiOpponentTurn(
  rival: ApexRivalProfile,
  roundIndex: number,
  rng: () => number = Math.random
): { aiCorrect: boolean; aiTimeMs: number } {
  const jitter = (rng() - 0.5) * 2600;
  const pressureShift = roundIndex >= 5 ? -350 : 0;
  const aiTimeMs = Math.max(
    1800,
    Math.min(DUEL_ROUND_LIMIT_MS - 1200, Math.round(rival.avgResponseMs + jitter + pressureShift))
  );
  const aiCorrect = rng() <= rival.accuracyRate;
  return { aiCorrect, aiTimeMs };
}

export const APEX_DUEL_QUESTION_BANK: ApexDuelQuestion[] = [
  // QUANTUM CLASH (Physics)
  {
    id: 'qc-1',
    track: 'quantum-clash',
    subject: 'Physics',
    chapter: 'Electrostatics',
    prompt: 'Electric field just outside a large uniformly charged conducting sheet of surface charge density σ is:',
    formulaLatex: 'E = ?',
    options: ['σ / ε₀', 'σ / (2ε₀)', '2σ / ε₀', 'Zero'],
    correctIndex: 0,
    explanation: 'Inside a conductor E = 0, so by Gauss law across a pillbox straddling one surface, E = σ / ε₀ (twice a thin non-conducting sheet).',
  },
  {
    id: 'qc-2',
    track: 'quantum-clash',
    subject: 'Physics',
    chapter: 'Modern Physics',
    prompt: 'If the kinetic energy of a free electron doubles, its de Broglie wavelength λ changes by a factor of:',
    formulaLatex: '\\lambda = \\frac{h}{\\sqrt{2mK}}',
    options: ['1 / √2', '√2', '1 / 2', '2'],
    correctIndex: 0,
    explanation: 'Since λ ∝ 1 / √K, doubling K divides λ by √2.',
  },
  {
    id: 'qc-3',
    track: 'quantum-clash',
    subject: 'Physics',
    chapter: 'Rotational Motion',
    prompt: 'A solid sphere rolls without slipping down an incline of angle θ. Its linear acceleration is:',
    formulaLatex: 'a = \\frac{g\\sin\\theta}{1 + k^2/R^2}',
    options: ['(5/7) g sin θ', '(2/3) g sin θ', '(1/2) g sin θ', '(3/5) g sin θ'],
    correctIndex: 0,
    explanation: 'For a solid sphere I = (2/5)mR², so k²/R² = 2/5 and a = g sin θ / (1 + 2/5) = (5/7) g sin θ.',
  },
  {
    id: 'qc-4',
    track: 'quantum-clash',
    subject: 'Physics',
    chapter: 'Current Electricity',
    prompt: 'A wire of resistance R is stretched uniformly to double its length. Its new resistance becomes:',
    formulaLatex: 'R = \\rho\\frac{L}{A}',
    options: ['4R', '2R', 'R / 2', '8R'],
    correctIndex: 0,
    explanation: 'Volume AL is constant, so doubling L halves A; therefore R′ = ρ(2L)/(A/2) = 4R.',
  },
  {
    id: 'qc-5',
    track: 'quantum-clash',
    subject: 'Physics',
    chapter: 'Ray Optics',
    prompt: 'An object is placed at 2f in front of a convex lens of focal length f. The image magnification is:',
    formulaLatex: '\\frac{1}{v} - \\frac{1}{u} = \\frac{1}{f}',
    options: ['-1 (real, inverted)', '+1 (virtual, erect)', '-2 (real, magnified)', '-0.5 (diminished)'],
    correctIndex: 0,
    explanation: 'With u = -2f, 1/v = 1/f - 1/(2f) = 1/(2f) => v = +2f and m = v/u = -1.',
  },
  {
    id: 'qc-6',
    track: 'quantum-clash',
    subject: 'Physics',
    chapter: 'Gravitation',
    prompt: 'The ratio of escape velocity to orbital velocity just above Earth’s surface is:',
    formulaLatex: '\\frac{v_e}{v_o} = ?',
    options: ['√2', '2', '1 / √2', '√3'],
    correctIndex: 0,
    explanation: 'v_e = √(2gR) and v_o = √(gR), so v_e / v_o = √2.',
  },
  {
    id: 'qc-7',
    track: 'quantum-clash',
    subject: 'Physics',
    chapter: 'SHM & Waves',
    prompt: 'At what displacement x from mean position is kinetic energy equal to potential energy in SHM of amplitude A?',
    formulaLatex: 'K = U \\implies \\frac{1}{2}k(A^2 - x^2) = \\frac{1}{2}kx^2',
    options: ['A / √2', 'A / 2', 'A / √3', '√3 A / 2'],
    correctIndex: 0,
    explanation: 'Setting A² - x² = x² gives 2x² = A², so x = ±A / √2.',
  },
  {
    id: 'qc-8',
    track: 'quantum-clash',
    subject: 'Physics',
    chapter: 'Magnetism',
    prompt: 'Radius of the circular path of a charged particle moving perpendicular to uniform magnetic field B is:',
    formulaLatex: 'qvB = \\frac{mv^2}{r}',
    options: ['mv / (qB)', 'qB / (mv)', 'mv² / (qB)', '2πm / (qB)'],
    correctIndex: 0,
    explanation: 'Equating centripetal force mv²/r to magnetic Lorentz force qvB yields r = mv / (qB).',
  },

  // SYNTHESIS STRIKE (Chemistry)
  {
    id: 'ss-1',
    track: 'synthesis-strike',
    subject: 'Chemistry',
    chapter: 'Organic Mechanisms',
    prompt: 'Which alkyl halide undergoes SN2 substitution the fastest with NaI in dry acetone (Finkelstein)?',
    formulaLatex: 'R-X + I^- \\xrightarrow{\\text{acetone}} R-I + X^-',
    options: ['CH₃-Br', '(CH₃)₃C-Br', '(CH₃)₂CH-Br', 'CH₃CH₂CH₂-Cl'],
    correctIndex: 0,
    explanation: 'SN2 favors minimal steric hindrance (methyl > 1° > 2° >> 3°) and Br⁻ is a better leaving group than Cl⁻.',
  },
  {
    id: 'ss-2',
    track: 'synthesis-strike',
    subject: 'Chemistry',
    chapter: 'Aldehydes & Ketones',
    prompt: 'Which reagent cleanly oxidizes a primary alcohol (R-CH₂OH) to an aldehyde without over-oxidizing to acid?',
    formulaLatex: 'R-CH_2OH \\xrightarrow{?} R-CHO',
    options: ['PCC in CH₂Cl₂', 'Acidified KMnO₄ (Δ)', 'Jones Reagent (CrO₃/H₂SO₄)', 'LiAlH₄'],
    correctIndex: 0,
    explanation: 'Pyridinium chlorochromate (PCC) in anhydrous CH₂Cl₂ stops oxidation cleanly at the aldehyde stage.',
  },
  {
    id: 'ss-3',
    track: 'synthesis-strike',
    subject: 'Chemistry',
    chapter: 'Chemical Kinetics',
    prompt: 'For a first-order reaction, half-life t₁/₂ is related to initial concentration [A]₀ as:',
    formulaLatex: 't_{1/2} = \\frac{0.693}{k}',
    options: ['Independent of [A]₀', 'Directly proportional to [A]₀', 'Inversely proportional to [A]₀', 'Proportional to [A]₀²'],
    correctIndex: 0,
    explanation: 'First-order half-life t₁/₂ = ln(2)/k depends solely on rate constant k, independent of initial concentration.',
  },
  {
    id: 'ss-4',
    track: 'synthesis-strike',
    subject: 'Chemistry',
    chapter: 'Coordination Compounds',
    prompt: 'The hybridization and geometry of [Ni(CN)₄]²⁻ (strong field ligand CN⁻) are:',
    formulaLatex: '[\\text{Ni(CN)}_4]^{2-} \\; (d^8)',
    options: ['dsp² · Square Planar', 'sp³ · Tetrahedral', 'd²sp³ · Octahedral', 'sp³d · Trigonal Bipyramidal'],
    correctIndex: 0,
    explanation: 'Ni²⁺ is d⁸; strong-field CN⁻ pairs electrons leaving one inner 3d orbital vacant -> dsp² square planar, diamagnetic.',
  },
  {
    id: 'ss-5',
    track: 'synthesis-strike',
    subject: 'Chemistry',
    chapter: 'Amines & Diazonium',
    prompt: 'Aniline treated with NaNO₂ + HCl at 0–5 °C followed by CuCN/KCN gives:',
    formulaLatex: 'C_6H_5NH_2 \\xrightarrow{\\text{NaNO}_2/\\text{HCl}} \\xrightarrow{\\text{CuCN}} ?',
    options: ['Benzonitrile (C₆H₅CN)', 'Chlorobenzene', 'Phenol', 'Nitrobenzene'],
    correctIndex: 0,
    explanation: 'Diazotization yields benzenediazonium chloride, and Sandmeyer reaction with CuCN replaces -N₂⁺Cl⁻ by -CN.',
  },
  {
    id: 'ss-6',
    track: 'synthesis-strike',
    subject: 'Chemistry',
    chapter: 'Chemical Bonding',
    prompt: 'According to VSEPR theory, the molecular shape of XeF₄ (4 bond pairs + 2 lone pairs) is:',
    formulaLatex: '\\text{XeF}_4 \\; (sp^3d^2)',
    options: ['Square Planar', 'Tetrahedral', 'See-Saw', 'Square Pyramidal'],
    correctIndex: 0,
    explanation: 'The two lone pairs occupy axial trans positions in the octahedron, leaving four fluorines in a square plane.',
  },
  {
    id: 'ss-7',
    track: 'synthesis-strike',
    subject: 'Chemistry',
    chapter: 'Thermodynamics',
    prompt: 'A reaction is spontaneous at ALL temperatures when ΔH and ΔS have signs:',
    formulaLatex: '\\Delta G = \\Delta H - T\\Delta S < 0',
    options: ['ΔH < 0 and ΔS > 0', 'ΔH > 0 and ΔS < 0', 'ΔH > 0 and ΔS > 0', 'ΔH < 0 and ΔS < 0'],
    correctIndex: 0,
    explanation: 'When ΔH is negative and ΔS is positive, ΔH - TΔS is always negative for every T > 0 K.',
  },
  {
    id: 'ss-8',
    track: 'synthesis-strike',
    subject: 'Chemistry',
    chapter: 'Aldol & Cannizzaro',
    prompt: 'Which aldehyde gives the Cannizzaro disproportionation reaction with concentrated NaOH?',
    formulaLatex: '2R-CHO + \\text{conc. NaOH} \\to R-CH_2OH + R-COONa',
    options: ['Benzaldehyde (C₆H₅CHO)', 'Acetaldehyde (CH₃CHO)', 'Propanal (CH₃CH₂CHO)', 'Acetone'],
    correctIndex: 0,
    explanation: 'Cannizzaro requires aldehydes with NO α-hydrogen; benzaldehyde has no α-H.',
  },

  // LOGIC LABYRINTH (Maths + Biology + Analytical Mixed)
  {
    id: 'll-1',
    track: 'logic-labyrinth',
    subject: 'Mathematics',
    chapter: 'Definite Integration',
    prompt: 'Using King’s property, evaluate the definite integral:',
    formulaLatex: 'I = \\int_0^{\\pi/2} \\frac{\\sin x}{\\sin x + \\cos x}\\,dx',
    options: ['π / 4', 'π / 2', '1', 'π / 8'],
    correctIndex: 0,
    explanation: 'Replacing x -> π/2 - x swaps sin x and cos x; adding 2I = ∫₀^(π/2) 1 dx = π/2 => I = π/4.',
  },
  {
    id: 'll-2',
    track: 'logic-labyrinth',
    subject: 'Biology',
    chapter: 'Molecular Basis of Inheritance',
    prompt: 'In DNA replication, Okazaki fragments are synthesized discontinuously on which strand?',
    formulaLatex: '\\text{DNA Pol III}: 5\' \\to 3\'',
    options: ['Lagging strand (3′→5′ template)', 'Leading strand (3′→5′ template)', 'Both strands continuously', 'RNA primer only'],
    correctIndex: 0,
    explanation: 'DNA polymerase only synthesizes 5′→3′, so the template running 5′→3′ toward the fork forms discontinuous Okazaki fragments.',
  },
  {
    id: 'll-3',
    track: 'logic-labyrinth',
    subject: 'Mathematics',
    chapter: 'Matrices & Determinants',
    prompt: 'If A is a 3×3 matrix with det(A) = 4, then det(2A) equals:',
    formulaLatex: '\\det(kA) = k^n \\det(A)',
    options: ['32', '8', '16', '24'],
    correctIndex: 0,
    explanation: 'For an n×n matrix, det(kA) = kⁿ det(A) = 2³ × 4 = 8 × 4 = 32.',
  },
  {
    id: 'll-4',
    track: 'logic-labyrinth',
    subject: 'Biology',
    chapter: 'Human Physiology',
    prompt: 'Which shift in the Oxygen-Hemoglobin dissociation curve occurs during intense exercise (Bohr Effect)?',
    formulaLatex: '\\uparrow \\text{CO}_2, \\downarrow \\text{pH} \\implies ?',
    options: ['Right shift (more O₂ unloaded)', 'Left shift (tighter O₂ binding)', 'No shift', 'Linear curve'],
    correctIndex: 0,
    explanation: 'Higher CO₂, H⁺, and temperature lower Hb affinity for O₂, shifting the curve right to deliver O₂ to active muscles.',
  },
  {
    id: 'll-5',
    track: 'logic-labyrinth',
    subject: 'Mathematics',
    chapter: 'Probability',
    prompt: 'Two fair dice are rolled. What is the probability that the sum is a prime number equal to 7?',
    formulaLatex: 'P(\\text{sum} = 7) = ?',
    options: ['1 / 6', '1 / 9', '5 / 36', '7 / 36'],
    correctIndex: 0,
    explanation: '6 favorable pairs {(1,6),(2,5),(3,4),(4,3),(5,2),(6,1)} out of 36 => 6/36 = 1/6.',
  },
  {
    id: 'll-6',
    track: 'logic-labyrinth',
    subject: 'Biology',
    chapter: 'Photosynthesis (NCERT)',
    prompt: 'In C4 plants like maize and sugarcane, the primary CO₂ acceptor in mesophyll cells is:',
    formulaLatex: '\\text{PEP} + \\text{CO}_2 \\xrightarrow{\\text{PEPcase}} \\text{OAA}',
    options: ['PEP (3-carbon)', 'RuBP (5-carbon)', 'PGA (3-carbon)', 'Malic Acid (4-carbon)'],
    correctIndex: 0,
    explanation: 'Phosphoenolpyruvate (PEP) accepts CO₂ via PEP carboxylase in mesophyll cells to form 4-carbon OAA.',
  },
  {
    id: 'll-7',
    track: 'logic-labyrinth',
    subject: 'Mathematics',
    chapter: 'Limits & Continuity',
    prompt: 'Evaluate the standard exponential limit:',
    formulaLatex: '\\lim_{x\\to 0} (1 + 3x)^{2/x}',
    options: ['e⁶', 'e⁵', 'e^(3/2)', '6'],
    correctIndex: 0,
    explanation: 'For 1^∞ form, lim (1 + ax)^(b/x) = e^(ab) = e^(3×2) = e⁶.',
  },
  {
    id: 'll-8',
    track: 'logic-labyrinth',
    subject: 'Biology',
    chapter: 'Genetics & Biotechnology',
    prompt: 'Restriction endonuclease EcoRI recognizes and cuts which palindromic DNA sequence?',
    formulaLatex: '5\'-\\text{G}\\downarrow\\text{AATTC}-3\'',
    options: ["5'-GAATTC-3'", "5'-AAGCTT-3'", "5'-GGATCC-3'", "5'-CTGCAG-3'"],
    correctIndex: 0,
    explanation: "EcoRI cuts between G and A in the palindromic 5'-GAATTC-3' sequence, creating sticky ends.",
  },
];

export function getDuelQuestionsForTrack(track: ApexTrackId, count = 8): ApexDuelQuestion[] {
  const matched = APEX_DUEL_QUESTION_BANK.filter((q) => q.track === track);
  if (matched.length >= count) return matched.slice(0, count);
  return APEX_DUEL_QUESTION_BANK.slice(0, count);
}
