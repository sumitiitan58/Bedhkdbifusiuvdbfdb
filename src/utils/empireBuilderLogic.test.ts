import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyPaldaAnswer,
  computeQuizRewardCoins,
  createInitialEmpireState,
  generateMatchedRivals,
  getActionCoinCost,
  getMatchmakingBracket,
  resolvePaldaOutcome,
  ROBOT_AVATARS,
  startPaldaBattle,
} from './empireBuilderLogic';

describe('empireBuilderLogic', () => {
  it('starts every player at 10 sq. ft. with 5 selectable avatars and Data Bot build discount', () => {
    assert.equal(ROBOT_AVATARS.length, 5);
    const empire = createInitialEmpireState('prepsbot-prime', 'PrepsKM');
    assert.equal(empire.areaSqFt, 10);
    assert.equal(empire.playerNameTag, 'PrepsKM');

    const baseHouseCost = getActionCoinCost('build-house', 'prepsbot-prime');
    const discountedCost = getActionCoinCost('build-house', 'data-bot');
    assert.ok(discountedCost < baseHouseCost);

    const primeCoins = computeQuizRewardCoins('Moderate', 3, 'prepsbot-prime');
    const buddyCoins = computeQuizRewardCoins('Moderate', 3, 'cyber-buddy');
    assert.ok(primeCoins > buddyCoins);
  });

  it('enforces tiered fair matchmaking brackets strictly per blueprint', () => {
    const starter = getMatchmakingBracket(10);
    assert.equal(starter.minArea, 15);
    assert.equal(starter.maxArea, 100);

    const mid = getMatchmakingBracket(450);
    assert.equal(mid.minArea, 120);
    assert.equal(mid.maxArea, 950);

    const titan = getMatchmakingBracket(1200);
    assert.equal(titan.minArea, 1400);
    assert.equal(titan.maxArea, 3000);

    const rivals = generateMatchedRivals(10);
    assert.equal(rivals.length, 3);
    for (const r of rivals) {
      assert.ok(r.areaSqFt >= 15 && r.areaSqFt <= 100);
    }
  });

  it('resolves Palda tug-of-war victory, Annex (Hadap Lo), Ally (Dosti), and Defeat reset to 10 sq. ft.', () => {
    const empire = { ...createInitialEmpireState('bookbot-scholar', 'PrepsKM'), areaSqFt: 250 };
    const rival = generateMatchedRivals(250)[0];
    let battle = startPaldaBattle(rival);
    assert.equal(battle.balance, 0);

    battle = applyPaldaAnswer(battle, true, 3);
    battle = applyPaldaAnswer(battle, true, 3);
    battle = applyPaldaAnswer(battle, true, 3);
    assert.equal(battle.status, 'player-won');

    const annexed = resolvePaldaOutcome(empire, rival, 'annex');
    assert.equal(annexed.areaSqFt, 250 + rival.areaSqFt);

    const allied = resolvePaldaOutcome(empire, rival, 'ally');
    assert.equal(allied.alliedEmpires.length, 1);
    assert.equal(allied.alliedEmpires[0].id, rival.id);

    const defeated = resolvePaldaOutcome(annexed, rival, 'defeat');
    assert.equal(defeated.areaSqFt, 10);
  });
});
