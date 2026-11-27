import type { QuestionTimingRecord, TestAttemptRecord, TestQuestionRecord } from '../types';

export interface TiltIncident {
  questionId: string;
  questionNumber: number;
  subjectName: string;
  chapterName: string;
  timeSpentSeconds: number;
  triggerChainLength: number;
  marksLost: number;
  reason: string;
}

export interface TimeSinkTrap {
  questionId: string;
  questionNumber: number;
  subjectName: string;
  chapterName: string;
  timeSpentSeconds: number;
  outcome: 'Wrong' | 'Skipped';
  recommendation: string;
}

export interface Sm2ReviewCard {
  questionId: string;
  subjectName: string;
  chapterName: string;
  questionPreview: string;
  easeFactor: number;
  intervalDays: 1 | 3 | 7 | 21;
  nextReviewDateIso: string;
  stageLabel: 'Day 1' | 'Day 3' | 'Day 7' | 'Day 21';
  reason: 'Wrong Answer' | 'Tilt Guess' | 'Time-Sink Trap';
  priorityScore: number;
}

export interface ExamTemperamentReport {
  tiltIncidents: TiltIncident[];
  totalMarksLostToTilt: number;
  tiltRiskLevel: 'Calm' | 'Moderate' | 'High Tilt';
  timeSinkTraps: TimeSinkTrap[];
  totalTimeLostSeconds: number;
  sm2Queue: Sm2ReviewCard[];
  temperamentScore: number; // 0-100
  summaryHeadline: string;
}

const TIME_SINK_THRESHOLD_SECONDS = 210; // >3.5 minutes
const TILT_PANIC_SECONDS = 15;

function addDaysIso(baseIso: string, days: number): string {
  const date = new Date(baseIso);
  if (Number.isNaN(date.getTime())) {
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + days);
    return fallback.toISOString().slice(0, 10);
  }
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Computes next SM-2 review interval in the Prepskm 2.0 schedule (Day 1 -> Day 3 -> Day 7 -> Day 21).
 */
export function advanceSm2Stage(
  currentInterval: 1 | 3 | 7 | 21,
  qualityScore: number // 0-5 (3+ = recalled correctly)
): { nextInterval: 1 | 3 | 7 | 21; stageLabel: 'Day 1' | 'Day 3' | 'Day 7' | 'Day 21'; easeFactor: number } {
  const safeQ = Math.max(0, Math.min(5, qualityScore));
  const baseEf = 2.5 + (0.1 - (5 - safeQ) * (0.08 + (5 - safeQ) * 0.02));
  const easeFactor = Number(Math.max(1.3, baseEf).toFixed(2));

  if (safeQ < 3) {
    return { nextInterval: 1, stageLabel: 'Day 1', easeFactor };
  }
  if (currentInterval === 1) return { nextInterval: 3, stageLabel: 'Day 3', easeFactor };
  if (currentInterval === 3) return { nextInterval: 7, stageLabel: 'Day 7', easeFactor };
  return { nextInterval: 21, stageLabel: 'Day 21', easeFactor };
}

/**
 * Analyzes per-question timing & answer sequences for:
 * 1. Negative-Marking "Tilt" (panic guessing <15s after 2 consecutive wrong/tough questions)
 * 2. Time-Sink Traps (>3.5 minutes spent and still wrong or skipped)
 * 3. SM-2 Spaced-Repetition Mistake Queue (Day 1 -> Day 3 -> Day 7 -> Day 21)
 */
