import {
  parseJsonBody,
  resolveCorsHeaders,
  runTutorStudioWithFallback,
  sanitizeErrorMessage,
} from '../_lib/aiGateway.js';

const ALLOWED_ACTIONS = new Set(['analyze-sheet', 'learning-path', 'practice-questions']);

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

  const action = String(parsed.data.action ?? '').trim();
  if (!ALLOWED_ACTIONS.has(action)) {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid tutor studio action.' }), {
      status: 400,
      headers,
    });
  }

  const payload =
    parsed.data.payload && typeof parsed.data.payload === 'object'
      ? (parsed.data.payload as Record<string, unknown>)
      : {};

  try {
    const result = await runTutorStudioWithFallback({
      action,
      payload,
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
      JSON.stringify({ ok: true, result: result.data, provider: result.provider }),
      { status: 200, headers }
    );
  } catch (err) {
    const detail = sanitizeErrorMessage(err);
    const isValidation = /required|unsupported/i.test(detail);
    return new Response(
      JSON.stringify({
        ok: false,
        error: detail || 'The AI Tutor could not format the response cleanly. Please try again in a moment.',
      }),
      { status: isValidation ? 400 : 502, headers }
    );
  }
}
