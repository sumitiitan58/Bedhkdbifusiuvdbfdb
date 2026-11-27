import type {
  LiveTeacherLesson,
  LiveTeacherLessonRequest,
} from '../utils/liveTeacherEngine';
import type {
  KeepStudyNote,
  SheetPerformanceAnalysis,
  TutorLearningPath,
  TutorPracticeQuestion,
  TutorSheetFeedback,
} from '../utils/sheetTutorAnalyzer';

export interface GeminiMentorPlanDay {
  day: string;
  focus: string;
}

export interface GeminiMentorResponse {
  headline: string;
  iqDiagnosis: string;
  mustDoPriorities: string[];
  avoidOrSkip: string[];
  sevenDayPlan: GeminiMentorPlanDay[];
  directAnswer: string;
}

export interface GeminiExtractedQuestion {
  questionNumber: number;
  subjectName: string;
  chapterName?: string;
  questionType: 'single-mcq' | 'multi-mcq' | 'integer';
  questionText: string;
  optionTexts?: string[];
  correctOptionIndices?: number[];
  numericalAnswer?: string;
  solutionText: string;
}

export interface GeminiQuestionExplanation {
  coreConcept: string;
  stepByStep: string[];
  examShortcut: string;
}

function isSameOriginHostedEnv(hostname: string): boolean {
  const host = hostname.trim().toLowerCase();
  if (!host) return false;
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host === 'prepskm.in' ||
    host === 'www.prepskm.in' ||
    host.endsWith('.prepskm.in') ||
    host.endsWith('.vercel.app') ||
    host.endsWith('.run.app') ||
    host.endsWith('.googleusercontent.com') ||
    host.endsWith('.scf.usercontent.goog') ||
    host.endsWith('.web.app') ||
    host.endsWith('.firebaseapp.com') ||
    host.endsWith('.aistudio.google.com')
  );
}

function isDisallowedApiBaseUrl(base: string): boolean {
  try {
    const parsed = new URL(base);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return true;
    }
    const host = parsed.hostname.toLowerCase();
    // Never allow accidental Cloudflare dashboard URLs (e.g., dash.cloudflare.com) to hijack /api/* calls
    if (host === 'dash.cloudflare.com' || host.endsWith('.dash.cloudflare.com')) {
      return true;
    }
    if (host === 'cloudflare.com' || host === 'www.cloudflare.com') {
      return true;
    }
    return false;
  } catch {
    return true;
  }
}

export function resolveApiUrl(
  path: string,
  envBase?: string,
  runtimeHostname?: string
): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const activeHostname =
    typeof runtimeHostname === 'string'
      ? runtimeHostname
      : typeof window !== 'undefined' && window.location?.hostname
        ? window.location.hostname
        : '';

  // Always use same-origin relative endpoints (/api/chat, /api/preps-ai, etc.)
  // when running on localhost, Google AI Studio preview, prepskm.in, or Vercel.
  if (activeHostname && isSameOriginHostedEnv(activeHostname)) {
    return cleanPath;
  }

  const rawBase =
    typeof envBase === 'string'
      ? envBase
      : typeof import.meta !== 'undefined' &&
          (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_API_BASE_URL
        ? (import.meta as unknown as { env?: Record<string, string | undefined> }).env!.VITE_API_BASE_URL!
        : '';
  const trimmedBase = rawBase.trim().replace(/\/+$/, '');
  if (!trimmedBase || isDisallowedApiBaseUrl(trimmedBase)) {
    return cleanPath;
  }
  return `${trimmedBase}${cleanPath}`;
}

export interface ProviderErrorSummary {
  provider: string;
  status?: number;
  reason: string;
}

class ApiHttpError extends Error {
  status: number;
  providerErrors?: ProviderErrorSummary[];
  constructor(message: string, status: number, providerErrors?: ProviderErrorSummary[]) {
    super(message);
    this.status = status;
    this.providerErrors = providerErrors;
  }
}

const DEFAULT_FETCH_TIMEOUT_MS = 35_000;
const RETRYABLE_HTTP_STATUSES = new Set([408, 429, 502, 503, 504]);

function formatApiErrorMessage(
  endpoint: string,
  status: number,
  data: { error?: string; providerErrors?: ProviderErrorSummary[] }
): string {
  if (typeof data.error === 'string' && data.error.trim()) {
    return data.error.trim();
  }
  if (Array.isArray(data.providerErrors) && data.providerErrors.length > 0) {
    const details = data.providerErrors.map((e) => `${e.provider}: ${e.reason}`).join(' | ');
    return `AI provider error at ${endpoint} (HTTP ${status}): ${details}`;
  }
  return `Preps AI endpoint ${endpoint} returned HTTP ${status}.`;
}

