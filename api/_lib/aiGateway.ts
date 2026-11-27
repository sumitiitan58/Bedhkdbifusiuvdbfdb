/**
 * Prepskm Vercel Server-Only AI Gateway (/api/_lib/aiGateway.ts)
 *
 * Security & Scalability Architecture:
 * - Strictly reads private API keys from server-side `process.env` ONLY (never `VITE_*`).
 * - Rejects/strips any client-supplied key fields to prevent improper secret backflow.
 * - Sanitizes all upstream error responses so provider keys can never leak to clients.
 * - Extensible provider registry: add any new AI model by appending one descriptor to
 *   `AI_PROVIDER_REGISTRY` without touching route handlers or frontend code.
 *
 * Automatic Failover Order:
 *   1. Groq       (GROQ_API_KEY)       -> llama-3.3-70b-versatile
 *   2. Gemini     (GEMINI_API_KEY)     -> gemini-2.5-flash
 *   3. DeepSeek   (DEEPSEEK_API_KEY)   -> deepseek-chat
 *   4. OpenRouter (OPENROUTER_API_KEY) -> openrouter/free
 *   5. Mistral    (MISTRAL_API_KEY)    -> mistral-small-latest
 */

export const REQUEST_TIMEOUT_MS = 18_000;
export const MAX_MESSAGES = 14;
export const MAX_MESSAGE_CHARS = 3_000;
export const MAX_JSON_BODY_BYTES = 18 * 1024 * 1024;

export interface AiChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiProviderDescriptor {
  id: string;
  envVar: string;
  protocol: 'openai-compatible' | 'gemini-rest';
  endpoint: string;
  model: string;
  extraHeaders?: Record<string, string>;
}

/**
 * Extensible server-side AI provider registry.
 * Append new models here as the platform scales — zero frontend changes required.
 */
export const AI_PROVIDER_REGISTRY: readonly AiProviderDescriptor[] = [
  {
    id: 'groq',
    envVar: 'GROQ_API_KEY',
    protocol: 'openai-compatible',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama-3.3-70b-versatile',
  },
  {
    id: 'gemini',
    envVar: 'GEMINI_API_KEY',
    protocol: 'gemini-rest',
    endpoint:
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    model: 'gemini-2.5-flash',
  },
  {
    id: 'deepseek',
    envVar: 'DEEPSEEK_API_KEY',
    protocol: 'openai-compatible',
    endpoint: 'https://api.deepseek.com/chat/completions',
    model: 'deepseek-chat',
  },
  {
    id: 'openrouter',
    envVar: 'OPENROUTER_API_KEY',
    protocol: 'openai-compatible',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'openrouter/free',
    extraHeaders: {
      'HTTP-Referer': 'https://prepskm.in',
      'X-Title': 'PREPSKM.IN Preps AI',
    },
  },
  {
    id: 'mistral',
    envVar: 'MISTRAL_API_KEY',
    protocol: 'openai-compatible',
    endpoint: 'https://api.mistral.ai/v1/chat/completions',
    model: 'mistral-small-latest',
  },
] as const;

export const AI_PROVIDER_ENV_VARS: readonly string[] = AI_PROVIDER_REGISTRY.map(
  (provider) => provider.envVar
);

const FORBIDDEN_CLIENT_SECRET_KEYS = new Set([
  'apikey',
  'api_key',
  'secret',
  'secretkey',
  'token',
  'authorization',
  'gemini_api_key',
  'groq_api_key',
  'deepseek_api_key',
  'openrouter_api_key',
  'mistral_api_key',
]);

export function getSingleApiKey(rawValue: unknown): string {
  if (typeof rawValue !== 'string') return '';
  return rawValue.trim();
}

/**
 * Reads a private server-only key strictly from non-VITE environment variables.
 * Never reads client-exposed `VITE_*` variables to guarantee zero secret leakage.
 */
export function getServerSecret(
  env: Record<string, string | undefined>,
  envVarName: string
): string {
  if (!envVarName || envVarName.startsWith('VITE_')) return '';
  return getSingleApiKey(env[envVarName]);
}

