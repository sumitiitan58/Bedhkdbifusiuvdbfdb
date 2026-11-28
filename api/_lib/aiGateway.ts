/**
 * Prepskm Server-Only Dynamic AI Gateway (/api/_lib/aiGateway.ts)
 *
 * Architecture Principles:
 * - Zero hardcoded or static fallback responses: every query is processed live
 *   by an active upstream AI model via an automatic failover chain.
 * - Strictly reads all 8 private API secrets directly from server-side `process.env`
 *   (never `VITE_*`, never client-supplied headers/payloads):
 *     1. GROQ_API_KEY
 *     2. GEMINI_API_KEY
 *     3. DEEPSEEK_API_KEY
 *     4. OPENROUTER_API_KEY
 *     5. MISTRAL_API_KEY & MISTRAL_API_KEYS (multi-key rotation pool)
 *     6. CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_WORKERS_AI_TOKEN
 * - Fast per-provider timeouts so multi-provider failover completes comfortably
 *   inside both Vercel Serverless Functions and mobile Safari / AI Studio preview.
 * - Captures exact sanitized upstream provider error details for transparent debugging.
 */

export const REQUEST_TIMEOUT_MS = 9_500;
export const STRUCTURED_TIMEOUT_MS = 12_000;
export const MAX_MESSAGES = 14;
export const MAX_MESSAGE_CHARS = 3_500;
export const MAX_JSON_BODY_BYTES = 18 * 1024 * 1024;

export interface AiChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ProviderFailureDetail {
  provider: string;
  status?: number;
  reason: string;
}

export interface AiProviderDescriptor {
  id: string;
  envVar: string;
  extraEnvVars?: readonly string[];
  accountIdEnvVar?: string;
  protocol: 'openai-compatible' | 'gemini-rest' | 'cloudflare-workers-ai';
  endpoint: string;
  model: string;
  structuredModel?: string;
  fallbackModels?: readonly string[];
  supportsJsonObjectFormat?: boolean;
  extraHeaders?: Record<string, string>;
}

/**
 * Extensible server-side AI provider failover chain supporting all 8 configured secrets.
 */
export const AI_PROVIDER_REGISTRY: readonly AiProviderDescriptor[] = [
  {
    id: 'groq',
    envVar: 'GROQ_API_KEY',
    protocol: 'openai-compatible',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama-3.1-8b-instant',
    structuredModel: 'llama-3.3-70b-versatile',
    fallbackModels: ['meta-llama/llama-4-scout-17b-16e-instruct', 'llama-3.1-8b-instant'],
    supportsJsonObjectFormat: true,
  },
  {
    id: 'gemini',
    envVar: 'GEMINI_API_KEY',
    protocol: 'gemini-rest',
    endpoint:
      'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
    model: 'gemini-4-hydrogen',
    fallbackModels: ['gemini-3.1-flash-lite'],
  },
  {
    id: 'openrouter',
    envVar: 'OPENROUTER_API_KEY',
    protocol: 'openai-compatible',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'openrouter/free',
    structuredModel: 'google/gemma-3-27b-it:free',
    fallbackModels: ['openrouter/free', 'qwen/qwen3-32b:free', 'meta-llama/llama-3.3-70b-instruct'],
    extraHeaders: {
      'HTTP-Referer': 'https://prepskm.in',
      'X-Title': 'PREPSKM.IN Preps AI',
    },
  },
  {
    id: 'cloudflare',
    envVar: 'CLOUDFLARE_WORKERS_AI_TOKEN',
    accountIdEnvVar: 'CLOUDFLARE_ACCOUNT_ID',
    protocol: 'cloudflare-workers-ai',
    endpoint: 'https://api.cloudflare.com/client/v4/accounts/{accountId}/ai/run/{model}',
    model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
    fallbackModels: ['@cf/meta/llama-3.1-8b-instruct-fast'],
  },
  {
    id: 'mistral',
    envVar: 'MISTRAL_API_KEY',
    extraEnvVars: ['MISTRAL_API_KEYS'],
    protocol: 'openai-compatible',
    endpoint: 'https://api.mistral.ai/v1/chat/completions',
    model: 'mistral-small-latest',
    supportsJsonObjectFormat: true,
  },
  {
    id: 'deepseek',
    envVar: 'DEEPSEEK_API_KEY',
    protocol: 'openai-compatible',
    endpoint: 'https://api.deepseek.com/chat/completions',
    model: 'deepseek-chat',
    supportsJsonObjectFormat: true,
  },
] as const;

interface ProviderCooldownEntry {
  untilMs: number;
  reason: string;
  status?: number;
}

const providerCooldownMap = new Map<string, ProviderCooldownEntry>();

export function resetProviderCooldowns(): void {
  providerCooldownMap.clear();
}

function getCooldownKey(providerLabel: string, apiKey: string): string {
  const keyTag = apiKey.slice(-6);
  return `${providerLabel}:${keyTag}`;
}

function getActiveProviderCooldown(providerLabel: string, apiKey: string): ProviderCooldownEntry | null {
  const key = getCooldownKey(providerLabel, apiKey);
  const entry = providerCooldownMap.get(key);
  if (!entry) return null;
  if (Date.now() >= entry.untilMs) {
    providerCooldownMap.delete(key);
    return null;
  }
  return entry;
}

function recordProviderCooldownIfBillingOrQuota(
  providerLabel: string,
  apiKey: string,
  status: number | undefined,
  reason: string
): void {
  const lower = reason.toLowerCase();
  let ttlMs = 0;

  if (
    status === 402 ||
    /insufficient\s+balance|subscription\s+to\s+access|payment\s+required/i.test(lower)
  ) {
    ttlMs = 15 * 60 * 1000;
  } else if (
    status === 429 &&
    /spending\s+cap|quota|billing|monthly|resource_exhausted/i.test(lower)
  ) {
    ttlMs = 5 * 60 * 1000;
  } else if (status === 401 || status === 403) {
    ttlMs = 10 * 60 * 1000;
  }

  if (ttlMs > 0) {
    providerCooldownMap.set(getCooldownKey(providerLabel, apiKey), {
      untilMs: Date.now() + ttlMs,
      reason,
      status,
    });
  }
}

export const AI_PROVIDER_ENV_VARS: readonly string[] = [
  'GROQ_API_KEY',
  'GEMINI_API_KEY',
  'MISTRAL_API_KEY',
  'MISTRAL_API_KEYS',
  'DEEPSEEK_API_KEY',
  'OPENROUTER_API_KEY',
  'CLOUDFLARE_ACCOUNT_ID',
  'CLOUDFLARE_WORKERS_AI_TOKEN',
] as const;

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
  'mistral_api_keys',
  'cloudflare_account_id',
  'cloudflare_workers_ai_token',
]);

