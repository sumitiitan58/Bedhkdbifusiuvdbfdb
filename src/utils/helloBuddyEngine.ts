import type { ExamTrackId } from '../context/ExamContext';

export const BUDDY_FIRST_WAKE_GREETING =
  'Hey! Main hoon Buddy, tumhara study friend. Tum mujhse bilkul ek dost ki tarah baat kar sakte ho—website ke kisi bhi feature ke baare mein poocho, koi doubt clear karo, ya mujhe bolo apna naam change karne, track switch karne, ya koi bhi chapter kholne ke liye. Main sab handle kar lunga!';

export const BUDDY_ONBOARDED_STORAGE_KEY = 'prepskm_buddy_onboarded_v1';

export type BuddyAction =
  | {
      type: 'dismiss';
      spokenReply: string;
    }
  | {
      type: 'recall';
      spokenReply: string;
    }
  | {
      type: 'onboarding';
      spokenReply: string;
    }
  | {
      type: 'update_name';
      newName: string;
      spokenReply: string;
    }
  | {
      type: 'switch_track';
      track: ExamTrackId;
      label: string;
      spokenReply: string;
    }
  | {
      type: 'navigate';
      path: string;
      destinationLabel: string;
      spokenReply: string;
    }
  | {
      type: 'focus_timer';
      action: 'start' | 'pause' | 'reset';
      minutes?: number;
      spokenReply: string;
    }
  | {
      type: 'open_tutor';
      topic: string;
      questionText: string;
      spokenReply: string;
    }
  | {
      type: 'page_help';
      spokenReply: string;
    }
  | {
      type: 'general_doubt';
      query: string;
    };

export interface WakeDetectionResult {
  woke: boolean;
  command: string;
  triggerKind?: 'wake' | 'dismiss' | 'recall';
}

/**
 * Intent-aware wake keyword detection (REQ-04):
 * Supports "Hey buddy", "AI buddy", "Preps buddy", "Preps", "Hello buddy",
 * Devanagari equivalents, and close Hinglish/English wake variations.
 */
const WAKE_REGEX =
  /(?:^|[\s,!.?।])(?:(?:hello|hey|hi|ok|okay|oye|suno|bhai|yo|ai|a\.?i\.?|preps?|prep|प्रेप्स|हेलो|हे|एआई)\s+(?:buddy|badi|बडी)|(?:hey|hello|hi|ok|okay|oye|suno)\s+(?:preps?|प्रेप्स)|\b(?:preps\s*buddy|ai\s*buddy)\b|(?:^|\s)(?:preps|प्रेप्स)(?=$|[\s,!.?।]))[,:!\s।-]*(.*)$/i;

/**
 * Intent-aware Dismiss / Hide phrases (REQ-05):
 * Matches Devanagari, Romanized Hinglish, and English natural-language commands
 * asking the AI Buddy to leave, disappear, or hide from the screen.
 */
const DISMISS_INTENT_REGEX =
  /(?:दूर\s*हो\s*जाओ|मेरी\s*न[ज़ज]रों\s*से|न[ज़ज]रों\s*से\s*दूर|[गग़]ायब\s*हो\s*जाओ|गायब\s*हो|निकल\s*जाओ|यहा[ँं]\s*से\s*(?:निकल|चले|हट|भाग)|चले\s*जाओ|हट\s*जाओ|छुप\s*जाओ|भाग\s*जाओ|बंद\s*हो\s*जाओ|door\s+ho\s*jao|dur\s+ho\s*jao|meri\s+nazron\s+se|nazron\s+se\s+door|ga?yab\s+ho\s*jao|ghayab\s+ho\s*jao|nikal\s+jao|yahan\s+se\s+(?:nikal|chale|hat|bhag)|jaldi\s+se\s+jaldi\s+(?:nikal|jao|hat)|chale\s+jao|hat\s+jao|bhag\s+jao|chhup\s+jao|so\s+jao|band\s+ho\s+jao|go\s+away|leave\s+(?:me|now|screen|here)|disappear|vanish|hide\s+(?:yourself|buddy|now|away)?|dismiss\s*(?:buddy|yourself)?|get\s+out(?:\s+of\s+here)?|out\s+of\s+my\s+sight)/i;