export function analyzeExamTemperament(
  attempts: TestAttemptRecord[],
  questions: TestQuestionRecord[],
  resolvedMistakeIds: string[] = []
): ExamTemperamentReport {
  const questionMap = new Map(questions.map((q) => [q.id, q]));
  const resolvedSet = new Set(resolvedMistakeIds);

  const tiltIncidents: TiltIncident[] = [];
  const timeSinkTraps: TimeSinkTrap[] = [];
  const sm2Map = new Map<string, Sm2ReviewCard>();

  let totalTimeLostSeconds = 0;

  for (const attempt of attempts) {
    const orderedTimings: QuestionTimingRecord[] = [...(attempt.questionTimings ?? [])].sort(
      (a, b) => (a.openedAtMs || a.questionNumber) - (b.openedAtMs || b.questionNumber)
    );

    let consecutiveToughOrWrong = 0;

    for (const timing of orderedTimings) {
      const q = questionMap.get(timing.questionId);
      const isWrong = timing.answered && !timing.isCorrect;
      const isSkipped = !timing.answered;
      const isToughSlow = timing.timeSpentSeconds >= 140;

      // 1. Negative-Marking "Tilt" Detection
      const isPanicGuess =
        isWrong &&
        timing.timeSpentSeconds > 0 &&
        timing.timeSpentSeconds < TILT_PANIC_SECONDS &&
        consecutiveToughOrWrong >= 2;

      if (isPanicGuess) {
        const negMark = q?.negativeMarks ?? 1;
        tiltIncidents.push({
          questionId: timing.questionId,
          questionNumber: timing.questionNumber,
          subjectName: timing.subjectName,
          chapterName: timing.chapterName || q?.chapterName || 'General',
          timeSpentSeconds: Math.round(timing.timeSpentSeconds),
          triggerChainLength: consecutiveToughOrWrong,
          marksLost: negMark,
          reason: `Answered in ${Math.round(timing.timeSpentSeconds)}s immediately after ${consecutiveToughOrWrong} tough/wrong questions.`,
        });
      }

      // 2. Time-Sink Trap Detection (>3.5 minutes = 210s and wrong or skipped)
      if ((isWrong || isSkipped) && timing.timeSpentSeconds > TIME_SINK_THRESHOLD_SECONDS) {
        totalTimeLostSeconds += Math.round(timing.timeSpentSeconds);
        timeSinkTraps.push({
          questionId: timing.questionId,
          questionNumber: timing.questionNumber,
          subjectName: timing.subjectName,
          chapterName: timing.chapterName || q?.chapterName || 'General',
          timeSpentSeconds: Math.round(timing.timeSpentSeconds),
          outcome: isWrong ? 'Wrong' : 'Skipped',
          recommendation: `Spent ${Math.floor(timing.timeSpentSeconds / 60)}m ${Math.round(
            timing.timeSpentSeconds % 60
          )}s — mark for Round 2 after 90s next time.`,
        });
      }

      // 3. SM-2 Spaced-Repetition Queueing
      if ((isWrong || (isSkipped && timing.timeSpentSeconds > TIME_SINK_THRESHOLD_SECONDS)) && !resolvedSet.has(timing.questionId)) {
        const reason: Sm2ReviewCard['reason'] = isPanicGuess
          ? 'Tilt Guess'
          : timing.timeSpentSeconds > TIME_SINK_THRESHOLD_SECONDS
            ? 'Time-Sink Trap'
            : 'Wrong Answer';
        const existing = sm2Map.get(timing.questionId);
        const priorityScore = (existing?.priorityScore ?? 0) + (isPanicGuess ? 35 : reason === 'Time-Sink Trap' ? 30 : 25);

        sm2Map.set(timing.questionId, {
          questionId: timing.questionId,
          subjectName: timing.subjectName,
          chapterName: timing.chapterName || q?.chapterName || 'General',
          questionPreview:
            q?.questionText?.slice(0, 120) ||
            `${timing.subjectName} Q${timing.questionNumber} (${timing.chapterName || 'Concept Drill'})`,
          easeFactor: isPanicGuess ? 2.1 : 2.3,
          intervalDays: 1,
          stageLabel: 'Day 1',
          nextReviewDateIso: addDaysIso(attempt.submittedAtIso, 1),
          reason,
          priorityScore,
        });
      }

      // Update streak of tough/wrong questions for next question tilt check
      if (isWrong || (isSkipped && isToughSlow)) {
        consecutiveToughOrWrong += 1;
      } else if (timing.isCorrect) {
        consecutiveToughOrWrong = 0;
      }
    }
  }

  const totalMarksLostToTilt = tiltIncidents.reduce((sum, item) => sum + item.marksLost, 0);
  const tiltRiskLevel: ExamTemperamentReport['tiltRiskLevel'] =
    tiltIncidents.length >= 3 || totalMarksLostToTilt >= 4
      ? 'High Tilt'
      : tiltIncidents.length >= 1
        ? 'Moderate'
        : 'Calm';

  const penalty = Math.min(60, tiltIncidents.length * 14 + timeSinkTraps.length * 9);
  const temperamentScore = attempts.length === 0 ? 100 : Math.max(25, 100 - penalty);

  const sm2Queue = Array.from(sm2Map.values()).sort((a, b) => b.priorityScore - a.priorityScore);

  const summaryHeadline =
    attempts.length === 0
      ? 'Attempt a CBT Mock to unlock Tilt Detection, Time-Sink Traps & SM-2 Sunday Killer sets.'
      : tiltIncidents.length > 0
        ? `Detected ${tiltIncidents.length} panic-guess tilt incident${tiltIncidents.length === 1 ? '' : 's'} (-${totalMarksLostToTilt} marks) and ${timeSinkTraps.length} time-sink trap${timeSinkTraps.length === 1 ? '' : 's'}.`
        : timeSinkTraps.length > 0
          ? `Zero panic-guessing tilt! Watch out for ${timeSinkTraps.length} time-sink question${timeSinkTraps.length === 1 ? '' : 's'} (>3.5 min).`
          : 'Disciplined exam temperament: zero tilt guesses and zero >3.5 min time-sink traps.';

  return {
    tiltIncidents,
    totalMarksLostToTilt,
    tiltRiskLevel,
    timeSinkTraps,
    totalTimeLostSeconds,
    sm2Queue,
    temperamentScore,
    summaryHeadline,
  };
}

/**
 * Builds a Sunday Weakness Killer Mock directly from SM-2 queued mistakes or falls back to high-yield questions.
 */
export function buildSundayWeaknessKillerQuestions(
  sm2Queue: Sm2ReviewCard[],
  allQuestions: TestQuestionRecord[],
  limit = 15
): TestQuestionRecord[] {
  const byId = new Map(allQuestions.map((q) => [q.id, q]));
  const picked: TestQuestionRecord[] = [];
  const seen = new Set<string>();

  for (const card of sm2Queue) {
    const q = byId.get(card.questionId);
    if (q && !seen.has(q.id)) {
      picked.push(q);
      seen.add(q.id);
    }
    if (picked.length >= limit) break;
  }

  // Pad with published questions if student has fewer than `limit` mistakes yet
  if (picked.length < limit) {
    for (const q of allQuestions) {
      if (!seen.has(q.id)) {
        picked.push(q);
        seen.add(q.id);
      }
      if (picked.length >= limit) break;
    }
  }

  return picked.map((q, idx) => ({
    ...q,
    questionNumber: idx + 1,
  }));
}
