import { resolveApiUrl } from '../services/geminiClient';

export type AiGameFormat =
  | 'Formula Blitz'
  | 'Reaction Chain'
  | 'NCERT Line-Trap'
  | 'Rapid-Fire Blitz'
  | 'Match-the-Pairs'
  | 'Spot-the-Error';

export type AiGameDifficulty = 'Easy' | 'Exam-Level' | 'Ranker';

export interface AiGeneratedQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  timeLimitSeconds: number;
  hint: string;
  explanation: string;
  pairLeft?: string;
  pairRight?: string;
  wrongToken?: string;
  correctToken?: string;
}

export interface AiGeneratedGamePayload {
  title: string;
  exam: string;
  subject: string;
  chapter: string;
  format: AiGameFormat;
  difficulty: AiGameDifficulty;
  xpReward: number;
  questions: AiGeneratedQuestion[];
}

export interface GenerateAiGameRequest {
  exam: string;
  subject: string;
  chapter: string;
  format: AiGameFormat;
  difficulty: AiGameDifficulty;
  questionCount?: number;
}

export function validateAiGamePayload(
  raw: unknown,
  requested?: Partial<GenerateAiGameRequest>
): AiGeneratedGamePayload {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid AI game payload received from server.');
  }
  const obj = raw as Record<string, unknown>;
  const rawQuestions = Array.isArray(obj.questions) ? obj.questions : [];
  if (rawQuestions.length === 0) {
    throw new Error('AI returned an empty question set. Please retry.');
  }

  const questions: AiGeneratedQuestion[] = rawQuestions
    .map((item, idx) => {
      const q = (item ?? {}) as Record<string, unknown>;
      const options = Array.isArray(q.options)
        ? q.options.map((o) => String(o ?? '').trim()).filter(Boolean)
        : [];
      const safeOptions = options.length >= 2 ? options.slice(0, 4) : ['Option A', 'Option B', 'Option C', 'Option D'];
      const rawCorrect = Number(q.correctIndex ?? 0);
      const correctIndex =
        Number.isInteger(rawCorrect) && rawCorrect >= 0 && rawCorrect < safeOptions.length
          ? rawCorrect
          : 0;
      return {
        id: String(q.id || `ai-q-${idx + 1}`),
        prompt: String(q.prompt || '').trim(),
        options: safeOptions,
        correctIndex,
        timeLimitSeconds: Math.max(10, Math.min(90, Number(q.timeLimitSeconds) || 25)),
        hint: String(q.hint || 'Recall the core NCERT / JEE formula or reaction mechanism.').trim(),
        explanation: String(
          q.explanation || 'Verify units, boundary conditions, and standard exam conventions.'
        ).trim(),
      };
    })
    .filter((q) => q.prompt.length > 0);

  if (questions.length === 0) {
    throw new Error('AI game payload contained no valid prompts.');
  }

  const resolvedExam = String(requested?.exam || obj.exam || 'JEE Main').trim();
  const resolvedSubject = String(requested?.subject || obj.subject || '').trim();
  const resolvedChapter = String(requested?.chapter || obj.chapter || '').trim();
  const resolvedFormat = (requested?.format || obj.format || 'Rapid-Fire Blitz') as AiGameFormat;
  const resolvedDifficulty = (requested?.difficulty || obj.difficulty || 'Exam-Level') as AiGameDifficulty;

  return {
    title: String(obj.title || `${resolvedChapter || 'Custom'} ${resolvedFormat}`).trim(),
    exam: resolvedExam,
    subject: resolvedSubject,
    chapter: resolvedChapter,
    format: resolvedFormat,
    difficulty: resolvedDifficulty,
    xpReward: Math.max(50, Math.min(500, Number(obj.xpReward) || questions.length * 30)),
    questions,
  };
}

export async function generateCustomAiGame(
  request: GenerateAiGameRequest
): Promise<AiGeneratedGamePayload> {
  if (!request.subject.trim() || !request.chapter.trim()) {
    throw new Error('Please choose a valid subject and chapter before generating a game.');
  }

  const response = await fetch(resolveApiUrl('/api/ai/generate-game'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(request),
  });

  const data = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    game?: unknown;
    error?: string;
  };

  if (!response.ok || !data.ok || !data.game) {
    throw new Error(
      data.error ||
        `AI Game Generator returned HTTP ${response.status}. Please retry in a moment.`
    );
  }

  return validateAiGamePayload(data.game, request);
}
