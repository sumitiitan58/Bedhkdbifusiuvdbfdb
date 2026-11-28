import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractJsonObject,
  resetProviderCooldowns,
  runStructuredJsonWithFallback,
} from './aiGateway';

describe('aiGateway JSON recovery & cooldown circuit breaker', () => {
  beforeEach(() => {
    resetProviderCooldowns();
  });

  it('repairs missing commas between array elements and strips <think> blocks', () => {
    const malformed = `<think>thinking about {braces} inside reasoning</think>
\`\`\`json
{
  "topicTitle": "Kinematics",
  "steps": [
    { "stepNumber": 1, "boardLatex": "\\frac{v^2 - u^2}{2a}" }
    { "stepNumber": 2, "boardLatex": "v = u + at" }
  ],
  "quickDoubtSuggestions": [
    "Step 1 kaise aaya?"
    "Shortcut kya hai?",
  ]
}
\`\`\``;
    const parsed = extractJsonObject(malformed);
    assert.equal(parsed.topicTitle, 'Kinematics');
    assert.ok(Array.isArray(parsed.steps));
    assert.equal(parsed.steps.length, 2);
    assert.ok(Array.isArray(parsed.quickDoubtSuggestions));
    assert.equal(parsed.quickDoubtSuggestions.length, 2);
  });

  it('retries fallback model on Groq schema failure and cools down HTTP 402 billing errors', async () => {
    let groqCalls = 0;
    let deepseekCalls = 0;

    const fakeFetch: typeof fetch = async (input, init) => {
      const url = String(input);
      if (url.includes('deepseek.com')) {
        deepseekCalls += 1;
        return new Response(JSON.stringify({ error: { message: 'Insufficient Balance' } }), {
          status: 402,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.includes('groq.com')) {
        groqCalls += 1;
        const body = JSON.parse(String(init?.body ?? '{}')) as { model?: string };
        // First model returns invalid schema; fallback model succeeds!
        if (groqCalls === 1) {
          assert.equal(body.model, 'llama-3.3-70b-versatile');
          return new Response(
            JSON.stringify({ choices: [{ message: { content: '{"wrongKey": true}' } }] }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        return new Response(
          JSON.stringify({
            choices: [{ message: { content: '{"steps": [{"stepNumber": 1}, {"stepNumber": 2}]}' } }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('Not found', { status: 404 });
    };

    const res = await runStructuredJsonWithFallback({
      systemPrompt: 'Output JSON',
      userPrompt: 'Explain kinematics',
      env: { GROQ_API_KEY: 'gsk_test_123456' },
      fetchImpl: fakeFetch,
      validator: (p) => Array.isArray(p.steps) && p.steps.length >= 2,
    });

    assert.equal(res.ok, true);
    assert.equal(groqCalls, 2);

    // Now test 402 cooldown on DeepSeek: second call should skip DeepSeek completely!
    const fail1 = await runStructuredJsonWithFallback({
      systemPrompt: 'Output JSON',
      userPrompt: 'Test 1',
      env: { DEEPSEEK_API_KEY: 'sk-test-balance' },
      fetchImpl: fakeFetch,
    });
    assert.equal(fail1.ok, false);
    assert.equal(deepseekCalls, 1);

    const fail2 = await runStructuredJsonWithFallback({
      systemPrompt: 'Output JSON',
      userPrompt: 'Test 2',
      env: { DEEPSEEK_API_KEY: 'sk-test-balance' },
      fetchImpl: fakeFetch,
    });
    assert.equal(fail2.ok, false);
    assert.equal(deepseekCalls, 1); // Skipped via cooldown!
  });
});
