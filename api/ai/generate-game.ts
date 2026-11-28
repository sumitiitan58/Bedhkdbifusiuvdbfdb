import {
  parseJsonBody,
  resolveCorsHeaders,
  runStructuredJsonWithFallback,
} from '../_lib/aiGateway.js';

export async function OPTIONS(request: Request): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: resolveCorsHeaders(request.headers.get('origin'), 'POST, OPTIONS'),
  });
}

export async function POST(request: Request): Promise<Response> {
  const headers = resolveCorsHeaders(request.headers.get('origin'), 'POST, OPTIONS');
  const parsed = await parseJsonBody(request);
  if (!parsed.ok) {
    return new Response(JSON.stringify({ ok: false, error: parsed.error }), {
      status: 400,
      headers,
    });
  }

  const body = parsed.data;
  const exam = String(body.exam ?? 'JEE Main').trim().slice(0, 40);
  const subject = String(body.subject ?? '').trim().slice(0, 40);
  const chapter = String(body.chapter ?? '').trim().slice(0, 120);
  const format = String(body.format ?? 'Quantum Clash').trim().slice(0, 60);
  const difficulty = String(body.difficulty ?? 'Exam-Level').trim().slice(0, 40);
  const count = Math.min(8, Math.max(3, Number(body.questionCount) || 5));

  if (!subject || !chapter) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'Both subject and chapter are required to generate a tailored Apex Arena game.',
      }),
      { status: 400, headers }
    );
  }

  const prompt = [
    `Create a playable ${count}-question interactive study game for Indian ${exam} aspirants.`,
    `STRICT SUBJECT & CHAPTER LOCK: Subject = "${subject}" | Chapter/Topic = "${chapter}" | Game Format = "${format}" | Difficulty = "${difficulty}".`,
    `Every single question, option, hint, and explanation MUST strictly belong to "${chapter}" in ${subject} aligned with NCERT / ${exam} syllabus. Never generate questions from any other chapter.`,
    'Return ONLY valid JSON with this exact schema (no markdown):',
    '{',
    `  "title": "${format}: ${chapter.replace(/"/g, '\\"')}",`,
    `  "exam": "${exam.replace(/"/g, '\\"')}",`,
    `  "subject": "${subject.replace(/"/g, '\\"')}",`,
    `  "chapter": "${chapter.replace(/"/g, '\\"')}",`,
    `  "format": "${format.replace(/"/g, '\\"')}",`,
    `  "difficulty": "${difficulty.replace(/"/g, '\\"')}",`,
    '  "xpReward": 120,',
    '  "questions": [',
    '    {',
    '      "id": "q1",',
    '      "prompt": "Verified NCERT/exam question strictly from this chapter",',
    '      "options": ["Option A", "Option B", "Option C", "Option D"],',
    '      "correctIndex": 0,',
    '      "timeLimitSeconds": 35,',
    '      "hint": "Concise 1-sentence hint",',
    '      "explanation": "Crisp explanation with formula"',
    '    }',
    '  ]',
    '}',
  ].join('\n');

  const result = await runStructuredJsonWithFallback({
    systemPrompt: `You are the Prepskm Apex Arena Game Designer for ${exam}. Stay 100% locked to Subject "${subject}" and Chapter "${chapter}". Generate verified, zero-hallucination multiple-choice study game rounds strictly matching the JSON schema.`,
    userPrompt: prompt,
    env: process.env,
    maxTokens: 2600,
    validator: (data) => Array.isArray(data.questions) && data.questions.length > 0,
  });

  if (!result.ok) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: result.error,
        attemptedProviders: result.attemptedProviders,
        providerErrors: result.providerErrors,
      }),
      {
        status: 503,
        headers,
      }
    );
  }

  return new Response(
    JSON.stringify({ ok: true, game: result.data, provider: result.provider }),
    { status: 200, headers }
  );
}
