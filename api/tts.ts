import { GoogleGenAI } from '@google/genai';
import { parseJsonBody, resolveCorsHeaders, sanitizeErrorMessage } from './_lib/aiGateway';

function wrapPcmAsWavBase64(base64Data: string, mimeType: string): { audioBase64: string; mimeType: string } {
  const normalizedMime = mimeType.toLowerCase();
  if (
    normalizedMime.startsWith('audio/wav') ||
    normalizedMime.startsWith('audio/mpeg') ||
    normalizedMime.startsWith('audio/mp3') ||
    normalizedMime.startsWith('audio/ogg') ||
    normalizedMime.startsWith('audio/webm')
  ) {
    return { audioBase64: base64Data, mimeType };
  }

  const rateMatch = /rate=(\d+)/i.exec(mimeType);
  const sampleRate = rateMatch ? Number(rateMatch[1]) || 24000 : 24000;
  const pcmBuffer = Buffer.from(base64Data, 'base64');
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;

  const wavHeader = Buffer.alloc(44);
  wavHeader.write('RIFF', 0);
  wavHeader.writeUInt32LE(36 + pcmBuffer.length, 4);
  wavHeader.write('WAVE', 8);
  wavHeader.write('fmt ', 12);
  wavHeader.writeUInt32LE(16, 16);
  wavHeader.writeUInt16LE(1, 20);
  wavHeader.writeUInt16LE(numChannels, 22);
  wavHeader.writeUInt32LE(sampleRate, 24);
  wavHeader.writeUInt32LE(byteRate, 28);
  wavHeader.writeUInt16LE(blockAlign, 32);
  wavHeader.writeUInt16LE(bitsPerSample, 34);
  wavHeader.write('data', 36);
  wavHeader.writeUInt32LE(pcmBuffer.length, 40);

  return {
    audioBase64: Buffer.concat([wavHeader, pcmBuffer]).toString('base64'),
    mimeType: 'audio/wav',
  };
}

async function generateViaRestV1Beta(
  apiKey: string,
  model: string,
  promptText: string
): Promise<{ audioBase64: string; mimeType: string; model: string }> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'aistudio-build',
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: promptText }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: 'Puck',
            },
          },
        },
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`REST ${model} HTTP ${res.status}: ${errText.slice(0, 220)}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ inlineData?: { data?: string; mimeType?: string } }>;
      };
    }>;
  };
  const inlinePart = data.candidates?.[0]?.content?.parts?.find((p) => Boolean(p.inlineData?.data));
  const rawBase64 = inlinePart?.inlineData?.data;
  const rawMime = inlinePart?.inlineData?.mimeType || 'audio/L16;codec=pcm;rate=24000';
  if (!rawBase64) {
    throw new Error(`REST ${model} returned empty audio.`);
  }
  const wrapped = wrapPcmAsWavBase64(rawBase64, rawMime);
  return { ...wrapped, model };
}

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
      JSON.stringify({
        ok: false,
        fallback: 'browser-tts',
        error: 'GEMINI_API_KEY is not configured for Gemini TTS.',
      }),
      { status: 200, headers }
    );
  }

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
      ? 'Warm, friendly 18-year-old Indian peer mentor speaking natural Hinglish to a close friend at a relaxed normal conversational pace, encouraging and approachable, never robotic or rushed'
      : 'Warm, friendly 18-year-old peer mentor explaining clearly to a close friend in natural English at a relaxed normal conversational pace, encouraging and easy to follow, never robotic or rushed';

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const errors: string[] = [];

  // Attempt 1: Official @google/genai SDK with gemini-3.8-flash-lite-tts (unary returns complete WAV)
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
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

    const inlinePart = response.candidates?.[0]?.content?.parts?.find((part) =>
      Boolean((part as { inlineData?: { data?: string } }).inlineData?.data)
    ) as { inlineData?: { data?: string; mimeType?: string } } | undefined;

    const rawBase64 = inlinePart?.inlineData?.data;
    const rawMime = inlinePart?.inlineData?.mimeType || 'audio/wav';
    if (rawBase64) {
      const wrapped = wrapPcmAsWavBase64(rawBase64, rawMime);
      return new Response(
        JSON.stringify({
          ok: true,
          audioBase64: wrapped.audioBase64,
          mimeType: wrapped.mimeType,
          model: 'gemini-3.8-flash-lite-tts',
          voice: 'Puck',
        }),
        { status: 200, headers }
      );
    }
    errors.push('SDK gemini-3.8-flash-lite-tts returned empty audio.');
  } catch (err) {
    errors.push(sanitizeErrorMessage(err));
  }

  // Attempt 2 & 3: Direct v1beta REST fallback for gemini-2.5-flash-preview-tts and gemini-3.8-flash-lite-tts
  const restPrompt = `Say in a ${stylePrompt}: ${cleanSpokenText}`;
  for (const model of ['gemini-2.5-flash-preview-tts', 'gemini-3.8-flash-lite-tts'] as const) {
    try {
      const result = await generateViaRestV1Beta(apiKey, model, restPrompt);
      return new Response(
        JSON.stringify({
          ok: true,
          audioBase64: result.audioBase64,
          mimeType: result.mimeType,
          model: result.model,
          voice: 'Puck',
        }),
        { status: 200, headers }
      );
    } catch (err) {
      errors.push(sanitizeErrorMessage(err));
    }
  }

  // Graceful 200 fallback payload so browser falls back to Web Speech cleanly without console 500 errors
  return new Response(
    JSON.stringify({
      ok: false,
      fallback: 'browser-tts',
      error: errors[0] || 'Gemini TTS unavailable; using browser speech synthesis.',
    }),
    { status: 200, headers }
  );
}
