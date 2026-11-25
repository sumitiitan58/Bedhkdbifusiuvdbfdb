import { countConfiguredProviders } from './preps-ai.js';

export async function onRequestGet(context) {
  const env = context.env ?? {};
  const providersConfigured = countConfiguredProviders(env);

  return new Response(
    JSON.stringify({
      ok: true,
      service: 'prepskm-cloudflare-pages-api',
      aiConfigured: providersConfigured > 0,
      providersReady: providersConfigured,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    }
  );
}
