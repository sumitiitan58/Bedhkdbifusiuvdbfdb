import {
  AI_PROVIDER_REGISTRY,
  listConfiguredProviders,
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
  const configuredProviders = listConfiguredProviders(process.env);

  return new Response(
    JSON.stringify({
      ok: true,
      service: 'prepskm-vercel-api',
      runtime: 'vercel-serverless',
      aiConfigured: configuredProviders.length > 0,
      providersReady: configuredProviders.length,
      configuredProviders,
      supportedProviders: AI_PROVIDER_REGISTRY.length,
    }),
    { status: 200, headers }
  );
}