/**
 * Intent-aware Recall / Reappear phrases (REQ-05):
 * Matches "Hey buddy, प्लीज़ आ जाओ", "please aa jao", "wapas aa jao",
 * "come back", "show yourself", and natural summon phrasing.
 */
const RECALL_INTENT_REGEX =
  /(?:प्ली[ज़ज]\s*आ\s*जाओ|वापस\s*आ\s*जाओ|वापिस\s*आ\s*जाओ|आ\s*जाओ(?:\s*बडी|\s*प्ली[ज़ज]|\s*ना|\s*यार|\s*दोस्त)?|दिख\s*जाओ|सामने\s*आ\s*जाओ|(?:please|plz|pls)\s+aa\s*jao|wapas\s+aa\s*jao|wapis\s+aa\s*jao|aa\s+jao(?:\s+(?:buddy|yaar|dost|na|please|plz|wapas))?$|come\s+back|reappear|show\s+(?:yourself|buddy|up)|bring\s+(?:buddy|yourself)\s+back|appear\s+again|wapas\s+aao|buddy\s+wapas)/i;

function normalizeDevanagariNukta(text: string): string {
  return text.normalize('NFD').replace(/\u093C/g, '').normalize('NFC');
}

export function isDismissVoiceCommand(transcript: string): boolean {
  const clean = normalizeDevanagariNukta(transcript.trim());
  if (!clean) return false;
  return DISMISS_INTENT_REGEX.test(clean);
}

export function isRecallVoiceCommand(transcript: string): boolean {
  const clean = normalizeDevanagariNukta(transcript.trim());
  if (!clean) return false;
  return RECALL_INTENT_REGEX.test(clean);
}

export function extractHelloBuddyWake(transcript: string): WakeDetectionResult {
  const clean = transcript.trim();
  if (!clean) return { woke: false, command: '' };

  // Check wake phrase first
  const match = clean.match(WAKE_REGEX);
  if (match) {
    const command = (match[1] ?? '').trim();
    if (isDismissVoiceCommand(command) || isDismissVoiceCommand(clean)) {
      return { woke: true, command: command || clean, triggerKind: 'dismiss' };
    }
    if (isRecallVoiceCommand(command) || isRecallVoiceCommand(clean)) {
      return { woke: true, command: command || clean, triggerKind: 'recall' };
    }
    return {
      woke: true,
      command,
      triggerKind: 'wake',
    };
  }

  // Standalone natural-language dismiss or recall phrases (e.g. "निकल जाओ यहां से जल्दी से जल्दी")
  if (isDismissVoiceCommand(clean)) {
    return { woke: true, command: clean, triggerKind: 'dismiss' };
  }
  if (isRecallVoiceCommand(clean)) {
    return { woke: true, command: clean, triggerKind: 'recall' };
  }

  return { woke: false, command: '' };
}

