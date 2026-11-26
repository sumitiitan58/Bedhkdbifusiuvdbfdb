import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  AI_PROVIDER_ENV_VARS,
  countConfiguredProviders,
  getSingleApiKey,
  onRequest,
  onRequestOptions,
  onRequestPost,
  runPrepsAiWithFallback,
} from '../../functions/api/preps-ai.js';

function createMockResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('Preps AI 6-provider individual key failover engine', () => {
  it('defines the exact 6 individual AI provider environment variables', () => {
    assert.deepEqual(
      [...AI_PROVIDER_ENV_VARS].sort(),
      [
        'CLOUDFLARE_WORKERS_AI_API_KEY',
        'DEEPSEEK_API_KEY',
        'GEMINI_API_KEY',
        'GROQ_API_KEY',
        'MISTRAL_API_KEY',
        'OPENROUTER_API_KEY',
      ]
    );
  });

  it('trims single API keys and ignores blank values', () => {
    assert.equal(getSingleApiKey('  test-key  '), 'test-key');
    assert.equal(getSingleApiKey('   '), '');
    assert.equal(getSingleApiKey(undefined), '');
  });

  it('fails over from Groq (429) and Gemini (network error) to DeepSeek seamlessly', async () => {
    const calledUrls: string[] = [];
    const fetchImpl = async (input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      calledUrls.push(url);
      if (url.includes('api.groq.com')) {
        return createMockResponse(429, { error: 'rate_limit' });
      }
      if (url.includes('generativelanguage.googleapis.com')) {
        throw new Error('Network timeout');
      }
      if (url.includes('api.deepseek.com')) {
        return createMockResponse(200, {
          choices: [{ message: { content: 'Use Gauss Law for symmetric charge distributions.' } }],
        });
      }
      return createMockResponse(500, { error: 'unexpected' });
    };

    const result = await runPrepsAiWithFallback({
      messages: [{ role: 'user', content: 'Explain Gauss Law briefly.' }],
      context: { track: 'Class 12 JEE' },
      env: {
        GROQ_API_KEY: 'dummy-groq',
        GEMINI_API_KEY: 'dummy-gemini',
        DEEPSEEK_API_KEY: 'dummy-deepseek',
        OPENROUTER_API_KEY: 'dummy-openrouter',
        MISTRAL_API_KEY: 'dummy-mistral',
      },
      fetchImpl: fetchImpl as typeof fetch,
    });

    assert.equal(result.ok, true);
    assert.equal(result.provider, 'deepseek');
    assert.match(result.reply ?? '', /Gauss Law/i);
    assert.equal(calledUrls.length, 3);
    assert.ok(calledUrls[0].includes('api.groq.com'));
    assert.ok(calledUrls[1].includes('generativelanguage.googleapis.com'));
    assert.ok(calledUrls[2].includes('api.deepseek.com'));
  });

  it('fails over through all first 5 providers to Cloudflare Workers AI REST endpoint', async () => {
    const calledUrls: string[] = [];
    const fetchImpl = async (input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      calledUrls.push(url);
      if (url.includes('api.cloudflare.com/client/v4/accounts/acct-123/ai/v1/chat/completions')) {
        return createMockResponse(200, {
          choices: [{ message: { content: 'Cloudflare Workers AI fallback reply.' } }],
        });
      }
      return createMockResponse(503, { error: 'unavailable' });
    };

    const result = await runPrepsAiWithFallback({
      messages: [{ role: 'user', content: 'Give me a 7-day JEE plan.' }],
      context: {},
      env: {
        GROQ_API_KEY: 'k1',
        GEMINI_API_KEY: 'k2',
        DEEPSEEK_API_KEY: 'k3',
        OPENROUTER_API_KEY: 'k4',
        MISTRAL_API_KEY: 'k5',
        CLOUDFLARE_WORKERS_AI_API_KEY: 'k6',
        CLOUDFLARE_ACCOUNT_ID: 'acct-123',
      },
      fetchImpl: fetchImpl as typeof fetch,
    });

    assert.equal(result.ok, true);
    assert.equal(result.provider, 'cloudflare-workers-ai');
    assert.equal(result.reply, 'Cloudflare Workers AI fallback reply.');
    assert.equal(calledUrls.length, 6);
  });

  it('supports native Cloudflare Pages env.AI binding when REST account ID is absent', async () => {
    const result = await runPrepsAiWithFallback({
      messages: [{ role: 'user', content: 'State Kirchoff loop rule.' }],
      context: {},
      env: {
        AI: {
          run: async () => ({ response: 'Sum of potential differences around any closed loop is zero.' }),
        },
      },
    });

    assert.equal(result.ok, true);
    assert.equal(result.provider, 'cloudflare-workers-ai');
    assert.match(result.reply ?? '', /closed loop/i);
  });

  it('returns a safe user-facing error when zero provider keys are configured', async () => {
    assert.equal(countConfiguredProviders({}), 0);
    const result = await runPrepsAiWithFallback({
      messages: [{ role: 'user', content: 'Hello' }],
      context: {},
      env: {},
    });
    assert.equal(result.ok, false);
    assert.match(result.error ?? '', /no AI provider keys are configured/i);
  });
});

