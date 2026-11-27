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

  if (getSingleApiKey(runtimeEnv.GROQ_API_KEY || runtimeEnv.VITE_GROQ_API_KEY)) count += 1;
  if (getSingleApiKey(runtimeEnv.GEMINI_API_KEY || runtimeEnv.VITE_GEMINI_API_KEY)) count += 1;
  if (getSingleApiKey(runtimeEnv.DEEPSEEK_API_KEY || runtimeEnv.VITE_DEEPSEEK_API_KEY)) count += 1;
  if (getSingleApiKey(runtimeEnv.OPENROUTER_API_KEY || runtimeEnv.VITE_OPENROUTER_API_KEY)) count += 1;
  if (getSingleApiKey(runtimeEnv.MISTRAL_API_KEY || runtimeEnv.VITE_MISTRAL_API_KEY)) count += 1;

  const hasCloudflareRest =
    Boolean(getSingleApiKey(runtimeEnv.CLOUDFLARE_WORKERS_AI_API_KEY || runtimeEnv.VITE_CLOUDFLARE_WORKERS_AI_API_KEY)) &&
    Boolean(getSingleApiKey(runtimeEnv.CLOUDFLARE_ACCOUNT_ID || runtimeEnv.VITE_CLOUDFLARE_ACCOUNT_ID));
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
      /^https:\/\/[a-z0-9-]+\.prepskm\.in$/i.test(requestOrigin) ||
      /^https:\/\/[a-z0-9-]+\.pages\.dev$/i.test(requestOrigin) ||
      /^https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.pages\.dev$/i.test(requestOrigin) ||
      /^https:\/\/[a-z0-9-]+\.workers\.dev$/i.test(requestOrigin) ||
      /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(requestOrigin))
      ? requestOrigin
      : 'https://prepskm.in';

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
    'You are Preps AI, a friendly Indian JEE Main, JEE Advanced, NEET UG, and Class 9-12 Board bhaiya/mentor on PREPSKM.IN.',
    'Core persona and communication style (STRICTLY FOLLOW across every response):',
    '- Explain every concept in natural, warm, easy-to-understand Hinglish (conversational Hindi-English mix, like a supportive Indian senior bhaiya/mentor — e.g. "Simple funda yeh hai", "Chalo step-by-step samajhte hain", "Exam mein yahi trap aata hai") so any student can grasp even tough concepts effortlessly.',
    '- Avoid robotic textbook jargon. Break tough physics, chemistry, maths, and biology doubts into clear, relatable real-world intuition, formulas, and practical NTA/NCERT shortcuts.',
    '- NEVER use raw Markdown formatting characters (#, **, *, _, `, >, or markdown tables). Write clean plain-text paragraphs or simple numbered steps (1., 2., 3.) so every reply reads cleanly on screen and sounds super natural when spoken aloud.',
    '- Ground every progress review, chapter summary, learning path, and practice tip in the LIVE STUDENT CONTEXT below — including their Prep Score, Google Sheets performance analysis (sheetPerformanceSummary), Google Keep study notes (keepStudyNotes), mock history, and weak chapters.',
    '- When Google Sheets performance data is present, cite exact subject/chapter accuracy percentages and trends accurately without guessing, give constructive Hinglish encouragement, and suggest concrete next steps.',
    '- When Google Keep study notes are present, weave those saved formulas and doubts directly into your explanation.',
    '- If totalAttempts is 0 and no Google Sheet is loaded yet, warmly encourage the student to load their sheet, attempt a quick CBT mock, or pick one high-weightage chapter to build momentum.',
  ];

  if (isMistakeFix) {
    lines.push(
      '- MISTAKE FIX MODE: Friendly Hinglish mein batao ki galti kahan aur kyun hui (conceptual gap, formula slip, ya sign/unit trap), fir simple numbered steps mein official answer tak solve karke dikhao, aur end mein ek crisp 1-line Exam Rule do taaki student dubara ye galti kabhi na kare. No raw markdown symbols.'
    );
  }

  if (voiceMode) {
    lines.push(
      '- VOICE MODE ACTIVE: Keep the Hinglish reply crisp and conversational (under 85 words) in smooth spoken sentences with zero symbols, bullets, asterisks, or markdown so it sounds completely natural aloud.'
    );
  } else {
    lines.push(
      '- Keep replies crisp, structured with plain numbered steps, and easy to understand (typically 100-210 words unless a full derivation is requested).'
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
      'Isi concept par ek similar practice question do',
      'Iska 10-second exam shortcut kya hoga?',
      'Is chapter ke must-remember formulas batao',
    ];
  }
  if (lastUser.includes('maths') || lastUser.includes('math') || lastUser.includes('negative')) {
    return [
      '7-day weak chapter revision plan bana do',
      'JEE Maths 60 minutes mein kaise attempt karein?',
      'High-weightage easy-marks chapters kaunse hain?',
    ];
  }
  if (lastUser.includes('progress') || lastUser.includes('test') || lastUser.includes('score')) {
    return [
      'Agle mock mein negative marking kaise kam karun?',
      '7-day weak chapter revision plan bana do',
      'Mere weakest subject ki simple strategy batao',
    ];
  }
  return [
    'Mera latest test ka progress kaisa hai?',
    '7-day weak chapter revision plan bana do',
    '3 common exam traps batao jo students karte hain',
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
  maxTokens = 1200,
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
      max_tokens: maxTokens,
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

async function callGeminiRest({
  fetchImpl,
  apiKey,
  systemPrompt,
  messages,
  jsonMode = false,
}) {
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
        temperature: 0.4,
        ...(jsonMode ? { responseMimeType: 'application/json' } : {}),
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
  maxTokens = 1200,
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
      maxTokens,
    });
  }

  // Fallback to native Cloudflare Pages AI binding (`env.AI`) if attached
  if (aiBinding && typeof aiBinding.run === 'function') {
    const result = await aiBinding.run(CLOUDFLARE_AI_MODEL, {
      messages: chatMessages,
      max_tokens: maxTokens,
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
  maxTokens = 1200,
  jsonMode = false,
}) {
  const runtimeEnv = env && typeof env === 'object' ? env : {};
  const systemPrompt = buildSystemPrompt(context);

  const groqKey = getSingleApiKey(runtimeEnv.GROQ_API_KEY || runtimeEnv.VITE_GROQ_API_KEY);
  const geminiKey = getSingleApiKey(runtimeEnv.GEMINI_API_KEY || runtimeEnv.VITE_GEMINI_API_KEY);
  const deepseekKey = getSingleApiKey(runtimeEnv.DEEPSEEK_API_KEY || runtimeEnv.VITE_DEEPSEEK_API_KEY);
  const openrouterKey = getSingleApiKey(runtimeEnv.OPENROUTER_API_KEY || runtimeEnv.VITE_OPENROUTER_API_KEY);
  const mistralKey = getSingleApiKey(runtimeEnv.MISTRAL_API_KEY || runtimeEnv.VITE_MISTRAL_API_KEY);
  const cloudflareKey = getSingleApiKey(
    runtimeEnv.CLOUDFLARE_WORKERS_AI_API_KEY || runtimeEnv.VITE_CLOUDFLARE_WORKERS_AI_API_KEY
  );
  const cloudflareAccountId = getSingleApiKey(
    runtimeEnv.CLOUDFLARE_ACCOUNT_ID || runtimeEnv.VITE_CLOUDFLARE_ACCOUNT_ID
  );
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
          maxTokens,
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
          jsonMode,
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
          maxTokens,
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
          maxTokens,
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
          maxTokens,
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
          maxTokens,
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

export async function onRequestOptions({ request }) {
  const origin = request.headers.get('origin') || '';
  return new Response(null, {
    status: 204,
    headers: resolveCorsHeaders(origin),
  });
}

export async function onRequestPost({ request, env }) {
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
    env: env ?? {},
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

export async function onRequest({ request }) {
  const origin = request.headers.get('origin') || '';
  return new Response(
    JSON.stringify({ ok: false, error: 'Method not allowed. Use POST.' }),
    { status: 405, headers: resolveCorsHeaders(origin) }
  );
}
