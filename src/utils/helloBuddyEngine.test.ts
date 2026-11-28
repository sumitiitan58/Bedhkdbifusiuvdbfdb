import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  BUDDY_FIRST_WAKE_GREETING,
  extractHelloBuddyWake,
  parseBuddyIntent,
} from './helloBuddyEngine';

describe('helloBuddyEngine', () => {
  it('detects Hey buddy, AI buddy, Preps buddy, Preps, and Hello buddy wake keywords (REQ-04)', () => {
    for (const phrase of [
      'hello buddy, mera naam Aarav kar do',
      'Hey buddy, Apex Arena kholo',
      'AI buddy, Thermodynamics explain karo',
      'Preps buddy, NEET track pe switch karo',
      'Preps, 25 minute ka focus timer start karo',
      'प्रेप्स बडी, बताओ क्या कर सकते हो',
    ]) {
      const res = extractHelloBuddyWake(phrase);
      assert.equal(res.woke, true, `Expected wake match for: ${phrase}`);
      assert.ok(res.command.length > 0);
    }

    const bareWake = extractHelloBuddyWake('Preps');
    assert.equal(bareWake.woke, true);

    const miss = extractHelloBuddyWake('just studying kinematics formulas');
    assert.equal(miss.woke, false);
  });

  it('recognizes natural-language Dismiss / Hide commands in Hindi, Hinglish, and English (REQ-05)', () => {
    for (const phrase of [
      'Hey buddy, दूर हो जाओ मेरी नज़रों से',
      'Hey buddy, ग़ायब हो जाओ',
      'Hey buddy, गायब हो जाओ',
      'निकल जाओ यहां से जल्दी से जल्दी',
      'Hey buddy, door ho jao meri nazron se',
      'Preps buddy gayab ho jao',
      'nikal jao yahan se jaldi se jaldi',
      'AI buddy please go away and hide yourself',
    ]) {
      const wake = extractHelloBuddyWake(phrase);
      assert.equal(wake.woke, true, `Expected dismiss wake for: ${phrase}`);
      assert.equal(wake.triggerKind, 'dismiss', `Expected dismiss kind for: ${phrase}`);
      const intent = parseBuddyIntent(phrase);
      assert.equal(intent.type, 'dismiss', `Expected dismiss action for: ${phrase}`);
    }
  });

  it('recognizes natural-language Recall / Reappear commands in Hindi, Hinglish, and English (REQ-05)', () => {
    for (const phrase of [
      'Hey buddy, प्लीज़ आ जाओ',
      'Hey buddy, please aa jao',
      'AI buddy wapas aa jao',
      'Preps buddy वापस आ जाओ',
      'Hey buddy come back',
      'Preps show yourself',
    ]) {
      const wake = extractHelloBuddyWake(phrase);
      assert.equal(wake.woke, true, `Expected recall wake for: ${phrase}`);
      assert.equal(wake.triggerKind, 'recall', `Expected recall kind for: ${phrase}`);
      const intent = parseBuddyIntent(phrase);
      assert.equal(intent.type, 'recall', `Expected recall action for: ${phrase}`);
    }
  });

  it('parses profile name update command in Hinglish and English', () => {
    const h = parseBuddyIntent('Hello Buddy, mera naam Aarav kar do');
    assert.equal(h.type, 'update_name');
    if (h.type === 'update_name') {
      assert.equal(h.newName, 'Aarav');
    }

    const e = parseBuddyIntent('change my name to Riya Sharma');
    assert.equal(e.type, 'update_name');
    if (e.type === 'update_name') {
      assert.equal(e.newName, 'Riya Sharma');
    }
  });

  it('parses track switching commands for NEET, JEE, and Boards', () => {
    const neet = parseBuddyIntent('Hello Buddy, NEET track pe switch karo');
    assert.equal(neet.type, 'switch_track');
    if (neet.type === 'switch_track') assert.equal(neet.track, 'neet');

    const jee = parseBuddyIntent('Switch track to JEE');
    assert.equal(jee.type, 'switch_track');
    if (jee.type === 'switch_track') assert.equal(jee.track, 'jee');
  });

  it('parses site navigation commands accurately', () => {
    const arena = parseBuddyIntent('Hello Buddy, Apex Arena kholo');
    assert.equal(arena.type, 'navigate');
    if (arena.type === 'navigate') assert.equal(arena.path, '/arena');

    const pred = parseBuddyIntent('Percentile Predictor dikhao');
    assert.equal(pred.type, 'navigate');
    if (pred.type === 'navigate') assert.equal(pred.path, '/workspace?tab=predictor');
  });

  it('parses focus timer duration and actions', () => {
    const start = parseBuddyIntent('Hello Buddy, 25 minute ka focus timer start karo');
    assert.equal(start.type, 'focus_timer');
    if (start.type === 'focus_timer') {
      assert.equal(start.action, 'start');
      assert.equal(start.minutes, 25);
    }

    const pause = parseBuddyIntent('pause focus timer');
    assert.equal(pause.type, 'focus_timer');
    if (pause.type === 'focus_timer') assert.equal(pause.action, 'pause');
  });

  it('launches Live Teacher for explain commands and answers onboarding / page help', () => {
    const tutor = parseBuddyIntent('Hello Buddy, Kinematics explain karo');
    assert.equal(tutor.type, 'open_tutor');
    if (tutor.type === 'open_tutor') assert.equal(tutor.topic, 'Kinematics');

    const help = parseBuddyIntent('ye Mastery Tracker kaise kaam karta hai?', '/workspace');
    assert.equal(help.type, 'page_help');

    const onboard = parseBuddyIntent('What can you do?');
    assert.equal(onboard.type, 'onboarding');
    if (onboard.type === 'onboarding') {
      assert.equal(onboard.spokenReply, BUDDY_FIRST_WAKE_GREETING);
    }
  });
});