export function getSingleApiKey(rawValue: unknown): string {
  if (typeof rawValue !== 'string') return '';
  return rawValue.trim().replace(/^['"]|['"]$/g, '').trim();
}

export function parseApiKeyPool(rawValue: unknown): string[] {
  if (typeof rawValue !== 'string') return [];
  const trimmed = rawValue.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((v) => getSingleApiKey(String(v ?? ''))).filter(Boolean);
      }
    } catch {
      // fall through to delimiter split
    }
  }
  return trimmed
    .split(/[\n,;]+/)
    .map((part) => getSingleApiKey(part))
    .filter(Boolean);
}

/**
 * Reads a private server-only secret strictly from non-VITE environment variables.
 */
export function getServerSecret(
  env: Record<string, string | undefined>,
  envVarName: string
): string {
  if (!envVarName || envVarName.startsWith('VITE_')) return '';
  return getSingleApiKey(env[envVarName]);
}

/**
 * Resolves all active key candidates for a provider descriptor (deduplicated).
 */
export function getProviderKeys(
  env: Record<string, string | undefined>,
  descriptor: AiProviderDescriptor
): string[] {
  const runtimeEnv = env && typeof env === 'object' ? env : {};
  const seen = new Set<string>();
  const out: string[] = [];

  const pushPool = (envName: string) => {
    if (!envName || envName.startsWith('VITE_')) return;
    for (const key of parseApiKeyPool(runtimeEnv[envName])) {
      if (!seen.has(key)) {
        seen.add(key);
        out.push(key);
      }
    }
  };

  pushPool(descriptor.envVar);
  if (descriptor.extraEnvVars) {
    for (const extraVar of descriptor.extraEnvVars) {
      pushPool(extraVar);
    }
  }
  return out;
}

export function listConfiguredProviders(
  env: Record<string, string | undefined> = process.env
): string[] {
  const runtimeEnv = env && typeof env === 'object' ? env : {};
  const ready: string[] = [];
  for (const provider of AI_PROVIDER_REGISTRY) {
    const keys = getProviderKeys(runtimeEnv, provider);
    if (keys.length === 0) continue;
    if (provider.accountIdEnvVar && !getServerSecret(runtimeEnv, provider.accountIdEnvVar)) {
      continue;
    }
    ready.push(provider.id);
  }
  return ready;
}

export function countConfiguredProviders(
  env: Record<string, string | undefined> = process.env
): number {
  return listConfiguredProviders(env).length;
}

export function isAllowedCorsOrigin(origin: string): boolean {
  if (!origin) return false;
  const clean = origin.trim();
  return (
    clean === 'https://prepskm.in' ||
    clean === 'https://www.prepskm.in' ||
    clean === 'http://prepskm.in' ||
    clean === 'http://www.prepskm.in' ||
    /^https:\/\/[a-z0-9.-]+\.prepskm\.in$/i.test(clean) ||
    /^https:\/\/[a-z0-9.-]+\.vercel\.app$/i.test(clean) ||
    /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(clean) ||
    /^https:\/\/[a-z0-9.-]+\.(run\.app|googleusercontent\.com|scf\.usercontent\.goog|web\.app|firebaseapp\.com|aistudio\.google\.com)$/i.test(
      clean
    )
  );
}

export function resolveCorsHeaders(
  requestOrigin: string | null | undefined,
  allowedMethods = 'POST, GET, OPTIONS'
): Record<string, string> {
  const origin = typeof requestOrigin === 'string' ? requestOrigin.trim() : '';
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': allowedMethods,
    'Access-Control-Allow-Headers': 'Content-Type, Accept, X-Requested-With',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, max-age=0',
    'X-Content-Type-Options': 'nosniff',
  };

  if (origin && isAllowedCorsOrigin(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  } else if (!origin) {
    headers['Access-Control-Allow-Origin'] = 'https://prepskm.in';
  }

  return headers;
}

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
  return raw
    .replace(
      /(AIza[0-9A-Za-z\-_]{16,}|gsk_[0-9A-Za-z\-_]{12,}|sk-[0-9A-Za-z\-_]{12,}|Bearer\s+[0-9A-Za-z\-_.]{12,}|key=[0-9A-Za-z\-_]{12,})/gi,
      '[REDACTED]'
    )
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 260);
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

function buildStrictTopicLockLine(context: Record<string, unknown>): string {
  const subject = String(context.subject ?? context.subjectName ?? '').trim();
  const chapter = String(context.chapter ?? context.chapterName ?? '').trim();
  const topic = String(context.topic ?? context.topicTitle ?? '').trim();

  const scopeParts = [
    subject ? `Subject: "${subject}"` : '',
    chapter ? `Chapter: "${chapter}"` : '',
    topic ? `Topic: "${topic}"` : '',
  ].filter(Boolean);

  if (scopeParts.length > 0) {
    return (
      `MANDATORY SUBJECT & CHAPTER LOCK (${scopeParts.join(' | ')}): ` +
      'Your entire explanation, formulas, examples, and exam tips MUST strictly match this exact subject, chapter, and user question. ' +
      'NEVER drift into unrelated default chapters or canned templates.'
    );
  }

  return (
    'MANDATORY SUBJECT & CHAPTER ACCURACY: Identify the exact subject, chapter, and concept from the user query and answer strictly for that exact question. ' +
    'NEVER substitute generic or unrelated default chapter examples.'
  );
}

export const PREPSKM_CORE_SYSTEM_PROMPT = `Platform Overview:
Prepskm (PREPSKM.IN) is a student-first, community-driven EdTech platform built for JEE Main, JEE Advanced, NEET UG, and Class 9-12 Board aspirants. It democratizes quality exam preparation by staying 100% free for students, driven by the founder's mission rather than profit motives.

Founder Background & Philosophy:
- Founder: Sumit Kumar (known as @UnfilteredSumit across YouTube, Instagram, and Telegram).
- Identity: 16-year-old EdTech blogger, daily blogger, and JEE mentor from Shivaji Nagar, Samastipur, Bihar, coming from a middle-class family with roots in business and farming.
- Motivation: Built Prepskm out of personal struggle after experiencing the trap of passively watching endless "one-shot" videos and getting stuck in note-taking without active question practice.
- Mentorship Style: Relatable peer and friend rather than a distant authority — gives honest reality checks and practical, actionable guidance.

Core Features & Content Strategy:
- Extensive Question Bank: Over 1,000,000+ questions and PYQs with a daily target of 10,000+ high-quality questions for deep practice variety.
- Active Learning Focus: Prioritizes Daily Practice Problems (DPPs), formula sheets, CBT mocks, and active question solving over passive video binge-watching.
- AI Buddy Persona: Act as a supportive, empathetic, grounding study companion and friend. Handle doubts conversationally, keep aspirants focused, and if a student asks off-topic, distracting, or inappropriate/explicit queries, gently yet firmly redirect them back to their JEE/NEET/Board preparation with warmth and zero preaching.
- Community-Driven Updates: Platform features (including interactive study games in Arena) evolve directly from student DMs and community requests.

Tone & Operational Guidelines:
- Maintain an empathetic, encouraging, grounded, and accessible tone in natural Hinglish (conversational Hindi-English mix) unless pure English is requested.
- Prioritize student clarity, active practice, and free accessibility above everything else.`;

