import type {
  ChapterRecord,
  TestAttemptRecord,
  TestQuestionRecord,
} from '../types';
import { computeStudyStreak, toLocalDateKey } from './streakTracker';
import { extractMistakeEntries } from './testAnalysisEngine';

export type PrepReadinessTier =
  | 'Foundation'
  | 'Contender'
  | '98+ %ile Ready'
  | 'AIR Top 1000 Pace';

export interface PrepScoreFactor {
  id: 'pacing' | 'chapter-weightage' | 'accuracy-control' | 'consistency-recovery';
  label: string;
  shortLabel: string;
  weightPercent: number;
  score: number;
  maxScore: number;
  percent: number;
  summary: string;
}

export interface PrepScoreInsight {
  id: string;
  deltaPts: number;
  headline: string;
  detail: string;
  sentiment: 'positive' | 'negative' | 'neutral';
}

export interface PrepScoreActionItem {
  id: string;
  chapterName: string;
  subjectName: string;
  title: string;
  reason: string;
  estimatedGainPts: number;
  priority: 'High' | 'Medium';
  route: string;
  actionLabel: string;
}

export interface PrepScoreDiagnostics {
  idealSecondsPerQuestion: number;
  avgSecondsPerQuestion: number;
  rushedWrongCount: number;
  timeSinkCount: number;
  totalAttemptedQuestions: number;
  totalCorrectQuestions: number;
  totalWrongQuestions: number;
  positiveMarksEarned: number;
  negativeMarksLost: number;
  netPositiveRatioPercent: number;
  activeStreakDays: number;
  mistakeTotalCount: number;
  mistakeResolvedCount: number;
  mistakeRecoveryPercent: number;
  highYieldChaptersCovered: number;
}

export interface PrepScoreReport {
  score: number;
  maxScore: 1000;
  tier: PrepReadinessTier;
  tierDescription: string;
  deltaThisWeek: number;
  deltaLabel: string;
  pointsTo850: number;
  hasAttemptData: boolean;
  factors: PrepScoreFactor[];
  insights: PrepScoreInsight[];
  actionItems: PrepScoreActionItem[];
  diagnostics: PrepScoreDiagnostics;
}

export interface PrepScoreInput {
  attempts: TestAttemptRecord[];
  questions: TestQuestionRecord[];
  chapters: ChapterRecord[];
  activeStudyDates: string[];
  resolvedMistakeIds: string[];
  cohortLabel?: string;
  referenceDate?: Date;
}

const HIGH_YIELD_KEYWORDS: Array<{ keyword: string; weight: number }> = [
  { keyword: 'modern physics', weight: 1.9 },
  { keyword: 'electrostat', weight: 1.85 },
  { keyword: 'current electricity', weight: 1.85 },
  { keyword: 'rotational', weight: 1.8 },
  { keyword: 'thermodynamics', weight: 1.8 },
  { keyword: 'optics', weight: 1.75 },
  { keyword: 'magnetism', weight: 1.7 },
  { keyword: 'calculus', weight: 1.9 },
  { keyword: 'definite integration', weight: 1.85 },
  { keyword: 'integration', weight: 1.8 },
  { keyword: 'matrices', weight: 1.75 },
  { keyword: 'vectors', weight: 1.75 },
  { keyword: '3d geometry', weight: 1.75 },
  { keyword: 'probability', weight: 1.65 },
  { keyword: 'goc', weight: 1.9 },
  { keyword: 'general organic', weight: 1.9 },
  { keyword: 'organic', weight: 1.8 },
  { keyword: 'coordination', weight: 1.8 },
  { keyword: 'chemical bonding', weight: 1.85 },
  { keyword: 'equilibrium', weight: 1.7 },
  { keyword: 'genetics', weight: 1.9 },
  { keyword: 'human physiology', weight: 1.85 },
  { keyword: 'biotechnology', weight: 1.8 },
  { keyword: 'ecology', weight: 1.7 },
];

export function getPrepReadinessTier(score: number): {
  tier: PrepReadinessTier;
  description: string;
} {
  if (score >= 825) {
    return {
      tier: 'AIR Top 1000 Pace',
      description: 'Elite accuracy, disciplined exam pacing, and high-yield chapter command.',
    };
  }
  if (score >= 650) {
    return {
      tier: '98+ %ile Ready',
      description: 'Strong competitive trajectory — tighten time traps and mistake recovery to cross 850+.',
    };
  }
  if (score >= 400) {
    return {
      tier: 'Contender',
      description: 'Solid conceptual base — sharpen negative-mark control and high-weightage chapters.',
    };
  }
  return {
    tier: 'Foundation',
    description: 'Building momentum — complete weekly mocks, log daily streak, and clear core mistakes.',
  };
}

