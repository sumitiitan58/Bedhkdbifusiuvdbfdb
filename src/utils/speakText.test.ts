import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_GEMINI_VOICE,
  GEMINI_VOICES,
  resolveGeminiVoice,
  selectBestIndianVoice,
  type BrowserVoiceLike,
} from './speakText';

test('GEMINI_VOICES exposes all 5 official Gemini prebuilt voices', () => {
  const ids = GEMINI_VOICES.map((v) => v.id);
  assert.deepEqual(ids, ['Puck', 'Kore', 'Charon', 'Fenrir', 'Zephyr']);
  assert.equal(DEFAULT_GEMINI_VOICE, 'Puck');
});

test('resolveGeminiVoice validates voice names case-insensitively and defaults safely to Puck', () => {
  assert.equal(resolveGeminiVoice('kore'), 'Kore');
  assert.equal(resolveGeminiVoice('  Fenrir  '), 'Fenrir');
  assert.equal(resolveGeminiVoice('Zephyr'), 'Zephyr');
  assert.equal(resolveGeminiVoice('unknown-voice'), 'Puck');
  assert.equal(resolveGeminiVoice(null), 'Puck');
});

test('selectBestIndianVoice prioritizes Neural/Google en-IN male voice over generic US voices', () => {
  const voices: BrowserVoiceLike[] = [
    { name: 'eSpeak en', lang: 'en-US' },
    { name: 'Google US English', lang: 'en-US' },
    { name: 'Microsoft Prabhat Online (Natural) - English (India)', lang: 'en-IN' },
    { name: 'Microsoft Neerja - English (India)', lang: 'en-IN' },
  ];

  const chosen = selectBestIndianVoice(voices, 'hinglish');
  assert.equal(chosen?.name, 'Microsoft Prabhat Online (Natural) - English (India)');
});

test('selectBestIndianVoice picks Google en-IN or hi-IN when Microsoft Neural voices are absent', () => {
  const voices: BrowserVoiceLike[] = [
    { name: 'Samantha', lang: 'en-US' },
    { name: 'Google हिन्दी', lang: 'hi-IN' },
    { name: 'Google English (India)', lang: 'en-IN' },
  ];

  const chosen = selectBestIndianVoice(voices, 'hinglish');
  assert.equal(chosen?.name, 'Google English (India)');
});

test('selectBestIndianVoice returns null on empty voice list', () => {
  assert.equal(selectBestIndianVoice([], 'hinglish'), null);
});
