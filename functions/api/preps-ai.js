/**
 * Preps AI 6-Provider Automatic Failover Function (/api/preps-ai)
 *
 * Each provider reads its own dedicated individual environment variable to prevent
 * key-parsing or configuration errors:
 *   1. Groq                  (GROQ_API_KEY)                  -> llama-3.3-70b-versatile
 *   2. Gemini                (GEMINI_API_KEY)                -> gemini-2.5-flash
 *   3. DeepSeek              (DEEPSEEK_API_KEY)              -> deepseek-chat
 *   4. OpenRouter            (OPENROUTER_API_KEY)            -> openrouter/free
 *   5. Mistral               (MISTRAL_API_KEY)               -> mistral-small-latest
 *   6. Cloudflare Workers AI (CLOUDFLARE_WORKERS_AI_API_KEY + CLOUDFLARE_ACCOUNT_ID, or env.AI binding)
 *                                                            -> @cf/meta/llama-3.3-70b-instruct-fp8-fast
 */

const REQUEST_TIMEOUT_MS = 18000;
const MAX_MESSAGES = 14;
const MAX_MESSAGE_CHARS = 3000;
const CLOUDFLARE_AI_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

export const AI_PROVIDER_ENV_VARS = [
  'GROQ_API_KEY',
  'GEMINI_API_KEY',
  'DEEPSEEK_API_KEY',
  'OPENROUTER_API_KEY',
  'MISTRAL_API_KEY',
  'CLOUDFLARE_WORKERS_AI_API_KEY',
];

export function getSingleApiKey(rawValue) {
  if (typeof rawValue !== 'string') return '';
  return rawValue.trim();
}

export function countConfiguredProviders(env = {}) {
  const runtimeEnv = env && typeof env === 'object' ? env : {};
  let count = 0;

  if (getSingleApiKey(runtimeEnv.GROQ_API_KEY)) count += 1;
  if (getSingleApiKey(runtimeEnv.GEMINI_API_KEY)) count += 1;
  if (getSingleApiKey(runtimeEnv.DEEPSEEK_API_KEY)) count += 1;
  if (getSingleApiKey(runtimeEnv.OPENROUTER_API_KEY)) count += 1;
  if (getSingleApiKey(runtimeEnv.MISTRAL_API_KEY)) count += 1;

  const hasCloudflareRest =
    Boolean(getSingleApiKey(runtimeEnv.CLOUDFLARE_WORKERS_AI_API_KEY)) &&
    Boolean(getSingleApiKey(runtimeEnv.CLOUDFLARE_ACCOUNT_ID));
  const hasCloudflareBinding = Boolean(runtimeEnv.AI && typeof runtimeEnv.AI.run === 'function');
  if (hasCloudflareRest || hasCloudflareBinding) {
    count += 1;
  }

  return count;
}

export function resolveCorsHeaders(requestOrigin) {
  const allowedOrigin =
    requestOrigin &&
    (requestOrigin === 'https://prepskm.in' ||
      requestOrigin === 'https://www.prepskm.in' ||
      /^https:\/\/[a-z0-9-]+\.pages\.dev$/i.test(requestOrigin) ||
      /^https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.pages\.dev$/i.test(requestOrigin) ||
      /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(requestOrigin))
      ? requestOrigin
      : 'https://prepskm.in';

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  };
}

export function normalizeMessages(body) {
  const normalized = [];

  if (Array.isArray(body?.messages) && body.messages.length > 0) {
    for (const item of body.messages.slice(-MAX_MESSAGES)) {
      if (!item || typeof item !== 'object') continue;
      const role = item.role === 'assistant' || item.role === 'model' ? 'assistant' : 'user';
      const content = String(item.content ?? item.text ?? '').trim().slice(0, MAX_MESSAGE_CHARS);
      if (content) {
        normalized.push({ role, content });
      }
    }
  } else {
    if (Array.isArray(body?.history)) {
      for (const item of body.history.slice(-(MAX_MESSAGES - 1))) {
        if (!item || typeof item !== 'object') continue;
        const role = item.role === 'assistant' || item.role === 'model' ? 'assistant' : 'user';
        const content = String(item.content ?? item.text ?? '').trim().slice(0, MAX_MESSAGE_CHARS);
        if (content) {
          normalized.push({ role, content });
        }
      }
    }
    const singleMsg = String(body?.message ?? '').trim().slice(0, MAX_MESSAGE_CHARS);
    if (singleMsg) {
      const last = normalized[normalized.length - 1];
      if (!last || last.role !== 'user' || last.content !== singleMsg) {
        normalized.push({ role: 'user', content: singleMsg });
      }
    }
  }

  return normalized;
}

