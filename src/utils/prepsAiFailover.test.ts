import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  AI_PROVIDER_ENV_VARS,
  AI_PROVIDER_REGISTRY,
  countConfiguredProviders,
  getServerSecret,
  getSingleApiKey,
  resolveCorsHeaders,
  runPrepsAiWithFallback,
  sanitizeClientContext,
  sanitizeErrorMessage,
} from '../../api/_lib/aiGateway';
import { GET as healthGet } from '../../api/health';
import { OPTIONS as prepsOptions, POST as prepsPost } from '../../api/preps-ai';
import { POST as chatPost } from '../../api/chat';

function createMockResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('Vercel Server-Only AI Gateway & Multi-Provider Failover', () => {
  it('defines strictly server-side AI provider env vars with zero VITE_ prefixes or Cloudflare keys', () => {
    assert.deepEqual(
      [...AI_PROVIDER_ENV_VARS].sort(),
      [
        'DEEPSEEK_API_KEY',
        'GEMINI_API_KEY',
        'GROQ_API_KEY',
        'MISTRAL_API_KEY',
        'OPENROUTER_API_KEY',
      ]
    );
    assert.equal(AI_PROVIDER_REGISTRY.length, 5);
    for (const key of AI_PROVIDER_ENV_VARS) {
      assert.ok(!key.startsWith('VITE_'), `Provider secret must never start with VITE_: ${key}`);
    }
  });

  it('prevents API key backflow by ignoring VITE_* env vars and stripping client-supplied key fields', () => {
    assert.equal(getSingleApiKey('  secret-val  '), 'secret-val');
    assert.equal(getServerSecret({ VITE_GEMINI_API_KEY: 'exposed' }, 'VITE_GEMINI_API_KEY'), '');
    assert.equal(getServerSecret({ VITE_GEMINI_API_KEY: 'exposed' }, 'GEMINI_API_KEY'), '');
    assert.equal(getServerSecret({ GEMINI_API_KEY: 'server-only-key' }, 'GEMINI_API_KEY'), 'server-only-key');

    const cleaned = sanitizeClientContext({
      cohortLabel: 'Class 12 JEE',
      apiKey: 'sk-should-be-stripped',
      GEMINI_API_KEY: 'AIzaShouldNotPass',
      token: 'secret-token',
    });
    assert.equal(cleaned.cohortLabel, 'Class 12 JEE');
    assert.equal('apiKey' in cleaned, false);
    assert.equal('GEMINI_API_KEY' in cleaned, false);
    assert.equal('token' in cleaned, false);

    const scrubbed = sanitizeErrorMessage(new Error('Upstream failed with sk-abcdef12345678901234'));
    assert.ok(!scrubbed.includes('sk-abcdef12345678901234'));
    assert.ok(scrubbed.includes('[REDACTED]'));
  });

  it('fails over seamlessly from Groq (429) and Gemini (network error) to DeepSeek', async () => {
    const calledUrls: string[] = [];
    const fetchImpl = async (input: string | URL | Request) => {
      const url =
        typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
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
    if (result.ok) {
      assert.equal(result.provider, 'deepseek');
      assert.match(result.reply, /Gauss Law/i);
    }
    assert.equal(calledUrls.length, 3);
  });

  it('returns a safe user-facing message when zero server keys are configured', async () => {
    assert.equal(countConfiguredProviders({}), 0);
    const result = await runPrepsAiWithFallback({
      messages: [{ role: 'user', content: 'Hello' }],
      context: {},
      env: {},
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /Vercel Environment Variables/i);
    }
  });
});

describe('Vercel-Exclusive Deployment & Zero Legacy Platform Footprint', () => {
  const rootDir = path.resolve(process.cwd());

  it('has eliminated all residual Netlify and Cloudflare config files and functions', () => {
    const forbiddenPaths = [
      'wrangler.toml',
      'netlify.toml',
      path.join('public', '_redirects'),
      path.join('public', '_headers'),
      path.join('public', '_routes.json'),
      'functions',
      'netlify',
    ];
    for (const relPath of forbiddenPaths) {
      assert.equal(
        fs.existsSync(path.join(rootDir, relPath)),
        false,
        `Residual legacy platform path should not exist: ${relPath}`
      );
    }
  });

  it('configures vercel.json cleanly for Vite + Vercel Serverless Functions without intercepting /api/*', () => {
    const vercelConfig = JSON.parse(
      fs.readFileSync(path.join(rootDir, 'vercel.json'), 'utf-8')
    ) as {
      framework?: string;
      outputDirectory?: string;
      rewrites?: Array<{ source: string; destination: string }>;
    };
    assert.equal(vercelConfig.framework, 'vite');
    assert.equal(vercelConfig.outputDirectory, 'dist');
    assert.ok(Array.isArray(vercelConfig.rewrites) && vercelConfig.rewrites.length > 0);
    assert.ok(vercelConfig.rewrites[0].source.includes('(?!api/'));
  });

  it('keeps .env.example exclusively Vercel-focused with individual server-only provider keys', () => {
    const envExample = fs.readFileSync(path.join(rootDir, '.env.example'), 'utf-8');
    assert.ok(!/cloudflare|netlify/i.test(envExample), 'Legacy host reference found in .env.example');
    for (const varName of AI_PROVIDER_ENV_VARS) {
      assert.ok(
        new RegExp(`^${varName}=$`, 'm').test(envExample),
        `Missing server-side placeholder "${varName}=" in .env.example`
      );
    }
  });

  it('serves /api/health, /api/preps-ai, and /api/chat cleanly with strict Vercel CORS headers', async () => {
    const cors = resolveCorsHeaders('https://prepskm-preview.vercel.app');
    assert.equal(cors['Access-Control-Allow-Origin'], 'https://prepskm-preview.vercel.app');

    const healthRes = await healthGet(
      new Request('https://prepskm.in/api/health', {
        method: 'GET',
        headers: { origin: 'https://prepskm.in' },
      })
    );
    assert.equal(healthRes.status, 200);
    const healthData = (await healthRes.json()) as { ok: boolean; runtime: string };
    assert.equal(healthData.ok, true);
    assert.equal(healthData.runtime, 'vercel-serverless');

    const optRes = await prepsOptions(
      new Request('https://prepskm.in/api/preps-ai', {
        method: 'OPTIONS',
        headers: { origin: 'https://prepskm.in' },
      })
    );
    assert.equal(optRes.status, 204);
    assert.equal(optRes.headers.get('Access-Control-Allow-Origin'), 'https://prepskm.in');

    const badPreps = await prepsPost(
      new Request('https://prepskm.in/api/preps-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', origin: 'https://prepskm.in' },
        body: JSON.stringify({ messages: [] }),
      })
    );
    assert.equal(badPreps.status, 400);

    const badChat = await chatPost(
      new Request('https://prepskm.in/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', origin: 'https://prepskm.in' },
        body: JSON.stringify({ messages: [] }),
      })
    );
    assert.equal(badChat.status, 400);
  });
});
