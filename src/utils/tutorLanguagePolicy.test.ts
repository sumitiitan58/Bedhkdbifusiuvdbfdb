import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  detectTutorResponseLanguage,
  findPrecedingUserQuestion,
} from './tutorLanguagePolicy';

describe('tutorLanguagePolicy', () => {
  it('defaults strictly to Hinglish for greetings, short prompts, Hindi, and Hinglish', () => {
    assert.equal(detectTutorResponseLanguage('Hi'), 'hinglish');
    assert.equal(detectTutorResponseLanguage('ABCD'), 'hinglish');
    assert.equal(detectTutorResponseLanguage('Newton second law kya hota hai?'), 'hinglish');
    assert.equal(detectTutorResponseLanguage('Photoelectric effect samjhao bhai'), 'hinglish');
    assert.equal(detectTutorResponseLanguage('गुरुत्वाकर्षण का नियम बताओ'), 'hinglish');
  });

  it('switches to English ONLY when explicitly asked in English and resumes Hinglish on follow-up', () => {
    assert.equal(
      detectTutorResponseLanguage('What is Newton second law of motion?'),
      'english'
    );
    assert.equal(
      detectTutorResponseLanguage('Explain the photoelectric effect in simple terms'),
      'english'
    );
    assert.equal(
      detectTutorResponseLanguage('Explain Gauss law in English'),
      'english'
    );
    // Immediate Hinglish follow-up resumes Hinglish
    assert.equal(
      detectTutorResponseLanguage('Ab iska shortcut batao'),
      'hinglish'
    );
    assert.equal(
      detectTutorResponseLanguage('Explain Gauss law in Hinglish'),
      'hinglish'
    );
  });

  it('binds Open Step-by-Step Whiteboard to the exact message turn, never reverting to Hi', () => {
    const thread = [
      { role: 'user', text: 'Hi' },
      { role: 'assistant', text: 'Hey dost! Kaise help karun?' },
      { role: 'user', text: 'ABCD' },
      { role: 'assistant', text: 'ABCD ke baare mein baat karte hain!' },
      { role: 'user', text: 'Explain Gauss Law for a charged sphere' },
      { role: 'assistant', text: 'Gauss law states flux equals q enclosed over epsilon naught.' },
    ];

    assert.equal(findPrecedingUserQuestion(thread, 1), 'Hi');
    assert.equal(findPrecedingUserQuestion(thread, 3), 'ABCD');
    assert.equal(
      findPrecedingUserQuestion(thread, 5),
      'Explain Gauss Law for a charged sphere'
    );
  });
});
