import { GoogleGenAI } from '@google/genai';
import { parseJsonBody, resolveCorsHeaders, sanitizeErrorMessage } from './_lib/aiGateway';

const GEMINI_TTS_MODEL = 'gemini-3.8-flash-lite-tts';

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

  const rawText = typeof parsed.data.text === 'string' ? parsed.data.text.trim() : '';
  const language = parsed.data.language === 'english' ? 'english' : 'hinglish';

  if (!rawText) {
    return new Response(JSON.stringify({ ok: false, error: 'text is required for TTS.' }), {
      status: 400,
      headers,
    });
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return new Response(
      JSON.stringify({ ok: false, error: 'GEMINI_API_KEY is not configured for Gemini TTS.' }),
      { status: 503, headers }
    );
  }

  // Strip raw LaTeX delimiters so the speech model speaks clean natural math phrasing
  const cleanSpokenText = rawText
    .replace(/\$\$([^$]+)\$\$/g, ' $1 ')
    .replace(/\$([^$]+)\$/g, ' $1 ')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1 over $2')
    .replace(/\\sqrt\{([^}]+)\}/g, 'square root of $1')
    .replace(/\\[a-zA-Z]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 1400);

  const stylePrompt =
    language === 'hinglish'
      ? 'Warm, friendly 18-year-old Indian peer mentor speaking natural Hinglish to a close friend, calm and clear at a relaxed normal conversational pace, encouraging and approachable, never robotic or rushed'
      : 'Warm, friendly 18-year-old peer mentor explaining clearly to a close friend in natural English, relaxed normal conversational pace, encouraging and easy to follow, never robotic or rushed';

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const response = await ai.models.generateContent({
      model: GEMINI_TTS_MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: cleanSpokenText,
              speechMetadata: { style: stylePrompt },
            } as unknown as { text: string },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: 'Puck',
            },
          },
        },
      },
    });

    const inlinePart = response.candidates?.[0]?.content?.parts?.find(
      (part) => Boolean((part as { inlineData?: { data?: string } }).inlineData?.data)
    ) as { inlineData?: { data?: string; mimeType?: string } } | undefined;

    const audioBase64 = inlinePart?.inlineData?.data;
    const mimeType = inlinePart?.inlineData?.mimeType || 'audio/wav';

    if (!audioBase64) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Gemini TTS returned empty audio data.' }),
        { status: 502, headers }
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        audioBase64,
        mimeType,
        model: GEMINI_TTS_MODEL,
        voice: 'Puck',
      }),
      { status: 200, headers }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: sanitizeErrorMessage(err) || 'Gemini TTS generation failed.',
      }),
      { status: 502, headers }
    );
  }
}
