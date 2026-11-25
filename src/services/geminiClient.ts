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

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string } & T;
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }
  return data;
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
  suggestedFollowUps: string[];
}

export async function requestPrepsAiChat(payload: {
  message: string;
  history: PrepsAiChatMessage[];
  studentContext: unknown;
  voiceMode?: boolean;
}): Promise<PrepsAiChatResponse> {
  const data = await postJson<PrepsAiChatResponse>('/api/gemini/chat', payload);
  return {
    reply: data.reply,
    suggestedFollowUps: data.suggestedFollowUps ?? [],
  };
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
