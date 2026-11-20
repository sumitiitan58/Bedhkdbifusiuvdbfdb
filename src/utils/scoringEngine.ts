import type {
  ChapterScoreBreakdown,
  IQConfig,
  MockTestRecord,
  PaceCategory,
  PaceSummary,
  QuestionPaletteState,
  QuestionTimingRecord,
  QuestionType,
  StudentAnswerValue,
  SubjectScoreBreakdown,
  TestAttemptRecord,
  TestQuestionRecord,
} from '../types';

export const DEFAULT_IQ_CONFIG: IQConfig = {
  id: 'iqScoring',
  tooFastThresholdSec: 12,
  optimalMinSec: 25,
  optimalMaxSec: 135,
  tooSlowThresholdSec: 210,
  rushingPenaltyWeight: 4,
  slowPenaltyWeight: 2.5,
  optimalBonusWeight: 3,
};

export function getNextQuestionNumber(existingQuestions: Pick<TestQuestionRecord, 'questionNumber'>[]): number {
  if (existingQuestions.length === 0) return 1;
  const maxNum = existingQuestions.reduce(
    (max, q) => (q.questionNumber > max ? q.questionNumber : max),
    0
  );
  return maxNum + 1;
}

/**
 * Safely transforms a draft question when switching types in the Question Paper Builder.
 * Switching MCQ -> Integer retains Crop 1 (Question) & Crop 6 (Solution) while strictly
 * discarding Options A-D and option indices to prevent invalid answer data leakage.
 */
export function transitionQuestionType(
  draft: Partial<TestQuestionRecord>,
  nextType: QuestionType
): Partial<TestQuestionRecord> {
  if (nextType === 'integer') {
    return {
      ...draft,
      questionType: 'integer',
      optionTexts: [],
      optionImageUrls: [],
      correctOptionIndices: [],
      numericalAnswer: draft.numericalAnswer ?? '',
    };
  }

  const prevCorrect = draft.correctOptionIndices ?? [];
  return {
    ...draft,
    questionType: nextType,
    optionTexts: draft.optionTexts?.length === 4 ? draft.optionTexts : ['', '', '', ''],
    optionImageUrls: draft.optionImageUrls?.length === 4 ? draft.optionImageUrls : ['', '', '', ''],
    correctOptionIndices: nextType === 'single-mcq' ? prevCorrect.slice(0, 1) : prevCorrect,
    numericalAnswer: '',
  };
}

export function isQuestionAnswered(answer?: StudentAnswerValue): boolean {
  if (!answer) return false;
  if (answer.type === 'single-mcq') return answer.selectedIndex !== null;
  if (answer.type === 'multi-mcq') return answer.selectedIndices.length > 0;
  return answer.value.trim().length > 0;
}

export function getPaletteState(
  visited: boolean,
  markedForReview: boolean,
  answer?: StudentAnswerValue
): QuestionPaletteState {
  if (!visited) return 'not-visited';
  const answered = isQuestionAnswered(answer);
  if (answered && markedForReview) return 'answered-marked';
  if (answered) return 'answered';
  if (markedForReview) return 'marked-review';
  return 'not-answered';
}

export function evaluateSingleQuestion(
  question: TestQuestionRecord,
  answer: StudentAnswerValue | undefined,
  test: Pick<MockTestRecord, 'positiveMarks' | 'negativeMarks' | 'negativeMarkingEnabled'>
): { answered: boolean; isCorrect: boolean; deltaMarks: number; maxMarks: number } {
  const pos = question.positiveMarks ?? test.positiveMarks;
  const neg = test.negativeMarkingEnabled ? (question.negativeMarks ?? test.negativeMarks) : 0;

  if (!isQuestionAnswered(answer) || !answer) {
    return { answered: false, isCorrect: false, deltaMarks: 0, maxMarks: pos };
  }

  let isCorrect = false;
  if (question.questionType === 'single-mcq' && answer.type === 'single-mcq') {
    const expected = question.correctOptionIndices?.[0];
    isCorrect = expected !== undefined && answer.selectedIndex === expected;
  } else if (question.questionType === 'multi-mcq' && answer.type === 'multi-mcq') {
    const expected = [...(question.correctOptionIndices ?? [])].sort((a, b) => a - b);
    const actual = [...answer.selectedIndices].sort((a, b) => a - b);
    isCorrect =
      expected.length > 0 &&
      expected.length === actual.length &&
      expected.every((val, idx) => val === actual[idx]);
  } else if (question.questionType === 'integer' && answer.type === 'integer') {
    const expectedNum = Number.parseFloat((question.numericalAnswer ?? '').trim());
    const actualNum = Number.parseFloat(answer.value.trim());
    if (!Number.isNaN(expectedNum) && !Number.isNaN(actualNum)) {
      isCorrect = Math.abs(expectedNum - actualNum) <= 0.01;
    } else {
      isCorrect =
        (question.numericalAnswer ?? '').trim().toLowerCase() ===
        answer.value.trim().toLowerCase();
    }
  }

  return {
    answered: true,
    isCorrect,
    deltaMarks: isCorrect ? pos : neg > 0 ? -Math.abs(neg) : 0,
    maxMarks: pos,
  };
}