describe('Cloudflare Pages _redirects & .env.example hygiene', () => {
  const rootDir = path.resolve(process.cwd());

  it('has valid Cloudflare Pages _redirects syntax with zero redirect loops or Netlify rules', () => {
    const redirectsContent = fs.readFileSync(path.join(rootDir, 'public', '_redirects'), 'utf-8');
    const rules = redirectsContent
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'));

    assert.ok(rules.length > 0, 'Expected canonical redirect rules');
    const validStatuses = new Set(['301', '302', '303', '307', '308']);
    const sources = new Set<string>();
    const destinations = new Set<string>();

    for (const rule of rules) {
      assert.ok(!rule.includes('200!'), `Invalid Netlify force status in rule: ${rule}`);
      assert.ok(!rule.includes('.netlify'), `Stale Netlify target in rule: ${rule}`);
      assert.ok(!rule.startsWith('/* '), `Unnecessary catch-all SPA loop rule: ${rule}`);

      const parts = rule.split(/\s+/);
      assert.equal(parts.length, 3, `Expected "<source> <dest> <status>" in rule: ${rule}`);
      const [src, dest, status] = parts;
      assert.notEqual(src, dest, `Self-redirect loop detected: ${rule}`);
      assert.ok(validStatuses.has(status), `Invalid Cloudflare redirect status "${status}" in: ${rule}`);
      sources.add(src);
      destinations.add(dest);
    }

    for (const dest of destinations) {
      assert.ok(!sources.has(dest), `Redirect chain/loop detected involving destination ${dest}`);
    }
  });

  it('lists all 6 individual API key env vars cleanly in .env.example without legacy *_API_KEYS', () => {
    const envExample = fs.readFileSync(path.join(rootDir, '.env.example'), 'utf-8');
    assert.ok(!envExample.includes('_API_KEYS'), 'Legacy *_API_KEYS variable found in .env.example');
    for (const varName of AI_PROVIDER_ENV_VARS) {
      assert.ok(
        new RegExp(`^${varName}=$`, 'm').test(envExample),
        `Missing individual placeholder "${varName}=" in .env.example`
      );
    }
  });

  it('implements Cloudflare Pages Functions handlers in functions/api/preps-ai.js using env (zero process.env or exports.handler)', async () => {
    const fnSource = fs.readFileSync(path.join(rootDir, 'functions', 'api', 'preps-ai.js'), 'utf-8');
    assert.ok(
      /export\s+async\s+function\s+onRequestPost\s*\(\s*\{\s*request\s*,\s*env\s*\}\s*\)/.test(fnSource),
      'Expected export async function onRequestPost({ request, env })'
    );
    assert.ok(!fnSource.includes('exports.handler'), 'Found legacy Netlify exports.handler');
    assert.ok(!fnSource.includes('process.env'), 'Found Node process.env inside Cloudflare Pages Function');

    // Verify OPTIONS CORS preflight
    const optRes = await onRequestOptions({
      request: new Request('https://prepskm.in/api/preps-ai', {
        method: 'OPTIONS',
        headers: { origin: 'https://prepskm.in' },
      }),
    });
    assert.equal(optRes.status, 204);
    assert.equal(optRes.headers.get('Access-Control-Allow-Origin'), 'https://prepskm.in');

    // Verify non-POST method rejection
    const getRes = await onRequest({
      request: new Request('https://prepskm.in/api/preps-ai', { method: 'GET' }),
    });
    assert.equal(getRes.status, 405);

    // Verify POST validation & env-driven response using Cloudflare Pages env.AI binding
    const badRes = await onRequestPost({
      request: new Request('https://prepskm.in/api/preps-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', origin: 'https://prepskm.in' },
        body: JSON.stringify({ messages: [] }),
      }),
      env: {},
    });
    assert.equal(badRes.status, 400);

    const okRes = await onRequestPost({
      request: new Request('https://prepskm.in/api/preps-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', origin: 'https://prepskm.in' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Explain Ohm law simply.' }],
          context: { track: 'Class 12 JEE' },
        }),
      }),
      env: {
        AI: {
          run: async () => ({ response: 'Simple funda: V = IR at constant temperature.' }),
        },
      },
    });
    assert.equal(okRes.status, 200);
    const data = (await okRes.json()) as { ok: boolean; reply: string; provider: string };
    assert.equal(data.ok, true);
    assert.equal(data.provider, 'cloudflare-workers-ai');
    assert.match(data.reply, /V = IR/);
  });
});