function buildSystemPrompt(context) {
  const safeContext =
    context && typeof context === 'object' ? JSON.stringify(context, null, 2).slice(0, 6000) : '';
  const voiceMode = Boolean(context && typeof context === 'object' && context.voiceMode);
  const isMistakeFix = Boolean(
    context && typeof context === 'object' && (context.mistakeQuestion || context.mistakeSummary)
  );

  const lines = [
    'You are Preps AI, the dedicated academic mentor on PREPSKM.IN for Class 9-12 Boards, JEE Main, JEE Advanced, and NEET UG students.',
    'Teaching style:',
    '- Give clear, accurate, step-by-step explanations with formulas, NCERT/NTA exam traps, and practical shortcuts.',
    '- Match the student language naturally: if they ask in Hinglish/Hindi, reply in warm, crisp Hinglish; if in English, reply in clear English.',
    '- Ground every strategy, score, or revision answer in the LIVE STUDENT CONTEXT below (track, streak, accuracy, exam countdown, latest mock test, weak chapters, or mistake question details).',
    '- If totalAttempts is 0 and the student asks about test progress, politely let them know they have not taken a CBT mock yet and suggest starting their first mock or revising a high-weightage chapter.',
  ];

  if (isMistakeFix) {
    lines.push(
      '- MISTAKE FIX MODE: Diagnose why the mistake happened (conceptual gap, formula slip, or sign/unit error), walk through the clean step-by-step derivation to the official answer, and finish with a 1-line exam rule so the student never repeats this mistake.'
    );
  }

  if (voiceMode) {
    lines.push(
      '- VOICE MODE ACTIVE: Keep the reply concise (under 90 words) in natural spoken sentences without markdown bullets, asterisks, or raw symbols so it reads smoothly aloud.'
    );
  } else {
    lines.push(
      '- Keep explanations structured, concise, and easy to scan (typically 100-220 words unless a detailed derivation is requested).'
    );
  }

  if (safeContext) {
    lines.push('', 'LIVE STUDENT CONTEXT:', safeContext);
  }

  return lines.join('\n');
}

function buildSuggestedFollowUps(messages, context) {
  const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content?.toLowerCase() ?? '';
  if (context && typeof context === 'object' && (context.mistakeQuestion || context.mistakeSummary)) {
    return [
      'Give me a similar practice problem to test this concept',
      'What is the fastest 10-second exam shortcut here?',
      'Which NCERT formula should I memorize for this chapter?',
    ];
  }
  if (lastUser.includes('maths') || lastUser.includes('math') || lastUser.includes('negative')) {
    return [
      'Build a 7-day weak chapter revision plan',
      'How should I attempt JEE Maths in 60 minutes?',
      'Which high-weightage chapters give easy marks first?',
    ];
  }
  if (lastUser.includes('progress') || lastUser.includes('test') || lastUser.includes('score')) {
    return [
      'How do I reduce negative marking in my next mock?',
      'Give me a 7-day weak chapter revision plan',
      'Explain my weakest subject strategy step-by-step',
    ];
  }
  return [
    'Mera latest test ka progress kaisa hai?',
    'Create a 7-day weak chapter revision plan',
    'Give me 3 high-yield exam traps to avoid',
  ];
}

