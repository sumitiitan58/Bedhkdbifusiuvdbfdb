export type ChatModeId =
  | 'mentor'
  | 'doubt-solver'
  | 'sheets'
  | 'learning-path'
  | 'practice';

export interface ChatDiagramAsset {
  title: string;
  caption: string;
  subject: string;
  svgMarkup: string;
  concepts: string[];
}

export interface ChatMessageItem {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAtIso: string;
  diagram?: ChatDiagramAsset;
  mode?: ChatModeId;
  provider?: string;
}

export interface ChatThreadRecord {
  id: string;
  title: string;
  mode: ChatModeId;
  messages: ChatMessageItem[];
  createdAtIso: string;
  updatedAtIso: string;
}

export type SupportRequestCategory =
  | 'Missing Chapter'
  | 'Formula Sheet'
  | 'Bug Report'
  | 'Feature / Game Suggestion';

export type SupportRequestStatus = 'Open' | 'In Review' | 'Resolved';

export interface AdminSupportRequest {
  id: string;
  category: SupportRequestCategory;
  subject: string;
  examTrack: string;
  summary: string;
  details: string;
  studentName: string;
  studentEmail: string;
  status: SupportRequestStatus;
  createdAtIso: string;
  updatedAtIso: string;
}

export type DifficultyTier = 'Easy' | 'Moderate' | 'Hard' | 'Very Hard';

export interface BlueprintQuestionItem {
  id: string;
  questionNumber: number;
  examTrack: 'JEE Main' | 'JEE Advanced' | 'NEET' | 'Class 9-12';
  subjectName: string;
  chapterName: string;
  difficultyTier: DifficultyTier;
  questionType: 'single-mcq' | 'multi-mcq' | 'integer';
  questionText: string;
  optionTexts: string[];
  correctOptionIndices: number[];
  numericalAnswer?: string;
  solutionText: string;
  publishedTargets: Array<'dpp' | 'cbt-mock' | 'apex-arena'>;
  createdAtIso: string;
}

export function generateThreadTitleFromQuery(query: string): string {
  const cleaned = query
    .replace(/\s+/g, ' ')
    .replace(/^[^a-zA-Z0-9]+/, '')
    .trim();
  if (!cleaned) return 'New Study Chat';
  const words = cleaned.split(' ');
  const clipped = words.slice(0, 7).join(' ');
  const finalTitle = clipped.length > 48 ? `${clipped.slice(0, 45).trim()}...` : clipped;
  return finalTitle.charAt(0).toUpperCase() + finalTitle.slice(1);
}