export function classifyPace(
  timeSpentSeconds: number,
  answered: boolean,
  config: IQConfig = DEFAULT_IQ_CONFIG
): PaceCategory {
  if (!answered) return 'Unattempted';
  if (timeSpentSeconds < config.tooFastThresholdSec) return 'Too Fast';
  if (timeSpentSeconds > config.tooSlowThresholdSec) return 'Too Slow';
  if (timeSpentSeconds >= config.optimalMinSec && timeSpentSeconds <= config.optimalMaxSec) {
    return 'Optimal Pace';
  }
  return 'Optimal Pace';
}

/**
 * Transparent, configurable IQ Score (0–150 scale) kept completely separate from official exam marks.
 * Uses solving pace strictly as a learning heuristic, never as an accusation of misconduct.
 */
export function computeIQScore(
  timings: QuestionTimingRecord[],
  accuracyPercent: number,
  config: IQConfig = DEFAULT_IQ_CONFIG
): { iqScore: number; paceSummary: PaceSummary } {
  let tooFastCount = 0;
  let optimalCount = 0;
  let tooSlowCount = 0;
  let unattemptedCount = 0;
  let rushingIncorrect = 0;
  let optimalCorrect = 0;

  for (const t of timings) {
    if (t.paceCategory === 'Unattempted') {
      unattemptedCount += 1;
    } else if (t.paceCategory === 'Too Fast') {
      tooFastCount += 1;
      if (!t.isCorrect) rushingIncorrect += 1;
    } else if (t.paceCategory === 'Too Slow') {
      tooSlowCount += 1;
    } else {
      optimalCount += 1;
      if (t.isCorrect) optimalCorrect += 1;
    }
  }

  const attempted = timings.length - unattemptedCount;
  if (attempted === 0) {
    return {
      iqScore: 50,
      paceSummary: {
        tooFastCount: 0,
        optimalCount: 0,
        tooSlowCount: 0,
        unattemptedCount,
        rushingFlagNote: 'Attempt questions to generate a pace efficiency profile.',
      },
    };
  }

  const baseScore = 60 + accuracyPercent * 0.55;
  const optimalBonus = (optimalCorrect / attempted) * config.optimalBonusWeight * 10;
  const rushingPenalty =
    ((tooFastCount * 0.5 + rushingIncorrect * 0.8) / attempted) * config.rushingPenaltyWeight * 10;
  const slowPenalty = (tooSlowCount / attempted) * config.slowPenaltyWeight * 10;

  const rawIq = Math.round(Math.max(40, Math.min(150, baseScore + optimalBonus - rushingPenalty - slowPenalty)));

  let rushingFlagNote = 'Balanced exam pacing across attempted questions.';
  if (tooFastCount >= 2 && rushingIncorrect > 0) {
    rushingFlagNote = `Pace heuristic: ${tooFastCount} very quick response(s) (<${config.tooFastThresholdSec}s) detected with ${rushingIncorrect} error(s). Consider double-checking calculations to reduce possible rushing or guessing.`;
  } else if (tooSlowCount >= 2) {
    rushingFlagNote = `Pace heuristic: ${tooSlowCount} question(s) exceeded ${config.tooSlowThresholdSec}s. Practice skipping time-sink problems first.`;
  } else if (optimalCorrect > 0) {
    rushingFlagNote = `Strong exam discipline: ${optimalCorrect} accurate answer(s) solved within the optimal pace window.`;
  }

  return {
    iqScore: rawIq,
    paceSummary: {
      tooFastCount,
      optimalCount,
      tooSlowCount,
      unattemptedCount,
      rushingFlagNote,
    },
  };
}

