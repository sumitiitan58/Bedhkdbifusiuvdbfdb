import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  FORMULA_CLASH_DECK,
  KBT_LADDER_XP,
  SYLLABUS_DOMINION_HEXES,
  applyFiftyFifty,
  buildConceptLinkDeck,
  canPlayConceptCard,
  generatePeerPoll,
  getDominatedRegions,
  getKbtSafeHavenXp,
  getKbtTimeLimitSeconds,
  isHexAttackable,
  nextTurnEnergy,
  resolveFormulaClashCard,
  resolveSkirmishOutcome,
} from './apexArenaGamesEngine';

describe('apexArenaGamesEngine — 4 Brand-New Arena Games', () => {
  it('Formula Clash: awards 1.5x Critical Hit <= 5s, 100% normal, and 20% chip fizzle on wrong', () => {
    const attackCard = FORMULA_CLASH_DECK.find((c) => c.kind === 'attack')!;
    const crit = resolveFormulaClashCard(attackCard, true, 3.2);
    assert.equal(crit.isCritical, true);
    assert.equal(crit.effectivePower, Math.round(attackCard.power * 1.5));

    const normal = resolveFormulaClashCard(attackCard, true, 8.5);
    assert.equal(normal.isCritical, false);
    assert.equal(normal.effectivePower, attackCard.power);

    const wrong = resolveFormulaClashCard(attackCard, false, 4.0);
    assert.equal(wrong.fizzled, true);
    assert.equal(wrong.effectivePower, Math.round(attackCard.power * 0.2));

    assert.equal(nextTurnEnergy(3), 4);
    assert.equal(nextTurnEnergy(10), 10);
  });

  it('Concept Link: builds deck and classifies Wild, Subject, Chapter, and Link Challenge plays', () => {
    const deck = buildConceptLinkDeck();
    assert.ok(deck.length >= 24);
    const center = deck.find((c) => c.subject === 'Physics' && c.cardType === 'normal')!;
    const wild = deck.find((c) => c.cardType === 'wild')!;
    const sameSub = deck.find((c) => c.subject === 'Physics' && c.id !== center.id && c.cardType === 'normal')!;
    const diffSub = deck.find((c) => c.subject === 'Biology' && c.cardType === 'normal')!;

    assert.equal(canPlayConceptCard(wild, center, 'Physics').matchType, 'wild');
    assert.equal(canPlayConceptCard(sameSub, center, 'Physics').matchType, 'subject');
    assert.equal(canPlayConceptCard(diffSub, center, 'Physics').matchType, 'link-challenge');
  });

  it('Kaun Banega Topper: enforces 15-step ladder, timers (30s/45s/untimed), safe havens, and lifelines', () => {
    assert.equal(KBT_LADDER_XP.length, 15);
    assert.equal(KBT_LADDER_XP[4], 1000);
    assert.equal(KBT_LADDER_XP[9], 10000);
    assert.equal(KBT_LADDER_XP[14], 50000);

    assert.equal(getKbtTimeLimitSeconds(0), 30);
    assert.equal(getKbtTimeLimitSeconds(6), 45);
    assert.equal(getKbtTimeLimitSeconds(12), null);

    assert.equal(getKbtSafeHavenXp(4), 0);
    assert.equal(getKbtSafeHavenXp(5), 1000);
    assert.equal(getKbtSafeHavenXp(10), 10000);

    const removed = applyFiftyFifty(2);
    assert.equal(removed.length, 2);
    assert.ok(!removed.includes(2));

    const poll = generatePeerPoll(1, 1);
    assert.equal(poll.reduce((s, n) => s + n, 0), 100);
    assert.ok(poll[1] >= 50);
  });

  it('Syllabus Dominion: validates hex adjacency, 3-Q skirmish outcomes, and region domination bonuses', () => {
    const owned = ['mech-1'];
    assert.equal(isHexAttackable('mech-2', owned), true);
    assert.equal(isHexAttackable('bio-1', owned), false);
    assert.equal(isHexAttackable('mech-1', owned), false);

    assert.equal(resolveSkirmishOutcome(3), 'captured');
    assert.equal(resolveSkirmishOutcome(2), 'damaged');
    assert.equal(resolveSkirmishOutcome(1), 'repelled');

    const fullMechanics = SYLLABUS_DOMINION_HEXES.filter((h) => h.regionId === 'mechanics-valley').map((h) => h.id);
    assert.deepEqual(getDominatedRegions(fullMechanics), ['mechanics-valley']);
  });
});