function getChapterWeightMultiplier(
  chapterName: string,
  chapterWeightageLookup: Map<string, number>
): number {
  const normalized = chapterName.trim().toLowerCase();
  const catalogMarks = chapterWeightageLookup.get(normalized);
  let weight = catalogMarks ? Math.max(1, Math.min(2, catalogMarks / 6)) : 1;

  for (const item of HIGH_YIELD_KEYWORDS) {
    if (normalized.includes(item.keyword)) {
      weight = Math.max(weight, item.weight);
    }
  }
  return weight;
}

interface RawScoreComputation {
  totalScore: number;
  factors: PrepScoreFactor[];
  diagnostics: PrepScoreDiagnostics;
  subjectStats: Map<
    string,
    {
      subject: string;
      correct: number;
      wrong: number;
      rushedWrong: number;
      timeSinks: number;
      totalTime: number;
      count: number;
    }
  >;
  chapterStats: Map<
    string,
    {
      chapterName: string;
      subjectName: string;
      attempted: number;
      correct: number;
      wrong: number;
      unattempted: number;
      rushedWrong: number;
      timeSinks: number;
      weight: number;
    }
  >;
}

function computeCorePrepScore(input: PrepScoreInput): RawScoreComputation {
  const {
    attempts,
    questions,
    chapters,
    activeStudyDates,
    resolvedMistakeIds,
    cohortLabel = 'JEE Main',
    referenceDate = new Date(),
  } = input;

  const isNeet = cohortLabel.toLowerCase().includes('neet');
  const idealSecondsPerQuestion = isNeet ? 55 : 90;

  const qMap = new Map(questions.map((q) => [q.id, q]));
  const chapterWeightageLookup = new Map<string, number>();
  for (const ch of chapters) {
    chapterWeightageLookup.set(ch.name.trim().toLowerCase(), ch.weightageMarks ?? 4);
  }

  let totalTimedQuestions = 0;
  let totalTimeSeconds = 0;
  let rushedWrongCount = 0;
  let timeSinkCount = 0;

  let totalAttemptedQuestions = 0;
  let totalCorrectQuestions = 0;
  let totalWrongQuestions = 0;
  let positiveMarksEarned = 0;
  let negativeMarksLost = 0;
  let maxPossibleOnAttempted = 0;

  const subjectStats = new Map<
    string,
    {
      subject: string;
      correct: number;
      wrong: number;
      rushedWrong: number;
      timeSinks: number;
      totalTime: number;
      count: number;
    }
  >();

  const chapterStats = new Map<
    string,
    {
      chapterName: string;
      subjectName: string;
      attempted: number;
      correct: number;
      wrong: number;
      unattempted: number;
      rushedWrong: number;
      timeSinks: number;
      weight: number;
    }
  >();

  for (const att of attempts) {
    if (att.questionTimings && att.questionTimings.length > 0) {
      for (const timing of att.questionTimings) {
        const q = qMap.get(timing.questionId);
        const pos = q?.positiveMarks ?? 4;
        const neg = q?.negativeMarks ?? 1;
        const chapterName = (timing.chapterName || q?.chapterName || 'Core Syllabus').trim();
        const subjectName = (timing.subjectName || q?.subjectName || 'General').trim();
        const weight = getChapterWeightMultiplier(chapterName, chapterWeightageLookup);

        const isRushedWrong = timing.answered && !timing.isCorrect && timing.timeSpentSeconds < 10;
        const isTimeSink = timing.timeSpentSeconds > 180;

        if (timing.answered || timing.timeSpentSeconds > 0) {
          totalTimedQuestions++;
          totalTimeSeconds += Math.max(0, timing.timeSpentSeconds);
        }
        if (isRushedWrong) rushedWrongCount++;
        if (isTimeSink) timeSinkCount++;

        const sKey = subjectName;
        const sEntry = subjectStats.get(sKey) ?? {
          subject: subjectName,
          correct: 0,
          wrong: 0,
          rushedWrong: 0,
          timeSinks: 0,
          totalTime: 0,
          count: 0,
        };
        sEntry.totalTime += Math.max(0, timing.timeSpentSeconds);
        sEntry.count += 1;
        if (isRushedWrong) sEntry.rushedWrong += 1;
        if (isTimeSink) sEntry.timeSinks += 1;

        const cKey = `${subjectName}::${chapterName}`;
        const cEntry = chapterStats.get(cKey) ?? {
          chapterName,
          subjectName,
          attempted: 0,
          correct: 0,
          wrong: 0,
          unattempted: 0,
          rushedWrong: 0,
          timeSinks: 0,
          weight,
        };
        if (isRushedWrong) cEntry.rushedWrong += 1;
        if (isTimeSink) cEntry.timeSinks += 1;

        if (timing.answered) {
          totalAttemptedQuestions++;
          maxPossibleOnAttempted += pos;
          cEntry.attempted += 1;
          if (timing.isCorrect) {
            totalCorrectQuestions++;
            positiveMarksEarned += pos;
            sEntry.correct += 1;
            cEntry.correct += 1;
          } else {
            totalWrongQuestions++;
            negativeMarksLost += neg;
            sEntry.wrong += 1;
            cEntry.wrong += 1;
          }
        } else {
          cEntry.unattempted += 1;
        }

        subjectStats.set(sKey, sEntry);
        chapterStats.set(cKey, cEntry);
      }
    } else {
      // Fallback when attempt only stores aggregate counts
      const attCount = att.correctCount + att.incorrectCount;
      totalAttemptedQuestions += attCount;
      totalCorrectQuestions += att.correctCount;
      totalWrongQuestions += att.incorrectCount;
      positiveMarksEarned += att.correctCount * 4;
      negativeMarksLost += Math.max(0, att.correctCount * 4 - att.score);
      maxPossibleOnAttempted += attCount * 4;
      const qCount = Math.max(1, attCount + att.unattemptedCount);
      totalTimedQuestions += qCount;
      totalTimeSeconds += att.totalTimeSeconds;

      for (const ch of att.chapterScores ?? []) {
        const cKey = `${ch.subjectName}::${ch.chapterName}`;
        const weight = getChapterWeightMultiplier(ch.chapterName, chapterWeightageLookup);
        const cEntry = chapterStats.get(cKey) ?? {
          chapterName: ch.chapterName,
          subjectName: ch.subjectName,
          attempted: 0,
          correct: 0,
          wrong: 0,
          unattempted: 0,
          rushedWrong: 0,
          timeSinks: 0,
          weight,
        };
        cEntry.attempted += ch.correct + ch.incorrect;
        cEntry.correct += ch.correct;
        cEntry.wrong += ch.incorrect;
        cEntry.unattempted += Math.max(0, ch.total - ch.correct - ch.incorrect);
        chapterStats.set(cKey, cEntry);
      }
    }
  }

  const hasAttempts = attempts.length > 0;
  const avgSecondsPerQuestion =
    totalTimedQuestions > 0 ? Math.round(totalTimeSeconds / totalTimedQuestions) : 0;

  // 1) Pacing & Time Discipline (25% -> max 250 pts)
  let pacingScore = 0;
  if (hasAttempts && totalTimedQuestions > 0) {
    const deviationRatio = Math.abs(avgSecondsPerQuestion - idealSecondsPerQuestion) / (idealSecondsPerQuestion * 1.25);
    const paceAlignment = Math.max(0.15, 1 - Math.min(1, deviationRatio));
    const rushedRate = rushedWrongCount / Math.max(1, totalAttemptedQuestions);
    const timeSinkRate = timeSinkCount / Math.max(1, totalTimedQuestions);
    const disciplineMultiplier = Math.max(0.2, 1 - rushedRate * 0.65 - timeSinkRate * 0.55);
    pacingScore = Math.round(250 * Math.max(0, Math.min(1, paceAlignment * disciplineMultiplier)));
  }

  // 2) High-Yield Chapter Coverage (30% -> max 300 pts)
  let chapterWeightageScore = 0;
  let highYieldChaptersCovered = 0;
  if (hasAttempts && chapterStats.size > 0) {
    let weightedAccuracyNum = 0;
    let weightedAccuracyDen = 0;
    let weightedAttemptNum = 0;
    let weightedAttemptDen = 0;

    for (const ch of chapterStats.values()) {
      const totalQ = ch.attempted + ch.unattempted;
      if (totalQ <= 0) continue;
      if (ch.weight >= 1.5 && ch.attempted > 0) {
        highYieldChaptersCovered++;
      }
      const attemptRate = ch.attempted / totalQ;
      const accuracyRate = ch.attempted > 0 ? ch.correct / ch.attempted : 0;

      weightedAttemptNum += attemptRate * ch.weight * totalQ;
      weightedAttemptDen += ch.weight * totalQ;

      weightedAccuracyNum += accuracyRate * ch.weight * Math.max(1, ch.attempted);
      weightedAccuracyDen += ch.weight * Math.max(1, ch.attempted);
    }

    const weightedAcc = weightedAccuracyDen > 0 ? weightedAccuracyNum / weightedAccuracyDen : 0;
    const weightedAtt = weightedAttemptDen > 0 ? weightedAttemptNum / weightedAttemptDen : 0;
    const breadthFactor = Math.min(1, 0.72 + chapterStats.size * 0.045);
    const combinedChapterRatio = Math.max(
      0,
      Math.min(1, (0.68 * weightedAcc + 0.32 * weightedAtt) * breadthFactor)
    );
    chapterWeightageScore = Math.round(300 * combinedChapterRatio);
  }

  // 3) Accuracy & Negative Control (25% -> max 250 pts)
  const netMarks = positiveMarksEarned - negativeMarksLost;
  const netPositiveRatio =
    maxPossibleOnAttempted > 0
      ? Math.max(0, Math.min(1, netMarks / maxPossibleOnAttempted))
      : 0;
  let accuracyControlScore = 0;
  if (hasAttempts && totalAttemptedQuestions > 0) {
    const negLeakageRatio =
      positiveMarksEarned + negativeMarksLost > 0
        ? negativeMarksLost / (positiveMarksEarned + negativeMarksLost)
        : 0;
    const negativeControl = Math.max(0, 1 - negLeakageRatio * 1.4);
    accuracyControlScore = Math.round(
      250 * Math.max(0, Math.min(1, 0.72 * netPositiveRatio + 0.28 * negativeControl))
    );
  }

  // 4) Consistency & Error Elimination (20% -> max 200 pts)
  const streak = computeStudyStreak(activeStudyDates, toLocalDateKey(referenceDate));
  const activeDaysLast7 = streak.last7Days.filter((d) => d.active).length;
  const streakSubScore = Math.round(
    Math.min(1, streak.currentStreak / 14) * 80 +
      Math.min(1, activeDaysLast7 / 7) * 20
  );

  const mistakeEntries = extractMistakeEntries(attempts, questions);
  const resolvedSet = new Set(resolvedMistakeIds);
  const mistakeTotalCount = mistakeEntries.length;
  const mistakeResolvedCount = mistakeEntries.filter((m) => resolvedSet.has(m.questionId)).length;
  const mistakeRecoveryPercent =
    mistakeTotalCount > 0
      ? Math.round((mistakeResolvedCount / mistakeTotalCount) * 100)
      : hasAttempts
        ? 100
        : 0;

  const mistakeSubScore =
    mistakeTotalCount > 0
      ? Math.round((mistakeResolvedCount / mistakeTotalCount) * 100)
      : hasAttempts
        ? 100
        : 0;

  const consistencyRecoveryScore = Math.min(200, streakSubScore + mistakeSubScore);

  const totalScore = Math.max(
    0,
    Math.min(
      1000,
      pacingScore + chapterWeightageScore + accuracyControlScore + consistencyRecoveryScore
    )
  );

  const factors: PrepScoreFactor[] = [
    {
      id: 'pacing',
      label: 'Pacing & Time Discipline',
      shortLabel: 'Pacing',
      weightPercent: 25,
      score: pacingScore,
      maxScore: 250,
      percent: Math.round((pacingScore / 250) * 100),
      summary: hasAttempts
        ? `${avgSecondsPerQuestion}s/Q vs ${idealSecondsPerQuestion}s benchmark · ${rushedWrongCount} rushed (<10s), ${timeSinkCount} >180s traps`
        : 'Attempt your first CBT mock to calibrate question pacing',
    },
    {
      id: 'chapter-weightage',
      label: 'High-Yield Chapter Weightage',
      shortLabel: 'Chapter Weightage',
      weightPercent: 30,
      score: chapterWeightageScore,
      maxScore: 300,
      percent: Math.round((chapterWeightageScore / 300) * 100),
      summary: hasAttempts
        ? `${chapterStats.size} syllabus chapters tested · ${highYieldChaptersCovered} high-yield chapters attempted`
        : 'High-yield JEE/NEET chapters weighted by exam marks',
    },
    {
      id: 'accuracy-control',
      label: 'Accuracy & Negative Control',
      shortLabel: 'Accuracy',
      weightPercent: 25,
      score: accuracyControlScore,
      maxScore: 250,
      percent: Math.round((accuracyControlScore / 250) * 100),
      summary: hasAttempts
        ? `${Math.round(netPositiveRatio * 100)}% net yield · +${positiveMarksEarned} earned, -${negativeMarksLost} negative`
        : 'Measures net positive marks relative to attempted questions',
    },
    {
      id: 'consistency-recovery',
      label: 'Consistency & Mistake Recovery',
      shortLabel: 'Mistake Recovery',
      weightPercent: 20,
      score: consistencyRecoveryScore,
      maxScore: 200,
      percent: Math.round((consistencyRecoveryScore / 200) * 100),
      summary:
        mistakeTotalCount > 0
          ? `${streak.currentStreak}-day active streak · ${mistakeResolvedCount}/${mistakeTotalCount} mistakes mastered (${mistakeRecoveryPercent}%)`
          : `${streak.currentStreak}-day active streak · ${activeDaysLast7}/7 days active this week`,
    },
  ];

  const diagnostics: PrepScoreDiagnostics = {
    idealSecondsPerQuestion,
    avgSecondsPerQuestion,
    rushedWrongCount,
    timeSinkCount,
    totalAttemptedQuestions,
    totalCorrectQuestions,
    totalWrongQuestions,
    positiveMarksEarned,
    negativeMarksLost,
    netPositiveRatioPercent: Math.round(netPositiveRatio * 100),
    activeStreakDays: streak.currentStreak,
    mistakeTotalCount,
    mistakeResolvedCount,
    mistakeRecoveryPercent,
    highYieldChaptersCovered,
  };

  return {
    totalScore,
    factors,
    diagnostics,
    subjectStats,
    chapterStats,
  };
}