async function fetchWithTimeout(fetchImpl, url, options, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function callOpenAiCompatible({
  fetchImpl,
  url,
  apiKey,
  model,
  systemPrompt,
  messages,
  extraHeaders = {},
}) {
  const response = await fetchWithTimeout(fetchImpl, url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      ...extraHeaders,
    },
    body: JSON.stringify({
      model,
      temperature: 0.5,
      max_tokens: 900,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  const text =
    data?.choices?.[0]?.message?.content ??
    data?.result?.response ??
    data?.response;
  const reply = typeof text === 'string' ? text.trim() : '';
  if (!reply) {
    throw new Error('Empty completion');
  }
  return reply;
}

async function callGeminiRest({ fetchImpl, apiKey, systemPrompt, messages }) {
  const url =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const response = await fetchWithTimeout(fetchImpl, url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: systemPrompt }],
      },
      contents,
      generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 900,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  const parts = data?.candidates?.[0]?.content?.parts;
  const reply = Array.isArray(parts)
    ? parts
        .map((p) => (typeof p?.text === 'string' ? p.text : ''))
        .join('')
        .trim()
    : '';
  if (!reply) {
    throw new Error('Empty Gemini response');
  }
  return reply;
}

async function callCloudflareWorkersAi({
  fetchImpl,
  apiKey,
  accountId,
  aiBinding,
  systemPrompt,
  messages,
}) {
  const chatMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  // Prefer REST API with CLOUDFLARE_WORKERS_AI_API_KEY + CLOUDFLARE_ACCOUNT_ID when configured
  if (apiKey && accountId) {
    const safeAccountId = encodeURIComponent(accountId);
    return callOpenAiCompatible({
      fetchImpl,
      url: `https://api.cloudflare.com/client/v4/accounts/${safeAccountId}/ai/v1/chat/completions`,
      apiKey,
      model: CLOUDFLARE_AI_MODEL,
      systemPrompt,
      messages,
    });
  }

  // Fallback to native Cloudflare Pages AI binding (`env.AI`) if attached
  if (aiBinding && typeof aiBinding.run === 'function') {
    const result = await aiBinding.run(CLOUDFLARE_AI_MODEL, {
      messages: chatMessages,
      max_tokens: 900,
      temperature: 0.5,
    });
    const text =
      typeof result === 'string'
        ? result
        : result?.response ?? result?.choices?.[0]?.message?.content;
    const reply = typeof text === 'string' ? text.trim() : '';
    if (!reply) {
      throw new Error('Empty Cloudflare Workers AI response');
    }
    return reply;
  }

  throw new Error('Cloudflare Workers AI account ID or binding missing');
}

export async function runPrepsAiWithFallback({
  messages,
  context,
  env = {},
  fetchImpl = globalThis.fetch,
}) {
  const runtimeEnv = env && typeof env === 'object' ? env : {};
  const systemPrompt = buildSystemPrompt(context);

  const groqKey = getSingleApiKey(runtimeEnv.GROQ_API_KEY);
  const geminiKey = getSingleApiKey(runtimeEnv.GEMINI_API_KEY);
  const deepseekKey = getSingleApiKey(runtimeEnv.DEEPSEEK_API_KEY);
  const openrouterKey = getSingleApiKey(runtimeEnv.OPENROUTER_API_KEY);
  const mistralKey = getSingleApiKey(runtimeEnv.MISTRAL_API_KEY);
  const cloudflareKey = getSingleApiKey(runtimeEnv.CLOUDFLARE_WORKERS_AI_API_KEY);
  const cloudflareAccountId = getSingleApiKey(runtimeEnv.CLOUDFLARE_ACCOUNT_ID);
  const cloudflareBinding =
    runtimeEnv.AI && typeof runtimeEnv.AI.run === 'function' ? runtimeEnv.AI : null;

  const providers = [
    {
      name: 'groq',
      enabled: Boolean(groqKey),
      invoke: () =>
        callOpenAiCompatible({
          fetchImpl,
          url: 'https://api.groq.com/openai/v1/chat/completions',
          apiKey: groqKey,
          model: 'llama-3.3-70b-versatile',
          systemPrompt,
          messages,
        }),
    },
    {
      name: 'gemini',
      enabled: Boolean(geminiKey),
      invoke: () =>
        callGeminiRest({
          fetchImpl,
          apiKey: geminiKey,
          systemPrompt,
          messages,
        }),
    },
    {
      name: 'deepseek',
      enabled: Boolean(deepseekKey),
      invoke: () =>
        callOpenAiCompatible({
          fetchImpl,
          url: 'https://api.deepseek.com/chat/completions',
          apiKey: deepseekKey,
          model: 'deepseek-chat',
          systemPrompt,
          messages,
        }),
    },
    {
      name: 'openrouter',
      enabled: Boolean(openrouterKey),
      invoke: () =>
        callOpenAiCompatible({
          fetchImpl,
          url: 'https://openrouter.ai/api/v1/chat/completions',
          apiKey: openrouterKey,
          model: 'openrouter/free',
          systemPrompt,
          messages,
          extraHeaders: {
            'HTTP-Referer': 'https://prepskm.in',
            'X-Title': 'PREPSKM.IN Preps AI',
          },
        }),
    },
    {
      name: 'mistral',
      enabled: Boolean(mistralKey),
      invoke: () =>
        callOpenAiCompatible({
          fetchImpl,
          url: 'https://api.mistral.ai/v1/chat/completions',
          apiKey: mistralKey,
          model: 'mistral-small-latest',
          systemPrompt,
          messages,
        }),
    },
    {
      name: 'cloudflare-workers-ai',
      enabled: Boolean((cloudflareKey && cloudflareAccountId) || cloudflareBinding),
      invoke: () =>
        callCloudflareWorkersAi({
          fetchImpl,
          apiKey: cloudflareKey,
          accountId: cloudflareAccountId,
          aiBinding: cloudflareBinding,
          systemPrompt,
          messages,
        }),
    },
  ];

  let configuredProviders = 0;

  for (const provider of providers) {
    if (!provider.enabled) continue;
    configuredProviders += 1;
    try {
      const reply = await provider.invoke();
      return {
        ok: true,
        reply,
        provider: provider.name,
        suggestedFollowUps: buildSuggestedFollowUps(messages, context),
      };
    } catch {
      // Automatically fail over to the next configured provider without leaking credentials
      continue;
    }
  }

  return {
    ok: false,
    error:
      configuredProviders === 0
        ? 'Preps AI is temporarily unavailable because no AI provider keys are configured yet. Please check back shortly.'
        : 'Preps AI is experiencing high demand right now across all mentors. Please wait a few seconds and try your question again.',
  };
}

export async function onRequestOptions(context) {
  const origin = context.request.headers.get('origin') || '';
  return new Response(null, {
    status: 204,
    headers: resolveCorsHeaders(origin),
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const origin = request.headers.get('origin') || '';
  const headers = resolveCorsHeaders(origin);

  let body = {};
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ ok: false, error: 'Invalid JSON request payload.' }),
      { status: 400, headers }
    );
  }

  const messages = normalizeMessages(body);
  if (messages.length === 0) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'Please enter a question or study doubt for Preps AI.',
      }),
      { status: 400, headers }
    );
  }

  const studentContext =
    body?.context && typeof body.context === 'object'
      ? { ...body.context }
      : body?.studentContext && typeof body.studentContext === 'object'
        ? { ...body.studentContext }
        : {};
  if (body?.voiceMode) {
    studentContext.voiceMode = true;
  }

  const result = await runPrepsAiWithFallback({
    messages,
    context: studentContext,
    env,
  });

  if (!result.ok) {
    return new Response(
      JSON.stringify({ ok: false, error: result.error }),
      { status: 503, headers }
    );
  }

  return new Response(
    JSON.stringify({
      ok: true,
      reply: result.reply,
      provider: result.provider,
      suggestedFollowUps: result.suggestedFollowUps,
    }),
    { status: 200, headers }
  );
}

export async function onRequest(context) {
  const origin = context.request.headers.get('origin') || '';
  return new Response(
    JSON.stringify({ ok: false, error: 'Method not allowed. Use POST.' }),
    { status: 405, headers: resolveCorsHeaders(origin) }
  );
}