export function createEmptyChatThread(mode: ChatModeId = 'mentor', nowIso = new Date().toISOString()): ChatThreadRecord {
  return {
    id: `thread-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: 'New Chat',
    mode,
    messages: [],
    createdAtIso: nowIso,
    updatedAtIso: nowIso,
  };
}

export function appendMessageToThread(
  thread: ChatThreadRecord,
  message: ChatMessageItem
): ChatThreadRecord {
  const isFirstUserMsg =
    message.role === 'user' && !thread.messages.some((m) => m.role === 'user');
  const nextTitle =
    isFirstUserMsg && (thread.title === 'New Chat' || !thread.title.trim())
      ? generateThreadTitleFromQuery(message.text)
      : thread.title;

  return {
    ...thread,
    title: nextTitle,
    messages: [...thread.messages, message],
    updatedAtIso: message.createdAtIso,
  };
}

export function sortThreadsByRecent(threads: ChatThreadRecord[]): ChatThreadRecord[] {
  return [...threads].sort((a, b) => b.updatedAtIso.localeCompare(a.updatedAtIso));
}

export function shouldGenerateDiagram(prompt: string, explicitToggle: boolean): boolean {
  if (explicitToggle) return true;
  const lower = prompt.toLowerCase();
  return /\b(draw|diagram|sketch|visualize|illustrate|free[- ]?body|fbd|circuit diagram|reaction mechanism|apparatus|cell structure|ray diagram|graph of|plot)\b/.test(
    lower
  );
}

/**
 * Strips any unsafe scripting elements or event handlers from generated SVG
 * so inline educational diagrams are strictly safe to render.
 */
export function sanitizeEducationalSvg(rawSvg: string): string {
  if (!rawSvg || typeof rawSvg !== 'string') return '';
  const match = rawSvg.match(/<svg[\s\S]*?<\/svg>/i);
  if (!match) return '';
  let svg = match[0];
  svg = svg.replace(/<script[\s\S]*?<\/script>/gi, '');
  svg = svg.replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '');
  svg = svg.replace(/<iframe[\s\S]*?<\/iframe>/gi, '');
  svg = svg.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  svg = svg.replace(/javascript:/gi, '');
  svg = svg.replace(/data:text\/html/gi, '');
  return svg.trim();
}

const SUBSCRIPT_MAP: Record<string, string> = {
  '0': '₀',
  '1': '₁',
  '2': '₂',
  '3': '₃',
  '4': '₄',
  '5': '₅',
  '6': '₆',
  '7': '₇',
  '8': '₈',
  '9': '₉',
};

const SUPERSCRIPT_MAP: Record<string, string> = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
  '+': '⁺',
  '-': '⁻',
};

/**
 * Normalizes common physics, chemistry, and math notation extracted from PDFs
 * into clean Unicode chemical formulas and symbols (e.g., H2SO4 -> H₂SO₄, epsilon_0 -> ε₀).
 */
export function normalizeFormulaSymbols(input: string): string {
  if (!input) return '';
  let out = input;

  // Named Greek/scientific tokens
  const tokenReplacements: Array<[RegExp, string]> = [
    [/\\?epsilon_0\b/gi, 'ε₀'],
    [/\\?mu_0\b/gi, 'μ₀'],
    [/\\?Delta\s*G\^?0\b/g, 'ΔG°'],
    [/\\?Delta\s*H\^?0\b/g, 'ΔH°'],
    [/\\?Delta\s*S\^?0\b/g, 'ΔS°'],
    [/\\?Delta\b/g, 'Δ'],
    [/\\?lambda\b/gi, 'λ'],
    [/\\?omega\b/g, 'ω'],
    [/\\?Omega\b/g, 'Ω'],
    [/\\?theta\b/gi, 'θ'],
    [/\\?alpha\b/gi, 'α'],
    [/\\?beta\b/gi, 'β'],
    [/\\?gamma\b/gi, 'γ'],
    [/\\?pi\b/g, 'π'],
    [/\\?sigma\b/gi, 'σ'],
    [/<->/g, '⇌'],
    [/->/g, '→'],
    [/>=/g, '≥'],
    [/<=/g, '≤'],
    [/!=/g, '≠'],
  ];

  for (const [pattern, replacement] of tokenReplacements) {
    out = out.replace(pattern, replacement);
  }

  // Common chemical formulas (element symbol followed by digits)
  const knownFormulas: Array<[RegExp, string]> = [
    [/\bH2SO4\b/g, 'H₂SO₄'],
    [/\bH2O2\b/g, 'H₂O₂'],
    [/\bH2O\b/g, 'H₂O'],
    [/\bCO2\b/g, 'CO₂'],
    [/\bNH3\b/g, 'NH₃'],
    [/\bCH4\b/g, 'CH₄'],
    [/\bC2H5OH\b/g, 'C₂H₅OH'],
    [/\bC6H6\b/g, 'C₆H₆'],
    [/\bKMnO4\b/g, 'KMnO₄'],
    [/\bK2Cr2O7\b/g, 'K₂Cr₂O₇'],
    [/\bCrO5\b/g, 'CrO₅'],
    [/\bFe2O3\b/g, 'Fe₂O₃'],
    [/\bNa2CO3\b/g, 'Na₂CO₃'],
    [/\bCaCO3\b/g, 'CaCO₃'],
    [/\bHNO3\b/g, 'HNO₃'],
    [/\bPCl5\b/g, 'PCl₅'],
    [/\bSF6\b/g, 'SF₆'],
    [/\bXeF4\b/g, 'XeF₄'],
    [/\bO2\b/g, 'O₂'],
    [/\bN2\b/g, 'N₂'],
    [/\bH2\b/g, 'H₂'],
    [/\bCl2\b/g, 'Cl₂'],
  ];
  for (const [pattern, replacement] of knownFormulas) {
    out = out.replace(pattern, replacement);
  }

  // Explicit underscore subscript like x_1, v_0, SO_4
  out = out.replace(/([A-Za-z])_([0-9]+)/g, (_m, base: string, digits: string) => {
    const sub = digits
      .split('')
      .map((d) => SUBSCRIPT_MAP[d] ?? d)
      .join('');
    return `${base}${sub}`;
  });

  // Explicit caret superscript like 10^8, m^2, Fe^3+, SO4^2-
  out = out.replace(/\^([0-9]+[+-]?)/g, (_m, exp: string) =>
    exp
      .split('')
      .map((ch) => SUPERSCRIPT_MAP[ch] ?? ch)
      .join('')
  );

  return out;
}
