/**
 * Preps AI Multi-Provider Cloudflare Pages Function (/api/preps-ai)
 *
 * Automatic key & provider rotation order using Cloudflare Pages `env`:
 *   1. Groq       (llama-3.3-70b-versatile)
 *   2. Gemini     (gemini-2.5-flash)
 *   3. OpenRouter (openrouter/free)
 *   4. Mistral    (mistral-small-latest)
 *
 * Supports comma-separated multiple API keys per provider in Cloudflare Pages
 * Environment Variables / Secrets (or `.dev.vars` locally):
 *   GROQ_API_KEYS / GROQ_API_KEY
 *   GEMINI_API_KEYS / GEMINI_API_KEY
 *   OPENROUTER_API_KEYS / OPENROUTER_API_KEY
 *   MISTRAL_API_KEYS / MISTRAL_API_KEY
 */

const REQUEST_TIMEOUT_MS = 18000;
const MAX_MESSAGES = 14;
const MAX_MESSAGE_CHARS = 3000;

export function parseKeyList(...envValues) {
  const keys = [];
  const seen = new Set();
  for (const raw of envValues) {
    if (typeof raw !== 'string' || !raw.trim()) continue;
    for (const part of raw.split(/[\n,]+/)) {
      const cleaned = part.trim();
      if (cleaned && !seen.has(cleaned)) {
        seen.add(cleaned);
        keys.push(cleaned);
      }
    }
  }
  return keys;
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

async function fetchWithTimeout(url, options, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function callOpenAiCompatible({ url, apiKey, model, systemPrompt, messages, extraHeaders = {} }) {
  const response = await fetchWithTimeout(url, {
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
  const text = data?.choices?.[0]?.message?.content;
  const reply = typeof text === 'string' ? text.trim() : '';
  if (!reply) {
    throw new Error('Empty completion');
  }
  return reply;
}

async function callGeminiRest({ apiKey, systemPrompt, messages }) {
  const url =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const response = await fetchWithTimeout(url, {
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

export async function runPrepsAiWithFallback({ messages, context, env = {} }) {
  const runtimeEnv = env && typeof env === 'object' ? env : {};
  const systemPrompt = buildSystemPrompt(context);

  const providers = [
    {
      name: 'groq',
      keys: parseKeyList(runtimeEnv.GROQ_API_KEYS, runtimeEnv.GROQ_API_KEY),
      invoke: (apiKey) =>
        callOpenAiCompatible({
          url: 'https://api.groq.com/openai/v1/chat/completions',
          apiKey,
          model: 'llama-3.3-70b-versatile',
          systemPrompt,
          messages,
        }),
    },
    {
      name: 'gemini',
      keys: parseKeyList(runtimeEnv.GEMINI_API_KEYS, runtimeEnv.GEMINI_API_KEY),
      invoke: (apiKey) =>
        callGeminiRest({
          apiKey,
          systemPrompt,
          messages,
        }),
    },
    {
      name: 'openrouter',
      keys: parseKeyList(runtimeEnv.OPENROUTER_API_KEYS, runtimeEnv.OPENROUTER_API_KEY),
      invoke: (apiKey) =>
        callOpenAiCompatible({
          url: 'https://openrouter.ai/api/v1/chat/completions',
          apiKey,
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
      keys: parseKeyList(runtimeEnv.MISTRAL_API_KEYS, runtimeEnv.MISTRAL_API_KEY),
      invoke: (apiKey) =>
        callOpenAiCompatible({
          url: 'https://api.mistral.ai/v1/chat/completions',
          apiKey,
          model: 'mistral-small-latest',
          systemPrompt,
          messages,
        }),
    },
  ];

  let totalKeysConfigured = 0;

  for (const provider of providers) {
    for (const apiKey of provider.keys) {
      totalKeysConfigured += 1;
      try {
        const reply = await provider.invoke(apiKey);
        return {
          ok: true,
          reply,
          provider: provider.name,
          suggestedFollowUps: buildSuggestedFollowUps(messages, context),
        };
      } catch {
        // Silently rotate to the next key or next provider without exposing credentials
        continue;
      }
    }
  }

  return {
    ok: false,
    error:
      totalKeysConfigured === 0
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
