import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canTurnNext,
  canTurnPrev,
  formatBookPageLabel,
  getNextBookPage,
  getPrevBookPage,
  getVisibleBookPages,
  normalizeBookPage,
} from './bookReader';

test('single-page mode advances and clamps page by page', () => {
  assert.deepEqual(getVisibleBookPages(1, 5, false), [1]);
  assert.equal(canTurnPrev(1, 5, false), false);
  assert.equal(canTurnNext(1, 5, false), true);

  assert.equal(getNextBookPage(1, 5, false), 2);
  assert.equal(getNextBookPage(5, 5, false), 5);
  assert.equal(canTurnNext(5, 5, false), false);
  assert.equal(getPrevBookPage(5, 5, false), 4);
  assert.equal(getPrevBookPage(1, 5, false), 1);
});

test('two-page spread mode pairs pages (1-2, 3-4, 5) cleanly', () => {
  assert.equal(normalizeBookPage(2, 5, true), 1);
  assert.deepEqual(getVisibleBookPages(1, 5, true), [1, 2]);
  assert.deepEqual(getVisibleBookPages(2, 5, true), [1, 2]);
  assert.equal(canTurnPrev(1, 5, true), false);
  assert.equal(canTurnNext(1, 5, true), true);

  const secondSpread = getNextBookPage(1, 5, true);
  assert.equal(secondSpread, 3);
  assert.deepEqual(getVisibleBookPages(secondSpread, 5, true), [3, 4]);

  const lastSpread = getNextBookPage(secondSpread, 5, true);
  assert.equal(lastSpread, 5);
  assert.deepEqual(getVisibleBookPages(lastSpread, 5, true), [5]);
  assert.equal(canTurnNext(lastSpread, 5, true), false);
  assert.equal(getNextBookPage(lastSpread, 5, true), 5);

  assert.equal(getPrevBookPage(lastSpread, 5, true), 3);
  assert.equal(getPrevBookPage(3, 5, true), 1);
});

test('formatBookPageLabel formats single and spread ranges accurately', () => {
  assert.equal(formatBookPageLabel([1, 2], 12), 'Pages 1–2 of 12');
  assert.equal(formatBookPageLabel([5], 5), 'Page 5 of 5');
  assert.equal(formatBookPageLabel([], 0), 'Loading…');
});