function buildInsights(core: RawScoreComputation, hasAttempts: boolean): PrepScoreInsight[] {
  const { diagnostics, subjectStats, chapterStats } = core;

  if (!hasAttempts) {
    const streakPts = Math.min(20, diagnostics.activeStreakDays * 6);
    return [
      {
        id: 'insight-streak',
        deltaPts: streakPts,
        headline:
          diagnostics.activeStreakDays > 0
            ? `+${streakPts} pts from your ${diagnostics.activeStreakDays}-day study streak`
            : '+0 pts baseline — start logging daily study sessions',
        detail: 'Consistent daily sessions build up to 100 points in the Consistency factor.',
        sentiment: diagnostics.activeStreakDays > 0 ? 'positive' : 'neutral',
      },
      {
        id: 'insight-first-mock',
        deltaPts: 0,
        headline: 'Unlock 750+ pts by submitting your first CBT Mock',
        detail: 'Pacing (250), High-Yield Chapters (300), and Accuracy (250) activate right after your first test.',
        sentiment: 'neutral',
      },
      {
        id: 'insight-mistakes',
        deltaPts: 0,
        headline: 'Mistake Notebook auto-tracks every error',
        detail: 'Re-attempting and mastering wrong questions adds up to 100 recovery points.',
        sentiment: 'neutral',
      },
    ];
  }

  const insights: PrepScoreInsight[] = [];

  // Insight 1: Best-paced subject or rushed error drag
  let worstRushedChapter: { chapterName: string; subjectName: string; count: number } | null = null;
  for (const ch of chapterStats.values()) {
    if (ch.rushedWrong > (worstRushedChapter?.count ?? 0)) {
      worstRushedChapter = {
        chapterName: ch.chapterName,
        subjectName: ch.subjectName,
        count: ch.rushedWrong,
      };
    }
  }

  let bestPacedSubject: { subject: string; avgSec: number; acc: number } | null = null;
  for (const sub of subjectStats.values()) {
    const att = sub.correct + sub.wrong;
    if (att === 0) continue;
    const acc = Math.round((sub.correct / att) * 100);
    const avgSec = Math.round(sub.totalTime / Math.max(1, sub.count));
    if (
      acc >= 60 &&
      avgSec <= diagnostics.idealSecondsPerQuestion * 1.15 &&
      (!bestPacedSubject || acc > bestPacedSubject.acc)
    ) {
      bestPacedSubject = { subject: sub.subject, avgSec, acc };
    }
  }

  if (bestPacedSubject) {
    const gain = Math.max(8, Math.min(28, Math.round(bestPacedSubject.acc * 0.24)));
    insights.push({
      id: 'insight-pacing-win',
      deltaPts: gain,
      headline: `+${gain} pts for fast ${bestPacedSubject.subject} pacing (${bestPacedSubject.avgSec}s/Q)`,
      detail: `${bestPacedSubject.acc}% accuracy within the ${diagnostics.idealSecondsPerQuestion}s/Q ideal exam window.`,
      sentiment: 'positive',
    });
  } else {
    const diffSec = diagnostics.avgSecondsPerQuestion - diagnostics.idealSecondsPerQuestion;
    const impact = diffSec > 20 ? -Math.min(20, Math.round(diffSec / 5)) : 10;
    insights.push({
      id: 'insight-pacing-general',
      deltaPts: impact,
      headline:
        impact >= 0
          ? `+${impact} pts for steady overall pacing (${diagnostics.avgSecondsPerQuestion}s/Q)`
          : `${impact} pts for overtime pacing (${diagnostics.avgSecondsPerQuestion}s/Q vs ${diagnostics.idealSecondsPerQuestion}s target)`,
      detail:
        impact >= 0
          ? 'Your average speed stays near the optimal exam benchmark.'
          : 'Skip multi-step traps after 2 minutes and return in the second pass.',
      sentiment: impact >= 0 ? 'positive' : 'negative',
    });
  }

  // Insight 2: Rushed errors (<10s) OR Time-Sink traps (>180s) OR Negative-mark control
  if (diagnostics.rushedWrongCount > 0) {
    const penalty = -Math.min(28, diagnostics.rushedWrongCount * 6);
    const location = worstRushedChapter
      ? worstRushedChapter.chapterName
      : 'recent mocks';
    insights.push({
      id: 'insight-rushed',
      deltaPts: penalty,
      headline: `${penalty} pts due to ${diagnostics.rushedWrongCount} rushed error${diagnostics.rushedWrongCount === 1 ? '' : 's'} (<10s) in ${location}`,
      detail: 'Slow down for 15 seconds on option elimination to stop avoidable negative marks.',
      sentiment: 'negative',
    });
  } else if (diagnostics.timeSinkCount > 0) {
    const penalty = -Math.min(24, diagnostics.timeSinkCount * 7);
    insights.push({
      id: 'insight-timesink',
      deltaPts: penalty,
      headline: `${penalty} pts from ${diagnostics.timeSinkCount} time-sink trap${diagnostics.timeSinkCount === 1 ? '' : 's'} (>180s)`,
      detail: 'Questions crossing 3 minutes drain momentum across the rest of the paper.',
      sentiment: 'negative',
    });
  } else if (diagnostics.negativeMarksLost > 0) {
    const penalty = -Math.min(22, Math.max(4, Math.round(diagnostics.negativeMarksLost * 1.5)));
    insights.push({
      id: 'insight-neg-control',
      deltaPts: penalty,
      headline: `${penalty} pts lost to -${diagnostics.negativeMarksLost} negative marks`,
      detail: `Net positive yield is ${diagnostics.netPositiveRatioPercent}%; tightening guesswork boosts score immediately.`,
      sentiment: 'negative',
    });
  } else {
    insights.push({
      id: 'insight-clean-neg',
      deltaPts: 16,
      headline: '+16 pts for zero negative-mark leakage',
      detail: 'Clean accuracy with zero rushed (<10s) guesses or >180s time traps.',
      sentiment: 'positive',
    });
  }

  // Insight 3: Mistake Recovery & Streak
  if (diagnostics.mistakeTotalCount > 0 && diagnostics.mistakeRecoveryPercent >= 50) {
    const gain = Math.max(10, Math.round(diagnostics.mistakeRecoveryPercent * 0.22));
    insights.push({
      id: 'insight-recovery',
      deltaPts: gain,
      headline: `+${gain} pts from mastering ${diagnostics.mistakeRecoveryPercent}% of Mistake Notebook`,
      detail: `${diagnostics.mistakeResolvedCount}/${diagnostics.mistakeTotalCount} errors resolved alongside a ${diagnostics.activeStreakDays}-day streak.`,
      sentiment: 'positive',
    });
  } else if (diagnostics.mistakeTotalCount > 0) {
    const pending = diagnostics.mistakeTotalCount - diagnostics.mistakeResolvedCount;
    const drag = -Math.min(20, Math.max(6, pending * 3));
    insights.push({
      id: 'insight-pending-mistakes',
      deltaPts: drag,
      headline: `${drag} pts held back by ${pending} unresolved Mistake Notebook item${pending === 1 ? '' : 's'}`,
      detail: 'Re-attempting and clearing logged errors recovers up to 100 points directly.',
      sentiment: 'negative',
    });
  } else {
    const streakGain = Math.max(6, Math.min(24, diagnostics.activeStreakDays * 4));
    insights.push({
      id: 'insight-consistency',
      deltaPts: streakGain,
      headline: `+${streakGain} pts from ${diagnostics.activeStreakDays}-day consistency streak`,
      detail: 'Keep logging at least one mock, chapter review, or focus sprint each day.',
      sentiment: 'positive',
    });
  }

  return insights.slice(0, 3);
}

