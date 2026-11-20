import test from 'node:test';
import assert from 'node:assert/strict';
import { getNextTheme, parseStoredTheme, resolveInitialTheme } from './theme';

test('parseStoredTheme accepts only light or dark', () => {
  assert.equal(parseStoredTheme('light'), 'light');
  assert.equal(parseStoredTheme('dark'), 'dark');
  assert.equal(parseStoredTheme('system'), null);
  assert.equal(parseStoredTheme(null), null);
});

test('resolveInitialTheme prioritizes stored value over system preference', () => {
  assert.equal(resolveInitialTheme('dark', false), 'dark');
  assert.equal(resolveInitialTheme('light', true), 'light');
  assert.equal(resolveInitialTheme(null, true), 'dark');
  assert.equal(resolveInitialTheme(undefined, false), 'light');
});

test('getNextTheme toggles cleanly between light and dark', () => {
  assert.equal(getNextTheme('light'), 'dark');
  assert.equal(getNextTheme('dark'), 'light');
});