function buildSystemPrompt(context: Record<string, unknown>): string {
  const safeContext =
    context && Object.keys(context).length > 0
      ? JSON.stringify(context, null, 2).slice(0, 6000)
      : '';
  const voiceMode = Boolean(context.voiceMode);
  const isMistakeFix = Boolean(context.mistakeQuestion || context.mistakeSummary);

  const preferredLanguage =
    context.preferredLanguage === 'english' ? 'english' : 'hinglish';

  const lines = [
    'You are Preps AI (AI Buddy), the official student-first JEE, NEET UG & Class 9-12 study companion on PREPSKM.IN — speaking with the warm, relatable persona of a real 17 to 18-year-old Indian male student mentor.',
    PREPSKM_CORE_SYSTEM_PROMPT,
    buildStrictTopicLockLine(context),
    preferredLanguage === 'english'
      ? 'STRICT LANGUAGE POLICY: The student explicitly asked this question in English. Respond in clear, natural Indian English for this turn. If the student later switches back to Hinglish or Hindi, immediately resume Hinglish.'
      : 'STRICT LANGUAGE POLICY: You MUST respond strictly in natural conversational Hinglish by default (like a friendly 17-18 year old Indian topper friend). Switch to pure English ONLY when the student explicitly asks a question purely in English.',
    'Response formatting & accuracy rules (STRICTLY FOLLOW across every response):',
    '- Break tough physics, chemistry, maths, and biology doubts into clear intuition, verified NCERT/NTA formulas, and exact step-by-step solving for the user question.',
    '- Encourage active question solving (DPPs, PYQs, formula recall) instead of passive one-shot video loops when students ask for study advice.',
    '- If the user asks about Prepskm or its founder, answer accurately using the Founder Background & Philosophy above (Sumit Kumar / @UnfilteredSumit from Shivaji Nagar, Samastipur, Bihar).',
    '- If the user sends off-topic, explicit, or inappropriate messages, do NOT entertain them — respond with a friendly, firm peer-style reality check and redirect immediately back to their study goal or next practice question.',
    '- NEVER use raw Markdown formatting characters (#, **, *, _, `, >, or markdown tables). Write clean plain-text paragraphs or simple numbered steps (1., 2., 3.).',
    '- Ground progress reviews in the LIVE STUDENT CONTEXT below when present, without inventing numbers.',
  ];

  if (isMistakeFix) {
    lines.push(
      preferredLanguage === 'english'
        ? '- MISTAKE FIX MODE: Explain clearly in English why the mistake happened on this exact question, solve it cleanly step-by-step to the official answer, and end with a crisp 1-line Exam Rule.'
        : '- MISTAKE FIX MODE: Explain clearly in Hinglish why the mistake happened on this exact question, solve it cleanly step-by-step to the official answer, and end with a crisp 1-line Exam Rule.'
    );
  }

  if (voiceMode) {
    lines.push(
      '- VOICE MODE ACTIVE: Keep the reply crisp and conversational (under 85 words) in smooth spoken sentences with zero symbols or bullets.'
    );
  } else {
    lines.push(
      '- Keep replies crisp, structured with plain numbered steps, and directly focused on the user exact query.'
    );
  }

  if (safeContext) {
    lines.push('', 'LIVE STUDENT CONTEXT:', safeContext);
  }

  return lines.join('\n');
}

function buildTopicAnchoredFollowUps(
  messages: AiChatMessage[],
  context: Record<string, unknown>
): string[] {
  const chapter = String(context.chapter ?? context.chapterName ?? '').trim();
  const subject = String(context.subject ?? context.subjectName ?? '').trim();
  const lastUser =
    [...messages].reverse().find((m) => m.role === 'user')?.content?.trim() ?? '';

  const topicLabel =
    chapter ||
    (subject ? `${subject} topic` : '') ||
    (lastUser.length > 0 ? lastUser.replace(/\s+/g, ' ').slice(0, 42) : 'this concept');

  return [
    `${topicLabel} par ek exam-level practice question do`,
    `${topicLabel} ka 10-second exam shortcut aur trap batao`,
    `${topicLabel} ke sabse important formulas summarize karo`,
  ];
}

class ProviderCallError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

async function readUpstreamErrorDetail(response: Response): Promise<string> {
  try {
    const raw = await response.text();
    if (!raw.trim()) return `HTTP ${response.status}`;
    try {
      const parsed = JSON.parse(raw) as {
        error?: string | { message?: string; code?: string; status?: string };
        message?: string;
        errors?: Array<{ message?: string; code?: number }>;
      };
      const detail =
        (typeof parsed.error === 'string'
          ? parsed.error
          : parsed.error?.message || parsed.error?.status || parsed.error?.code) ||
        parsed.message ||
        parsed.errors?.[0]?.message ||
        raw;
      return sanitizeErrorMessage(`HTTP ${response.status}: ${String(detail).slice(0, 140)}`);
    } catch {
      return sanitizeErrorMessage(`HTTP ${response.status}: ${raw.slice(0, 140)}`);
    }
  } catch {
    return `HTTP ${response.status}`;
  }
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
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ProviderCallError(`Timed out after ${timeoutMs}ms`, 504);
    }
    throw err;
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
  jsonMode?: boolean;
  supportsJsonObjectFormat?: boolean;
  timeoutMs?: number;
}): Promise<string> {
  const buildBody = (withResponseFormat: boolean) =>
    JSON.stringify({
      model: params.model,
      temperature: params.jsonMode ? 0.2 : 0.45,
      max_tokens: params.maxTokens ?? 1400,
      ...(withResponseFormat ? { response_format: { type: 'json_object' } } : {}),
      messages: [
        { role: 'system', content: params.systemPrompt },
        ...params.messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    });

  const useJsonFormat = Boolean(params.jsonMode && params.supportsJsonObjectFormat);
  let response = await fetchWithTimeout(
    params.fetchImpl,
    params.url,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${params.apiKey}`,
        ...(params.extraHeaders ?? {}),
      },
      body: buildBody(useJsonFormat),
    },
    params.timeoutMs ?? REQUEST_TIMEOUT_MS
  );

  // Some providers/models reject response_format: json_object with HTTP 400; retry once cleanly without it
  if (!response.ok && response.status === 400 && useJsonFormat) {
    response = await fetchWithTimeout(
      params.fetchImpl,
      params.url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${params.apiKey}`,
          ...(params.extraHeaders ?? {}),
        },
        body: buildBody(false),
      },
      params.timeoutMs ?? REQUEST_TIMEOUT_MS
    );
  }

  if (!response.ok) {
    const detail = await readUpstreamErrorDetail(response);
    throw new ProviderCallError(detail, response.status);
  }

  const data = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string | Array<{ type?: string; text?: string }>;
        reasoning?: string;
      };
    }>;
    result?: { response?: string };
    response?: string;
  };
  const rawContent = data?.choices?.[0]?.message?.content;
  let text = '';
  if (typeof rawContent === 'string') {
    text = rawContent;
  } else if (Array.isArray(rawContent)) {
    text = rawContent
      .map((part) => (typeof part?.text === 'string' ? part.text : ''))
      .join('');
  } else {
    text = data?.result?.response ?? data?.response ?? '';
  }
  const reply = text.trim();
  if (!reply) {
    throw new ProviderCallError('Empty completion from upstream model', 502);
  }
  return reply;
}

