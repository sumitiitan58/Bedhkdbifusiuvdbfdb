export const GEMINI_VOICES = [
  { id: 'Puck', label: 'Puck', vibe: 'Upbeat Buddy' },
  { id: 'Kore', label: 'Kore', vibe: 'Clear & Calm' },
  { id: 'Charon', label: 'Charon', vibe: 'Deep Mentor' },
  { id: 'Fenrir', label: 'Fenrir', vibe: 'Bold Coach' },
  { id: 'Zephyr', label: 'Zephyr', vibe: 'Bright & Crisp' },
] as const;

export type GeminiVoiceName = (typeof GEMINI_VOICES)[number]['id'];

export const DEFAULT_GEMINI_VOICE: GeminiVoiceName = 'Puck';

const VOICE_STORAGE_KEY = 'prepskm_gemini_voice';
const VOICE_CHANGE_EVENT = 'prepskm:gemini-voice-change';

export interface SpeakTextOptions {
  language?: 'hinglish' | 'english';
  voiceName?: GeminiVoiceName;
  rate?: number;
  pitch?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: () => void;
}

export interface BrowserVoiceLike {
  name: string;
  lang: string;
  localService?: boolean;
  default?: boolean;
}

let activeAudioElement: HTMLAudioElement | null = null;
let activeObjectUrl: string | null = null;
let activeAbortController: AbortController | null = null;
let speechSessionCounter = 0;

export function resolveGeminiVoice(raw: unknown): GeminiVoiceName {
  if (typeof raw === 'string') {
    const found = GEMINI_VOICES.find((v) => v.id.toLowerCase() === raw.trim().toLowerCase());
    if (found) return found.id;
  }
  return DEFAULT_GEMINI_VOICE;
}

export function getPreferredGeminiVoice(): GeminiVoiceName {
  if (typeof window === 'undefined') return DEFAULT_GEMINI_VOICE;
  try {
    return resolveGeminiVoice(window.localStorage.getItem(VOICE_STORAGE_KEY));
  } catch {
    return DEFAULT_GEMINI_VOICE;
  }
}

export function setPreferredGeminiVoice(voice: GeminiVoiceName): GeminiVoiceName {
  const safe = resolveGeminiVoice(voice);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(VOICE_STORAGE_KEY, safe);
    } catch {
      // ignore storage quota / private mode
    }
    window.dispatchEvent(new CustomEvent<GeminiVoiceName>(VOICE_CHANGE_EVENT, { detail: safe }));
  }
  return safe;
}

export function subscribeGeminiVoice(listener: (voice: GeminiVoiceName) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (event: Event) => {
    const custom = event as CustomEvent<GeminiVoiceName>;
    listener(resolveGeminiVoice(custom.detail ?? getPreferredGeminiVoice()));
  };
  window.addEventListener(VOICE_CHANGE_EVENT, handler);
  return () => window.removeEventListener(VOICE_CHANGE_EVENT, handler);
}

/**
 * Pure ranking selector for browser SpeechSynthesis fallback voices
 * (used only if Gemini TTS is offline or unconfigured).
 */
export function selectBestIndianVoice<T extends BrowserVoiceLike>(
  voices: readonly T[],
  language: 'hinglish' | 'english' = 'hinglish'
): T | null {
  if (!voices || voices.length === 0) return null;

  const scoreVoice = (v: T): number => {
    const name = v.name.toLowerCase();
    const lang = v.lang.toLowerCase();
    let score = 0;

    if (lang === 'en-in' || lang.startsWith('en-in')) score += 60;
    else if (language === 'hinglish' && (lang === 'hi-in' || lang.startsWith('hi'))) score += 52;
    else if (lang.startsWith('en-gb') || lang.startsWith('en-us')) score += 25;
    else if (lang.startsWith('en')) score += 15;

    if (name.includes('natural') || name.includes('neural') || name.includes('online')) score += 40;
    if (name.includes('google')) score += 32;
    if (
      name.includes('prabhat') ||
      name.includes('madhur') ||
      name.includes('rishi') ||
      name.includes('male') ||
      name.includes('daniel') ||
      name.includes('alex')
    ) {
      score += 48;
    }
    if (name.includes('neerja') || name.includes('swara') || name.includes('heera')) score += 10;
    if (name.includes('india')) score += 18;

    if (name.includes('espeak') || name.includes('compact') || name.includes('robot')) score -= 40;

    return score;
  };

  let best = voices[0];
  let bestScore = scoreVoice(best);
  for (let i = 1; i < voices.length; i++) {
    const s = scoreVoice(voices[i]);
    if (s > bestScore) {
      best = voices[i];
      bestScore = s;
    }
  }
  return best;
}