function buildActionItems(
  core: RawScoreComputation,
  cohortLabel: string,
  hasAttempts: boolean
): PrepScoreActionItem[] {
  const isNeet = cohortLabel.toLowerCase().includes('neet');
  const items: PrepScoreActionItem[] = [];

  if (!hasAttempts) {
    return [
      {
        id: 'act-first-cbt',
        chapterName: isNeet ? 'Full PCB Syllabus' : 'Full PCM Syllabus',
        subjectName: isNeet ? 'PCB' : 'PCM',
        title: 'Take your first timed NTA CBT Mock',
        reason: 'Calibrates your real pacing, accuracy, and high-yield chapter baseline across all 4 factors.',
        estimatedGainPts: 380,
        priority: 'High',
        route: '/cbt-mocks',
        actionLabel: 'Start CBT Mock',
      },
      {
        id: 'act-high-yield-1',
        chapterName: isNeet ? 'Human Physiology & Genetics' : 'Electrostatics & Modern Physics',
        subjectName: isNeet ? 'Biology' : 'Physics',
        title: isNeet
          ? 'Revise Genetics & Human Physiology Short Notes'
          : 'Revise Electrostatics & Modern Physics Formula Sheets',
        reason: 'Highest weightage chapters carry 1.8x–1.9x multiplier in the Chapter Weightage factor.',
        estimatedGainPts: 110,
        priority: 'High',
        route: '/materials',
        actionLabel: 'Open Chapter Notes',
      },
      {
        id: 'act-high-yield-2',
        chapterName: isNeet ? 'GOC & Chemical Bonding' : 'Calculus & GOC',
        subjectName: isNeet ? 'Chemistry' : 'Mathematics',
        title: isNeet
          ? 'Master GOC & Chemical Bonding PYQs'
          : 'Drill Calculus & General Organic Chemistry PYQs',
        reason: 'Consistent accuracy in core high-weightage chapters moves scores from Foundation to 98+ %ile Ready.',
        estimatedGainPts: 95,
        priority: 'Medium',
        route: '/materials',
        actionLabel: 'Browse PYQs',
      },
    ];
  }

  // Sort chapters by opportunity score (high weight * error/skip/trap burden)
  const chapterOpportunities = Array.from(core.chapterStats.values())
    .map((ch) => {
      const total = Math.max(1, ch.attempted + ch.unattempted);
      const acc = ch.attempted > 0 ? ch.correct / ch.attempted : 0;
      const weakness = (1 - acc) * 0.65 + (ch.unattempted / total) * 0.35;
      const trapPenalty = ch.rushedWrong * 0.18 + ch.timeSinks * 0.15;
      const opportunity = (weakness + trapPenalty) * ch.weight;
      return { ...ch, acc, opportunity };
    })
    .filter((ch) => ch.opportunity > 0.25)
    .sort((a, b) => b.opportunity - a.opportunity);

  for (const ch of chapterOpportunities.slice(0, 3)) {
    const accPct = Math.round(ch.acc * 100);
    const estGain = Math.max(16, Math.min(68, Math.round(ch.opportunity * 38)));
    const reasonParts: string[] = [];
    if (ch.attempted > 0 && accPct < 75) {
      reasonParts.push(`${accPct}% accuracy (${ch.wrong} wrong)`);
    }
    if (ch.rushedWrong > 0) {
      reasonParts.push(`${ch.rushedWrong} rushed <10s error${ch.rushedWrong > 1 ? 's' : ''}`);
    }
    if (ch.timeSinks > 0) {
      reasonParts.push(`${ch.timeSinks} >180s time trap${ch.timeSinks > 1 ? 's' : ''}`);
    }
    if (ch.unattempted > 0) {
      reasonParts.push(`${ch.unattempted} skipped`);
    }

    items.push({
      id: `act-ch-${ch.subjectName}-${ch.chapterName}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      chapterName: ch.chapterName,
      subjectName: ch.subjectName,
      title: `Fix ${ch.chapterName} (${ch.subjectName})`,
      reason:
        reasonParts.length > 0
          ? `${reasonParts.join(' · ')} — high-yield ${ch.weight >= 1.5 ? 'priority' : 'core'} chapter.`
          : 'Strengthen speed and formula recall for consistent exam marks.',
      estimatedGainPts: estGain,
      priority: ch.weight >= 1.5 || accPct < 55 ? 'High' : 'Medium',
      route: `/materials?q=${encodeURIComponent(ch.chapterName)}`,
      actionLabel: 'Revise Chapter',
    });
  }

  // Add Mistake Notebook recovery action if unresolved mistakes remain
  const pendingMistakes =
    core.diagnostics.mistakeTotalCount - core.diagnostics.mistakeResolvedCount;
  if (pendingMistakes > 0) {
    const recoveryGain = Math.max(
      14,
      Math.min(85, Math.round((pendingMistakes / Math.max(1, core.diagnostics.mistakeTotalCount)) * 90))
    );
    items.push({
      id: 'act-mistake-recovery',
      chapterName: 'Mistake Notebook',
      subjectName: 'All Subjects',
      title: `Resolve ${pendingMistakes} logged Mistake Notebook question${pendingMistakes === 1 ? '' : 's'}`,
      reason: `Currently at ${core.diagnostics.mistakeRecoveryPercent}% mistake mastery — clearing these directly boosts Consistency & Recovery.`,
      estimatedGainPts: recoveryGain,
      priority: pendingMistakes >= 3 ? 'High' : 'Medium',
      route: '/mistakes',
      actionLabel: 'Re-Attempt Mistakes',
    });
  }

  // Add Streak action if streak < 7 days
  if (core.diagnostics.activeStreakDays < 7) {
    items.push({
      id: 'act-daily-streak',
      chapterName: 'Daily Consistency',
      subjectName: 'Habit',
      title: `Extend your ${core.diagnostics.activeStreakDays}-day streak to 7+ consecutive days`,
      reason: 'Daily mock drills or chapter revision sessions unlock up to 100 consistency points.',
      estimatedGainPts: Math.max(15, (7 - core.diagnostics.activeStreakDays) * 7),
      priority: 'Medium',
      route: '/cbt-mocks',
      actionLabel: 'Practice Today',
    });
  }

  return items.slice(0, 4);
}

/**
 * Computes the complete dynamic AI Prep Score (0–1000) report including readiness tier,
 * weekly delta, 4-factor breakdown, 3 data-backed AI insights, and chapter-level action items.
 */
export function computeAiPrepScore(input: PrepScoreInput): PrepScoreReport {
  const referenceDate = input.referenceDate ?? new Date();
  const cohortLabel = input.cohortLabel ?? 'JEE Main';
  const current = computeCorePrepScore({ ...input, cohortLabel, referenceDate });
  const hasAttemptData = input.attempts.length > 0;

  // Compute weekly delta: compare against state 7 days ago (or prior attempt baseline when multiple attempts happened this week)
  const sevenDaysAgo = new Date(referenceDate);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const cutoffIso = sevenDaysAgo.toISOString();
  const cutoffDateKey = toLocalDateKey(sevenDaysAgo);

  const olderAttempts = input.attempts.filter(
    (a) => (a.submittedAtIso || '') < cutoffIso
  );
  const olderStudyDates = input.activeStudyDates.filter((d) => d <= cutoffDateKey);

  let deltaThisWeek = 0;
  let deltaLabel = 'this week';

  if (olderAttempts.length > 0) {
    const prior = computeCorePrepScore({
      ...input,
      attempts: olderAttempts,
      activeStudyDates: olderStudyDates,
      cohortLabel,
      referenceDate: sevenDaysAgo,
    });
    deltaThisWeek = current.totalScore - prior.totalScore;
  } else if (input.attempts.length >= 2) {
    const sorted = [...input.attempts].sort((a, b) =>
      (a.submittedAtIso || '').localeCompare(b.submittedAtIso || '')
    );
    const previousAttempts = sorted.slice(0, -1);
    const prior = computeCorePrepScore({
      ...input,
      attempts: previousAttempts,
      activeStudyDates: input.activeStudyDates.slice(0, Math.max(0, input.activeStudyDates.length - 1)),
      cohortLabel,
      referenceDate,
    });
    deltaThisWeek = current.totalScore - prior.totalScore;
    deltaLabel = 'vs last mock';
  } else if (hasAttemptData) {
    // First attempt this week: show realistic positive momentum from accuracy + streak
    const streakOnlyPrior = computeCorePrepScore({
      ...input,
      attempts: [],
      activeStudyDates: olderStudyDates,
      cohortLabel,
      referenceDate: sevenDaysAgo,
    });
    deltaThisWeek = Math.min(48, Math.max(-20, Math.round((current.totalScore - streakOnlyPrior.totalScore) * 0.06)));
    deltaLabel = 'this week';
  } else if (current.diagnostics.activeStreakDays > 0) {
    deltaThisWeek = Math.min(18, current.diagnostics.activeStreakDays * 6);
    deltaLabel = 'this week';
  }

  const tierInfo = getPrepReadinessTier(current.totalScore);
  const insights = buildInsights(current, hasAttemptData);
  const actionItems = buildActionItems(current, cohortLabel, hasAttemptData);

  return {
    score: current.totalScore,
    maxScore: 1000,
    tier: tierInfo.tier,
    tierDescription: tierInfo.description,
    deltaThisWeek,
    deltaLabel,
    pointsTo850: Math.max(0, 850 - current.totalScore),
    hasAttemptData,
    factors: current.factors,
    insights,
    actionItems,
    diagnostics: current.diagnostics,
  };
}
