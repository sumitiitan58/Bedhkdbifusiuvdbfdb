import test from 'node:test';
import assert from 'node:assert/strict';
import {
  escapeSvgXml,
  formatScientificNotation,
  renderOptionImageDataUrl,
  renderQuestionImageDataUrl,
  resolveOptionImageSrc,
  resolveQuestionImageSrc,
} from './questionImageRenderer';

test('formatScientificNotation prettifies powers, subscripts, Greek letters, and arrows', () => {
  const formatted = formatScientificNotation('F = q_1*q_2 / (4*pi*epsilon_0*r^2) -> 10^-9');
  assert.match(formatted, /q₁/);
  assert.match(formatted, /q₂/);
  assert.match(formatted, /π/);
  assert.match(formatted, /ε₀/);
  assert.match(formatted, /r²/);
  assert.match(formatted, /→/);
  assert.match(formatted, /10⁻⁹/);
});

test('escapeSvgXml escapes all unsafe XML characters cleanly', () => {
  assert.equal(escapeSvgXml('<script>&"a\'b</script>'), '&lt;script&gt;&amp;&quot;a&apos;b&lt;/script&gt;');
});

test('renderQuestionImageDataUrl and renderOptionImageDataUrl return valid SVG image data URLs', () => {
  const qUrl = renderQuestionImageDataUrl({
    questionNumber: 1,
    subjectName: 'Physics',
    chapterName: 'Electrostatics',
    questionText: 'Find electric field E at distance r^2 when charge q > 0.',
  });
  assert.ok(qUrl.startsWith('data:image/svg+xml;charset=utf-8,'));
  const decodedQ = decodeURIComponent(qUrl.replace('data:image/svg+xml;charset=utf-8,', ''));
  assert.match(decodedQ, /<svg /);
  assert.match(decodedQ, /Q1/);
  assert.match(decodedQ, /r²/);
  assert.match(decodedQ, /q &gt; 0/);

  const optUrl = renderOptionImageDataUrl({
    label: 'B',
    text: '9 x 10^9 N/C',
    state: 'selected',
  });
  assert.ok(optUrl.startsWith('data:image/svg+xml;charset=utf-8,'));
  const decodedOpt = decodeURIComponent(optUrl.replace('data:image/svg+xml;charset=utf-8,', ''));
  assert.match(decodedOpt, />B</);
  assert.match(decodedOpt, /10⁹/);
});

test('resolveQuestionImageSrc and resolveOptionImageSrc prioritize custom uploaded image URLs', () => {
  const customQ = resolveQuestionImageSrc({
    questionNumber: 2,
    subjectName: 'Chemistry',
    questionText: 'Sample text',
    questionImageUrl: 'https://cdn.example.com/q2.png',
  });
  assert.equal(customQ.isCustomImage, true);
  assert.equal(customQ.src, 'https://cdn.example.com/q2.png');

  const autoQ = resolveQuestionImageSrc({
    questionNumber: 3,
    subjectName: 'Maths',
    questionText: 'Integrate x^2 dx',
    questionImageUrl: '',
  });
  assert.equal(autoQ.isCustomImage, false);
  assert.ok(autoQ.src.startsWith('data:image/svg+xml;charset=utf-8,'));

  const customOpt = resolveOptionImageSrc(
    {
      optionImageUrls: ['https://cdn.example.com/optA.jpg', '', '', ''],
      optionTexts: ['A text', 'B text', 'C text', 'D text'],
    },
    0
  );
  assert.equal(customOpt.isCustomImage, true);
  assert.equal(customOpt.src, 'https://cdn.example.com/optA.jpg');

  const autoOpt = resolveOptionImageSrc(
    {
      optionImageUrls: ['https://cdn.example.com/optA.jpg', '', '', ''],
      optionTexts: ['A text', 'B text', 'C text', 'D text'],
    },
    1
  );
  assert.equal(autoOpt.isCustomImage, false);
  assert.equal(autoOpt.label, 'B');
  assert.ok(autoOpt.src.startsWith('data:image/svg+xml;charset=utf-8,'));
});