export function evaluateFullAttempt(params: {
  attemptId: string;
  userId: string;
  test: MockTestRecord;
  questions: TestQuestionRecord[];
  answers: Record<string, StudentAnswerValue>;
  questionSecondsMap: Record<string, number>;
  openedAtMap: Record<string, number>;
  answeredAtMap: Record<string, number | null>;
  totalTimeSeconds: number;
  iqConfig?: IQConfig;
  submittedAtIso?: string;
}): TestAttemptRecord {
  const {
    attemptId,
    userId,
    test,
    questions,
    answers,
    questionSecondsMap,
    openedAtMap,
    answeredAtMap,
    totalTimeSeconds,
    iqConfig = DEFAULT_IQ_CONFIG,
  } = params;

  let score = 0;
  let maxScore = 0;
  let correctCount = 0;
  let incorrectCount = 0;
  let unattemptedCount = 0;

  const subjectMap = new Map<
    string,
    { total: number; correct: number; incorrect: number; unattempted: number; score: number; maxScore: number; totalSec: number }
  >();
  const chapterMap = new Map<
    string,
    { chapterName: string; subjectName: string; total: number; correct: number; incorrect: number }
  >();

  const questionTimings: QuestionTimingRecord[] = [];

  for (const q of questions) {
    const ans = answers[q.id];
    const evalResult = evaluateSingleQuestion(q, ans, test);
    const timeSpentSeconds = Math.max(0, Math.round(questionSecondsMap[q.id] ?? 0));
    const paceCategory = classifyPace(timeSpentSeconds, evalResult.answered, iqConfig);

    score += evalResult.deltaMarks;
    maxScore += evalResult.maxMarks;

    if (!evalResult.answered) unattemptedCount += 1;
    else if (evalResult.isCorrect) correctCount += 1;
    else incorrectCount += 1;

    const sub = subjectMap.get(q.subjectName) ?? {
      total: 0,
      correct: 0,
      incorrect: 0,
      unattempted: 0,
      score: 0,
      maxScore: 0,
      totalSec: 0,
    };
    sub.total += 1;
    sub.maxScore += evalResult.maxMarks;
    sub.score += evalResult.deltaMarks;
    sub.totalSec += timeSpentSeconds;
    if (!evalResult.answered) sub.unattempted += 1;
    else if (evalResult.isCorrect) sub.correct += 1;
    else sub.incorrect += 1;
    subjectMap.set(q.subjectName, sub);

    const chapName = q.chapterName?.trim() || 'General';
    const chapKey = `${q.subjectName}::${chapName}`;
    const chap = chapterMap.get(chapKey) ?? {
      chapterName: chapName,
      subjectName: q.subjectName,
      total: 0,
      correct: 0,
      incorrect: 0,
    };
    chap.total += 1;
    if (evalResult.answered) {
      if (evalResult.isCorrect) chap.correct += 1;
      else chap.incorrect += 1;
    }
    chapterMap.set(chapKey, chap);

    questionTimings.push({
      questionId: q.id,
      questionNumber: q.questionNumber,
      subjectName: q.subjectName,
      chapterName: chapName,
      openedAtMs: openedAtMap[q.id] ?? 0,
      answeredAtMs: answeredAtMap[q.id] ?? null,
      timeSpentSeconds,
      answered: evalResult.answered,
      isCorrect: evalResult.isCorrect,
      paceCategory,
    });
  }

  const attempted = correctCount + incorrectCount;
  const accuracyPercent = attempted > 0 ? Math.round((correctCount / attempted) * 100) : 0;
  const avgTimePerQuestion =
    questions.length > 0 ? Math.round(totalTimeSeconds / questions.length) : 0;

  const { iqScore, paceSummary } = computeIQScore(questionTimings, accuracyPercent, iqConfig);

  const subjectScores: SubjectScoreBreakdown[] = Array.from(subjectMap.entries()).map(
    ([subjectName, s]) => {
      const subAttempted = s.correct + s.incorrect;
      return {
        subjectName,
        total: s.total,
        correct: s.correct,
        incorrect: s.incorrect,
        unattempted: s.unattempted,
        score: Number(s.score.toFixed(2)),
        maxScore: Number(s.maxScore.toFixed(2)),
        accuracyPercent: subAttempted > 0 ? Math.round((s.correct / subAttempted) * 100) : 0,
        avgTimeSeconds: s.total > 0 ? Math.round(s.totalSec / s.total) : 0,
      };
    }
  );

  const chapterScores: ChapterScoreBreakdown[] = Array.from(chapterMap.values()).map((c) => {
    const chAttempted = c.correct + c.incorrect;
    return {
      ...c,
      accuracyPercent: chAttempted > 0 ? Math.round((c.correct / chAttempted) * 100) : 0,
    };
  });

  return {
    id: attemptId,
    userId,
    testId: test.id,
    testTitle: test.title,
    destination: test.destination,
    cohortId: test.cohortId,
    score: Number(score.toFixed(2)),
    maxScore: Number(maxScore.toFixed(2)),
    correctCount,
    incorrectCount,
    unattemptedCount,
    accuracyPercent,
    totalTimeSeconds,
    avgTimePerQuestion,
    iqScore,
    paceSummary,
    subjectScores,
    chapterScores,
    questionTimings,
    answers,
    submittedAtIso: params.submittedAtIso ?? new Date().toISOString(),
  };
}

