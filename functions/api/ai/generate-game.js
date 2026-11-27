/**
 * Cloudflare Pages Function: POST /api/ai/generate-game
 * Generates a structured JSON Prepskm 2.0 Arena interactive study game via Gemini REST API.
 */
import { resolveCorsHeaders } from '../preps-ai.js';

export async function onRequestOptions({ request }) {
  const origin = request.headers.get('origin') || '';
  return new Response(null, { status: 204, headers: resolveCorsHeaders(origin) });
}

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get('origin') || '';
  const headers = resolveCorsHeaders(origin);
  const apiKey = String(env?.GEMINI_API_KEY || env?.VITE_GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'GEMINI_API_KEY is not configured in Cloudflare Pages environment variables.',
      }),
      { status: 503, headers }
    );
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ ok: false, error: 'Invalid JSON request body.' }),
      { status: 400, headers }
    );
  }

  const exam = String(body.exam || 'JEE Main').trim().slice(0, 40);
  const subject = String(body.subject || 'Physics').trim().slice(0, 40);
  const chapter = String(body.chapter || 'Electrostatics').trim().slice(0, 120);
  const format = String(body.format || 'Formula Blitz').trim().slice(0, 60);
  const difficulty = String(body.difficulty || 'Exam-Grade').trim().slice(0, 40);
  const count = Math.min(8, Math.max(3, Number(body.questionCount) || 5));

  const prompt = [
    `Create a playable ${count}-question interactive study game for Indian ${exam} aspirants.`,
    `Subject: ${subject} | Chapter/Topic: ${chapter} | Game Format: ${format} | Difficulty: ${difficulty}.`,
    'Return ONLY valid JSON with fields: title, exam, subject, chapter, format, difficulty, xpReward (integer), and questions (array of { id, prompt, options (4 strings), correctIndex (0..3), timeLimitSeconds (20..60), hint, explanation }).',
  ].join('\n');

  try {
    const model = env?.GEMINI_MODEL || 'gemini-2.5-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.4,
        },
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return new Response(
        JSON.stringify({
          ok: false,
          error: `Gemini API failed (${resp.status}): ${errText.slice(0, 200)}`,
        }),
        { status: resp.status === 429 ? 429 : 502, headers }
      );
    }

    const data = await resp.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const game = JSON.parse(text);
    return new Response(JSON.stringify({ ok: true, game }), { status: 200, headers });
  } catch (err) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: err instanceof Error ? err.message : 'Failed to generate AI study game.',
      }),
      { status: 500, headers }
    );
  }
}
