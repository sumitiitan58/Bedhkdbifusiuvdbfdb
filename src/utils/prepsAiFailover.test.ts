import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  AI_PROVIDER_ENV_VARS,
  AI_PROVIDER_REGISTRY,
  PREPSKM_CORE_SYSTEM_PROMPT,
  countConfiguredProviders,
  extractJsonObject,
  getServerSecret,
  getSingleApiKey,
  isAllowedCorsOrigin,
  listConfiguredProviders,
  parseApiKeyPool,
  resolveCorsHeaders,
  runLiveTeacherLessonWithFallback,
  runPrepsAiWithFallback,
  runStructuredJsonWithFallback,
  sanitizeClientContext,
  sanitizeErrorMessage,
} from '../../api/_lib/aiGateway';
import { GET as healthGet } from '../../api/health';
import { OPTIONS as prepsOptions, POST as prepsPost } from '../../api/preps-ai';
import { OPTIONS as chatOptions, POST as chatPost } from '../../api/chat';
import { POST as liveLessonPost } from '../../api/ai/live-lesson';
import { resolveApiUrl } from '../services/geminiClient';

function createMockResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('Vercel & AI Studio Server-Only AI Gateway (All 8 Secrets & Failover)', () => {
  it('defines all 8 server-side AI provider env vars with zero VITE_ prefixes', () => {
    assert.deepEqual(
      [...AI_PROVIDER_ENV_VARS].sort(),
      [
        'CLOUDFLARE_ACCOUNT_ID',
        'CLOUDFLARE_WORKERS_AI_TOKEN',
        'DEEPSEEK_API_KEY',
        'GEMINI_API_KEY',
        'GROQ_API_KEY',
        'MISTRAL_API_KEY',
        'MISTRAL_API_KEYS',
        'OPENROUTER_API_KEY',
      ]
    );
    assert.equal(AI_PROVIDER_REGISTRY.length, 6);
    for (const key of AI_PROVIDER_ENV_VARS) {
      assert.ok(!key.startsWith('VITE_'), `Provider secret must never start with VITE_: ${key}`);
    }
    assert.deepEqual(parseApiKeyPool('key-1, key-2;\n"key-3"'), ['key-1', 'key-2', 'key-3']);
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

  it('fails over seamlessly from Groq (429), Gemini (network error), and Mistral (503) to DeepSeek', async () => {
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
      if (url.includes('api.mistral.ai')) {
        return createMockResponse(503, { error: 'mistral_overloaded' });
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
      context: { track: 'Class 12 JEE', subject: 'Physics', chapter: 'Electrostatics' },
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
      assert.ok(result.suggestedFollowUps.some((f) => /Electrostatics/i.test(f)));
    }
    assert.equal(calledUrls.length, 4);
  });

  it('fails over structured JSON requests cleanly when primary provider returns malformed output', async () => {
    const fetchImpl = async (input: string | URL | Request) => {
      const url =
        typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url.includes('api.groq.com')) {
        return createMockResponse(200, {
          choices: [{ message: { content: 'not-valid-json-response' } }],
        });
      }
      if (url.includes('generativelanguage.googleapis.com')) {
        return createMockResponse(200, {
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      subject: 'Chemistry',
                      chapter: 'Aldehydes and Ketones',
                      ok: true,
                    }),
                  },
                ],
              },
            },
          ],
        });
      }
      return createMockResponse(500, { error: 'unexpected' });
    };

    const res = await runStructuredJsonWithFallback({
      systemPrompt: 'Return strict JSON.',
      userPrompt: 'Aldol condensation in Aldehydes and Ketones',
      env: { GROQ_API_KEY: 'dummy-groq', GEMINI_API_KEY: 'dummy-gemini' },
      fetchImpl: fetchImpl as typeof fetch,
    });

    assert.equal(res.ok, true);
    if (res.ok) {
      assert.equal(res.provider, 'gemini');
      assert.equal(res.data.chapter, 'Aldehydes and Ketones');
    }
  });

  it('generates topic-locked dynamic Live Teacher whiteboard lessons via automatic failover', async () => {
    const fetchImpl = async (input: string | URL | Request) => {
      const url =
        typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url.includes('api.groq.com')) {
        return createMockResponse(503, { error: 'overloaded' });
      }
      if (url.includes('api.deepseek.com')) {
        return createMockResponse(200, {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  topicTitle: 'DNA Replication Leading vs Lagging Strand',
                  subjectName: 'Biology',
                  chapterName: 'Molecular Basis of Inheritance',
                  svgType: 'biology',
                  officialAnswer: 'DNA polymerase synthesizes only in 5 prime to 3 prime direction.',
                  steps: [
                    {
                      stepNumber: 1,
                      title: 'Helicase Unwinding',
                      boardLatex: '3\\prime \\to 5\\prime \\text{ template} \\Rightarrow 5\\prime \\to 3\\prime \\text{ leading}',
                      boardNotes: 'Helicase unzips hydrogen bonds at the replication fork.',
                      narrationScript: 'Pehle helicase DNA double helix ko unwind karta hai.',
                      englishNarrationScript: 'First helicase unwinds the DNA double helix.',
                      proTip: 'Remember polarity of template vs new strand.',
                      svgType: 'biology',
                    },
                    {
                      stepNumber: 2,
                      title: 'Okazaki Fragments',
                      boardLatex: '\\text{Lagging strand} \\to \\text{Okazaki fragments} + \\text{DNA Ligase}',
                      boardNotes: 'Discontinuous synthesis on 5 prime to 3 prime template joined by DNA ligase.',
                      narrationScript: 'Lagging strand par Okazaki fragments bante hain jinhe DNA ligase jodta hai.',
                      englishNarrationScript: 'Okazaki fragments form on the lagging strand and are sealed by DNA ligase.',
                      proTip: 'NEET frequently tests DNA ligase joining Okazaki fragments.',
                      svgType: 'biology',
                    },
                  ],
                  quickDoubtSuggestions: ['DNA polymerase sirf 5 prime to 3 prime kyun chalta hai?'],
                }),
              },
            },
          ],
        });
      }
      return createMockResponse(500, { error: 'unexpected' });
    };

    const result = await runLiveTeacherLessonWithFallback({
      questionText: 'Explain leading and lagging strand synthesis during DNA replication.',
      subjectName: 'Biology',
      chapterName: 'Molecular Basis of Inheritance',
      env: { GROQ_API_KEY: 'dummy-groq', DEEPSEEK_API_KEY: 'dummy-deepseek' },
      fetchImpl: fetchImpl as typeof fetch,
    });

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.provider, 'deepseek');
      assert.equal(result.lesson.subjectName, 'Biology');
      assert.equal(result.lesson.chapterName, 'Molecular Basis of Inheritance');
      assert.ok(Array.isArray(result.lesson.steps) && result.lesson.steps.length === 2);
    }
  });

  it('repairs unescaped LaTeX backslashes inside LLM JSON payloads without failing', () => {
    const rawWithLatex =
      '```json\n{"topicTitle":"DNA Replication","boardLatex":"5\\prime \\to 3\\prime + \\frac{1}{2} \\theta \\text{ Okazaki}","steps":[{"stepNumber":1,"boardLatex":"\\alpha + \\beta"}]}\n```';
    const parsed = extractJsonObject(rawWithLatex);
    assert.equal(parsed.topicTitle, 'DNA Replication');
    assert.match(String(parsed.boardLatex), /\\prime/);
    assert.match(String(parsed.boardLatex), /\\frac\{1\}\{2\}/);
  });

  it('embeds the official Prepskm founder philosophy, active learning ethos, and AI Buddy redirection guidelines', () => {
    assert.match(PREPSKM_CORE_SYSTEM_PROMPT, /Sumit Kumar/i);
    assert.match(PREPSKM_CORE_SYSTEM_PROMPT, /@UnfilteredSumit/i);
    assert.match(PREPSKM_CORE_SYSTEM_PROMPT, /Samastipur, Bihar/i);
    assert.match(PREPSKM_CORE_SYSTEM_PROMPT, /1,000,000\+/);
    assert.match(PREPSKM_CORE_SYSTEM_PROMPT, /one-shot/i);
    assert.match(PREPSKM_CORE_SYSTEM_PROMPT, /redirect/i);
  });

  it('rotates through MISTRAL_API_KEYS pool and fails over cleanly to Cloudflare Workers AI', async () => {
    const authHeaders: string[] = [];
    const fetchImpl = async (input: string | URL | Request, init?: RequestInit) => {
      const url =
        typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      const hdrs = (init?.headers ?? {}) as Record<string, string>;
      if (hdrs.Authorization) authHeaders.push(hdrs.Authorization);

      if (url.includes('api.mistral.ai')) {
        return createMockResponse(429, { error: { message: 'Mistral quota exceeded' } });
      }
      if (url.includes('api.cloudflare.com/client/v4/accounts/cf-acct-99/ai/run/')) {
        return createMockResponse(200, {
          result: { response: 'Use conservation of linear momentum before and after collision.' },
        });
      }
      return createMockResponse(500, { error: 'unexpected' });
    };

    const env = {
      MISTRAL_API_KEY: 'mistral-k1',
      MISTRAL_API_KEYS: 'mistral-k1, mistral-k2',
      CLOUDFLARE_ACCOUNT_ID: 'cf-acct-99',
      CLOUDFLARE_WORKERS_AI_TOKEN: 'cf-token-xyz',
    };
    assert.deepEqual(listConfiguredProviders(env), ['mistral', 'cloudflare']);

    const result = await runPrepsAiWithFallback({
      messages: [{ role: 'user', content: 'Explain elastic collision.' }],
      context: { subject: 'Physics', chapter: 'Work Power Energy' },
      env,
      fetchImpl: fetchImpl as typeof fetch,
    });

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.provider, 'cloudflare');
      assert.deepEqual(result.attemptedProviders, ['mistral#1', 'mistral#2', 'cloudflare']);
      assert.match(result.reply, /momentum/i);
    }
    assert.deepEqual(authHeaders, [
      'Bearer mistral-k1',
      'Bearer mistral-k2',
      'Bearer cf-token-xyz',
    ]);
  });

  it('returns exact sanitized providerErrors when every configured provider fails', async () => {
    const fetchImpl = async (input: string | URL | Request) => {
      const url =
        typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url.includes('api.groq.com')) {
        return createMockResponse(429, { error: { message: 'Groq RPM limit hit' } });
      }
      if (url.includes('generativelanguage.googleapis.com')) {
        return createMockResponse(403, { error: { message: 'API_KEY_INVALID AIzaSecret12345678901234' } });
      }
      return createMockResponse(500, { error: 'fail' });
    };

    const result = await runPrepsAiWithFallback({
      messages: [{ role: 'user', content: 'Test error reporting' }],
      env: { GROQ_API_KEY: 'gsk-test', GEMINI_API_KEY: 'gemini-test' },
      fetchImpl: fetchImpl as typeof fetch,
    });

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.providerErrors.length, 2);
      assert.match(result.error, /groq: HTTP 429: Groq RPM limit hit/i);
      assert.match(result.error, /gemini: HTTP 403/i);
      assert.ok(!result.error.includes('AIzaSecret12345678901234'));
    }
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
      assert.match(result.error, /environment secrets/i);
    }
  });
});

