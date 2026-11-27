import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildHandwritingLines,
  buildLessonRequestFromVoiceQuery,
  charToViseme,
  findTimelineMsForCharIndex,
  latexToHandwrittenReadable,
  sampleVisemeAtTime,
  textToVisemeTimeline,
} from './lipSyncEngine';
import { generateLiveTeacherLesson } from './liveTeacherEngine';

test('charToViseme maps vowels, bilabials, labiodentals, digraphs, and punctuation accurately', () => {
  assert.equal(charToViseme('a'), 'AA');
  assert.equal(charToViseme('e'), 'EE');
  assert.equal(charToViseme('o'), 'OH');
  assert.equal(charToViseme('u'), 'OO');
  assert.equal(charToViseme('m'), 'MBP');
  assert.equal(charToViseme('p'), 'MBP');
  assert.equal(charToViseme('f'), 'FV');
  assert.equal(charToViseme('t', 'h'), 'LTH');
  assert.equal(charToViseme(' '), 'rest');
  assert.equal(charToViseme('.'), 'rest');
});

test('textToVisemeTimeline builds monotonic timed frames and scales duration with playback rate', () => {
  const normal = textToVisemeTimeline('Force equals mass times acceleration.', 1);
  const fast = textToVisemeTimeline('Force equals mass times acceleration.', 1.5);

  assert.ok(normal.length > 10);
  for (let i = 1; i < normal.length; i += 1) {
    assert.ok(normal[i].startMs >= normal[i - 1].startMs);
    assert.ok(normal[i].endMs > normal[i].startMs);
  }

  const normalEnd = normal[normal.length - 1].endMs;
  const fastEnd = fast[fast.length - 1].endMs;
  assert.ok(fastEnd < normalEnd, '1.5x playback timeline must finish faster than 1x');

  const anchorMs = findTimelineMsForCharIndex(normal, 6);
  assert.ok(anchorMs !== null && anchorMs > 0);
});

test('sampleVisemeAtTime returns active articulation mid-utterance and rests at end', () => {
  const timeline = textToVisemeTimeline('Alpha beta gamma', 1);
  const midMs = Math.round(timeline[Math.floor(timeline.length / 2)].startMs + 10);
  const midSample = sampleVisemeAtTime(timeline, midMs);
  assert.ok(midSample.energy > 0.05);
  assert.ok(midSample.openness >= 0.04 && midSample.openness <= 1);

  const endSample = sampleVisemeAtTime(timeline, timeline[timeline.length - 1].endMs + 200);
  assert.equal(endSample.viseme, 'rest');
  assert.equal(endSample.jawDropPx, 0);
});

test('buildHandwritingLines produces progressive timed strokes and readable math symbols', () => {
  const lesson = generateLiveTeacherLesson({
    subjectName: 'Physics',
    questionText: 'Block sliding down rough inclined plane of angle theta with friction mu',
    source: 'preps-ai',
  });
  const lines = buildHandwritingLines(lesson.steps[1], 1);
  assert.equal(lines.length, 4);
  assert.equal(lines[0].kind, 'heading');
  assert.equal(lines[1].kind, 'equation');
  assert.ok(lines[1].startMs > lines[0].startMs);
  assert.ok(latexToHandwrittenReadable('N = mg\\cos\\theta').includes('θ'));
  const vecReadable = latexToHandwrittenReadable('\\vec{F}_{\\text{net}} = m\\vec{a}');
  assert.ok(!/[\u20D0-\u20FF]/.test(vecReadable), 'Must not emit unsupported combining diacritics');
  assert.ok(!vecReadable.includes('_'), 'Must not leave raw LaTeX underscores');
});

test('buildLessonRequestFromVoiceQuery infers subject cleanly from voice transcript', () => {
  const chem = buildLessonRequestFromVoiceQuery('Explain SN1 carbocation rearrangement mechanism');
  assert.equal(chem.subjectName, 'Chemistry');

  const math = buildLessonRequestFromVoiceQuery('Solve definite integral of sin x using Kings rule');
  assert.equal(math.subjectName, 'Mathematics');

  const bio = buildLessonRequestFromVoiceQuery('Explain DNA transcription and NCERT genetics');
  assert.equal(bio.subjectName, 'Biology');
});
