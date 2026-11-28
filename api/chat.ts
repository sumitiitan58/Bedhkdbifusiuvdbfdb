import {
  normalizeMessages,
  parseJsonBody,
  resolveCorsHeaders,
  runPrepsAiWithFallback,
  sanitizeClientContext,
  sanitizeErrorMessage,
} from './_lib/aiGateway.js';

export async function OPTIONS(request: Request): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: resolveCorsHeaders(request.headers.get('origin'), 'POST, OPTIONS'),
  });
}

export async function POST(request: Request): Promise<Response> {
  const headers = resolveCorsHeaders(request.headers.get('origin'), 'POST, OPTIONS');
  try {
    const parsed = await parseJsonBody(request);
    if (!parsed.ok) {
      return new Response(JSON.stringify({ ok: false, error: parsed.error }), {
        status: 400,
        headers,
      });
    }

    const body = parsed.data;
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

    const studentContext = sanitizeClientContext(body.context ?? body.studentContext ?? {});
    if (body.voiceMode) {
      studentContext.voiceMode = true;
    }

    const result = await runPrepsAiWithFallback({
      messages,
      context: studentContext,
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
  } catch (err) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: sanitizeErrorMessage(err) || 'Preps AI encountered an unexpected server error.',
      }),
      { status: 500, headers }
    );
  }
}