describe('Zero Static Fallbacks & Vercel-Exclusive Deployment', () => {
  const rootDir = path.resolve(process.cwd());

  it('eliminates static offline chat and static live-teacher fallbacks from client services & classroom UI', () => {
    const geminiClientSrc = fs.readFileSync(
      path.join(rootDir, 'src', 'services', 'geminiClient.ts'),
      'utf-8'
    );
    const liveModalSrc = fs.readFileSync(
      path.join(rootDir, 'src', 'components', 'live-teacher', 'LiveTeacherModal.tsx'),
      'utf-8'
    );

    assert.ok(!geminiClientSrc.includes('buildOfflineStudyChatFallback'));
    assert.ok(!geminiClientSrc.includes('prepskm-local-tutor'));
    assert.ok(!liveModalSrc.includes('generateLiveTeacherLesson'));
    assert.ok(!liveModalSrc.includes('buildTeacherDoubtFallback'));
  });

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

  it('keeps .env.example with all 8 individual server-only AI provider secret placeholders', () => {
    const envExample = fs.readFileSync(path.join(rootDir, '.env.example'), 'utf-8');
    assert.ok(!/netlify/i.test(envExample), 'Legacy Netlify reference found in .env.example');
    for (const varName of AI_PROVIDER_ENV_VARS) {
      assert.ok(
        new RegExp(`^${varName}=$`, 'm').test(envExample),
        `Missing server-side placeholder "${varName}=" in .env.example`
      );
    }
  });

  it('explicitly allows CORS for prepskm.in, www.prepskm.in, Vercel previews, localhost, and AI Studio preview', async () => {
    const allowedOrigins = [
      'https://prepskm.in',
      'https://www.prepskm.in',
      'https://prepskm-preview.vercel.app',
      'http://localhost:3000',
      'https://ais-dev-demo.us-west1.run.app',
      'https://preview.scf.usercontent.goog',
    ];
    for (const origin of allowedOrigins) {
      assert.equal(isAllowedCorsOrigin(origin), true, `Origin should be allowed: ${origin}`);
      const cors = resolveCorsHeaders(origin);
      assert.equal(cors['Access-Control-Allow-Origin'], origin);
    }
    assert.equal(isAllowedCorsOrigin('https://evil-domain.example'), false);

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

    const badLiveLesson = await liveLessonPost(
      new Request('https://prepskm.in/api/ai/live-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', origin: 'https://prepskm.in' },
        body: JSON.stringify({ questionText: '   ' }),
      })
    );
    assert.equal(badLiveLesson.status, 400);
  });

  it('always uses relative /api/chat and /api/preps-ai URLs on localhost, AI Studio preview, and prepskm.in and blocks dash.cloudflare.com', async () => {
    const cloudflareDash = 'https://dash.cloudflare.com/1234567890abcdef/pages';

    // Same-origin hosted environments must ALWAYS ignore external VITE_API_BASE_URL overrides
    assert.equal(resolveApiUrl('/api/chat', cloudflareDash, 'prepskm.in'), '/api/chat');
    assert.equal(resolveApiUrl('/api/preps-ai', cloudflareDash, 'www.prepskm.in'), '/api/preps-ai');
    assert.equal(resolveApiUrl('/api/chat', cloudflareDash, 'localhost'), '/api/chat');
    assert.equal(
      resolveApiUrl('/api/chat', cloudflareDash, 'ais-dev-demo.asia-southeast1.run.app'),
      '/api/chat'
    );
    assert.equal(
      resolveApiUrl('/api/preps-ai', 'https://other-host.example.com', 'prepskm-git-main.vercel.app'),
      '/api/preps-ai'
    );

    // Even outside known hosted domains, dash.cloudflare.com must be rejected in favor of relative paths
    assert.equal(
      resolveApiUrl('/api/chat', cloudflareDash, 'custom-mirror.example.org'),
      '/api/chat'
    );

    // /api/chat OPTIONS & POST return valid CORS & JSON responses
    const chatOptRes = await chatOptions(
      new Request('https://prepskm.in/api/chat', {
        method: 'OPTIONS',
        headers: { origin: 'https://prepskm.in' },
      })
    );
    assert.equal(chatOptRes.status, 204);
    assert.equal(chatOptRes.headers.get('Access-Control-Allow-Origin'), 'https://prepskm.in');

    const chatJsonRes = await chatPost(
      new Request('https://prepskm.in/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', origin: 'https://prepskm.in' },
        body: JSON.stringify({ messages: [] }),
      })
    );
    assert.equal(chatJsonRes.status, 400);
    assert.match(chatJsonRes.headers.get('Content-Type') ?? '', /application\/json/i);
    const parsedChatErr = (await chatJsonRes.json()) as { ok: boolean; error: string };
    assert.equal(parsedChatErr.ok, false);
    assert.ok(parsedChatErr.error.length > 0);
  });
});
