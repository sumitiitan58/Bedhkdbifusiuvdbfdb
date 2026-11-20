import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getDefaultExamInstructions,
  getEffectiveTestInstructions,
  getEffectiveTestSyllabus,
} from './examPresets.ts';
import type { MockTestRecord, TestQuestionRecord } from '../types/index.ts';

test('getDefaultExamInstructions returns distinct instructions for JEE Main vs NEET UG', () => {
  const jee = getDefaultExamInstructions({
    examType: 'JEE Main',
    durationMinutes: 180,
    positiveMarks: 4,
    negativeMarks: 1,
    negativeMarkingEnabled: true,
    totalQuestions: 75,
  });
  const neet = getDefaultExamInstructions({
    examType: 'NEET UG',
    durationMinutes: 200,
    positiveMarks: 4,
    negativeMarks: 1,
    negativeMarkingEnabled: true,
    totalQuestions: 180,
  });

  assert.ok(jee.some((line) => line.includes('JEE Main')));
  assert.ok(neet.some((line) => line.includes('NEET UG')));
  assert.notEqual(jee[0], neet[0]);
  assert.ok(neet.some((line) => line.includes('Room-Exit Warning')));
});

test('getEffectiveTestSyllabus derives subject/chapter syllabus from questions when explicit syllabus is absent', () => {
  const mockTest: MockTestRecord = {
    id: 'test-1',
    title: 'Sample Test',
    destination: 'cbt-mock',
    cohortId: 'class-12-jee',
    examCategory: 'JEE Main',
    examType: 'JEE Main',
    totalQuestions: 2,
    totalMarks: 8,
    durationMinutes: 15,
    positiveMarks: 4,
    negativeMarks: 1,
    negativeMarkingEnabled: true,
    showSolutionsAfterSubmit: true,
    status: 'published',
  };
  const questions: TestQuestionRecord[] = [
    {
      id: 'q1',
      testId: 'test-1',
      questionNumber: 1,
      subjectName: 'Physics',
      chapterName: 'Electrostatics',
      questionType: 'single-mcq',
      testStatus: 'published',
    },
    {
      id: 'q2',
      testId: 'test-1',
      questionNumber: 2,
      subjectName: 'Chemistry',
      chapterName: 'Chemical Bonding',
      questionType: 'single-mcq',
      testStatus: 'published',
    },
  ];

  const syllabus = getEffectiveTestSyllabus(mockTest, questions);
  assert.equal(syllabus.length, 2);
  assert.equal(syllabus[0].subject, 'Physics');
  assert.deepEqual(syllabus[0].chapters, ['Electrostatics']);

  const instructions = getEffectiveTestInstructions(mockTest);
  assert.ok(instructions.length >= 4);
});