function titleCaseName(raw: string): string {
  return raw
    .trim()
    .replace(/[^a-zA-Z\s'-]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function getContextPageHelp(currentPath: string, queryLower: string): string {
  if (queryLower.includes('mastery') || currentPath.startsWith('/workspace')) {
    return 'Study Workspace mein 4 powerful tools hain: 10-second Formula Duels, Pomodoro Focus Timer, 5-Stage Mastery Tracker jahan tum Theory se Revision 2 tak tick kar sakte ho, aur live Percentile Predictor!';
  }
  if (queryLower.includes('arena') || currentPath.startsWith('/arena')) {
    return 'Apex Arena mein 3D Empire Builder, Chemistry Lab Escape Room, Formula Runner, Concept Tower Defense, Formula Clash, Concept Link, Kaun Banega Topper, aur Syllabus Dominion games hain. Kisi bhi game card par Play Now tap karo!';
  }
  if (queryLower.includes('material') || currentPath.startsWith('/materials')) {
    return 'Study Materials mein har chapter ek tactile Play Card hai with handwritten notes, formula sheets, mind maps, aur inline Chapter DPPs. Kisi bhi card par click karo chapter open karne ke liye.';
  }
  if (queryLower.includes('mock') || currentPath.startsWith('/cbt-mocks')) {
    return 'CBT Mocks section mein authentic NTA-pattern full mock tests aur Custom Mock Builder hai jahan tum apni pasand ke chapters lock karke +4/-1 test de sakte ho.';
  }
  return 'Prepskm par tum Study Materials, Interactive Study Workspace, NTA CBT Mocks, Mistake Notebook, Live AI Tutor, aur Apex Arena games ek saath use kar sakte ho. Bas mujhe bolo kya kholna hai!';
}

export function parseBuddyIntent(rawCommand: string, currentPath = '/'): BuddyAction {
  const trimmed = rawCommand.trim();
  const wakeCheck = extractHelloBuddyWake(trimmed);
  const cmd = (wakeCheck.woke ? wakeCheck.command : trimmed).trim();
  const lower = cmd.toLowerCase();

  // 0a. Intent-aware Dismiss / Hide (REQ-05)
  if (isDismissVoiceCommand(cmd) || isDismissVoiceCommand(trimmed)) {
    return {
      type: 'dismiss',
      spokenReply: 'Theek hai dost, main screen se hat raha hoon. Jab bulaana ho bas bolna, Hey buddy please aa jao!',
    };
  }

  // 0b. Intent-aware Recall / Reappear (REQ-05)
  if (isRecallVoiceCommand(cmd) || isRecallVoiceCommand(trimmed)) {
    return {
      type: 'recall',
      spokenReply: 'Aa gaya dost! Bolo aaj kaunsa chapter ya doubt solve karna hai?',
    };
  }

  // 1. Onboarding / Capabilities
  if (
    !cmd ||
    /\b(what can you do|kya kar sakte|who are you|kaun ho|introduce|help me|capabilities)\b/i.test(lower)
  ) {
    return {
      type: 'onboarding',
      spokenReply: BUDDY_FIRST_WAKE_GREETING,
    };
  }

  // 2. Profile & Identity — Update Display Name
  const namePatterns = [
    /(?:change|set|update)\s+(?:my\s+)?name\s+(?:to|as)\s+([a-zA-Z][a-zA-Z\s'-]{1,28})$/i,
    /(?:mera|my)\s+(?:naam|name)\s+(?:to\s+|as\s+)?([a-zA-Z][a-zA-Z\s'-]{1,28}?)(?:\s+(?:kar\s*do|rakh\s*do|set\s*karo|change\s*karo|hai|please))?$/i,
    /(?:call\s+me|mujhe)\s+([a-zA-Z][a-zA-Z\s'-]{1,28}?)(?:\s+(?:bulao|bolna|kehna))?$/i,
  ];
  for (const rx of namePatterns) {
    const m = cmd.match(rx);
    if (m?.[1]) {
      const cleaned = titleCaseName(m[1]);
      if (cleaned.length >= 2) {
        return {
          type: 'update_name',
          newName: cleaned,
          spokenReply: `Done! Maine tumhara naam ${cleaned} update kar diya hai. Ab se main tumhe ${cleaned} hi bulaunga!`,
        };
      }
    }
  }

  // 3. Track Switching (JEE / NEET / Class 9-12 Boards)
  if (/\b(switch|change|set|select|badal|karo|kar do)\b/i.test(lower) && /\b(neet|jee|board|9[\s-]*12|foundation)\b/i.test(lower)) {
    if (/\bneet\b/i.test(lower)) {
      return {
        type: 'switch_track',
        track: 'neet',
        label: 'NEET UG',
        spokenReply: 'Ho gaya! Maine tumhara active track NEET UG par switch kar diya hai.',
      };
    }
    if (/\bjee\b/i.test(lower)) {
      return {
        type: 'switch_track',
        track: 'jee',
        label: 'JEE Main/Adv',
        spokenReply: 'Done! Ab tumhara active track JEE Main aur Advanced par set ho gaya hai.',
      };
    }
    if (/\b(board|9[\s-]*12|foundation)\b/i.test(lower)) {
      return {
        type: 'switch_track',
        track: 'boards',
        label: 'Class 9–12 Boards',
        spokenReply: 'Set ho gaya! Active track ab Class 9 to 12 Boards & Foundation hai.',
      };
    }
  }

  // 4. Focus Timer Control
  if (/\b(focus\s*timer|pomodoro|study\s*timer|timer)\b/i.test(lower)) {
    if (/\b(pause|stop|rok)\b/i.test(lower)) {
      return {
        type: 'focus_timer',
        action: 'pause',
        spokenReply: 'Focus timer pause kar diya hai. Jab ready ho, resume bol dena!',
      };
    }
    if (/\b(reset|clear|dobara)\b/i.test(lower)) {
      return {
        type: 'focus_timer',
        action: 'reset',
        spokenReply: 'Focus timer reset kar diya hai.',
      };
    }
    const minsMatch = lower.match(/(\d{1,3})\s*(?:min|minute|minutes|m\b)/i);
    const minutes = minsMatch ? Math.max(1, Math.min(180, Number(minsMatch[1]))) : 25;
    return {
      type: 'focus_timer',
      action: 'start',
      minutes,
      spokenReply: `Chalo focus mode on! Maine ${minutes} minute ka verified focus timer start kar diya hai. All the best!`,
    };
  }

  // 5. Site Navigation
  const navRoutes: Array<{ match: RegExp; path: string; label: string }> = [
    { match: /\b(apex\s*arena|arena|games?)\b/i, path: '/arena', label: 'Apex Arena' },
    { match: /\b(percentile\s*predictor|rank\s*predictor|predictor)\b/i, path: '/workspace?tab=predictor', label: 'Percentile Predictor' },
    { match: /\b(mastery\s*tracker|chapter\s*mastery)\b/i, path: '/workspace?tab=mastery', label: 'Mastery Tracker' },
    { match: /\b(study\s*workspace|workspace|quick\s*practice)\b/i, path: '/workspace', label: 'Study Workspace' },
    { match: /\b(study\s*materials?|materials?|chapter\s*notes|notes|formula\s*sheet)\b/i, path: '/materials', label: 'Study Materials & Notes' },
    { match: /\b(cbt\s*mocks?|mock\s*tests?|custom\s*mock)\b/i, path: '/cbt-mocks', label: 'CBT Mock Tests' },
    { match: /\b(chapter\s*dpps?|dpp|quiz)\b/i, path: '/dpp', label: 'Chapter DPPs' },
    { match: /\b(mistake\s*notebook|mistakes?)\b/i, path: '/mistakes', label: 'Mistake Notebook' },
    { match: /\b(test\s*analysis|analytics|prep\s*score)\b/i, path: '/analytics', label: 'Test Analysis' },
    { match: /\b(ncert|pyqs?)\b/i, path: '/learn?tab=ncert', label: 'NCERT-to-PYQ Mapper' },
    { match: /\b(preps\s*ai|ai\s*chat)\b/i, path: '/preps-ai', label: 'Preps AI Chat' },
    { match: /\b(profile|streak)\b/i, path: '/profile', label: 'Profile & Streaks' },
    { match: /\b(home|dashboard)\b/i, path: '/', label: 'Home Dashboard' },
  ];

  const isNavVerb = /\b(open|kholo|khol|dikhao|show|go\s+to|le\s+chalo|navigate|launch|start|chalo)\b/i.test(lower);
  const isHelpVerb = /\b(kaise\s+kaam|how\s+does|how\s+to\s+use|kya\s+hai|what\s+is\s+this)\b/i.test(lower);

  if (isHelpVerb) {
    return {
      type: 'page_help',
      spokenReply: getContextPageHelp(currentPath, lower),
    };
  }

  if (isNavVerb) {
    for (const route of navRoutes) {
      if (route.match.test(lower)) {
        return {
          type: 'navigate',
          path: route.path,
          destinationLabel: route.label,
          spokenReply: `Bilkul! ${route.label} khol raha hoon.`,
        };
      }
    }
  }

  // 6. Launch Explain Like a Teacher for a topic/chapter
  const explainMatch =
    cmd.match(/^(.+?)\s+(?:explain\s+karo|samjhao|padhao|teach\s+me)$/i) ||
    cmd.match(/^(?:explain|teach\s+me|explain\s+like\s+a\s+teacher)\s+(.+)$/i);
  if (explainMatch?.[1]) {
    const topic = explainMatch[1].trim();
    if (topic.length >= 2) {
      return {
        type: 'open_tutor',
        topic,
        questionText: `Explain ${topic} step-by-step with key formulas and an exam example.`,
        spokenReply: `Great! Main abhi ${topic} ke liye full-screen Live Teacher Whiteboard open kar raha hoon.`,
      };
    }
  }

  // 7. General Conversational Doubt
  return {
    type: 'general_doubt',
    query: cmd,
  };
}
