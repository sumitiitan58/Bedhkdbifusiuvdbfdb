import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTeacherDoubtFallback,
  detectTeacherSvgType,
  generateLiveTeacherLesson,
} from './liveTeacherEngine';

test('detectTeacherSvgType maps Physics, Circuits, Optics, Organic, Calculus, and Biology cleanly', () => {
  assert.equal(detectTeacherSvgType('A block of mass m slides down an incline of angle θ with friction'), 'vectors');
  assert.equal(detectTeacherSvgType('Find steady-state current in RC circuit using Kirchhoff law'), 'circuit');
  assert.equal(detectTeacherSvgType('A convex lens of focal length 20 cm forms a real image'), 'optics');
  assert.equal(detectTeacherSvgType('Aldol vs Cannizzaro reaction with NaBH4 reagent', 'Chemistry'), 'reaction');
  assert.equal(detectTeacherSvgType('Evaluate definite integral from 0 to pi/2 of sin^n x', 'Mathematics'), 'calculus');
  assert.equal(detectTeacherSvgType('Hardy-Weinberg genetic equilibrium and DNA gel electrophoresis', 'Biology'), 'biology');
});

test('generateLiveTeacherLesson builds 4 sequential steps with Hinglish, English, KaTeX, and proTips', () => {
  const lesson = generateLiveTeacherLesson({
    questionText: 'A 2 kg block slides down a 30° rough incline with μ = 0.2. Find acceleration.',
    subjectName: 'Physics',
    chapterName: 'Laws of Motion',
    officialAnswer: 'Option B',
    studentAnswer: 'Option A',
    source: 'mistake-notebook',
  });

  assert.equal(lesson.svgType, 'vectors');
  assert.equal(lesson.steps.length, 4);
  assert.deepEqual(
    lesson.steps.map((s) => s.stepNumber),
    [1, 2, 3, 4]
  );
  for (const step of lesson.steps) {
    assert.ok(step.title.length > 0);
    assert.ok(step.narrationScript.length > 20);
    assert.ok(step.englishNarrationScript.length > 20);
    assert.ok(step.boardLatex.length > 0);
    assert.ok(step.proTip.length > 0);
  }
  assert.ok(lesson.steps[0].narrationScript.includes('Option A'));
  assert.ok(lesson.steps[0].narrationScript.includes('Option B'));
});

test('buildTeacherDoubtFallback answers sin theta cross-questions in Hinglish and English', () => {
  const lesson = generateLiveTeacherLesson({
    questionText: 'Block sliding on inclined plane',
    subjectName: 'Physics',
  });
  const step2 = lesson.steps[1];

  const hi = buildTeacherDoubtFallback('Step 2 mein sin θ kyun liya?', lesson, step2, 'hinglish');
  assert.ok(hi.reply.includes('mg\\sin\\theta'));
  assert.ok(hi.latex?.includes('mg\\sin\\theta'));

  const en = buildTeacherDoubtFallback('Why did we take sin theta?', lesson, step2, 'english');
  assert.ok(en.reply.includes('mg\\sin\\theta'));
});
