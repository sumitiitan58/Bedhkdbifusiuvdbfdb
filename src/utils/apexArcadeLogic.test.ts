import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialFormulaRunnerState,
  createWaveEnemies,
  FORMULA_RUNNER_BANK,
  getTurretStats,
  resolveFormulaGatePass,
  samplePathPoint,
} from './apexArcadeLogic';

describe('apexArcadeLogic', () => {
  it('boosts speed, nitro, and combo on correct Formula Runner gate and damages shields on miss', () => {
    assert.ok(FORMULA_RUNNER_BANK.length >= 10);
    let state = { ...createInitialFormulaRunnerState(), status: 'playing' as const };
    const hit = resolveFormulaGatePass(state, 1, 1);
    assert.equal(hit.hitCorrect, true);
    assert.ok(hit.nextState.speedKmh > state.speedKmh);
    assert.ok(hit.nextState.nitroTimer > 0);
    assert.equal(hit.nextState.combo, 1);

    let damaged = hit.nextState;
    for (let i = 0; i < 3; i++) {
      damaged = resolveFormulaGatePass(damaged, 0, 2).nextState;
    }
    assert.equal(damaged.shields, 0);
    assert.equal(damaged.status, 'gameover');
  });

  it('scales Concept Tower Defense turret upgrades and interpolates enemy path points', () => {
    const lv1 = getTurretStats({
      id: 't1',
      slotIndex: 0,
      type: 'optics-laser',
      level: 1,
      x: 100,
      y: 100,
      cooldownSec: 0,
      ammo: 12,
      maxAmmo: 12,
    });
    const lv2 = getTurretStats({
      id: 't1',
      slotIndex: 0,
      type: 'optics-laser',
      level: 2,
      x: 100,
      y: 100,
      cooldownSec: 0,
      ammo: 12,
      maxAmmo: 12,
    });
    assert.ok(lv2.damage > lv1.damage);
    assert.ok(lv2.fireIntervalSec < lv1.fireIntervalSec);

    const wave2 = createWaveEnemies(2);
    assert.ok(wave2.some((e) => e.archetype === 'trap-boss'));

    const mid = samplePathPoint(
      [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
      ],
      0.5
    );
    assert.equal(Math.round(mid.x), 100);
    assert.equal(Math.round(mid.y), 0);
  });
});