export function countConfiguredProviders(
  env: Record<string, string | undefined> = process.env
): number {
  const runtimeEnv = env && typeof env === 'object' ? env : {};
  let count = 0;
  for (const provider of AI_PROVIDER_REGISTRY) {
    if (getServerSecret(runtimeEnv, provider.envVar)) {
      count += 1;
    }
  }
  return count;
}

export function isAllowedCorsOrigin(origin: string): boolean {
  if (!origin) return false;
  return (
    origin === 'https://prepskm.in' ||
    origin === 'https://www.prepskm.in' ||
    /^https:\/\/[a-z0-9-]+\.prepskm\.in$/i.test(origin) ||
    /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin) ||
    /^https:\/\/[a-z0-9-]+-[a-z0-9-]+\.vercel\.app$/i.test(origin) ||
    /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)
  );
}

export function resolveCorsHeaders(
  requestOrigin: string | null | undefined,
  allowedMethods = 'POST, GET, OPTIONS'
): Record<string, string> {
  const origin = typeof requestOrigin === 'string' ? requestOrigin.trim() : '';
  const allowedOrigin = isAllowedCorsOrigin(origin) ? origin : 'https://prepskm.in';

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': allowedMethods,
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, max-age=0',
    'X-Content-Type-Options': 'nosniff',
  };
}

/**
 * Strips any accidentally passed client secret/key fields from context objects
 * so client payloads can never inject or echo API credentials.
 */
export function sanitizeClientContext(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (FORBIDDEN_CLIENT_SECRET_KEYS.has(key.toLowerCase())) continue;
    out[key] = value;
  }
  return out;
}

export function sanitizeErrorMessage(rawError: unknown): string {
  const raw = rawError instanceof Error ? rawError.message : String(rawError ?? '');
  // Scrub any potential bearer tokens or provider API keys before returning
  return raw
    .replace(/(AIza[0-9A-Za-z\-_]{20,}|gsk_[0-9A-Za-z\-_]{16,}|sk-[0-9A-Za-z\-_]{16,})/g, '[REDACTED]')
    .slice(0, 220);
}

export function normalizeMessages(body: Record<string, unknown> | null | undefined): AiChatMessage[] {
  const normalized: AiChatMessage[] = [];
  if (!body || typeof body !== 'object') return normalized;

  if (Array.isArray(body.messages) && body.messages.length > 0) {
    for (const item of body.messages.slice(-MAX_MESSAGES)) {
      if (!item || typeof item !== 'object') continue;
      const rec = item as { role?: unknown; content?: unknown; text?: unknown };
      const role = rec.role === 'assistant' || rec.role === 'model' ? 'assistant' : 'user';
      const content = String(rec.content ?? rec.text ?? '').trim().slice(0, MAX_MESSAGE_CHARS);
      if (content) normalized.push({ role, content });
    }
  } else {
    if (Array.isArray(body.history)) {
      for (const item of body.history.slice(-(MAX_MESSAGES - 1))) {
        if (!item || typeof item !== 'object') continue;
        const rec = item as { role?: unknown; content?: unknown; text?: unknown };
        const role = rec.role === 'assistant' || rec.role === 'model' ? 'assistant' : 'user';
        const content = String(rec.content ?? rec.text ?? '').trim().slice(0, MAX_MESSAGE_CHARS);
        if (content) normalized.push({ role, content });
      }
    }
    const singleMsg = String(body.message ?? '').trim().slice(0, MAX_MESSAGE_CHARS);
    if (singleMsg) {
      const last = normalized[normalized.length - 1];
      if (!last || last.role !== 'user' || last.content !== singleMsg) {
        normalized.push({ role: 'user', content: singleMsg });
      }
    }
  }

  return normalized;
}