function normalizeNetworkError(err: unknown, endpoint: string, timeoutMs: number): ApiHttpError {
  if (err instanceof ApiHttpError) return err;
  if (err instanceof Error && err.name === 'AbortError') {
    return new ApiHttpError(
      `Request to ${endpoint} timed out after ${Math.round(timeoutMs / 1000)}s while waiting for active AI models.`,
      504
    );
  }
  const raw = err instanceof Error ? err.message : String(err ?? '');
  if (/load failed|failed to fetch|networkerror/i.test(raw)) {
    return new ApiHttpError(
      `Network connection to ${endpoint} was interrupted (${raw}). Verify internet connectivity or Vercel API route availability and retry.`,
      0
    );
  }
  return new ApiHttpError(raw || `Unexpected network error calling ${endpoint}.`, 0);
}

async function postJson<T>(
  url: string,
  body: unknown,
  options: { timeoutMs?: number; maxRetries?: number } = {}
): Promise<T> {
  const resolvedUrl = resolveApiUrl(url);
  const timeoutMs = options.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
  const maxRetries = options.maxRetries ?? 1;

  let lastError: unknown = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = globalThis.setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(resolvedUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        providerErrors?: ProviderErrorSummary[];
      } & T;
      if (!res.ok || data.ok === false) {
        const httpErr = new ApiHttpError(
          formatApiErrorMessage(resolvedUrl, res.status, data),
          res.status,
          data.providerErrors
        );
        if (attempt < maxRetries && RETRYABLE_HTTP_STATUSES.has(res.status)) {
          lastError = httpErr;
          await new Promise((r) => globalThis.setTimeout(r, 400 * (attempt + 1)));
          continue;
        }
        throw httpErr;
      }
      return data;
    } catch (err) {
      const normalized = normalizeNetworkError(err, resolvedUrl, timeoutMs);
      lastError = normalized;
      if (normalized.status > 0 && !RETRYABLE_HTTP_STATUSES.has(normalized.status)) {
        throw normalized;
      }
      if (attempt < maxRetries) {
        await new Promise((r) => globalThis.setTimeout(r, 400 * (attempt + 1)));
        continue;
      }
      throw normalized;
    } finally {
      globalThis.clearTimeout(timer);
    }
  }

  throw normalizeNetworkError(lastError, resolvedUrl, timeoutMs);
}

export async function requestGeminiMentor(payload: {
  studentName: string;
  cohortLabel: string;
  attemptsCount: number;
  averageAccuracy: number;
  averageIqScore: number;
  latestIqScore: number;
  paceSummary: { tooFast: number; optimal: number; tooSlow: number; unattempted: number };
  subjectPerformance: Array<{ subject: string; accuracy: number; scorePct: number }>;
  weakChapters: Array<{ chapterName: string; subjectName: string; accuracy: number }>;
  weeklyCompletionPercent: number;
  userQuestion?: string;
}): Promise<GeminiMentorResponse> {
  const data = await postJson<{ mentor: GeminiMentorResponse }>('/api/gemini/mentor', payload);
  return data.mentor;
}

export async function requestGeminiPdfExtraction(payload: {
  fileBase64?: string;
  mimeType?: string;
  rawTextInput?: string;
  defaultSubject: string;
  examType: string;
  maxQuestions?: number;
}): Promise<GeminiExtractedQuestion[]> {
  const data = await postJson<{ questions: GeminiExtractedQuestion[] }>(
    '/api/gemini/extract-pdf',
    payload
  );
  return data.questions;
}

export async function requestGeminiQuestionExplanation(payload: {
  subjectName: string;
  chapterName?: string;
  questionText: string;
  optionTexts?: string[];
  correctAnswer: string;
  studentAnswer: string;
  solutionText?: string;
}): Promise<GeminiQuestionExplanation> {
  const data = await postJson<{ explanation: GeminiQuestionExplanation }>(
    '/api/gemini/explain-question',
    payload
  );
  return data.explanation;
}

export interface PrepsAiChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

export interface PrepsAiChatResponse {
  reply: string;
  provider?: string;
  suggestedFollowUps: string[];
}

export async function requestPrepsAiMessages(payload: {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  context?: Record<string, unknown>;
}): Promise<PrepsAiChatResponse> {
  const endpoints = ['/api/chat', '/api/preps-ai', '/api/gemini/chat'];
  let lastErr: unknown = null;

  for (const endpoint of endpoints) {
    try {
      const data = await postJson<{
        reply?: string;
        provider?: string;
        suggestedFollowUps?: string[];
      }>(endpoint, payload);

      const cleanReply = typeof data.reply === 'string' ? data.reply.trim() : '';
      if (!cleanReply) {
        throw new ApiHttpError('Active AI model returned an empty response.', 502);
      }

      return {
        reply: cleanReply,
        provider: data.provider,
        suggestedFollowUps: Array.isArray(data.suggestedFollowUps) ? data.suggestedFollowUps : [],
      };
    } catch (err) {
      lastErr = err;
      const status = err instanceof ApiHttpError ? err.status : 0;
      // Fail over cleanly to alternate backend endpoint on route/transient errors
      if (status === 404 || status === 405 || status === 502 || status === 503 || status === 504 || status === 0) {
        continue;
      }
      throw err;
    }
  }

  throw lastErr instanceof Error
    ? lastErr
    : new ApiHttpError(
        'Preps AI live models are currently unreachable. Please check server environment keys and retry.',
        503
      );
}