async function callGeminiRest(params: {
  fetchImpl: typeof fetch;
  url: string;
  model: string;
  apiKey: string;
  systemPrompt: string;
  messages: AiChatMessage[];
  jsonMode?: boolean;
  timeoutMs?: number;
}): Promise<string> {
  const contents = params.messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  // Per Gemini 4 SDK guidance: do not pass deprecated sampling parameters (temperature) to gemini-4-* models
  const isGemini4 = /^gemini-4-/i.test(params.model);
  const generationConfig: Record<string, unknown> = {};
  if (!isGemini4) {
    generationConfig.temperature = params.jsonMode ? 0.2 : 0.4;
  }
  if (params.jsonMode) {
    generationConfig.responseMimeType = 'application/json';
  }

  const response = await fetchWithTimeout(
    params.fetchImpl,
    params.url,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': params.apiKey,
        'User-Agent': 'aistudio-build',
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: params.systemPrompt }],
        },
        contents,
        ...(Object.keys(generationConfig).length > 0 ? { generationConfig } : {}),
      }),
    },
    params.timeoutMs ?? REQUEST_TIMEOUT_MS
  );

  if (!response.ok) {
    const detail = await readUpstreamErrorDetail(response);
    throw new ProviderCallError(detail, response.status);
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
    throw new ProviderCallError('Empty Gemini response candidate', 502);
  }
  return reply;
}

