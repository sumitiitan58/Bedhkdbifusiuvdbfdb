import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  appendMessageToThread,
  createEmptyChatThread,
  generateThreadTitleFromQuery,
  normalizeFormulaSymbols,
  sanitizeEducationalSvg,
  shouldGenerateDiagram,
  sortThreadsByRecent,
} from './chatHistoryLogic';

describe('chatHistoryLogic', () => {
  it('auto-generates concise thread title from the first user query', () => {
    const title = generateThreadTitleFromQuery(
      '  explain rotational inertia of a hollow sphere about its tangent for JEE Advanced  '
    );
    assert.ok(title.length <= 48);
    assert.ok(title.startsWith('Explain rotational inertia'));
  });

  it('updates New Chat title only on the first user message and preserves on subsequent messages', () => {
    let thread = createEmptyChatThread('mentor', '2026-11-28T01:00:00.000Z');
    assert.equal(thread.title, 'New Chat');
    thread = appendMessageToThread(thread, {
      id: 'm1',
      role: 'user',
      text: 'Draw free body diagram of block on wedge',
      createdAtIso: '2026-11-28T01:01:00.000Z',
    });
    assert.equal(thread.title, 'Draw free body diagram of block on');

    thread = appendMessageToThread(thread, {
      id: 'm2',
      role: 'user',
      text: 'Now explain friction force',
      createdAtIso: '2026-11-28T01:02:00.000Z',
    });
    assert.equal(thread.title, 'Draw free body diagram of block on');
    assert.equal(thread.messages.length, 2);
  });

  it('sorts chat threads by most recently updated first', () => {
    const t1 = createEmptyChatThread('mentor', '2026-11-28T01:00:00.000Z');
    const t2 = createEmptyChatThread('mentor', '2026-11-28T03:00:00.000Z');
    const sorted = sortThreadsByRecent([t1, t2]);
    assert.equal(sorted[0].id, t2.id);
  });

  it('detects visual diagram prompts and sanitizes SVG against script/event injection', () => {
    assert.equal(shouldGenerateDiagram('Draw a free-body diagram for pulley', false), true);
    assert.equal(shouldGenerateDiagram('What is pH of water?', false), false);
    assert.equal(shouldGenerateDiagram('What is pH of water?', true), true);

    const dirty =
      '<svg viewBox="0 0 100 100" onload="alert(1)"><script>evil()</script><circle cx="50" cy="50" r="20" onclick="steal()" /></svg>';
    const clean = sanitizeEducationalSvg(dirty);
    assert.ok(clean.startsWith('<svg'));
    assert.ok(!clean.includes('<script'));
    assert.ok(!clean.includes('onload'));
    assert.ok(!clean.includes('onclick'));
  });

  it('normalizes chemistry and physics symbols for PDF extraction', () => {
    const out = normalizeFormulaSymbols(
      'In CrO5 and H2SO4, flux = q / epsilon_0 and Delta G^0 <= 0 with 10^8 m/s'
    );
    assert.ok(out.includes('CrO₅'));
    assert.ok(out.includes('H₂SO₄'));
    assert.ok(out.includes('ε₀'));
    assert.ok(out.includes('ΔG°'));
    assert.ok(out.includes('≤'));
    assert.ok(out.includes('10⁸'));
  });
});
