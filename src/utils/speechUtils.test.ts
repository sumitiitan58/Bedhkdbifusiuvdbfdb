import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanTextForSpeech,
  detectPrepsWakePhrase,
  selectPreferredIndianVoice,
} from './speechUtils';

test('cleanTextForSpeech strips markdown, URLs, emojis, and converts math symbols into spoken words', () => {
  const raw = [
    '### **Electrostatics Tip** 🔥',
    '> Formula: `E = k*q/r^2` and volume V = r^3',
    '- Δx -> 50% gain! Visit https://prepskm.in/materials for notes.',
  ].join('\n');

  const cleaned = cleanTextForSpeech(raw);

  assert.equal(cleaned.includes('#'), false);
  assert.equal(cleaned.includes('*'), false);
  assert.equal(cleaned.includes('`'), false);
  assert.equal(cleaned.includes('>'), false);
  assert.equal(cleaned.includes('https://'), false);
  assert.equal(cleaned.includes('🔥'), false);

  assert.match(cleaned, /by r squared/i);
  assert.match(cleaned, /r cubed/i);
  assert.match(cleaned, /delta x gives 50 percent/i);
});

test('cleanTextForSpeech converts standalone slash and arrows naturally', () => {
  const cleaned = cleanTextForSpeech('Speed = distance/time (m/s) -> 100% clear');
  assert.match(cleaned, /distance by time/i);
  assert.match(cleaned, /m by s/i);
  assert.match(cleaned, /gives 100 percent/i);
});

test('detectPrepsWakePhrase matches Preps AI and phonetic variants and extracts spoken question', () => {
  const r1 = detectPrepsWakePhrase('Preps AI explain Gauss Law in simple Hinglish');
  assert.equal(r1.detected, true);
  assert.equal(r1.commandAfterWake, 'explain Gauss Law in simple Hinglish');

  const r2 = detectPrepsWakePhrase('hey prep ai, rotational motion ke formula batao');
  assert.equal(r2.detected, true);
  assert.equal(r2.commandAfterWake, 'rotational motion ke formula batao');

  const r3 = detectPrepsWakePhrase('preps');
  assert.equal(r3.detected, true);
  assert.equal(r3.commandAfterWake, '');

  const r4 = detectPrepsWakePhrase('solve this physics numerical');
  assert.equal(r4.detected, false);
});

test('selectPreferredIndianVoice prioritizes en-IN then hi-IN over generic voices', () => {
  const voices = [
    { lang: 'en-US', name: 'Samantha' },
    { lang: 'hi-IN', name: 'Google हिन्दी' },
    { lang: 'en-IN', name: 'Google Indian English' },
  ];
  assert.equal(selectPreferredIndianVoice(voices), 2);

  const hindiFallback = [
    { lang: 'en-US', name: 'Alex' },
    { lang: 'hi-IN', name: 'Microsoft Swara' },
  ];
  assert.equal(selectPreferredIndianVoice(hindiFallback), 1);

  assert.equal(selectPreferredIndianVoice([]), -1);
});