export async function requestLiveTeacherLesson(
  payload: LiveTeacherLessonRequest
): Promise<{ lesson: LiveTeacherLesson; provider?: string }> {
  const data = await postJson<{ lesson?: LiveTeacherLesson; provider?: string }>(
    '/api/ai/live-lesson',
    {
      questionText: payload.questionText,
      subjectName: payload.subjectName,
      chapterName: payload.chapterName,
      solutionText: payload.solutionText,
      officialAnswer: payload.officialAnswer,
      studentAnswer: payload.studentAnswer,
    },
    { timeoutMs: 28_000, maxRetries: 1 }
  );

  if (!data.lesson || !Array.isArray(data.lesson.steps) || data.lesson.steps.length === 0) {
    throw new ApiHttpError(
      'Live AI Tutor returned an incomplete lesson. Please tap Retry to regenerate.',
      502
    );
  }

  return {
    lesson: data.lesson,
    provider: data.provider,
  };
}

export async function requestPrepsAiChat(payload: {
  message: string;
  history: PrepsAiChatMessage[];
  studentContext: unknown;
  voiceMode?: boolean;
}): Promise<PrepsAiChatResponse> {
  const mappedHistory = (payload.history ?? [])
    .filter((item) => item && typeof item.text === 'string' && item.text.trim())
    .map((item) => ({
      role: item.role,
      content: item.text.trim(),
    }));

  const cleanMessage = payload.message.trim();
  const last = mappedHistory[mappedHistory.length - 1];
  const messages =
    last && last.role === 'user' && last.content === cleanMessage
      ? mappedHistory
      : [...mappedHistory, { role: 'user' as const, content: cleanMessage }];

  const baseContext =
    payload.studentContext && typeof payload.studentContext === 'object'
      ? (payload.studentContext as Record<string, unknown>)
      : {};

  return requestPrepsAiMessages({
    messages,
    context: {
      ...baseContext,
      voiceMode: Boolean(payload.voiceMode),
    },
  });
}

export interface TestAiReport {
  verdict: string;
  markLeakAnalysis: string;
  strengths: string[];
  immediateFixes: string[];
  nextMockTarget: string;
}

export async function requestTestAiReport(payload: {
  testTitle: string;
  cohortLabel: string;
  metrics: unknown;
  subjectScores: unknown;
  attemptBuckets: unknown;
  difficultyBreakdown: unknown;
}): Promise<TestAiReport> {
  const data = await postJson<{ report: TestAiReport }>('/api/gemini/test-report', payload);
  return data.report;
}

export async function requestTutorSheetFeedback(payload: {
  studentName: string;
  cohortLabel: string;
  sheetAnalysis: SheetPerformanceAnalysis;
  keepNotes: KeepStudyNote[];
}): Promise<{ feedback: TutorSheetFeedback; provider?: string }> {
  const data = await postJson<{ result: TutorSheetFeedback; provider?: string }>(
    '/api/ai/tutor-studio',
    {
      action: 'analyze-sheet',
      payload,
    }
  );
  return { feedback: data.result, provider: data.provider };
}

export async function requestTutorLearningPath(payload: {
  studentName: string;
  cohortLabel: string;
  subjectName: string;
  chapterName: string;
  currentAccuracy?: number | null;
  sheetNotes?: string;
  keepNotes: KeepStudyNote[];
}): Promise<{ learningPath: TutorLearningPath; provider?: string }> {
  const data = await postJson<{ result: TutorLearningPath; provider?: string }>(
    '/api/ai/tutor-studio',
    {
      action: 'learning-path',
      payload,
    }
  );
  return { learningPath: data.result, provider: data.provider };
}

export async function requestTutorPracticeQuestions(payload: {
  cohortLabel: string;
  subjectName: string;
  chapterName: string;
  difficulty: 'Foundation' | 'Exam Level' | 'Challenge';
  count: number;
  focusNote?: string;
}): Promise<{ questions: TutorPracticeQuestion[]; provider?: string }> {
  const data = await postJson<{
    result: { questions?: TutorPracticeQuestion[] };
    provider?: string;
  }>('/api/ai/tutor-studio', {
    action: 'practice-questions',
    payload,
  });
  const list = Array.isArray(data.result?.questions) ? data.result.questions : [];
  return { questions: list, provider: data.provider };
}