async function callCloudflareWorkersAi(params: {
  fetchImpl: typeof fetch;
  accountId: string;
  apiToken: string;
  endpointTemplate: string;
  model: string;
  systemPrompt: string;
  messages: AiChatMessage[];
  maxTokens?: number;
  jsonMode?: boolean;
  timeoutMs?: number;
}): Promise<string> {
  const url = params.endpointTemplate
    .replace('{accountId}', encodeURIComponent(params.accountId))
    .replace('{model}', params.model);
  const response = await fetchWithTimeout(
    params.fetchImpl,
    url,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${params.apiToken}`,
      },
      body: JSON.stringify({
        max_tokens: params.maxTokens ?? 1400,
        temperature: params.jsonMode ? 0.25 : 0.45,
        messages: [
          { role: 'system', content: params.systemPrompt },
          ...params.messages.map((m) => ({ role: m.role, content: m.content })),
        ],
      }),
    },
    params.timeoutMs ?? REQUEST_TIMEOUT_MS
  );

  if (!response.ok) {
    const detail = await readUpstreamErrorDetail(response);
    throw new ProviderCallError(detail, response.status);
  }

  const data = (await response.json()) as {
    result?: {
      response?: string | Record<string, unknown>;
      choices?: Array<{ message?: { content?: string } }>;
    };
    response?: string;
    choices?: Array<{ message?: { content?: string } }>;
  };

  const rawResult =
    data?.result?.response ??
    data?.result?.choices?.[0]?.message?.content ??
    data?.choices?.[0]?.message?.content ??
    data?.response ??
    '';

  const reply =
    typeof rawResult === 'string'
      ? rawResult.trim()
      : rawResult && typeof rawResult === 'object'
        ? JSON.stringify(rawResult)
        : '';

  if (!reply) {
    throw new ProviderCallError('Empty Cloudflare Workers AI response', 502);
  }
  return reply;
}

function getCandidateModelsForDescriptor(
  descriptor: AiProviderDescriptor,
  jsonMode?: boolean
): string[] {
  const raw = [
    ...(jsonMode && descriptor.structuredModel ? [descriptor.structuredModel] : []),
    descriptor.model,
    ...(descriptor.fallbackModels ?? []),
  ];
  return Array.from(new Set(raw.filter(Boolean)));
}

async function invokeSingleModel(params: {
  descriptor: AiProviderDescriptor;
  model: string;
  apiKey: string;
  accountId?: string;
  fetchImpl: typeof fetch;
  systemPrompt: string;
  messages: AiChatMessage[];
  maxTokens?: number;
  jsonMode?: boolean;
  timeoutMs?: number;
}): Promise<string> {
  if (params.descriptor.protocol === 'gemini-rest') {
    const geminiUrl = params.descriptor.endpoint.replace('{model}', params.model);
    return await callGeminiRest({
      fetchImpl: params.fetchImpl,
      url: geminiUrl,
      model: params.model,
      apiKey: params.apiKey,
      systemPrompt: params.systemPrompt,
      messages: params.messages,
      jsonMode: params.jsonMode,
      timeoutMs: params.timeoutMs,
    });
  }

  if (params.descriptor.protocol === 'cloudflare-workers-ai') {
    if (!params.accountId) {
      throw new ProviderCallError('Missing CLOUDFLARE_ACCOUNT_ID', 503);
    }
    return await callCloudflareWorkersAi({
      fetchImpl: params.fetchImpl,
      accountId: params.accountId,
      apiToken: params.apiKey,
      endpointTemplate: params.descriptor.endpoint,
      model: params.model,
      systemPrompt: params.systemPrompt,
      messages: params.messages,
      maxTokens: params.maxTokens,
      jsonMode: params.jsonMode,
      timeoutMs: params.timeoutMs,
    });
  }

  return await callOpenAiCompatible({
    fetchImpl: params.fetchImpl,
    url: params.descriptor.endpoint,
    apiKey: params.apiKey,
    model: params.model,
    systemPrompt: params.systemPrompt,
    messages: params.messages,
    extraHeaders: params.descriptor.extraHeaders,
    maxTokens: params.maxTokens,
    jsonMode: params.jsonMode,
    supportsJsonObjectFormat: params.descriptor.supportsJsonObjectFormat,
    timeoutMs: params.timeoutMs,
  });
}

async function invokeProviderWithKey(params: {
  descriptor: AiProviderDescriptor;
  apiKey: string;
  accountId?: string;
  fetchImpl: typeof fetch;
  systemPrompt: string;
  messages: AiChatMessage[];
  maxTokens?: number;
  jsonMode?: boolean;
  timeoutMs?: number;
}): Promise<string> {
  const candidateModels = getCandidateModelsForDescriptor(params.descriptor, params.jsonMode);

  let lastError: unknown;
  for (let idx = 0; idx < candidateModels.length; idx++) {
    const activeModel = candidateModels[idx];
    try {
      return await invokeSingleModel({
        ...params,
        model: activeModel,
      });
    } catch (err) {
      lastError = err;
      const status = err instanceof ProviderCallError ? err.status : undefined;
      const shouldRetryNextModel =
        idx < candidateModels.length - 1 &&
        (status === 404 || status === 502 || status === 503 || status === 400);
      if (shouldRetryNextModel) {
        continue;
      }
      throw err;
    }
  }

  throw lastError ?? new ProviderCallError('Upstream model invocation failed', 502);
}

function formatFailoverFailureSummary(
  attemptedProviders: string[],
  providerErrors: ProviderFailureDetail[]
): string {
  if (attemptedProviders.length === 0) {
    return (
      'No server-side AI provider keys are configured in environment secrets ' +
      '(expected GROQ_API_KEY, GEMINI_API_KEY, MISTRAL_API_KEY / MISTRAL_API_KEYS, DEEPSEEK_API_KEY, OPENROUTER_API_KEY, or CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_WORKERS_AI_TOKEN).'
    );
  }
  const summary = providerErrors
    .map((e) => `${e.provider}: ${e.reason}`)
    .join(' | ');
  return `All configured AI providers failed (${attemptedProviders.join(' -> ')}): ${summary}`;
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
  | {
      ok: true;
      reply: string;
      provider: string;
      attemptedProviders: string[];
      providerErrors?: ProviderFailureDetail[];
      suggestedFollowUps: string[];
    }
  | {
      ok: false;
      error: string;
      attemptedProviders: string[];
      providerErrors: ProviderFailureDetail[];
    }
> {
  const runtimeEnv = params.env && typeof params.env === 'object' ? params.env : process.env;
  const fetchImpl = params.fetchImpl ?? globalThis.fetch;
  const cleanContext = sanitizeClientContext(params.context ?? {});
  const systemPrompt = params.systemPromptOverride ?? buildSystemPrompt(cleanContext);

  const attemptedProviders: string[] = [];
  const providerErrors: ProviderFailureDetail[] = [];

  for (const descriptor of AI_PROVIDER_REGISTRY) {
    const keys = getProviderKeys(runtimeEnv, descriptor);
    if (keys.length === 0) continue;

    const accountId = descriptor.accountIdEnvVar
      ? getServerSecret(runtimeEnv, descriptor.accountIdEnvVar)
      : undefined;
    if (descriptor.accountIdEnvVar && !accountId) {
      providerErrors.push({
        provider: descriptor.id,
        reason: `Missing ${descriptor.accountIdEnvVar}`,
      });
      continue;
    }

    for (let keyIdx = 0; keyIdx < keys.length; keyIdx++) {
      const label = keys.length > 1 ? `${descriptor.id}#${keyIdx + 1}` : descriptor.id;
      const cooldown = getActiveProviderCooldown(label, keys[keyIdx]);
      if (cooldown) {
        providerErrors.push({
          provider: label,
          status: cooldown.status,
          reason: `Skipped during cooldown (${cooldown.reason})`,
        });
        continue;
      }

      attemptedProviders.push(label);

      try {
        const reply = await invokeProviderWithKey({
          descriptor,
          apiKey: keys[keyIdx],
          accountId,
          fetchImpl,
          systemPrompt,
          messages: params.messages,
          maxTokens: params.maxTokens,
          jsonMode: params.jsonMode,
          timeoutMs: REQUEST_TIMEOUT_MS,
        });

        return {
          ok: true,
          reply,
          provider: label,
          attemptedProviders,
          providerErrors: providerErrors.length > 0 ? providerErrors : undefined,
          suggestedFollowUps: buildTopicAnchoredFollowUps(params.messages, cleanContext),
        };
      } catch (err) {
        const status = err instanceof ProviderCallError ? err.status : undefined;
        const reason = sanitizeErrorMessage(err) || 'Unknown upstream provider error';
        recordProviderCooldownIfBillingOrQuota(label, keys[keyIdx], status, reason);
        providerErrors.push({ provider: label, status, reason });
        console.warn(`[prepskm-ai][chat] ${label} failover -> ${reason}`);
        continue;
      }
    }
  }

  const finalError = formatFailoverFailureSummary(attemptedProviders, providerErrors);
  console.error(`[prepskm-ai][chat] all providers failed -> ${finalError}`);
  return {
    ok: false,
    attemptedProviders,
    providerErrors,
    error: finalError,
  };
}

