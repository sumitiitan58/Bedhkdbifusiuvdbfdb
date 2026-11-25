import type { MistakeNotebookEntry } from './testAnalysisEngine';

export type MistakeRootCause =
  | 'rushed-slip'
  | 'conceptual-gap'
  | 'time-sink'
  | 'skipped-topic';

export interface ChapterLeakStat {
  chapterName: string;
  subjectName: string;
  count: number;
  wrongCount: number;
  unattemptedCount: number;
  avgTimeSeconds: number;
  riskScore: number;
}

export interface SubjectLeakStat {
  subjectName: string;
  count: number;
  wrongCount: number;
  unattemptedCount: number;
  rushedCount: number;
}

export interface MistakePatternAnalysis {
  totalActive: number;
  totalMastered: number;
  rushedSlipCount: number;
  conceptualGapCount: number;
  timeSinkCount: number;
  skippedTopicCount: number;
  dominantCause: MistakeRootCause | null;
  dominantCauseLabel: string;
  dominantCauseAdvice: string;
  topLeakChapters: ChapterLeakStat[];
  subjectBreakdown: SubjectLeakStat[];
}

export type ReattemptStrategy = 'high-risk' | 'weak-chapter' | 'subject';

export function classifyMistakeRootCause(entry: MistakeNotebookEntry): MistakeRootCause {
  if (entry.status === 'unattempted') {
    return 'skipped-topic';
  }
  if (entry.timeSpentSeconds > 0 && entry.timeSpentSeconds < 15) {
    return 'rushed-slip';
  }
  if (entry.timeSpentSeconds > 150) {
    return 'time-sink';
  }
  return 'conceptual-gap';
}

export function getRootCauseLabel(cause: MistakeRootCause): string {
  switch (cause) {
    case 'rushed-slip':
      return 'Rushed Silly Slips (<15s)';
    case 'time-sink':
      return 'Overtime Calculation Traps (>150s)';
    case 'skipped-topic':
      return 'Unattempted / Skipped Topics';
    default:
      return 'Conceptual / Formula Gaps';
  }
}

export function analyzeMistakePatterns(
  allMistakes: MistakeNotebookEntry[],
  resolvedIds: Iterable<string>
): MistakePatternAnalysis {
  const resolvedSet = new Set(resolvedIds);
  const active = allMistakes.filter((m) => !resolvedSet.has(m.questionId));
  const totalMastered = allMistakes.length - active.length;

  let rushedSlipCount = 0;
  let conceptualGapCount = 0;
  let timeSinkCount = 0;
  let skippedTopicCount = 0;

  const chapterMap = new Map<
    string,
    {
      chapterName: string;
      subjectName: string;
      count: number;
      wrongCount: number;
      unattemptedCount: number;
      totalTime: number;
      occurrencesSum: number;
    }
  >();

  const subjectMap = new Map<string, SubjectLeakStat>();

  for (const m of active) {
    const cause = classifyMistakeRootCause(m);
    if (cause === 'rushed-slip') rushedSlipCount++;
    else if (cause === 'time-sink') timeSinkCount++;
    else if (cause === 'skipped-topic') skippedTopicCount++;
    else conceptualGapCount++;

    const chKey = `${m.subjectName}::${m.chapterName}`;
    const ch = chapterMap.get(chKey) ?? {
      chapterName: m.chapterName,
      subjectName: m.subjectName,
      count: 0,
      wrongCount: 0,
      unattemptedCount: 0,
      totalTime: 0,
      occurrencesSum: 0,
    };
    ch.count += 1;
    if (m.status === 'wrong') ch.wrongCount += 1;
    else ch.unattemptedCount += 1;
    ch.totalTime += Math.max(0, m.timeSpentSeconds);
    ch.occurrencesSum += Math.max(1, m.occurrences);
    chapterMap.set(chKey, ch);

    const sub = subjectMap.get(m.subjectName) ?? {
      subjectName: m.subjectName,
      count: 0,
      wrongCount: 0,
      unattemptedCount: 0,
      rushedCount: 0,
    };
    sub.count += 1;
    if (m.status === 'wrong') sub.wrongCount += 1;
    else sub.unattemptedCount += 1;
    if (cause === 'rushed-slip') sub.rushedCount += 1;
    subjectMap.set(m.subjectName, sub);
  }

  const topLeakChapters: ChapterLeakStat[] = Array.from(chapterMap.values())
    .map((ch) => ({
      chapterName: ch.chapterName,
      subjectName: ch.subjectName,
      count: ch.count,
      wrongCount: ch.wrongCount,
      unattemptedCount: ch.unattemptedCount,
      avgTimeSeconds: Math.round(ch.totalTime / Math.max(1, ch.count)),
      riskScore: ch.wrongCount * 3 + ch.unattemptedCount * 1.5 + ch.occurrencesSum,
    }))
    .sort((a, b) => b.riskScore - a.riskScore || b.count - a.count)
    .slice(0, 5);

  const subjectBreakdown = Array.from(subjectMap.values()).sort(
    (a, b) => b.count - a.count
  );

  let dominantCause: MistakeRootCause | null = null;
  let dominantCauseLabel = 'No active leaks yet';
  let dominantCauseAdvice =
    'Attempt a CBT mock or inline Chapter DPP to populate live root-cause error diagnostics.';

  if (active.length > 0) {
    const candidates: Array<{ cause: MistakeRootCause; count: number; advice: string }> = [
      {
        cause: 'conceptual-gap',
        count: conceptualGapCount,
        advice:
          'Revise core chapter short notes and formula sheets, then run a focused 5–10 question re-attempt set.',
      },
      {
        cause: 'rushed-slip',
        count: rushedSlipCount,
        advice:
          'Force a 10-second verification pause on units, signs, and option elimination before locking answers.',
      },
      {
        cause: 'time-sink',
        count: timeSinkCount,
        advice:
          'Cap first-pass solving at 120 seconds; mark lengthy derivations for Review and return after quick wins.',
      },
      {
        cause: 'skipped-topic',
        count: skippedTopicCount,
        advice:
          'Target your top skipped chapters with inline Chapter DPPs to convert blank questions into guaranteed +4s.',
      },
    ];
    candidates.sort((a, b) => b.count - a.count);
    dominantCause = candidates[0].cause;
    dominantCauseLabel = getRootCauseLabel(dominantCause);
    dominantCauseAdvice = candidates[0].advice;
  }

  return {
    totalActive: active.length,
    totalMastered,
    rushedSlipCount,
    conceptualGapCount,
    timeSinkCount,
    skippedTopicCount,
    dominantCause,
    dominantCauseLabel,
    dominantCauseAdvice,
    topLeakChapters,
    subjectBreakdown,
  };
}

