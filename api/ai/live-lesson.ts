import {
  parseJsonBody,
  resolveCorsHeaders,
  runLiveTeacherLessonWithFallback,
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
  const questionText = String(body.questionText ?? '').trim();
  if (!questionText) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'Please provide a question or concept to explain on the whiteboard.',
      }),
      { status: 400, headers }
    );
  }

  const result = await runLiveTeacherLessonWithFallback({
    questionText,
    subjectName: typeof body.subjectName === 'string' ? body.subjectName : undefined,
    chapterName: typeof body.chapterName === 'string' ? body.chapterName : undefined,
    solutionText: typeof body.solutionText === 'string' ? body.solutionText : undefined,
    officialAnswer: typeof body.officialAnswer === 'string' ? body.officialAnswer : undefined,
    studentAnswer: typeof body.studentAnswer === 'string' ? body.studentAnswer : undefined,
    env: process.env,
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
    JSON.stringify({
      ok: true,
      lesson: result.lesson,
      provider: result.provider,
    }),
    { status: 200, headers }
  );
}
