import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeMistakePatterns,
  buildPersonalizedReattemptSet,
  classifyMistakeRootCause,
  getRootCauseLabel,
} from './mistakeAnalysisEngine';
import type { MistakeNotebookEntry } from './testAnalysisEngine';
import type { TestQuestionRecord } from '../types';

function makeEntry(overrides: {
  questionId: string;
  chapterName?: string;
  subjectName?: string;
  status?: 'wrong' | 'unattempted';
  timeSpentSeconds?: number;
  occurrences?: number;
  submittedAtIso?: string;
}): MistakeNotebookEntry {
  const question: TestQuestionRecord = {
    id: overrides.questionId,
    testId: 'test-1',
    questionNumber: 1,
    subjectName: overrides.subjectName ?? 'Physics',
    chapterName: overrides.chapterName ?? 'Electrostatics',
    questionType: 'single-mcq',
    questionText: `Question ${overrides.questionId}`,
    optionTexts: ['A', 'B', 'C', 'D'],
    correctOptionIndices: [0],
    positiveMarks: 4,
    negativeMarks: 1,
    testStatus: 'published',
  };

  return {
    questionId: overrides.questionId,
    question,
    latestAttemptId: 'att-1',
    testId: 'test-1',
    testTitle: 'JEE Mock 1',
    submittedAtIso: overrides.submittedAtIso ?? '2026-11-24T10:00:00.000Z',
    status: overrides.status ?? 'wrong',
    occurrences: overrides.occurrences ?? 1,
    subjectName: overrides.subjectName ?? 'Physics',
    chapterName: overrides.chapterName ?? 'Electrostatics',
    studentAnswer:
      overrides.status === 'unattempted'
        ? undefined
        : { type: 'single-mcq', selectedIndex: 1 },
    timeSpentSeconds: overrides.timeSpentSeconds ?? 45,
  };
}

test('classifyMistakeRootCause accurately categorizes all four root causes', () => {
  assert.equal(
    classifyMistakeRootCause(makeEntry({ questionId: 'm1', status: 'unattempted', timeSpentSeconds: 0 })),
    'skipped-topic'
  );
  assert.equal(
    classifyMistakeRootCause(makeEntry({ questionId: 'm2', status: 'wrong', timeSpentSeconds: 9 })),
    'rushed-slip'
  );
  assert.equal(
    classifyMistakeRootCause(makeEntry({ questionId: 'm3', status: 'wrong', timeSpentSeconds: 185 })),
    'time-sink'
  );
  assert.equal(
    classifyMistakeRootCause(makeEntry({ questionId: 'm4', status: 'wrong', timeSpentSeconds: 58 })),
    'conceptual-gap'
  );
  assert.equal(getRootCauseLabel('rushed-slip'), 'Rushed Silly Slips (<15s)');
});

test('analyzeMistakePatterns aggregates counts, dominant cause, and top leak chapters', () => {
  const mistakes: MistakeNotebookEntry[] = [
    makeEntry({ questionId: '1', chapterName: 'Rotational Motion', timeSpentSeconds: 10 }),
    makeEntry({ questionId: '2', chapterName: 'Rotational Motion', timeSpentSeconds: 8 }),
    makeEntry({ questionId: '3', chapterName: 'Rotational Motion', timeSpentSeconds: 60 }),
    makeEntry({ questionId: '4', chapterName: 'Optics', timeSpentSeconds: 190 }),
    makeEntry({ questionId: '5', chapterName: 'Thermodynamics', status: 'unattempted', timeSpentSeconds: 5 }),
    makeEntry({ questionId: '6', chapterName: 'Electrostatics', timeSpentSeconds: 70 }),
  ];

  const report = analyzeMistakePatterns(mistakes, ['6']);
  assert.equal(report.totalActive, 5);
  assert.equal(report.totalMastered, 1);
  assert.equal(report.rushedSlipCount, 2);
  assert.equal(report.timeSinkCount, 1);
  assert.equal(report.skippedTopicCount, 1);
  assert.equal(report.conceptualGapCount, 1);
  assert.equal(report.dominantCause, 'rushed-slip');
  assert.equal(report.topLeakChapters[0].chapterName, 'Rotational Motion');
  assert.equal(report.topLeakChapters[0].count, 3);
});

test('buildPersonalizedReattemptSet prioritizes strategies and respects size limits', () => {
  const mistakes: MistakeNotebookEntry[] = [
    makeEntry({ questionId: 'skip-1', subjectName: 'Chemistry', chapterName: 'Equilibrium', status: 'unattempted', occurrences: 1 }),
    makeEntry({ questionId: 'rush-1', subjectName: 'Physics', chapterName: 'Rotational Motion', timeSpentSeconds: 10, occurrences: 2 }),
    makeEntry({ questionId: 'slow-1', subjectName: 'Physics', chapterName: 'Rotational Motion', timeSpentSeconds: 175, occurrences: 1 }),
    makeEntry({ questionId: 'conc-1', subjectName: 'Mathematics', chapterName: 'Calculus', timeSpentSeconds: 65, occurrences: 1 }),
    makeEntry({ questionId: 'done-1', subjectName: 'Physics', chapterName: 'Electrostatics', timeSpentSeconds: 50, occurrences: 3 }),
  ];

  const highRisk = buildPersonalizedReattemptSet(mistakes, ['done-1'], {
    strategy: 'high-risk',
    size: 2,
  });
  assert.equal(highRisk.length, 2);
  assert.equal(highRisk[0].questionId, 'rush-1');

  const weakChapters = buildPersonalizedReattemptSet(mistakes, ['done-1'], {
    strategy: 'weak-chapter',
    size: 3,
  });
  assert.equal(weakChapters.length, 3);
  assert.equal(weakChapters[0].chapterName, 'Rotational Motion');
  assert.equal(weakChapters[1].chapterName, 'Rotational Motion');

  const physicsOnly = buildPersonalizedReattemptSet(mistakes, ['done-1'], {
    strategy: 'subject',
    size: 5,
    subjectFilter: 'Physics',
  });
  assert.equal(physicsOnly.length, 2);
  assert.ok(physicsOnly.every((m) => m.subjectName === 'Physics' && m.questionId !== 'done-1'));
});