function repairJsonStringForLatex(input: string): string {
  let out = '';
  let inString = false;
  let i = 0;

  while (i < input.length) {
    const ch = input[i];

    if (!inString) {
      if (ch === '"') inString = true;
      out += ch;
      i += 1;
      continue;
    }

    if (ch === '"') {
      inString = false;
      out += ch;
      i += 1;
      continue;
    }

    if (ch === '\n') {
      out += '\\n';
      i += 1;
      continue;
    }

    if (ch === '\r') {
      i += 1;
      continue;
    }

    if (ch === '\t') {
      out += '\\t';
      i += 1;
      continue;
    }

    if (ch === '\\') {
      const next = input[i + 1];
      if (!next) {
        out += '\\\\';
        i += 1;
        continue;
      }

      // Preserve valid JSON escapes unless it is clearly a LaTeX macro like \frac, \theta, \text, \to, \right, \beta
      const rest = input.slice(i + 1);
      const isLatexMacro = /^(frac|theta|text|times|to\b|tau|tan|rightarrow|rho|right|beta|begin|binom|bar|cdot|cos|sin|sqrt|sum|sigma|prime|pi|phi|partial|alpha|approx|Delta|delta|epsilon|eta|gamma|infty|int|lambda|left|lim|ln|log|mu|nabla|neq|omega|Omega|pm|propto|psi|quad|vec|omega|varepsilon|varphi|leq|geq|equiv|implies|Rightarrow|leftrightarrow|therefore|because)/i.test(
        rest
      );

      if (isLatexMacro) {
        out += '\\\\';
        i += 1;
        continue;
      }

      if (next === '"' || next === '\\' || next === '/' || next === 'b' || next === 'f' || next === 'n' || next === 'r' || next === 't') {
        out += '\\' + next;
        i += 2;
        continue;
      }

      if (next === 'u' && /^[0-9a-fA-F]{4}/.test(input.slice(i + 2, i + 6))) {
        out += input.slice(i, i + 6);
        i += 6;
        continue;
      }

      // Escape invalid backslash (e.g., \p, \a, \s, \d, \c in LaTeX)
      out += '\\\\';
      i += 1;
      continue;
    }

    out += ch;
    i += 1;
  }

  // Strip trailing commas before } or ] and insert missing commas between adjacent JSON elements
  return out
    .replace(/,\s*([}\]])/g, '$1')
    .replace(/"(\s*\n\s*)"/g, '",$1"')
    .replace(/([}\]])(\s*\n\s*)([{["])/g, '$1,$2$3');
}

function findBalancedJsonObjectSlice(text: string): string | null {
  const start = text.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
    } else if (ch === '{') {
      depth += 1;
    } else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }

  const lastBrace = text.lastIndexOf('}');
  if (lastBrace > start) {
    return text.slice(start, lastBrace + 1);
  }
  return null;
}

export function extractJsonObject(rawText: string): Record<string, unknown> {
  // Remove reasoning blocks (e.g. <think>...</think>) emitted by reasoning models
  const cleaned = String(rawText || '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .trim();
  if (!cleaned) throw new Error('Empty AI JSON response');

  const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : cleaned;
  const slice = findBalancedJsonObjectSlice(candidate);
  if (!slice) {
    throw new Error('Could not parse structured JSON from AI response');
  }

  try {
    const parsed = JSON.parse(slice);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // fall through to structural + LaTeX repair
  }

  const repaired = repairJsonStringForLatex(slice);
  const parsed = JSON.parse(repaired);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Could not parse structured JSON from AI response');
  }
  return parsed as Record<string, unknown>;
}

/**
 * Executes a structured JSON prompt across the entire automatic multi-provider failover chain
 * (all 8 configured secrets, including model-level retries, MISTRAL_API_KEYS rotation,
 * Cloudflare Workers AI, and billing/quota circuit-breaker cooldowns).
 */
export async function runStructuredJsonWithFallback(params: {
  systemPrompt: string;
  userPrompt: string;
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
  maxTokens?: number;
  validator?: (parsed: Record<string, unknown>) => boolean;
}): Promise<
  | {
      ok: true;
      data: Record<string, unknown>;
      provider: string;
      attemptedProviders: string[];
      providerErrors?: ProviderFailureDetail[];
    }
  | {
      ok: false;
      error: string;
      attemptedProviders: string[];
      providerErrors: ProviderFailureDetail[];
    }
> {
  const runtimeEnv = params.env && typeof params.env === 'object' ? params.env : process.env;
  const fetchImpl = params.fetchImpl ?? globalThis.fetch;
  const attemptedProviders: string[] = [];
  const providerErrors: ProviderFailureDetail[] = [];

  for (const descriptor of AI_PROVIDER_REGISTRY) {
    const keys = getProviderKeys(runtimeEnv, descriptor);
    if (keys.length === 0) continue;

    const accountId = descriptor.accountIdEnvVar
      ? getServerSecret(runtimeEnv, descriptor.accountIdEnvVar)
      : undefined;
    if (descriptor.accountIdEnvVar && !accountId) {
      providerErrors.push({
        provider: descriptor.id,
        reason: `Missing ${descriptor.accountIdEnvVar}`,
      });
      continue;
    }

    const candidateModels = getCandidateModelsForDescriptor(descriptor, true);

    for (let keyIdx = 0; keyIdx < keys.length; keyIdx++) {
      const label = keys.length > 1 ? `${descriptor.id}#${keyIdx + 1}` : descriptor.id;
      const cooldown = getActiveProviderCooldown(label, keys[keyIdx]);
      if (cooldown) {
        providerErrors.push({
          provider: label,
          status: cooldown.status,
          reason: `Skipped during cooldown (${cooldown.reason})`,
        });
        continue;
      }

      attemptedProviders.push(label);
      let lastFailureReason = 'Structured JSON provider error';
      let lastFailureStatus: number | undefined;

      for (let mIdx = 0; mIdx < candidateModels.length; mIdx++) {
        const activeModel = candidateModels[mIdx];
        try {
          const rawReply = await invokeSingleModel({
            descriptor,
            model: activeModel,
            apiKey: keys[keyIdx],
            accountId,
            fetchImpl,
            systemPrompt: params.systemPrompt,
            messages: [{ role: 'user', content: params.userPrompt }],
            maxTokens: params.maxTokens ?? 2400,
            jsonMode: true,
            timeoutMs: STRUCTURED_TIMEOUT_MS,
          });

          const parsed = extractJsonObject(rawReply);
          if (params.validator && !params.validator(parsed)) {
            lastFailureReason = `Model ${activeModel} failed schema validation`;
            lastFailureStatus = undefined;
            continue;
          }

          return {
            ok: true,
            data: parsed,
            provider: label,
            attemptedProviders,
            providerErrors: providerErrors.length > 0 ? providerErrors : undefined,
          };
        } catch (err) {
          const status = err instanceof ProviderCallError ? err.status : undefined;
          const reason = sanitizeErrorMessage(err) || 'Structured JSON provider error';
          lastFailureReason = reason;
          lastFailureStatus = status;

          // Billing, auth, or spend-cap errors affect the entire provider key — cool down and move on immediately
          if (status === 401 || status === 402 || status === 403 || status === 429) {
            recordProviderCooldownIfBillingOrQuota(label, keys[keyIdx], status, reason);
            break;
          }

          // For 404, 400, 502, 503, or JSON parse failures, try next fallback model on this provider
          if (mIdx < candidateModels.length - 1) {
            continue;
          }
        }
      }

      providerErrors.push({
        provider: label,
        status: lastFailureStatus,
        reason: lastFailureReason,
      });
      console.warn(`[prepskm-ai][json] ${label} failover -> ${lastFailureReason}`);
    }
  }

  const finalError = formatFailoverFailureSummary(attemptedProviders, providerErrors);
  console.error(`[prepskm-ai][json] all providers failed -> ${finalError}`);
  return {
    ok: false,
    attemptedProviders,
    providerErrors,
    error: finalError,
  };
}

export function buildTutorStudioPrompt(
  action: string,
  payload: Record<string, unknown> = {}
): { systemPrompt: string; userPrompt: string } {
  const cohortLabel = String(payload.cohortLabel || 'Class 12 JEE / NEET').slice(0, 80);
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
        ? `Student Study Notes:\n${JSON.stringify(
            keepNotes.map((n) => ({
              title: String(n.title || '').slice(0, 100),
              subject: String(n.subject || '').slice(0, 50),
              chapter: String(n.chapter || '').slice(0, 80),
              content: String(n.content || '').slice(0, 400),
            }))
          )}`
        : 'Student Study Notes: None attached yet.',
      '',
      'Return ONLY valid JSON with this exact shape (warm Hinglish, ZERO raw markdown symbols):',
      '{',
      '  "verdict": "2-sentence friendly Hinglish mentor summary citing exact percentages from the sheet",',
      '  "progressTrendNote": "1-2 sentences in simple Hinglish explaining the score trend",',
      '  "strengths": ["2-3 specific strengths backed by sheet numbers"],',
      '  "priorityWeakAreas": ["2-4 highest-ROI weak chapters/concepts from the sheet"],',
      '  "constructiveAdvice": ["3-4 practical Hinglish study habits"],',
      '  "recommendedNextAction": "1 clear immediate 30-minute Hinglish study step"',
      '}',
    ].join('\n');

    return {
      systemPrompt:
        'You are Preps AI, a friendly Indian JEE/NEET/Boards mentor on PREPSKM.IN. Accurately analyze the provided performance metrics and notes in warm Hinglish strictly grounded in the exact subjects and chapters in the data. Output ONLY valid JSON.',
      userPrompt: prompt,
    };
  }

  if (action === 'learning-path') {
    const subjectName = String(payload.subjectName ?? '').trim().slice(0, 80);
    const chapterName = String(payload.chapterName ?? '').trim().slice(0, 120);
    if (!subjectName || !chapterName) {
      throw new Error('Both subjectName and chapterName are required to build a learning path.');
    }
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
      `STRICT SUBJECT & CHAPTER TARGET: Subject = "${subjectName}" | Chapter = "${chapterName}"`,
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
      `Every single concept, formula, step, and exam trap MUST strictly belong to "${chapterName}" in ${subjectName}. Do NOT include unrelated chapters.`,
      'Return ONLY valid JSON with 4 sequential learningSteps in friendly Hinglish (no markdown):',
      '{',
      `  "chapterName": "${chapterName.replace(/"/g, '\\"')}",`,
      `  "subjectName": "${subjectName.replace(/"/g, '\\"')}",`,
      '  "readinessLevel": "Foundation Rebuild | Core Strengthening | Exam Polish",',
      '  "chapterSummary": "3-4 sentence Hinglish conceptual overview of this exact chapter",',
      '  "keyFormulasAndConcepts": ["4-6 essential formulas strictly from this chapter"],',
      '  "learningSteps": [{ "stepNumber": 1, "phase": "Concept Clarity", "durationMinutes": 25, "objective": "Clear outcome", "actionItems": ["2-3 specific tasks"] }],',
      '  "examTrapsToAvoid": ["3-4 common NTA/Board pitfalls in this exact chapter"],',
      '  "keepChecklistTitle": "Short study checklist title for this chapter"',
      '}',
    ]
      .filter(Boolean)
      .join('\n');

    return {
      systemPrompt: `You are Preps AI, a friendly Indian JEE/NEET/Boards mentor on PREPSKM.IN. Stay 100% locked to Subject "${subjectName}" and Chapter "${chapterName}". Output ONLY valid JSON without markdown.`,
      userPrompt: prompt,
    };
  }

  if (action === 'practice-questions') {
    const subjectName = String(payload.subjectName ?? '').trim().slice(0, 80);
    const chapterName = String(payload.chapterName ?? '').trim().slice(0, 120);
    if (!subjectName || !chapterName) {
      throw new Error('Both subjectName and chapterName are required to generate practice questions.');
    }
    const difficulty = String(payload.difficulty || 'Exam Level').slice(0, 40);
    const count = Math.min(5, Math.max(3, Number(payload.count) || 3));
    const focusNote = String(payload.focusNote || '').slice(0, 400);

    const prompt = [
      `Student Track: ${cohortLabel}`,
      `STRICT SUBJECT & CHAPTER TARGET: Subject = "${subjectName}" | Chapter = "${chapterName}"`,
      `Difficulty: ${difficulty} | Number of Questions: ${count}`,
      focusNote ? `Specific Focus: ${focusNote}` : '',
      '',
      `Generate exactly ${count} verified single-choice MCQ practice questions strictly from "${chapterName}" (${subjectName}) with 4 clean options (A-D). Never substitute questions from other chapters.`,
      'Return ONLY valid JSON (hints & explanations in warm Hinglish, no markdown):',
      '{',
      '  "questions": [',
      '    {',
      '      "id": "q1",',
      '      "question": "Clear exam-style question statement strictly from this chapter",',
      '      "options": ["Option A", "Option B", "Option C", "Option D"],',
      '      "correctIndex": 0,',
      `      "difficulty": "${difficulty.replace(/"/g, '\\"')}",`,
      '      "conceptTag": "Short concept tag from this chapter",',
      '      "hint": "1-sentence Hinglish hint",',
      '      "explanation": "Step-by-step Hinglish explanation"',
      '    }',
      '  ]',
      '}',
    ]
      .filter(Boolean)
      .join('\n');

    return {
      systemPrompt: `You are Preps AI, a friendly Indian JEE/NEET question author on PREPSKM.IN. Stay 100% locked to Subject "${subjectName}" and Chapter "${chapterName}". Double-check calculations so correctIndex matches the verified answer. Output ONLY valid JSON.`,
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
  | { ok: true; data: Record<string, unknown>; provider: string }
  | {
      ok: false;
      error: string;
      attemptedProviders: string[];
      providerErrors: ProviderFailureDetail[];
    }
> {
  const { systemPrompt, userPrompt } = buildTutorStudioPrompt(params.action, params.payload);
  const result = await runStructuredJsonWithFallback({
    systemPrompt,
    userPrompt,
    env: params.env,
    fetchImpl: params.fetchImpl,
    maxTokens: 2400,
  });

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
      attemptedProviders: result.attemptedProviders,
      providerErrors: result.providerErrors,
    };
  }

  return {
    ok: true,
    data: result.data,
    provider: result.provider,
  };
}