export async function parseJsonBody(
  request: Request
): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; error: string }> {
  try {
    const raw = await request.text();
    if (!raw.trim()) return { ok: true, data: {} };
    if (raw.length > MAX_JSON_BODY_BYTES) {
      return { ok: false, error: 'Request payload is too large.' };
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, error: 'Request payload must be a JSON object.' };
    }
    return { ok: true, data: parsed as Record<string, unknown> };
  } catch {
    return { ok: false, error: 'Invalid JSON request payload.' };
  }
}

function buildSystemPrompt(context: Record<string, unknown>): string {
  const safeContext =
    context && Object.keys(context).length > 0
      ? JSON.stringify(context, null, 2).slice(0, 6000)
      : '';
  const voiceMode = Boolean(context.voiceMode);
  const isMistakeFix = Boolean(context.mistakeQuestion || context.mistakeSummary);

  const lines = [
    'You are Preps AI, a friendly Indian JEE Main, JEE Advanced, NEET UG, and Class 9-12 Board bhaiya/mentor on PREPSKM.IN.',
    'Core persona and communication style (STRICTLY FOLLOW across every response):',
    '- Explain every concept in natural, warm, easy-to-understand Hinglish (conversational Hindi-English mix, like a supportive Indian senior bhaiya/mentor — e.g. "Simple funda yeh hai", "Chalo step-by-step samajhte hain", "Exam mein yahi trap aata hai") so any student can grasp even tough concepts effortlessly.',
    '- Avoid robotic textbook jargon. Break tough physics, chemistry, maths, and biology doubts into clear, relatable real-world intuition, formulas, and practical NTA/NCERT shortcuts.',
    '- NEVER use raw Markdown formatting characters (#, **, *, _, `, >, or markdown tables). Write clean plain-text paragraphs or simple numbered steps (1., 2., 3.) so every reply reads cleanly on screen and sounds super natural when spoken aloud.',
    '- Ground every progress review, chapter summary, learning path, and practice tip in the LIVE STUDENT CONTEXT below — including their Prep Score, Google Sheets performance analysis, Google Keep study notes, mock history, and weak chapters.',
    '- If totalAttempts is 0 and no Google Sheet is loaded yet, warmly encourage the student to attempt a quick CBT mock or pick one high-weightage chapter to build momentum.',
  ];

  if (isMistakeFix) {
    lines.push(
      '- MISTAKE FIX MODE: Friendly Hinglish mein batao ki galti kahan aur kyun hui (conceptual gap, formula slip, ya sign/unit trap), fir simple numbered steps mein official answer tak solve karke dikhao, aur end mein ek crisp 1-line Exam Rule do taaki student dubara ye galti kabhi na kare.'
    );
  }

  if (voiceMode) {
    lines.push(
      '- VOICE MODE ACTIVE: Keep the Hinglish reply crisp and conversational (under 85 words) in smooth spoken sentences with zero symbols or bullets so it sounds completely natural aloud.'
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

function buildSuggestedFollowUps(
  messages: AiChatMessage[],
  context: Record<string, unknown>
): string[] {
  const lastUser =
    [...messages].reverse().find((m) => m.role === 'user')?.content?.toLowerCase() ?? '';
  if (context.mistakeQuestion || context.mistakeSummary) {
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

async function fetchWithTimeout(
  fetchImpl: typeof fetch,
  url: string,
  options: RequestInit,
  timeoutMs = REQUEST_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function callOpenAiCompatible(params: {
  fetchImpl: typeof fetch;
  url: string;
  apiKey: string;
  model: string;
  systemPrompt: string;
  messages: AiChatMessage[];
  extraHeaders?: Record<string, string>;
  maxTokens?: number;
}): Promise<string> {
  const response = await fetchWithTimeout(params.fetchImpl, params.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.apiKey}`,
      ...(params.extraHeaders ?? {}),
    },
    body: JSON.stringify({
      model: params.model,
      temperature: 0.45,
      max_tokens: params.maxTokens ?? 1200,
      messages: [
        { role: 'system', content: params.systemPrompt },
        ...params.messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Provider HTTP ${response.status}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    result?: { response?: string };
    response?: string;
  };
  const text =
    data?.choices?.[0]?.message?.content ?? data?.result?.response ?? data?.response ?? '';
  const reply = typeof text === 'string' ? text.trim() : '';
  if (!reply) {
    throw new Error('Empty completion');
  }
  return reply;
}

async function callGeminiRest(params: {
  fetchImpl: typeof fetch;
  url: string;
  apiKey: string;
  systemPrompt: string;
  messages: AiChatMessage[];
  jsonMode?: boolean;
}): Promise<string> {
  const contents = params.messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const response = await fetchWithTimeout(params.fetchImpl, params.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': params.apiKey,
    },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: params.systemPrompt }],
      },
      contents,
      generationConfig: {
        temperature: 0.4,
        ...(params.jsonMode ? { responseMimeType: 'application/json' } : {}),
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Provider HTTP ${response.status}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
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

export async function runPrepsAiWithFallback(params: {
  messages: AiChatMessage[];
  context?: Record<string, unknown>;
  systemPromptOverride?: string;
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
  maxTokens?: number;
  jsonMode?: boolean;
}): Promise<
  | { ok: true; reply: string; provider: string; suggestedFollowUps: string[] }
  | { ok: false; error: string }
> {
  const runtimeEnv = params.env && typeof params.env === 'object' ? params.env : process.env;
  const fetchImpl = params.fetchImpl ?? globalThis.fetch;
  const cleanContext = sanitizeClientContext(params.context ?? {});
  const systemPrompt = params.systemPromptOverride ?? buildSystemPrompt(cleanContext);

  let configuredProviders = 0;

  for (const descriptor of AI_PROVIDER_REGISTRY) {
    const apiKey = getServerSecret(runtimeEnv, descriptor.envVar);
    if (!apiKey) continue;
    configuredProviders += 1;

    try {
      const reply =
        descriptor.protocol === 'gemini-rest'
          ? await callGeminiRest({
              fetchImpl,
              url: descriptor.endpoint,
              apiKey,
              systemPrompt,
              messages: params.messages,
              jsonMode: params.jsonMode,
            })
          : await callOpenAiCompatible({
              fetchImpl,
              url: descriptor.endpoint,
              apiKey,
              model: descriptor.model,
              systemPrompt,
              messages: params.messages,
              extraHeaders: descriptor.extraHeaders,
              maxTokens: params.maxTokens,
            });

      return {
        ok: true,
        reply,
        provider: descriptor.id,
        suggestedFollowUps: buildSuggestedFollowUps(params.messages, cleanContext),
      };
    } catch {
      // Automatically fail over to the next configured provider without leaking secrets
      continue;
    }
  }

  return {
    ok: false,
    error:
      configuredProviders === 0
        ? 'Preps AI is running in local study mode because no server AI provider keys are configured yet in Vercel Environment Variables.'
        : 'Preps AI is experiencing high demand right now across all models. Please wait a few seconds and try again.',
  };
}

export function extractJsonObject(rawText: string): Record<string, unknown> {
  const trimmed = String(rawText || '').trim();
  if (!trimmed) throw new Error('Empty AI JSON response');
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  const firstBrace = candidate.indexOf('{');
  const lastBrace = candidate.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('Could not parse structured JSON from AI response');
  }
  return JSON.parse(candidate.slice(firstBrace, lastBrace + 1)) as Record<string, unknown>;
}

export function buildTutorStudioPrompt(
  action: string,
  payload: Record<string, unknown> = {}
): { systemPrompt: string; userPrompt: string } {
  const cohortLabel = String(payload.cohortLabel || 'Class 12 JEE').slice(0, 80);
  const studentName = String(payload.studentName || 'Student').slice(0, 80);

  if (action === 'analyze-sheet') {
    const analysis = (payload.sheetAnalysis ?? {}) as Record<string, unknown>;
    const keepNotes = Array.isArray(payload.keepNotes)
      ? (payload.keepNotes as Array<Record<string, unknown>>).slice(0, 6)
      : [];
    const prompt = [
      `Student: ${studentName} | Track: ${cohortLabel}`,
      `Google Sheet Analyzed: "${String(analysis.sheetTitle || 'Student Performance Sheet').slice(0, 120)}" (Tab: "${String(analysis.tabName || 'Data').slice(0, 80)}")`,
      `Verified Quantitative Metrics (DO NOT alter these numbers):`,
      JSON.stringify(
        {
          parsedRows: analysis.parsedCount ?? 0,
          overallScorePercent: analysis.overallScorePercent ?? 0,
          overallAccuracyPercent: analysis.overallAccuracyPercent ?? 0,
          trend: analysis.trend ?? 'Steady',
          trendDeltaPercent: analysis.trendDeltaPercent ?? 0,
          strongestSubject: analysis.strongestSubject ?? null,
          weakestSubject: analysis.weakestSubject ?? null,
          subjectSummaries: Array.isArray(analysis.subjectSummaries)
            ? analysis.subjectSummaries.slice(0, 8)
            : [],
          weakChapters: Array.isArray(analysis.weakChapters)
            ? analysis.weakChapters.slice(0, 8)
            : [],
          sampleRecords: Array.isArray(analysis.records) ? analysis.records.slice(0, 12) : [],
        },
        null,
        2
      ),
      keepNotes.length > 0
        ? `Student Google Keep Study Notes:\n${JSON.stringify(
            keepNotes.map((n) => ({
              title: String(n.title || '').slice(0, 100),
              subject: String(n.subject || '').slice(0, 50),
              chapter: String(n.chapter || '').slice(0, 80),
              content: String(n.content || '').slice(0, 400),
            }))
          )}`
        : 'Student Google Keep Study Notes: None attached yet.',
      '',
      'Return ONLY valid JSON with this exact shape (warm Hinglish, ZERO raw markdown symbols):',
      '{',
      '  "verdict": "2-sentence friendly Hinglish mentor summary citing exact percentages from the sheet",',
      '  "progressTrendNote": "1-2 sentences in simple Hinglish explaining the score trend",',
      '  "strengths": ["2-3 specific strengths backed by sheet numbers"],',
      '  "priorityWeakAreas": ["2-4 highest-ROI weak chapters/concepts"],',
      '  "constructiveAdvice": ["3-4 practical Hinglish study habits"],',
      '  "recommendedNextAction": "1 clear immediate 30-minute Hinglish study step"',
      '}',
    ].join('\n');

    return {
      systemPrompt:
        'You are Preps AI, a friendly Indian JEE/NEET/Boards mentor on PREPSKM.IN. Accurately analyze the provided performance metrics and notes in warm Hinglish. Output ONLY valid JSON.',
      userPrompt: prompt,
    };
  }

  if (action === 'learning-path') {
    const subjectName = String(payload.subjectName || 'Physics').slice(0, 80);
    const chapterName = String(payload.chapterName || 'Electrostatics').slice(0, 120);
    const currentAccuracy =
      payload.currentAccuracy !== undefined && payload.currentAccuracy !== null
        ? Number(payload.currentAccuracy)
        : null;
    const sheetNotes = String(payload.sheetNotes || '').slice(0, 400);
    const keepNotes = Array.isArray(payload.keepNotes)
      ? (payload.keepNotes as Array<Record<string, unknown>>).slice(0, 5)
      : [];

    const prompt = [
      `Student: ${studentName} | Track: ${cohortLabel}`,
      `Target Subject: ${subjectName} | Target Chapter: ${chapterName}`,
      currentAccuracy !== null && Number.isFinite(currentAccuracy)
        ? `Current Chapter Accuracy: ${currentAccuracy}%`
        : 'Current Chapter Accuracy: Not logged yet.',
      sheetNotes ? `Recent Error Notes: ${sheetNotes}` : '',
      keepNotes.length > 0
        ? `Relevant Study Notes:\n${keepNotes
            .map((n) => `- ${String(n.title || '')}: ${String(n.content || '').slice(0, 350)}`)
            .join('\n')}`
        : '',
      '',
      'Return ONLY valid JSON with 4 sequential learningSteps in friendly Hinglish (no markdown):',
      '{',
      `  "chapterName": "${chapterName.replace(/"/g, '\\"')}",`,
      `  "subjectName": "${subjectName.replace(/"/g, '\\"')}",`,
      '  "readinessLevel": "Foundation Rebuild | Core Strengthening | Exam Polish",',
      '  "chapterSummary": "3-4 sentence Hinglish conceptual overview",',
      '  "keyFormulasAndConcepts": ["4-6 essential formulas explained simply"],',
      '  "learningSteps": [{ "stepNumber": 1, "phase": "Concept Clarity", "durationMinutes": 25, "objective": "Clear outcome", "actionItems": ["2-3 specific tasks"] }],',
      '  "examTrapsToAvoid": ["3-4 common NTA/Board pitfalls"],',
      '  "keepChecklistTitle": "Short study checklist title"',
      '}',
    ]
      .filter(Boolean)
      .join('\n');

    return {
      systemPrompt:
        'You are Preps AI, a friendly Indian JEE/NEET/Boards mentor on PREPSKM.IN. Output ONLY valid JSON without markdown.',
      userPrompt: prompt,
    };
  }

  if (action === 'practice-questions') {
    const subjectName = String(payload.subjectName || 'Physics').slice(0, 80);
    const chapterName = String(payload.chapterName || 'Electrostatics').slice(0, 120);
    const difficulty = String(payload.difficulty || 'Exam Level').slice(0, 40);
    const count = Math.min(5, Math.max(3, Number(payload.count) || 3));
    const focusNote = String(payload.focusNote || '').slice(0, 400);

    const prompt = [
      `Student Track: ${cohortLabel}`,
      `Subject: ${subjectName} | Chapter: ${chapterName}`,
      `Difficulty: ${difficulty} | Number of Questions: ${count}`,
      focusNote ? `Specific Focus: ${focusNote}` : '',
      '',
      `Generate exactly ${count} verified single-choice MCQ practice questions with 4 clean options (A-D).`,
      'Return ONLY valid JSON (hints & explanations in warm Hinglish, no markdown):',
      '{',
      '  "questions": [',
      '    {',
      '      "id": "q1",',
      '      "question": "Clear exam-style question statement",',
      '      "options": ["Option A", "Option B", "Option C", "Option D"],',
      '      "correctIndex": 0,',
      `      "difficulty": "${difficulty.replace(/"/g, '\\"')}",`,
      '      "conceptTag": "Short concept tag",',
      '      "hint": "1-sentence Hinglish hint",',
      '      "explanation": "Step-by-step Hinglish explanation"',
      '    }',
      '  ]',
      '}',
    ]
      .filter(Boolean)
      .join('\n');

    return {
      systemPrompt:
        'You are Preps AI, a friendly Indian JEE/NEET question author on PREPSKM.IN. Double-check calculations so correctIndex matches the right option. Output ONLY valid JSON.',
      userPrompt: prompt,
    };
  }

  throw new Error('Unsupported tutor studio action.');
}

export async function runTutorStudioWithFallback(params: {
  action: string;
  payload: Record<string, unknown>;
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
}): Promise<
  { ok: true; data: Record<string, unknown>; provider: string } | { ok: false; error: string }
> {
  const { systemPrompt, userPrompt } = buildTutorStudioPrompt(params.action, params.payload);
  const result = await runPrepsAiWithFallback({
    messages: [{ role: 'user', content: userPrompt }],
    systemPromptOverride: systemPrompt,
    context: { tutorStudioAction: params.action },
    env: params.env,
    fetchImpl: params.fetchImpl,
    maxTokens: 2400,
    jsonMode: true,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  const parsed = extractJsonObject(result.reply);
  return {
    ok: true,
    data: parsed,
    provider: result.provider,
  };
}
