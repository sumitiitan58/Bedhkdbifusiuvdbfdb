/**
 * Preps AI Language Policy & Whiteboard Context Binding Engine
 *
 * Implements:
 * - REQ-02: Default spoken/written language is strictly Hinglish across all general
 *   interactions, greetings, Hindi, Hinglish, or mixed queries. Switches to English
 *   ONLY when the user explicitly asks a question in pure English (or requests English),
 *   and immediately resumes Hinglish on any Hinglish/Hindi follow-up.
 * - REQ-03: Binds each "Open Step-by-Step Whiteboard" button strictly to the exact
 *   preceding user query for that specific message turn (never reverting to thread[0]).
 */

export type TutorLanguageMode = 'hinglish' | 'english';

const DEVANAGARI_REGEX = /[\u0900-\u097F]/;

const EXPLICIT_HINGLISH_REQUEST_REGEX =
  /\b(in\s+hinglish|in\s+hindi|hindi\s+mein|hinglish\s+mein|hinglish\s+me|hindi\s+me)\b/i;

const EXPLICIT_ENGLISH_REQUEST_REGEX =
  /\b(in\s+english|reply\s+in\s+english|speak\s+in\s+english|explain\s+in\s+english|english\s+only|pure\s+english)\b/i;

// Common unambiguous Romanized Hindi / Hinglish markers that immediately keep or resume Hinglish
const HINGLISH_LEXICON_REGEX =
  /\b(kya|kaise|kyu|kyun|kyunki|kaun|kahan|kab|kitna|kitne|batao|bata|samjhao|samjha|samajh|karo|karna|karne|kardo|kar\s+do|hai|hain|hoon|hun|ho\b|tha|thi|nahi|nahin|mat\s+kar|bhai|yaar|dost|bhaiya|mera|meri|mere|tum|tumhara|aap|aapka|apna|apni|iska|iski|iske|uska|uske|yeh|ye\b|woh|wo\b|aur|lekin|mein|is\s+me|us\s+me|hindi\s+me|hinglish\s+me|se\s+batao|ko\s+batao|ka\s+matlab|ki\s+value|ke\s+baare|ab\b|abhi|phir|fir|bilkul|jaldi|thik|theek|accha|achha|sahi|galat|chalo|kholo|dikhao|padhao|padhna|padhai|sawal|jawab|shuru|wapas|jao|aao|nikal|gayab|door\s+ho|dur\s+ho|nazron|pleej|please\s+aa|aa\s+jao|de\s+do|do\s+na|bolo|suno|oye|namaste|namaskar|shukriya|dhanyawad)\b/i;

// Pure English question / instructional starters (used only when zero Hindi/Hinglish tokens exist)
const ENGLISH_QUESTION_SIGNAL_REGEX =
  /\b(what|why|how|when|where|which|who|whose|explain|define|derive|prove|solve|calculate|compute|find|determine|compare|differentiate|integrate|describe|state|list|summarize|simplify|evaluate|verify|show\s+that|can\s+you|could\s+you|would\s+you|tell\s+me|give\s+me|write|draw|sketch|does|is\s+there|are\s+there)\b/i;

/**
 * Determines whether the tutor should speak/reply in Hinglish (default) or English.
 *
 * Rules:
 * 1. Devanagari Hindi or explicit Hinglish request -> 'hinglish'
 * 2. Explicit English request -> 'english'
 * 3. Any Hinglish lexicon token -> 'hinglish'
 * 4. Pure English question/request (>= 3 words with clear English interrogative/verb syntax) -> 'english'
 * 5. Everything else (greetings like "Hi", short tokens like "ABCD", formulas, mixed queries) -> 'hinglish'
 */
export function detectTutorResponseLanguage(userInput: string): TutorLanguageMode {
  const clean = String(userInput ?? '').trim();
  if (!clean) return 'hinglish';

  if (DEVANAGARI_REGEX.test(clean)) return 'hinglish';
  if (EXPLICIT_HINGLISH_REQUEST_REGEX.test(clean)) return 'hinglish';
  if (EXPLICIT_ENGLISH_REQUEST_REGEX.test(clean)) return 'english';
  if (HINGLISH_LEXICON_REGEX.test(clean)) return 'hinglish';

  const words = clean
    .replace(/[^\p{L}\p{N}\s']/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);

  // Short greetings or single tokens ("Hi", "Hello", "ABCD") stay strictly in default Hinglish
  if (words.length < 3) return 'hinglish';

  // Require clear English question/instructional structure or '?' with English wording
  const hasEnglishVerbOrWh = ENGLISH_QUESTION_SIGNAL_REGEX.test(clean);
  const hasQuestionMark = clean.includes('?');
  if (hasEnglishVerbOrWh || (hasQuestionMark && words.length >= 4)) {
    return 'english';
  }

  return 'hinglish';
}

export interface TurnMessageLike {
  role: string;
  text: string;
}

/**
 * Finds the exact user query paired with a specific assistant reply at `assistantIndex`.
 * Walks strictly backward from `assistantIndex - 1` so follow-up messages (e.g. "ABCD" after "Hi")
 * NEVER revert to the first message in the chat history.
 */
export function findPrecedingUserQuestion(
  messages: readonly TurnMessageLike[],
  assistantIndex: number,
  fallbackText = ''
): string {
  if (Array.isArray(messages) && assistantIndex > 0) {
    const start = Math.min(assistantIndex - 1, messages.length - 1);
    for (let i = start; i >= 0; i--) {
      const m = messages[i];
      if (m && m.role === 'user' && typeof m.text === 'string' && m.text.trim()) {
        return m.text.trim();
      }
    }
  }
  return fallbackText.trim();
}
