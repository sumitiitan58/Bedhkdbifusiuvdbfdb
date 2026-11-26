/**
 * Pure speech normalization, wake-word detection, and Indian voice selection utilities
 * for Preps AI's zero-cost browser-native Web Speech API experience.
 */

export interface SpeechVoiceLike {
  lang: string;
  name: string;
  default?: boolean;
}

export interface WakeWordMatchResult {
  detected: boolean;
  matchedPhrase: string;
  commandAfterWake: string;
}

/**
 * Strips raw Markdown, emojis, URLs, and converts common JEE/NEET math & science symbols
 * into clean, natural spoken words so window.speechSynthesis never reads punctuation aloud.
 */
export function cleanTextForSpeech(rawText: string): string {
  if (!rawText || typeof rawText !== 'string') return '';

  let text = rawText;

  // 1. Remove fenced code blocks' markers while preserving inner readable text
  text = text.replace(/```[a-zA-Z0-9_-]*\n?/g, ' ').replace(/```/g, ' ');

  // 2. Remove URLs and markdown link wrappers [label](url) -> label
  text = text.replace(/\[([^\]]+)\]\((?:https?:\/\/|www\.)[^)]+\)/gi, '$1');
  text = text.replace(/https?:\/\/\S+|www\.\S+/gi, ' ');

  // 3. Remove emojis / pictographs / variation selectors
  text = text.replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, ' ');

  // 4. Convert math & science symbols into clear spoken words BEFORE stripping markdown
  text = text
    .replace(/\^\s*2\b|²/g, ' squared ')
    .replace(/\^\s*3\b|³/g, ' cubed ')
    .replace(/\^\s*\(?\s*-1\s*\)?|⁻¹/g, ' inverse ')
    .replace(/\^\s*n\b/g, ' to the power n ')
    .replace(/\^/g, ' to the power ')
    .replace(/Δ/g, ' delta ')
    .replace(/→|->|=>/g, ' gives ')
    .replace(/←|<-/g, ' from ')
    .replace(/≤|<=/g, ' less than or equal to ')
    .replace(/≥|>=/g, ' greater than or equal to ')
    .replace(/≠|!=/g, ' not equal to ')
    .replace(/±|\+-/g, ' plus or minus ')
    .replace(/≈/g, ' approximately ')
    .replace(/∞/g, ' infinity ')
    .replace(/√/g, ' square root of ')
    .replace(/π/g, ' pi ')
    .replace(/θ/g, ' theta ')
    .replace(/ω/g, ' omega ')
    .replace(/α/g, ' alpha ')
    .replace(/β/g, ' beta ')
    .replace(/γ/g, ' gamma ')
    .replace(/λ/g, ' lambda ')
    .replace(/μ/g, ' mu ')
    .replace(/ε/g, ' epsilon ')
    .replace(/Ω/g, ' ohm ')
    .replace(/°C/g, ' degree celsius ')
    .replace(/°/g, ' degree ')
    .replace(/×/g, ' times ')
    .replace(/÷/g, ' divided by ')
    .replace(/%/g, ' percent ')
    // Convert slash between alphanumeric / bracketed math or unit tokens into "by"
    .replace(/([A-Za-z0-9)\]])\s*\/\s*([A-Za-z0-9(\[])/g, '$1 by $2')
    .replace(/\//g, ' by ');

  // 5. Strip Markdown formatting symbols (#, **, *, _, `, -, >, ~, |)
  text = text
    // Leading heading hashes, blockquotes, and bullet dashes
    .replace(/^\s{0,3}#{1,6}\s*/gm, '')
    .replace(/^\s*>\s*/gm, '')
    .replace(/^\s*[-*•]\s+/gm, '')
    // Inline markdown wrappers & symbols
    .replace(/\*\*/g, '')
    .replace(/__/g, '')
    .replace(/~~/g, '')
    .replace(/[*_`#>|]/g, ' ')
    // Replace standalone dashes between words (e.g. "Step 1 - ") with pauses, keep hyphenated words clean
    .replace(/\s+[-–—]+\s+/g, ', ')
    .replace(/[-–—]{2,}/g, ', ');

  // 6. Normalize newlines into natural spoken pauses and collapse whitespace
  text = text
    .replace(/\r?\n+/g, '. ')
    .replace(/\.\s*\./g, '.')
    .replace(/,\s*,/g, ',')
    .replace(/\s+([.,?!])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

  return text;
}

/**
 * Detects the "Preps AI" wake phrase and common Indian phonetic SpeechRecognition variants
 * ("prep ai", "preps ai", "preps", "hey preps", "hello preps") and extracts any question
 * spoken immediately after the wake word.
 */
export function detectPrepsWakePhrase(transcript: string): WakeWordMatchResult {
  const clean = String(transcript || '').trim();
  if (!clean) {
    return { detected: false, matchedPhrase: '', commandAfterWake: '' };
  }

  const pattern =
    /\b((?:hey|hello|hi|ok|okay)\s+)?(preps\s*a\.?\s*i\.?|prep\s*a\.?\s*i\.?|prepsai|prep\s+eye|preps\s+eye|preps)\b[\s,:;.-]*(.*)$/i;

  const match = clean.match(pattern);
  if (!match) {
    return { detected: false, matchedPhrase: '', commandAfterWake: '' };
  }

  const matchedPhrase = `${match[1] ?? ''}${match[2] ?? ''}`.trim();
  const commandAfterWake = (match[3] ?? '').replace(/^[,:;.!?\s-]+/, '').trim();

  return {
    detected: true,
    matchedPhrase,
    commandAfterWake,
  };
}

/**
 * Selects the best Indian English (en-IN) or Hindi (hi-IN) voice index from
 * window.speechSynthesis.getVoices(). Returns -1 if no voices are available yet.
 */
export function selectPreferredIndianVoice(voices: SpeechVoiceLike[]): number {
  if (!Array.isArray(voices) || voices.length === 0) return -1;

  const normalized = voices.map((v, idx) => ({
    idx,
    lang: String(v.lang || '').toLowerCase().replace('_', '-'),
    name: String(v.name || '').toLowerCase(),
  }));

  // 1. Prefer high-quality Google / Microsoft / Natural Indian English voices
  const premiumEnIn = normalized.find(
    (v) =>
      v.lang === 'en-in' &&
      (v.name.includes('google') ||
        v.name.includes('natural') ||
        v.name.includes('neerja') ||
        v.name.includes('prabhat') ||
        v.name.includes('rishi') ||
        v.name.includes('heera'))
  );
  if (premiumEnIn) return premiumEnIn.idx;

  // 2. Any en-IN voice
  const anyEnIn = normalized.find((v) => v.lang === 'en-in' || v.lang.startsWith('en-in'));
  if (anyEnIn) return anyEnIn.idx;

  // 3. Any Hindi India voice (hi-IN)
  const anyHiIn = normalized.find((v) => v.lang === 'hi-in' || v.lang.startsWith('hi-'));
  if (anyHiIn) return anyHiIn.idx;

  // 4. Fallback to any English voice
  const anyEn = normalized.find((v) => v.lang.startsWith('en'));
  if (anyEn) return anyEn.idx;

  return 0;
}
