export interface ParsedSheetRecord {
  rowIndex: number;
  date: string;
  testOrActivity: string;
  subject: string;
  chapter: string;
  score: number | null;
  maxScore: number | null;
  scorePercent: number | null;
  accuracyPercent: number | null;
  mistakes: number | null;
  notes: string;
}

export interface SubjectSheetSummary {
  subject: string;
  entries: number;
  averageScorePercent: number;
  averageAccuracyPercent: number;
  totalMistakes: number;
  status: 'Strong' | 'Developing' | 'Priority Focus';
}

export interface ChapterSheetSummary {
  chapter: string;
  subject: string;
  entries: number;
  averageAccuracyPercent: number;
  averageScorePercent: number;
  totalMistakes: number;
  priority: 'High Focus' | 'Revise' | 'Strong';
}

export interface SheetPerformanceAnalysis {
  sheetTitle: string;
  tabName: string;
  rowCount: number;
  parsedCount: number;
  overallScorePercent: number;
  overallAccuracyPercent: number;
  trend: 'Improving' | 'Steady' | 'Declining' | 'Insufficient Data';
  trendDeltaPercent: number;
  strongestSubject: string | null;
  weakestSubject: string | null;
  subjectSummaries: SubjectSheetSummary[];
  weakChapters: ChapterSheetSummary[];
  records: ParsedSheetRecord[];
  constructiveFeedback: string[];
}

export interface KeepStudyNote {
  id: string;
  title: string;
  subject: string;
  chapter: string;
  content: string;
  updatedAtIso: string;
}

export interface TutorSheetFeedback {
  verdict: string;
  progressTrendNote: string;
  strengths: string[];
  priorityWeakAreas: string[];
  constructiveAdvice: string[];
  recommendedNextAction: string;
}

export interface LearningPathStep {
  stepNumber: number;
  phase: string;
  durationMinutes: number;
  objective: string;
  actionItems: string[];
}

export interface TutorLearningPath {
  chapterName: string;
  subjectName: string;
  readinessLevel: string;
  chapterSummary: string;
  keyFormulasAndConcepts: string[];
  learningSteps: LearningPathStep[];
  examTrapsToAvoid: string[];
  keepChecklistTitle: string;
}

export interface TutorPracticeQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  difficulty: string;
  conceptTag: string;
  hint: string;
  explanation: string;
}

export const SAMPLE_STUDENT_SHEET: {
  spreadsheetId: string;
  title: string;
  tabName: string;
  headers: string[];
  rows: string[][];
} = {
  spreadsheetId: 'sample-prepskm-sheet',
  title: 'Sample JEE & Boards Performance Tracker',
  tabName: 'Chapter Performance Log',
  headers: ['Date', 'Test', 'Subject', 'Chapter', 'Score', 'Max Score', 'Accuracy %', 'Wrong', 'Notes'],
  rows: [
    ['2026-10-18', 'Part Test 01', 'Physics', 'Electrostatics', '16', '32', '50', '4', 'Sign error in Gauss law flux questions'],
    ['2026-10-22', 'Part Test 02', 'Chemistry', 'Chemical Kinetics', '26', '32', '82', '1', 'Strong on first-order half-life graphs'],
    ['2026-10-26', 'Part Test 03', 'Mathematics', 'Definite Integration', '18', '32', '56', '3', 'Missed King property symmetry shortcut'],
    ['2026-11-02', 'Part Test 04', 'Physics', 'Rotational Motion', '14', '32', '46', '5', 'Confused rolling friction direction'],
    ['2026-11-08', 'Part Test 05', 'Chemistry', 'Coordination Compounds', '28', '32', '88', '1', 'Crystal field splitting clear'],
    ['2026-11-14', 'Part Test 06', 'Physics', 'Electrostatics', '22', '32', '69', '2', 'Improved dipole torque accuracy'],
    ['2026-11-19', 'Part Test 07', 'Mathematics', 'Matrices & Determinants', '27', '32', '85', '1', 'Fast Cramer rule verification'],
  ],
};