export function buildPersonalizedReattemptSet(
  allMistakes: MistakeNotebookEntry[],
  resolvedIds: Iterable<string>,
  options: {
    size: number;
    strategy: ReattemptStrategy;
    subjectFilter?: string;
  }
): MistakeNotebookEntry[] {
  const resolvedSet = new Set(resolvedIds);
  const activePool = allMistakes.filter((m) => !resolvedSet.has(m.questionId));
  const pool = activePool.length > 0 ? activePool : allMistakes;

  let scoped = pool;
  if (
    options.strategy === 'subject' &&
    options.subjectFilter &&
    options.subjectFilter !== 'all'
  ) {
    const matching = pool.filter((m) => m.subjectName === options.subjectFilter);
    if (matching.length > 0) {
      scoped = matching;
    }
  }

  const chapterFrequency = new Map<string, number>();
  for (const item of scoped) {
    const key = `${item.subjectName}::${item.chapterName}`;
    chapterFrequency.set(key, (chapterFrequency.get(key) ?? 0) + 1);
  }

  const scored = [...scoped].sort((a, b) => {
    if (options.strategy === 'weak-chapter') {
      const freqA = chapterFrequency.get(`${a.subjectName}::${a.chapterName}`) ?? 0;
      const freqB = chapterFrequency.get(`${b.subjectName}::${b.chapterName}`) ?? 0;
      if (freqB !== freqA) return freqB - freqA;
    }

    const riskA =
      (a.status === 'wrong' ? 4 : 2) +
      a.occurrences * 2 +
      (a.timeSpentSeconds < 15 && a.status === 'wrong' ? 1.5 : 0);
    const riskB =
      (b.status === 'wrong' ? 4 : 2) +
      b.occurrences * 2 +
      (b.timeSpentSeconds < 15 && b.status === 'wrong' ? 1.5 : 0);
    if (riskB !== riskA) return riskB - riskA;

    return (b.submittedAtIso || '').localeCompare(a.submittedAtIso || '');
  });

  const limit = Math.max(1, Math.min(options.size, scored.length));
  return scored.slice(0, limit);
}
