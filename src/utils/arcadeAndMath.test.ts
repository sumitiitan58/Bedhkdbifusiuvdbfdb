import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseMathTextSegments } from '../components/math/KatexFormula.tsx';
import {
  getComboMultiplier,
  getCountdownTone,
} from '../components/arena-games/ArcadeStageShell.tsx';

describe('KaTeX Rich Math Segment Parser', () => {
  it('parses inline and display LaTeX expressions cleanly', () => {
    const input = 'Escape velocity is $v_e = \\sqrt{2GM/R}$ and energy is $$E = -\\frac{GMm}{2r}$$ done.';
    const segments = parseMathTextSegments(input);
    assert.equal(segments.length, 5);
    assert.deepEqual(segments[0], { type: 'text', content: 'Escape velocity is ' });
    assert.deepEqual(segments[1], { type: 'inline-math', content: 'v_e = \\sqrt{2GM/R}' });
    assert.deepEqual(segments[2], { type: 'text', content: ' and energy is ' });
    assert.deepEqual(segments[3], { type: 'block-math', content: 'E = -\\frac{GMm}{2r}' });
    assert.deepEqual(segments[4], { type: 'text', content: ' done.' });
  });

  it('handles plain prose with zero LaTeX delimiters', () => {
    const segments = parseMathTextSegments('Pure NCERT Biology note.');
    assert.deepEqual(segments, [{ type: 'text', content: 'Pure NCERT Biology note.' }]);
  });
});

describe('Arcade Stage Combo & Countdown Helpers', () => {
  it('maps streak counts to 1x, 2x, 3x, 5x combo multipliers', () => {
    assert.equal(getComboMultiplier(0), 1);
    assert.equal(getComboMultiplier(1), 1);
    assert.equal(getComboMultiplier(2), 2);
    assert.equal(getComboMultiplier(3), 3);
    assert.equal(getComboMultiplier(4), 3);
    assert.equal(getComboMultiplier(5), 5);
    assert.equal(getComboMultiplier(9), 5);
  });

  it('transitions neon countdown bar color thresholds cleanly', () => {
    assert.equal(getCountdownTone(60), 'safe');
    assert.equal(getCountdownTone(21), 'safe');
    assert.equal(getCountdownTone(20), 'warn');
    assert.equal(getCountdownTone(11), 'warn');
    assert.equal(getCountdownTone(10), 'danger');
    assert.equal(getCountdownTone(0), 'danger');
  });
});