export const STARTER_KEEP_NOTES: KeepStudyNote[] = [
  {
    id: 'keep-starter-1',
    title: 'Electrostatics Formula Reminders',
    subject: 'Physics',
    chapter: 'Electrostatics',
    content:
      'Gauss Law applies cleanly only when E is constant over the Gaussian surface. Always check net enclosed charge q_in and sign of flux. Dipole torque tau = p x E, potential energy U = -p.E.',
    updatedAtIso: '2026-11-20T10:00:00.000Z',
  },
  {
    id: 'keep-starter-2',
    title: 'Definite Integration Tricks (Keep)',
    subject: 'Mathematics',
    chapter: 'Definite Integration',
    content:
      'Check King Property f(a+b-x) first whenever limits are 0 to pi/2 or a to b. For odd functions on [-a, a], integral is zero immediately.',
    updatedAtIso: '2026-11-21T10:00:00.000Z',
  },
];

function parseNumericCell(value: string | undefined): number | null {
  if (!value) return null;
  const cleaned = value.replace(/[%₹$,]/g, '').trim();
  if (!cleaned) return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

function findColumnIndex(headers: string[], patterns: RegExp[]): number {
  for (const pattern of patterns) {
    const idx = headers.findIndex((h) => pattern.test(h.trim().toLowerCase()));
    if (idx !== -1) return idx;
  }
  return -1;
}

/**
 * Pure, deterministic parser and analyzer for Google Sheets student performance tabs.
 * Supports Prepskm exported sheets as well as custom student score/chapter trackers.
 */
export function analyzeStudentSheetRows(
  headers: string[],
  rows: string[][],
  sheetTitle: string,
  tabName: string
): SheetPerformanceAnalysis {
  const normalizedHeaders = headers.map((h) => String(h ?? '').trim());

  const dateCol = findColumnIndex(normalizedHeaders, [/^date$/, /submitted/, /day/, /timestamp/]);
  const testCol = findColumnIndex(normalizedHeaders, [/test/, /exam/, /mock/, /quiz/, /activity/, /title/]);
  const subjectCol = findColumnIndex(normalizedHeaders, [/^subject/, /course/, /paper/]);
  const chapterCol = findColumnIndex(normalizedHeaders, [/chapter/, /topic/, /unit/, /lesson/]);
  const scoreCol = findColumnIndex(normalizedHeaders, [/^score$/, /marks?\s*obtained/, /earned/, /points/]);
  const maxScoreCol = findColumnIndex(normalizedHeaders, [/max\s*score/, /total\s*marks?/, /^max$/, /^out\s*of$/]);
  const accuracyCol = findColumnIndex(normalizedHeaders, [/accuracy/, /percent/, /^%$/]);
  const correctCol = findColumnIndex(normalizedHeaders, [/^correct$/]);
  const wrongCol = findColumnIndex(normalizedHeaders, [/wrong/, /incorrect/, /mistake/, /error/]);
  const notesCol = findColumnIndex(normalizedHeaders, [/note/, /remark/, /focus/, /priority/, /feedback/, /comment/]);

  const records: ParsedSheetRecord[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] ?? [];
    if (row.every((cell) => !String(cell ?? '').trim())) continue;

    const getCell = (col: number): string => (col >= 0 && col < row.length ? String(row[col] ?? '').trim() : '');

    const subject = getCell(subjectCol) || 'General';
    const chapter = getCell(chapterCol) || getCell(testCol) || `Row ${i + 1}`;
    const testOrActivity = getCell(testCol) || chapter;
    const date = getCell(dateCol);
    const notes = getCell(notesCol);

    const score = parseNumericCell(getCell(scoreCol));
    const maxScore = parseNumericCell(getCell(maxScoreCol));
    const correct = parseNumericCell(getCell(correctCol));
    const wrong = parseNumericCell(getCell(wrongCol));
    let accuracyPercent = parseNumericCell(getCell(accuracyCol));

    if (accuracyPercent === null && correct !== null && wrong !== null && correct + wrong > 0) {
      accuracyPercent = Math.round((correct / (correct + wrong)) * 100);
    }

    let scorePercent: number | null = null;
    if (score !== null && maxScore !== null && maxScore > 0) {
      scorePercent = Math.max(0, Math.min(100, Math.round((score / maxScore) * 100)));
    } else if (accuracyPercent !== null) {
      scorePercent = Math.max(0, Math.min(100, Math.round(accuracyPercent)));
    }

    if (accuracyPercent === null && scorePercent !== null) {
      accuracyPercent = scorePercent;
    }

    // Skip non-data section headers inside multi-table spreadsheets
    if (scorePercent === null && accuracyPercent === null && wrong === null) {
      continue;
    }

    records.push({
      rowIndex: i + 2,
      date,
      testOrActivity,
      subject,
      chapter,
      score,
      maxScore,
      scorePercent,
      accuracyPercent,
      mistakes: wrong,
      notes,
    });
  }

  const scoreValues = records
    .map((r) => r.scorePercent)
    .filter((v): v is number => v !== null);
  const accuracyValues = records
    .map((r) => r.accuracyPercent)
    .filter((v): v is number => v !== null);

  const overallScorePercent =
    scoreValues.length > 0
      ? Math.round(scoreValues.reduce((sum, v) => sum + v, 0) / scoreValues.length)
      : 0;
  const overallAccuracyPercent =
    accuracyValues.length > 0
      ? Math.round(accuracyValues.reduce((sum, v) => sum + v, 0) / accuracyValues.length)
      : overallScorePercent;

  // Chronological trend comparison (first half vs second half of score entries)
  let trend: SheetPerformanceAnalysis['trend'] = 'Insufficient Data';
  let trendDeltaPercent = 0;
  if (scoreValues.length >= 4) {
    const mid = Math.floor(scoreValues.length / 2);
    const earlyAvg = scoreValues.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
    const recentSlice = scoreValues.slice(mid);
    const recentAvg = recentSlice.reduce((a, b) => a + b, 0) / recentSlice.length;
    trendDeltaPercent = Math.round(recentAvg - earlyAvg);
    if (trendDeltaPercent >= 4) trend = 'Improving';
    else if (trendDeltaPercent <= -4) trend = 'Declining';
    else trend = 'Steady';
  } else if (scoreValues.length >= 2) {
    trendDeltaPercent = Math.round(scoreValues[scoreValues.length - 1] - scoreValues[0]);
    if (trendDeltaPercent >= 4) trend = 'Improving';
    else if (trendDeltaPercent <= -4) trend = 'Declining';
    else trend = 'Steady';
  }

  // Subject aggregation
  const subjectMap = new Map<
    string,
    { scoreSum: number; scoreCnt: number; accSum: number; accCnt: number; mistakes: number; entries: number }
  >();
  const chapterMap = new Map<
    string,
    { subject: string; chapter: string; scoreSum: number; scoreCnt: number; accSum: number; accCnt: number; mistakes: number; entries: number }
  >();

  for (const rec of records) {
    const sAgg = subjectMap.get(rec.subject) ?? {
      scoreSum: 0,
      scoreCnt: 0,
      accSum: 0,
      accCnt: 0,
      mistakes: 0,
      entries: 0,
    };
    sAgg.entries += 1;
    if (rec.scorePercent !== null) {
      sAgg.scoreSum += rec.scorePercent;
      sAgg.scoreCnt += 1;
    }
    if (rec.accuracyPercent !== null) {
      sAgg.accSum += rec.accuracyPercent;
      sAgg.accCnt += 1;
    }
    if (rec.mistakes !== null) {
      sAgg.mistakes += rec.mistakes;
    }
    subjectMap.set(rec.subject, sAgg);

    const chKey = `${rec.subject}::${rec.chapter}`;
    const cAgg = chapterMap.get(chKey) ?? {
      subject: rec.subject,
      chapter: rec.chapter,
      scoreSum: 0,
      scoreCnt: 0,
      accSum: 0,
      accCnt: 0,
      mistakes: 0,
      entries: 0,
    };
    cAgg.entries += 1;
    if (rec.scorePercent !== null) {
      cAgg.scoreSum += rec.scorePercent;
      cAgg.scoreCnt += 1;
    }
    if (rec.accuracyPercent !== null) {
      cAgg.accSum += rec.accuracyPercent;
      cAgg.accCnt += 1;
    }
    if (rec.mistakes !== null) {
      cAgg.mistakes += rec.mistakes;
    }
    chapterMap.set(chKey, cAgg);
  }

  const subjectSummaries: SubjectSheetSummary[] = Array.from(subjectMap.entries())
    .map(([subject, s]) => {
      const avgScore = s.scoreCnt > 0 ? Math.round(s.scoreSum / s.scoreCnt) : 0;
      const avgAcc = s.accCnt > 0 ? Math.round(s.accSum / s.accCnt) : avgScore;
      const status: SubjectSheetSummary['status'] =
        avgAcc >= 78 ? 'Strong' : avgAcc >= 60 ? 'Developing' : 'Priority Focus';
      return {
        subject,
        entries: s.entries,
        averageScorePercent: avgScore,
        averageAccuracyPercent: avgAcc,
        totalMistakes: s.mistakes,
        status,
      };
    })
    .sort((a, b) => a.averageAccuracyPercent - b.averageAccuracyPercent);

  const weakestSubject = subjectSummaries[0]?.subject ?? null;
  const strongestSubject =
    subjectSummaries.length > 0
      ? subjectSummaries[subjectSummaries.length - 1].subject
      : null;

  const weakChapters: ChapterSheetSummary[] = Array.from(chapterMap.values())
    .map((c) => {
      const avgScore = c.scoreCnt > 0 ? Math.round(c.scoreSum / c.scoreCnt) : 0;
      const avgAcc = c.accCnt > 0 ? Math.round(c.accSum / c.accCnt) : avgScore;
      const priority: ChapterSheetSummary['priority'] =
        avgAcc < 60 || c.mistakes >= 4 ? 'High Focus' : avgAcc < 78 ? 'Revise' : 'Strong';
      return {
        chapter: c.chapter,
        subject: c.subject,
        entries: c.entries,
        averageAccuracyPercent: avgAcc,
        averageScorePercent: avgScore,
        totalMistakes: c.mistakes,
        priority,
      };
    })
    .sort((a, b) => a.averageAccuracyPercent - b.averageAccuracyPercent);

  const constructiveFeedback: string[] = [];
  if (records.length === 0) {
    constructiveFeedback.push(
      'No numeric score or accuracy rows were detected in this tab. Select a tab containing Score, Max Score, or Accuracy % columns.'
    );
  } else {
    if (trend === 'Improving') {
      constructiveFeedback.push(
        `Positive momentum: your recent entries improved by +${trendDeltaPercent}% compared to earlier records.`
      );
    } else if (trend === 'Declining') {
      constructiveFeedback.push(
        `Recent scores dipped by ${trendDeltaPercent}%. Review recent error notes before attempting full-length tests.`
      );
    } else {
      constructiveFeedback.push(
        `Your score is holding steady around ${overallScorePercent}%. Targeted drills on your weakest 2 chapters will unlock the next tier.`
      );
    }

    if (strongestSubject && weakestSubject && strongestSubject !== weakestSubject) {
      const weakStat = subjectSummaries[0];
      const strongStat = subjectSummaries[subjectSummaries.length - 1];
      constructiveFeedback.push(
        `${strongestSubject} (${strongStat.averageAccuracyPercent}% avg) is your anchor subject, while ${weakestSubject} (${weakStat.averageAccuracyPercent}% avg) offers the highest score-gain ROI.`
      );
    }

    const topWeak = weakChapters.filter((c) => c.priority === 'High Focus').slice(0, 2);
    if (topWeak.length > 0) {
      constructiveFeedback.push(
        `Immediate chapter focus: ${topWeak
          .map((c) => `${c.chapter} (${c.averageAccuracyPercent}% acc)`)
          .join(' and ')}. Build a personalized learning path and solve 5 targeted practice questions next.`
      );
    }
  }

  return {
    sheetTitle,
    tabName,
    rowCount: rows.length,
    parsedCount: records.length,
    overallScorePercent,
    overallAccuracyPercent,
    trend,
    trendDeltaPercent,
    strongestSubject,
    weakestSubject,
    subjectSummaries,
    weakChapters,
    records,
    constructiveFeedback,
  };
}

