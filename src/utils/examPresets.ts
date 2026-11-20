import type { ExamType, MockTestRecord, TestQuestionRecord, TestSyllabusItem } from '../types';

export const EXAM_TYPES: ExamType[] = [
  'JEE Main',
  'JEE Advanced',
  'NEET UG',
  'Board Exam',
  'Custom',
];

export function getDefaultExamInstructions(params: {
  examType: ExamType;
  durationMinutes: number;
  positiveMarks: number;
  negativeMarks: number;
  negativeMarkingEnabled: boolean;
  totalQuestions: number;
}): string[] {
  const { examType, durationMinutes, positiveMarks, negativeMarks, negativeMarkingEnabled, totalQuestions } =
    params;

  const markingLine = negativeMarkingEnabled
    ? `Marking Scheme: +${positiveMarks} marks for every correct response, −${negativeMarks} mark for each incorrect response, and 0 marks for unattempted questions.`
    : `Marking Scheme: +${positiveMarks} marks for every correct response with NO negative marking for incorrect or unattempted questions.`;

  const commonTail = [
    `Total duration is ${durationMinutes} minutes for ${totalQuestions} questions. The countdown timer auto-submits your paper when time reaches 00:00.`,
    'Exam Room Discipline: Switching browser tabs, minimizing the window, or attempting to exit the test room triggers an instant Room-Exit Warning logged on your scorecard.',
  ];

  switch (examType) {
    case 'JEE Main':
      return [
        'JEE Main (NTA Computer-Based Test): Paper consists of Physics, Chemistry, and Mathematics with Single-Choice MCQs and Numerical Value questions.',
        markingLine,
        'For Numerical/Integer questions, type the exact numerical answer cleanly without units or extra spaces.',
        'Use "Save & Next" to lock your answer, or "Mark for Review & Next" to revisit tricky calculations before final submission.',
        ...commonTail,
      ];
    case 'JEE Advanced':
      return [
        'JEE Advanced Multi-Pattern CBT: Includes Single-Correct MCQs, Multiple-Correct (One or More Than One Correct) MCQs, and Non-Negative Integer / Numerical problems.',
        markingLine,
        'Read each question badge carefully — Multi-Correct MCQs require selecting ALL correct options to earn full marks.',
        'Maintain calm analytical pacing: time per question is recorded to compute your Exam IQ & Pacing Diagnostics.',
        ...commonTail,
      ];
    case 'NEET UG':
      return [
        'NEET UG Medical Entrance Pattern: Structured across Physics, Chemistry, and Biology (Botany & Zoology) with NCERT-aligned Single-Correct MCQs.',
        markingLine,
        'Speed & Accuracy Focus: Aim for under 45 seconds per Biology question to preserve time for Physics and Physical Chemistry numericals.',
        'Verify every option carefully before locking with "Save & Next" — avoid blind guessing to protect against negative marking.',
        ...commonTail,
      ];
    case 'Board Exam':
      return [
        'CBSE / State Board Objective & Competency Pattern: Covers NCERT derivations, assertion-reasoning, case-based MCQs, and numericals.',
        markingLine,
        'Focus on complete conceptual clarity and step-by-step verification rather than rushing.',
        ...commonTail,
      ];
    default:
      return [
        'PREPSKM Custom Practice Assessment: Curated by faculty for targeted chapter mastery and rank improvement.',
        markingLine,
        'Navigate freely across sections using the right-hand Question Palette and review flagged questions before submitting.',
        ...commonTail,
      ];
  }
}

export function getEffectiveTestInstructions(test: MockTestRecord): string[] {
  if (test.instructions && test.instructions.length > 0) {
    return test.instructions;
  }
  const examType: ExamType =
    test.examType ??
    (test.examCategory.toLowerCase().includes('neet')
      ? 'NEET UG'
      : test.examCategory.toLowerCase().includes('advanced')
        ? 'JEE Advanced'
        : test.examCategory.toLowerCase().includes('board')
          ? 'Board Exam'
          : 'JEE Main');

  return getDefaultExamInstructions({
    examType,
    durationMinutes: test.durationMinutes,
    positiveMarks: test.positiveMarks,
    negativeMarks: test.negativeMarks,
    negativeMarkingEnabled: test.negativeMarkingEnabled,
    totalQuestions: test.totalQuestions,
  });
}

export function getEffectiveTestSyllabus(
  test: MockTestRecord,
  questions: TestQuestionRecord[]
): TestSyllabusItem[] {
  if (test.syllabus && test.syllabus.length > 0) {
    return test.syllabus;
  }

  const bySubject = new Map<string, Set<string>>();
  for (const q of questions) {
    const subj = q.subjectName || 'General';
    if (!bySubject.has(subj)) {
      bySubject.set(subj, new Set());
    }
    if (q.chapterName && q.chapterName.trim().length > 0) {
      bySubject.get(subj)!.add(q.chapterName.trim());
    }
  }

  if (bySubject.size === 0 && test.subjectRanges && test.subjectRanges.length > 0) {
    return test.subjectRanges.map((r) => ({
      subject: r.subjectName,
      chapters: [`Questions ${r.startQ} – ${r.endQ} (Full Syllabus)`],
    }));
  }

  return Array.from(bySubject.entries()).map(([subject, chapterSet]) => ({
    subject,
    chapters: chapterSet.size > 0 ? Array.from(chapterSet) : ['Core Syllabus Topics'],
  }));
}
