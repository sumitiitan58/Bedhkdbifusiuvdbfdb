export type PredictorExamMode = 'jee-main' | 'neet-ug';

export interface PercentilePrediction {
  exam: PredictorExamMode;
  marks: number;
  maxMarks: number;
  percentile: number;
  estimatedAir: number;
  totalCandidates: number;
  topPercentLabel: string;
  targetTier: string;
  collegeOutlook: string;
}

/**
 * Calibrated NTA 2025-2026 JEE Main Marks vs Percentile curve
 * Anchor: 165/300 = 99.00 %ile, 120/300 = 96.45 %ile (15,38,468 unique candidates)
 */
const JEE_CURVE: Array<[number, number]> = [
  [300, 100.0],
  [270, 99.98],
  [235, 99.9],
  [205, 99.7],
  [185, 99.45],
  [175, 99.25],
  [170, 99.12],
  [165, 99.0],
  [160, 98.82],
  [155, 98.62],
  [150, 98.4],
  [145, 98.15],
  [140, 97.88],
  [135, 97.58],
  [130, 97.25],
  [125, 96.88],
  [120, 96.45],
  [115, 95.95],
  [110, 95.4],
  [105, 94.75],
  [100, 94.0],
  [95, 93.15],
  [90, 92.2],
  [85, 91.1],
  [80, 89.9],
  [70, 87.0],
  [60, 83.2],
  [50, 78.5],
  [35, 68.0],
  [20, 52.0],
  [0, 18.0],
];

/**
 * Calibrated NEET UG Marks vs Percentile curve (23,50,000 candidates)
 */
const NEET_CURVE: Array<[number, number]> = [
  [720, 99.999],
  [705, 99.97],
  [690, 99.9],
  [670, 99.72],
  [650, 99.38],
  [630, 98.85],
  [610, 98.1],
  [590, 97.2],
  [560, 95.4],
  [520, 92.6],
  [480, 89.2],
  [430, 84.0],
  [380, 77.5],
  [320, 68.0],
  [250, 56.0],
  [160, 40.0],
  [0, 5.0],
];

function interpolateCurve(marks: number, curve: Array<[number, number]>): number {
  const clamped = Math.max(0, Math.min(curve[0][0], marks));
  for (let i = 0; i < curve.length - 1; i++) {
    const [hiM, hiP] = curve[i];
    const [loM, loP] = curve[i + 1];
    if (clamped <= hiM && clamped >= loM) {
      if (hiM === loM) return hiP;
      const ratio = (clamped - loM) / (hiM - loM);
      return Number((loP + ratio * (hiP - loP)).toFixed(2));
    }
  }
  return curve[curve.length - 1][1];
}

export function predictExamPercentile(
  exam: PredictorExamMode,
  rawMarks: number
): PercentilePrediction {
  const isJee = exam === 'jee-main';
  const maxMarks = isJee ? 300 : 720;
  const totalCandidates = isJee ? 1538468 : 2350000;
  const marks = Math.max(0, Math.min(maxMarks, Math.round(rawMarks)));
  const percentile = interpolateCurve(marks, isJee ? JEE_CURVE : NEET_CURVE);
  const rawRank = Math.round(((100 - percentile) / 100) * totalCandidates);
  const estimatedAir = Math.max(1, Math.min(totalCandidates, rawRank || 1));
  const topPercent = Math.max(0.01, Number((100 - percentile).toFixed(2)));

  let targetTier = 'Foundation Zone';
  let collegeOutlook = isJee
    ? 'Build chapter accuracy & cut negative marking first'
    : 'Strengthen NCERT Biology & Inorganic revision first';

  if (isJee) {
    if (marks >= 205) {
      targetTier = 'AIR Top 5,000 Pace';
      collegeOutlook = 'NIT Trichy / Surathkal / Warangal CSE + Top IIITs';
    } else if (marks >= 165) {
      targetTier = '99+ %ile Elite Zone';
      collegeOutlook = 'Top 5 NITs Core/ECE & JEE Advanced Top Rank Ready';
    } else if (marks >= 130) {
      targetTier = '97–99 %ile Strong Contender';
      collegeOutlook = 'Tier-1/2 NITs & IIITs · +35 marks unlocks 99%ile';
    } else if (marks >= 95) {
      targetTier = 'JEE Advanced Cutoff Zone';
      collegeOutlook = 'Qualifies General Cutoff · High-ROI mark jump zone';
    }
  } else {
    if (marks >= 675) {
      targetTier = 'AIIMS Delhi / Top Central Govt';
      collegeOutlook = 'AIIMS Delhi, MAMC, VMMC & Top AIQ Medical Seats';
    } else if (marks >= 630) {
      targetTier = 'Top Govt MBBS Safe Zone';
      collegeOutlook = 'Top State Govt Medical Colleges & AIIMS Regional';
    } else if (marks >= 580) {
      targetTier = 'Borderline Govt MBBS Zone';
      collegeOutlook = 'State Quota Govt MBBS · Focus on NCERT Line-Traps';
    } else if (marks >= 480) {
      targetTier = 'Rising Contender';
      collegeOutlook = 'Need +120 marks via Biology 340+ & Physics Formula Blitz';
    }
  }

  return {
    exam,
    marks,
    maxMarks,
    percentile,
    estimatedAir,
    totalCandidates,
    topPercentLabel: `Top ${topPercent}%`,
    targetTier,
    collegeOutlook,
  };
}