export function buildKeepLearningPathNote(path: TutorLearningPath): string {
  const lines = [
    `${path.keepChecklistTitle || `${path.chapterName} — Personalized Learning Path`}`,
    `Subject: ${path.subjectName} | Readiness: ${path.readinessLevel}`,
    '',
    'Chapter Summary:',
    path.chapterSummary,
    '',
    'Key Formulas & Mental Models:',
    ...path.keyFormulasAndConcepts.map((f) => `- ${f}`),
    '',
    'Study Path Checklist:',
    ...path.learningSteps.flatMap((step) => [
      `[ ] Step ${step.stepNumber}: ${step.phase} (${step.durationMinutes} min) — ${step.objective}`,
      ...step.actionItems.map((item) => `    [ ] ${item}`),
    ]),
    '',
    'Exam Traps to Avoid:',
    ...path.examTrapsToAvoid.map((t) => `! ${t}`),
  ];
  return lines.join('\n');
}

export function buildKeepSheetFeedbackNote(
  analysis: SheetPerformanceAnalysis,
  aiFeedback: TutorSheetFeedback | null
): string {
  const lines = [
    `Prepskm Mentor Feedback — ${analysis.sheetTitle} (${analysis.tabName})`,
    `Overall Score: ${analysis.overallScorePercent}% | Accuracy: ${analysis.overallAccuracyPercent}% | Trend: ${analysis.trend} (${analysis.trendDeltaPercent >= 0 ? '+' : ''}${analysis.trendDeltaPercent}%)`,
    '',
  ];

  if (aiFeedback) {
    lines.push('Mentor Verdict:', aiFeedback.verdict, '');
    lines.push('Strengths:', ...aiFeedback.strengths.map((s) => `- ${s}`), '');
    lines.push('Priority Fixes:', ...aiFeedback.priorityWeakAreas.map((w) => `[ ] ${w}`), '');
    lines.push('Constructive Action Plan:', ...aiFeedback.constructiveAdvice.map((a) => `[ ] ${a}`));
  } else {
    lines.push('Key Takeaways:', ...analysis.constructiveFeedback.map((f) => `[ ] ${f}`));
  }

  return lines.join('\n');
}

export function buildKeepPracticeMistakesNote(
  chapterName: string,
  subjectName: string,
  questions: TutorPracticeQuestion[],
  selectedAnswers: Record<string, number>
): string {
  const missed = questions.filter(
    (q) => selectedAnswers[q.id] !== undefined && selectedAnswers[q.id] !== q.correctIndex
  );
  const targetList = missed.length > 0 ? missed : questions;
  const lines = [
    `Practice Revision Notes — ${chapterName} (${subjectName})`,
    missed.length > 0
      ? `Missed ${missed.length}/${questions.length} questions — Review before next mock:`
      : `Completed ${questions.length}/${questions.length} practice questions — Key takeaways:`,
    '',
    ...targetList.flatMap((q, idx) => [
      `[ ] Q${idx + 1} (${q.conceptTag}): ${q.question}`,
      `    Correct: ${q.options[q.correctIndex] ?? ''}`,
      `    Why: ${q.explanation}`,
      '',
    ]),
  ];
  return lines.join('\n');
}
