import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  SAMPLE_STUDENT_SHEET,
  analyzeStudentSheetRows,
  buildKeepLearningPathNote,
  buildKeepPracticeMistakesNote,
  buildKeepSheetFeedbackNote,
} from './sheetTutorAnalyzer';

describe('sheetTutorAnalyzer pure logic', () => {
  it('accurately analyzes sample student Google Sheet performance, trend, and weak chapters', () => {
    const analysis = analyzeStudentSheetRows(
      SAMPLE_STUDENT_SHEET.headers,
      SAMPLE_STUDENT_SHEET.rows,
      SAMPLE_STUDENT_SHEET.title,
      SAMPLE_STUDENT_SHEET.tabName
    );

    assert.equal(analysis.parsedCount, 7);
    assert.equal(analysis.trend, 'Improving');
    assert.ok(analysis.trendDeltaPercent > 0);
    assert.equal(analysis.weakestSubject, 'Physics');
    assert.equal(analysis.strongestSubject, 'Chemistry');
    assert.equal(analysis.weakChapters[0].chapter, 'Rotational Motion');
    assert.equal(analysis.weakChapters[0].priority, 'High Focus');
    assert.ok(analysis.constructiveFeedback.length >= 2);
  });

  it('parses custom spreadsheet headers with Correct/Wrong columns when Accuracy % is absent', () => {
    const analysis = analyzeStudentSheetRows(
      ['Topic', 'Course', 'Correct', 'Incorrect', 'Remarks'],
      [
        ['Thermodynamics', 'Physics', '8', '2', 'Good speed'],
        ['Ionic Equilibrium', 'Chemistry', '3', '7', 'Weak pH approximations'],
      ],
      'Custom Tracker',
      'Weekly Progress'
    );

    assert.equal(analysis.parsedCount, 2);
    assert.equal(analysis.overallAccuracyPercent, 55);
    assert.equal(analysis.weakChapters[0].chapter, 'Ionic Equilibrium');
    assert.equal(analysis.weakChapters[0].averageAccuracyPercent, 30);
    assert.equal(analysis.weakChapters[1].averageAccuracyPercent, 80);
  });

  it('handles empty or non-numeric rows gracefully without crashing', () => {
    const analysis = analyzeStudentSheetRows(
      ['Section', 'Note'],
      [['Summary', 'No tests yet'], ['', '']],
      'Empty Sheet',
      'Notes'
    );

    assert.equal(analysis.parsedCount, 0);
    assert.equal(analysis.overallScorePercent, 0);
    assert.equal(analysis.trend, 'Insufficient Data');
    assert.match(analysis.constructiveFeedback[0], /No numeric score/i);
  });

  it('formats Google Keep notes cleanly for learning paths, sheet feedback, and practice mistakes', () => {
    const analysis = analyzeStudentSheetRows(
      SAMPLE_STUDENT_SHEET.headers,
      SAMPLE_STUDENT_SHEET.rows,
      SAMPLE_STUDENT_SHEET.title,
      SAMPLE_STUDENT_SHEET.tabName
    );

    const feedbackNote = buildKeepSheetFeedbackNote(analysis, null);
    assert.match(feedbackNote, /Prepskm Mentor Feedback/i);
    assert.match(feedbackNote, /\[ \]/);

    const pathNote = buildKeepLearningPathNote({
      chapterName: 'Rotational Motion',
      subjectName: 'Physics',
      readinessLevel: 'Building Core',
      chapterSummary: 'Master torque, angular momentum, and pure rolling.',
      keyFormulasAndConcepts: ['tau = I * alpha', 'v = omega * R'],
      learningSteps: [
        {
          stepNumber: 1,
          phase: 'Core Concepts',
          durationMinutes: 25,
          objective: 'Resolve rolling friction directions',
          actionItems: ['Draw FBD for rolling up and down incline'],
        },
      ],
      examTrapsToAvoid: ['Do not assume friction always opposes translation in rolling'],
      keepChecklistTitle: 'Rotational Motion Path',
    });
    assert.match(pathNote, /Rotational Motion Path/);
    assert.match(pathNote, /Step 1: Core Concepts/);

    const quizNote = buildKeepPracticeMistakesNote(
      'Electrostatics',
      'Physics',
      [
        {
          id: 'q1',
          question: 'Net flux through a closed cube enclosing +q?',
          options: ['0', 'q/e0', 'q/6e0', '6q/e0'],
          correctIndex: 1,
          difficulty: 'Foundation',
          conceptTag: 'Gauss Law',
          hint: 'Use total enclosed charge',
          explanation: 'Total flux equals q_in / epsilon_0 independent of shape.',
        },
      ],
      { q1: 2 }
    );
    assert.match(quizNote, /Missed 1\/1 questions/);
    assert.match(quizNote, /Gauss Law/);
  });
});
