import {
  extractJsonObject,
  parseJsonBody,
  resolveCorsHeaders,
  runPrepsAiWithFallback,
} from '../_lib/aiGateway';

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
  const subject = String(body.subject ?? 'Physics').trim().slice(0, 40);
  const chapter = String(body.chapter ?? 'Electrostatics').trim().slice(0, 120);
  const format = String(body.format ?? 'Quantum Clash').trim().slice(0, 60);
  const difficulty = String(body.difficulty ?? 'Exam-Grade').trim().slice(0, 40);
  const count = Math.min(8, Math.max(3, Number(body.questionCount) || 5));

  const prompt = [
    `Create a playable ${count}-question interactive study game for Indian ${exam} aspirants.`,
    `Subject: ${subject} | Chapter/Topic: ${chapter} | Game Format: ${format} | Difficulty: ${difficulty}.`,
    'Return ONLY valid JSON with this exact schema (no markdown):',
    '{',
    `  "title": "${format}: ${chapter}",`,
    `  "exam": "${exam}",`,
    `  "subject": "${subject}",`,
    `  "chapter": "${chapter}",`,
    `  "format": "${format}",`,
    `  "difficulty": "${difficulty}",`,
    '  "xpReward": 120,',
    '  "questions": [',
    '    {',
    '      "id": "q1",',
    '      "prompt": "Verified NCERT/exam question",',
    '      "options": ["Option A", "Option B", "Option C", "Option D"],',
    '      "correctIndex": 0,',
    '      "timeLimitSeconds": 35,',
    '      "hint": "Concise 1-sentence hint",',
    '      "explanation": "Crisp explanation with formula"',
    '    }',
    '  ]',
    '}',
  ].join('\n');

  try {
    const result = await runPrepsAiWithFallback({
      messages: [{ role: 'user', content: prompt }],
      systemPromptOverride:
        'You are the Prepskm Apex Arena Game Designer for JEE Main, JEE Advanced, NEET UG, and Class 9-12 Boards. Generate accurate, trick-aware study game rounds strictly matching the JSON schema.',
      env: process.env,
      maxTokens: 2400,
      jsonMode: true,
    });

    if (!result.ok) {
      return new Response(JSON.stringify({ ok: false, error: result.error }), {
        status: 503,
        headers,
      });
    }

    const game = extractJsonObject(result.reply);
    return new Response(JSON.stringify({ ok: true, game, provider: result.provider }), {
      status: 200,
      headers,
    });
  } catch {
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'Unable to generate custom game right now. Please try again in a moment.',
      }),
      { status: 502, headers }
    );
  }
}