export interface CumulativeAnalyticsSummary {
  totalTests: number;
  totalCbts: number;
  totalDpps: number;
  totalQuestionsAttempted: number;
  cumulativeCorrect: number;
  cumulativeIncorrect: number;
  cumulativeUnattempted: number;
  overallAccuracy: number;
  averageScore: number;
  highestScore: number;
  averageTimePerQuestion: number;
  latestIqScore: number;
  averageIqScore: number;
  scoreDeltaFromPrevious: number | null;
}

export function computeCumulativeAnalytics(attempts: TestAttemptRecord[]): CumulativeAnalyticsSummary {
  if (attempts.length === 0) {
    return {
      totalTests: 0,
      totalCbts: 0,
      totalDpps: 0,
      totalQuestionsAttempted: 0,
      cumulativeCorrect: 0,
      cumulativeIncorrect: 0,
      cumulativeUnattempted: 0,
      overallAccuracy: 0,
      averageScore: 0,
      highestScore: 0,
      averageTimePerQuestion: 0,
      latestIqScore: 0,
      averageIqScore: 0,
      scoreDeltaFromPrevious: null,
    };
  }

  const ordered = [...attempts].sort(
    (a, b) => new Date(a.submittedAtIso).getTime() - new Date(b.submittedAtIso).getTime()
  );

  let cumulativeCorrect = 0;
  let cumulativeIncorrect = 0;
  let cumulativeUnattempted = 0;
  let totalScoreSum = 0;
  let highestScore = -Infinity;
  let totalTimeSum = 0;
  let totalQuestionsAll = 0;
  let iqSum = 0;
  let totalCbts = 0;
  let totalDpps = 0;

  for (const att of ordered) {
    if (att.destination === 'cbt-mock') totalCbts += 1;
    else totalDpps += 1;
    cumulativeCorrect += att.correctCount;
    cumulativeIncorrect += att.incorrectCount;
    cumulativeUnattempted += att.unattemptedCount;
    totalScoreSum += att.score;
    if (att.score > highestScore) highestScore = att.score;
    totalTimeSum += att.totalTimeSeconds;
    totalQuestionsAll += att.correctCount + att.incorrectCount + att.unattemptedCount;
    iqSum += att.iqScore;
  }

  const totalQuestionsAttempted = cumulativeCorrect + cumulativeIncorrect;
  const overallAccuracy =
    totalQuestionsAttempted > 0
      ? Math.round((cumulativeCorrect / totalQuestionsAttempted) * 100)
      : 0;

  const latest = ordered[ordered.length - 1];
  const prev = ordered.length >= 2 ? ordered[ordered.length - 2] : null;
  const scoreDeltaFromPrevious = prev ? Number((latest.score - prev.score).toFixed(1)) : null;

  return {
    totalTests: ordered.length,
    totalCbts,
    totalDpps,
    totalQuestionsAttempted,
    cumulativeCorrect,
    cumulativeIncorrect,
    cumulativeUnattempted,
    overallAccuracy,
    averageScore: Number((totalScoreSum / ordered.length).toFixed(1)),
    highestScore: Number(highestScore.toFixed(1)),
    averageTimePerQuestion:
      totalQuestionsAll > 0 ? Math.round(totalTimeSum / totalQuestionsAll) : 0,
    latestIqScore: latest.iqScore,
    averageIqScore: Math.round(iqSum / ordered.length),
    scoreDeltaFromPrevious,
  };
}
