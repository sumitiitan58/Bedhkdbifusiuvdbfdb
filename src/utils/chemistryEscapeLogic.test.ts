import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyCyberLabPenalty,
  checkNumericalAnswer,
  checkStoichiometryBalance,
  computeEscapeRank,
  createCyberLabRun,
  createKhandaharRun,
  verifyKhandaharPasscode,
} from './chemistryEscapeLogic';

describe('chemistryEscapeLogic', () => {
  it('initializes Cyber-Lab Sector 7 with 10:00 timer, 100% O2, and 3 hints', () => {
    const run = createCyberLabRun('JEE Main', 42);
    assert.equal(run.timeRemainingSec, 600);
    assert.equal(run.oxygenPercent, 100);
    assert.equal(run.hintsRemaining, 3);
    assert.equal(run.status, 'playing');
  });

  it('applies exact -20s timer and -10% oxygen penalty on wrong answers and triggers failure at 0', () => {
    let run = createCyberLabRun('JEE Main', 42);
    run = applyCyberLabPenalty(run);
    assert.equal(run.timeRemainingSec, 580);
    assert.equal(run.oxygenPercent, 90);
    assert.equal(run.status, 'playing');

    for (let i = 0; i < 9; i++) {
      run = applyCyberLabPenalty(run);
    }
    assert.equal(run.oxygenPercent, 0);
    assert.equal(run.status, 'failed');
  });

  it('validates stoichiometric balancing and numerical tolerance accurately', () => {
    assert.equal(checkStoichiometryBalance([1, 3, 2], [1, 3, 2]), true);
    assert.equal(checkStoichiometryBalance([1, 2, 2], [1, 3, 2]), false);
    assert.equal(checkNumericalAnswer('1.04', 1.04, 0.03), true);
    assert.equal(checkNumericalAnswer('1.06', 1.04, 0.03), true);
    assert.equal(checkNumericalAnswer('1.20', 1.04, 0.03), false);
    assert.equal(checkNumericalAnswer('not-a-number', 3, 0.1), false);
  });

  it('computes Rank S/A/B and lists concepts mastered', () => {
    const run = createCyberLabRun('JEE Advanced', 11);
    run.attempts = 5;
    run.correctCount = 5;
    run.timeRemainingSec = 420;
    run.oxygenPercent = 100;
    const report = computeEscapeRank(run);
    assert.equal(report.rank, 'S');
    assert.equal(report.accuracyPercent, 100);
    assert.equal(report.conceptsMastered.length, 5);
  });

  it('runs Khandahar nested doors, disarms on exact 4-digit code, and detonates on wrong code', () => {
    const run1 = createKhandaharRun(1, 101);
    const run2 = createKhandaharRun(3, 202);
    assert.equal(run1.clues.length, 4);
    assert.equal(run2.level, 3);

    const exact = run1.passcode.join('');
    const successRes = verifyKhandaharPasscode(run1, exact);
    assert.equal(successRes.success, true);
    assert.equal(successRes.nextState.status, 'escaped');

    const wrongCode = exact === '0000' ? '9999' : '0000';
    const boomRes = verifyKhandaharPasscode(run1, wrongCode);
    assert.equal(boomRes.success, false);
    assert.equal(boomRes.nextState.status, 'detonated');
    assert.ok(boomRes.voiceLine.toLowerCase().includes('boom'));
  });
});
