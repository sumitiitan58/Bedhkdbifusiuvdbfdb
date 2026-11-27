import {
  AI_PROVIDER_REGISTRY,
  countConfiguredProviders,
  resolveCorsHeaders,
} from './_lib/aiGateway';

export async function OPTIONS(request: Request): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: resolveCorsHeaders(request.headers.get('origin'), 'GET, OPTIONS'),
  });
}

export async function GET(request: Request): Promise<Response> {
  const headers = resolveCorsHeaders(request.headers.get('origin'), 'GET, OPTIONS');
  const providersReady = countConfiguredProviders(process.env);

  return new Response(
    JSON.stringify({
      ok: true,
      service: 'prepskm-vercel-api',
      runtime: 'vercel-serverless',
      aiConfigured: providersReady > 0,
      providersReady,
      supportedProviders: AI_PROVIDER_REGISTRY.length,
    }),
    { status: 200, headers }
  );
}