const VALID_SVG_TYPES = new Set([
  'vectors',
  'circuit',
  'optics',
  'reaction',
  'calculus',
  'mechanics',
  'biology',
  'generic',
]);

/**
 * Generates a 100% live, dynamic 4-step whiteboard lesson for the user's exact question,
 * subject, and chapter via the automatic multi-provider failover chain.
 */
export async function runLiveTeacherLessonWithFallback(params: {
  questionText: string;
  subjectName?: string;
  chapterName?: string;
  solutionText?: string;
  officialAnswer?: string;
  studentAnswer?: string;
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
}): Promise<
  | { ok: true; lesson: Record<string, unknown>; provider: string; attemptedProviders: string[] }
  | {
      ok: false;
      error: string;
      attemptedProviders: string[];
      providerErrors: ProviderFailureDetail[];
    }
> {
  const cleanQuestion = String(params.questionText ?? '').trim().slice(0, 2000);
  if (!cleanQuestion) {
    return {
      ok: false,
      attemptedProviders: [],
      providerErrors: [],
      error: 'A question or concept prompt is required to start the Live AI Tutor.',
    };
  }

  const subjectHint = String(params.subjectName ?? '').trim().slice(0, 80);
  const chapterHint = String(params.chapterName ?? '').trim().slice(0, 120);
  const solutionHint = String(params.solutionText ?? '').trim().slice(0, 1500);
  const officialAnswer = String(params.officialAnswer ?? '').trim().slice(0, 240);
  const studentAnswer = String(params.studentAnswer ?? '').trim().slice(0, 240);

  const systemPrompt = [
    'You are Preps AI Live Tutor (AI Buddy on PREPSKM.IN — a 100% free, student-first JEE & NEET platform founded by Sumit Kumar / @UnfilteredSumit from Samastipur, Bihar).',
    'Teach like a relatable, empathetic senior mentor/friend who prioritizes active problem-solving and clarity over passive lecturing.',
    'STRICT SUBJECT & CHAPTER LOCK:',
    `- Solve EXCLUSIVELY the exact question provided by the student${subjectHint ? ` in Subject "${subjectHint}"` : ''}${chapterHint ? ` and Chapter "${chapterHint}"` : ''}.`,
    '- NEVER default to generic or unrelated templates (like inclined plane, electrostatics, or random formulas) unless the student actually asked about them.',
    '- Every step equation (boardLatex), whiteboard note (boardNotes), Hinglish narration (narrationScript), English narration (englishNarrationScript), and proTip MUST directly solve THIS exact question accurately.',
    '- Write clean LaTeX inside boardLatex (without surrounding $ signs) and DOUBLE-ESCAPE all JSON backslashes (for example: \\\\frac{a}{b}, \\\\theta, \\\\to). Write natural spoken sentences with NO raw markdown symbols (**, #, *, _) inside narrationScript and englishNarrationScript.',
    '- Output ONLY valid JSON matching the exact requested schema.',
  ].join('\n');

  const userPrompt = [
    subjectHint ? `Requested Subject: ${subjectHint}` : 'Infer Subject accurately from the question.',
    chapterHint ? `Requested Chapter: ${chapterHint}` : 'Infer Chapter accurately from the question.',
    `Student Question: "${cleanQuestion}"`,
    officialAnswer ? `Official Verified Answer: ${officialAnswer}` : '',
    studentAnswer ? `Student Attempted Answer: ${studentAnswer}` : '',
    solutionHint ? `Reference Solution Context: ${solutionHint}` : '',
    '',
    'Return ONLY valid JSON with EXACTLY 4 progressive whiteboard steps:',
    '{',
    '  "topicTitle": "Short crisp title matching the exact chapter & concept of this question",',
    '  "subjectName": "Exact subject (Physics | Chemistry | Mathematics | Biology)",',
    '  "chapterName": "Exact chapter name for this question",',
    '  "svgType": "one of: vectors | circuit | optics | reaction | calculus | mechanics | biology | generic",',
    `  "questionPrompt": "${cleanQuestion.replace(/"/g, '\\"')}",`,
    '  "officialAnswer": "Verified final answer to this question",',
    '  "steps": [',
    '    {',
    '      "stepNumber": 1,',
    '      "title": "Step 1 concise whiteboard heading",',
    '      "boardLatex": "Pure LaTeX formula/relation for step 1 (no $ delimiters)",',
    '      "boardNotes": "Concise handwritten note for step 1",',
    '      "narrationScript": "Warm Hinglish spoken explanation for step 1 (2-3 natural sentences, no markdown)",',
    '      "englishNarrationScript": "Clear English spoken explanation for step 1 (2-3 natural sentences, no markdown)",',
    '      "proTip": "1-sentence exam shortcut or trap warning specific to this step",',
    '      "svgType": "matching svgType"',
    '    }',
    '  ],',
    '  "quickDoubtSuggestions": [',
    '    "3 short, topic-specific student cross-questions about THIS exact solution"',
    '  ]',
    '}',
  ]
    .filter(Boolean)
    .join('\n');

  const result = await runStructuredJsonWithFallback({
    systemPrompt,
    userPrompt,
    env: params.env,
    fetchImpl: params.fetchImpl,
    maxTokens: 2800,
    validator: (parsed) => Array.isArray(parsed.steps) && parsed.steps.length >= 2,
  });

  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
      attemptedProviders: result.attemptedProviders,
      providerErrors: result.providerErrors,
    };
  }

  const raw = result.data;
  const resolvedSvg = VALID_SVG_TYPES.has(String(raw.svgType ?? ''))
    ? String(raw.svgType)
    : 'generic';
  const rawSteps = Array.isArray(raw.steps) ? raw.steps : [];

  const steps = rawSteps.slice(0, 4).map((item, idx) => {
    const s = (item ?? {}) as Record<string, unknown>;
    const stepSvg = VALID_SVG_TYPES.has(String(s.svgType ?? ''))
      ? String(s.svgType)
      : resolvedSvg;
    const cleanLatex = String(s.boardLatex ?? '')
      .replace(/^\$\$?|\$\$?$/g, '')
      .trim();
    const notes = String(s.boardNotes ?? '').trim();
    const hinglish = String(s.narrationScript ?? notes).trim();
    const english = String(s.englishNarrationScript ?? hinglish).trim();

    return {
      stepNumber: idx + 1,
      title: String(s.title || `Step ${idx + 1}`).trim(),
      boardLatex: cleanLatex || String(s.title || `Step ${idx + 1}`),
      boardNotes: notes || hinglish,
      narrationScript: hinglish || notes,
      englishNarrationScript: english || hinglish,
      proTip: String(s.proTip || 'Double-check units, signs, and boundary conditions.').trim(),
      svgType: stepSvg,
    };
  });

  const resolvedSubject = String(raw.subjectName || subjectHint || 'Science').trim();
  const resolvedChapter = String(raw.chapterName || chapterHint || raw.topicTitle || 'Core Concept').trim();
  const resolvedTopic = String(raw.topicTitle || resolvedChapter).trim();
  const quickDoubts = Array.isArray(raw.quickDoubtSuggestions)
    ? raw.quickDoubtSuggestions.map((d) => String(d ?? '').trim()).filter(Boolean).slice(0, 3)
    : [];

  const lesson = {
    id: `live-ai-lesson-${Date.now()}`,
    topicTitle: resolvedTopic,
    subjectName: resolvedSubject,
    chapterName: resolvedChapter,
    svgType: resolvedSvg,
    questionPrompt: cleanQuestion,
    officialAnswer: officialAnswer || String(raw.officialAnswer ?? '').trim() || undefined,
    studentAnswer: studentAnswer || undefined,
    steps,
    quickDoubtSuggestions:
      quickDoubts.length > 0
        ? quickDoubts
        : [
            `Step 2 mein ${resolvedChapter} ka formula kaise apply hua?`,
            `Is ${resolvedChapter} question ka 10-second shortcut kya hai?`,
            `${resolvedChapter} mein sabse common exam trap kya hai?`,
          ],
  };

  return {
    ok: true,
    lesson,
    provider: result.provider,
    attemptedProviders: result.attemptedProviders,
  };
}
