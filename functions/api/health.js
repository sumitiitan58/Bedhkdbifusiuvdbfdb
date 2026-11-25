import { parseKeyList } from './preps-ai.js';

export async function onRequestGet(context) {
  const env = context.env ?? {};
  const providersConfigured =
    parseKeyList(env.GROQ_API_KEYS, env.GROQ_API_KEY).length +
    parseKeyList(env.GEMINI_API_KEYS, env.GEMINI_API_KEY).length +
    parseKeyList(env.OPENROUTER_API_KEYS, env.OPENROUTER_API_KEY).length +
    parseKeyList(env.MISTRAL_API_KEYS, env.MISTRAL_API_KEY).length;

  return new Response(
    JSON.stringify({
      ok: true,
      service: 'prepskm-cloudflare-pages-api',
      aiConfigured: providersConfigured > 0,
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
