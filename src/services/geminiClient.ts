import { generateLiveTeacherLesson } from '../utils/liveTeacherEngine';
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

export function resolveApiUrl(path: string, envBase?: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const rawBase =
    typeof envBase === 'string'
      ? envBase
      : typeof import.meta !== 'undefined' &&
          (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_API_BASE_URL
        ? (import.meta as unknown as { env?: Record<string, string | undefined> }).env!.VITE_API_BASE_URL!
        : '';
  const trimmedBase = rawBase.trim().replace(/\/+$/, '');
  return trimmedBase ? `${trimmedBase}${cleanPath}` : cleanPath;
}

class ApiHttpError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const DEFAULT_FETCH_TIMEOUT_MS = 22_000;
const RETRYABLE_HTTP_STATUSES = new Set([408, 429, 502, 503, 504]);

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

      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string } & T;
      if (!res.ok || data.ok === false) {
        const httpErr = new ApiHttpError(
          data.error || `Request failed with status ${res.status}`,
          res.status
        );
        if (attempt < maxRetries && RETRYABLE_HTTP_STATUSES.has(res.status)) {
          lastError = httpErr;
          await new Promise((r) => globalThis.setTimeout(r, 350 * (attempt + 1)));
          continue;
        }
        throw httpErr;
      }
      return data;
    } catch (err) {
      lastError = err;
      if (err instanceof ApiHttpError && !RETRYABLE_HTTP_STATUSES.has(err.status)) {
        throw err;
      }
      if (attempt < maxRetries) {
        await new Promise((r) => globalThis.setTimeout(r, 350 * (attempt + 1)));
        continue;
      }
      if (err instanceof Error && err.name === 'AbortError') {
        throw new ApiHttpError('Request timed out while contacting Preps AI.', 504);
      }
      throw err;
    } finally {
      globalThis.clearTimeout(timer);
    }
  }

  throw lastError instanceof Error ? lastError : new ApiHttpError('Network request failed.', 0);
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

function buildOfflineStudyChatFallback(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
): PrepsAiChatResponse {
  const latestPrompt =
    [...messages].reverse().find((m) => m.role === 'user')?.content?.trim() ||
    'Explain core JEE/NEET problem solving strategy';
  const lesson = generateLiveTeacherLesson({
    questionText: latestPrompt,
    source: 'preps-ai',
  });
  const reply = [
    `Chalo ${lesson.topicTitle} ko step-by-step samajhte hain:`,
    `1. ${lesson.steps[0].boardNotes}`,
    `2. ${lesson.steps[1].boardNotes}`,
    `3. ${lesson.steps[2].boardNotes}`,
    `Exam Rule: ${lesson.steps[3].proTip} (Tap "Explain Like a Teacher" for full animated whiteboard & voice!)`,
  ].join('\n');

  return {
    reply,
    provider: 'prepskm-local-tutor',
    suggestedFollowUps: lesson.quickDoubtSuggestions,
  };
}

export async function requestPrepsAiMessages(payload: {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  context?: Record<string, unknown>;
}): Promise<PrepsAiChatResponse> {
  const endpoints = ['/api/preps-ai', '/api/gemini/chat', '/api/chat'];
  let lastErr: unknown = null;

  for (const endpoint of endpoints) {
    try {
      const data = await postJson<{
        reply?: string;
        provider?: string;
        suggestedFollowUps?: string[];
      }>(endpoint, payload);

      return {
        reply: data.reply || 'Preps AI could not generate a response right now. Please try again.',
        provider: data.provider,
        suggestedFollowUps: Array.isArray(data.suggestedFollowUps) ? data.suggestedFollowUps : [],
      };
    } catch (err) {
      lastErr = err;
      const status = err instanceof ApiHttpError ? err.status : 0;
      // Retry next fallback route when endpoint returns 404/405/503 or network error
      if (status === 404 || status === 405 || status === 503 || status === 0) {
        continue;
      }
      throw err;
    }
  }

  // Seamless zero-404 local study fallback if deployed on static-only hosting without Functions/keys
  if (lastErr instanceof ApiHttpError && (lastErr.status === 404 || lastErr.status === 503)) {
    return buildOfflineStudyChatFallback(payload.messages);
  }
  return buildOfflineStudyChatFallback(payload.messages);
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
