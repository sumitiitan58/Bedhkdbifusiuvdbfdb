import { GoogleGenAI } from '@google/genai';
import { parseJsonBody, resolveCorsHeaders, sanitizeErrorMessage } from './_lib/aiGateway';

const ALLOWED_GEMINI_VOICES = ['Puck', 'Kore', 'Charon', 'Fenrir', 'Zephyr'] as const;
type GeminiVoiceName = (typeof ALLOWED_GEMINI_VOICES)[number];

function resolveGeminiVoiceName(raw: unknown): GeminiVoiceName {
  if (typeof raw === 'string') {
    const match = ALLOWED_GEMINI_VOICES.find((v) => v.toLowerCase() === raw.trim().toLowerCase());
    if (match) return match;
  }
  return 'Puck';
}

function ensurePlayableWavBase64(base64Data: string, mimeType: string): { audioBase64: string; mimeType: string } {
  const buf = Buffer.from(base64Data, 'base64');
  // Unary gemini-3.8-flash-lite-tts returns a complete RIFF WAV file directly; never double-wrap it.
  if (buf.length >= 12 && buf.subarray(0, 4).toString('ascii') === 'RIFF') {
    return { audioBase64: base64Data, mimeType: 'audio/wav' };
  }

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

  // Raw L16 PCM fallback wrapper (24kHz mono 16-bit LE)
  const rateMatch = /rate=(\d+)/i.exec(mimeType);
  const sampleRate = rateMatch ? Number(rateMatch[1]) || 24000 : 24000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;

  const wavHeader = Buffer.alloc(44);
  wavHeader.write('RIFF', 0);
  wavHeader.writeUInt32LE(36 + buf.length, 4);
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
  wavHeader.writeUInt32LE(buf.length, 40);

  return {
    audioBase64: Buffer.concat([wavHeader, buf]).toString('base64'),
    mimeType: 'audio/wav',
  };
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
  const voiceName = resolveGeminiVoiceName(parsed.data.voiceName ?? parsed.data.voice);

  if (!rawText) {
    return new Response(JSON.stringify({ ok: false, error: 'text is required for Gemini TTS.' }), {
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
        error: 'GEMINI_API_KEY is not configured in server environment.',
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
      ? 'Realistic 17 to 18-year-old Indian male student friend and mentor speaking natural conversational Hinglish with genuine human warmth, relaxed rhythm, and zero robotic stiffness'
      : 'Realistic 17 to 18-year-old Indian male student friend and mentor speaking clear, natural conversational Indian English with genuine human warmth and zero robotic stiffness';

  try {
    const ai = new GoogleGenAI({
      apiKey,
      apiVersion: 'v1beta',
      httpOptions: {
        headers: { 'User-Agent': 'aistudio-build' },
      },
    });

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
            prebuiltVoiceConfig: { voiceName },
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
      const audio = ensurePlayableWavBase64(rawBase64, rawMime);
      return new Response(
        JSON.stringify({
          ok: true,
          audioBase64: audio.audioBase64,
          mimeType: audio.mimeType,
          model: 'gemini-3.8-flash-lite-tts',
          voice: voiceName,
        }),
        { status: 200, headers }
      );
    }

    return new Response(
      JSON.stringify({
        ok: false,
        fallback: 'browser-tts',
        error: 'Gemini TTS returned empty audio.',
      }),
      { status: 200, headers }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        ok: false,
        fallback: 'browser-tts',
        error: sanitizeErrorMessage(err) || 'Gemini TTS temporarily unavailable.',
      }),
      { status: 200, headers }
    );
  }
}