export function stopSpeaking(): void {
  speechSessionCounter += 1;
  if (activeAbortController) {
    try {
      activeAbortController.abort();
    } catch {
      // ignore
    }
    activeAbortController = null;
  }
  if (activeAudioElement) {
    try {
      activeAudioElement.pause();
      activeAudioElement.src = '';
    } catch {
      // ignore
    }
    activeAudioElement = null;
  }
  if (activeObjectUrl) {
    try {
      URL.revokeObjectURL(activeObjectUrl);
    } catch {
      // ignore
    }
    activeObjectUrl = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

function speakWithBrowserFallback(cleanText: string, options: SpeakTextOptions, sessionId: number): void {
  if (sessionId !== speechSessionCounter) return;
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    options.onEnd?.();
    return;
  }

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voices = window.speechSynthesis.getVoices();
    const chosen = selectBestIndianVoice(voices, options.language ?? 'hinglish');
    if (chosen) {
      utterance.voice = chosen;
      utterance.lang = chosen.lang;
    } else {
      utterance.lang = 'en-IN';
    }
    utterance.rate = options.rate ?? 1.02;
    utterance.pitch = options.pitch ?? 0.96;
    utterance.onstart = () => {
      if (sessionId === speechSessionCounter) options.onStart?.();
    };
    utterance.onend = () => {
      if (sessionId === speechSessionCounter) options.onEnd?.();
    };
    utterance.onerror = () => {
      if (sessionId === speechSessionCounter) options.onEnd?.();
    };
    window.speechSynthesis.speak(utterance);
  } catch {
    if (sessionId === speechSessionCounter) {
      options.onError?.();
      options.onEnd?.();
    }
  }
}

/**
 * Unified Gemini Voice TTS player (`gemini-3.8-flash-lite-tts` via `/api/tts`).
 * Uses the student's selected Gemini prebuilt voice (Puck, Kore, Charon, Fenrir, Zephyr),
 * falling back to browser SpeechSynthesis only if `/api/tts` is unreachable.
 */
export async function speakText(
  text: string,
  options: SpeakTextOptions = {}
): Promise<'gemini' | 'browser' | 'silent'> {
  const cleanText = text
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleanText || typeof window === 'undefined') {
    options.onEnd?.();
    return 'silent';
  }

  stopSpeaking();
  const sessionId = speechSessionCounter;
  const voiceName = resolveGeminiVoice(options.voiceName ?? getPreferredGeminiVoice());

  try {
    const controller = new AbortController();
    activeAbortController = controller;
    const timeoutId = window.setTimeout(() => controller.abort(), 14000);
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        text: cleanText,
        language: options.language ?? 'hinglish',
        voiceName,
      }),
      signal: controller.signal,
    });
    window.clearTimeout(timeoutId);
    if (activeAbortController === controller) {
      activeAbortController = null;
    }

    if (sessionId !== speechSessionCounter) return 'silent';

    if (res.ok) {
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        audioBase64?: string;
        mimeType?: string;
      };

      if (data.ok && data.audioBase64) {
        const blob = base64ToBlob(data.audioBase64, data.mimeType || 'audio/wav');
        const url = URL.createObjectURL(blob);
        activeObjectUrl = url;
        const audio = new Audio(url);
        activeAudioElement = audio;
        audio.playbackRate = options.rate ?? 1.0;

        return await new Promise<'gemini' | 'browser'>((resolve) => {
          audio.onplay = () => {
            if (sessionId === speechSessionCounter) options.onStart?.();
          };
          audio.onended = () => {
            if (sessionId === speechSessionCounter) {
              stopSpeaking();
              options.onEnd?.();
            }
            resolve('gemini');
          };
          audio.onerror = () => {
            if (sessionId === speechSessionCounter) {
              speakWithBrowserFallback(cleanText, options, sessionId);
            }
            resolve('browser');
          };
          const playPromise = audio.play();
          if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => {
              if (sessionId === speechSessionCounter) {
                speakWithBrowserFallback(cleanText, options, sessionId);
              }
              resolve('browser');
            });
          }
        });
      }
    }
  } catch {
    // Graceful fallback if network request aborted or unavailable
  }

  if (sessionId !== speechSessionCounter) return 'silent';
  speakWithBrowserFallback(cleanText, options, sessionId);
  return 'browser';
}
