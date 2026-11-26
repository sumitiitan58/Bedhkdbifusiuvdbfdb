/**
 * Pure deterministic SVG Image Renderer for JEE / NEET / Board Questions & Options.
 * Renders crisp, Retina-sharp vector image cards (`data:image/svg+xml;charset=utf-8,...`)
 * for questions and options A–D with prettified scientific & math notation, while
 * prioritizing custom uploaded/cropped `questionImageUrl` and `optionImageUrls`.
 */

import type { TestQuestionRecord } from '../types';

export type QuestionImageTheme = 'light' | 'dark';
export type OptionVisualState = 'default' | 'selected' | 'correct' | 'wrong';

const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;

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
  n: 'ⁿ',
  i: 'ⁱ',
};

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
  '+': '₊',
  '-': '₋',
};

function toSuperscript(raw: string): string {
  return raw
    .split('')
    .map((ch) => SUPERSCRIPT_MAP[ch] ?? ch)
    .join('');
}

function toSubscript(raw: string): string {
  return raw
    .split('')
    .map((ch) => SUBSCRIPT_MAP[ch] ?? ch)
    .join('');
}

/**
 * Formats ASCII math/chemistry notation into crisp Unicode scientific symbols
 * so formulas are immediately legible inside rendered question & option images.
 */
export function formatScientificNotation(input: string): string {
  if (!input) return '';
  return String(input)
    .replace(/\r\n/g, '\n')
    // Named constants with subscripts before generic subscript conversion
    .replace(/\bepsilon_?0\b/gi, 'ε₀')
    .replace(/\bmu_?0\b/gi, 'μ₀')
    // Powers like 10^-19, x^2, m^3, e^{-x}
    .replace(/\^\{([0-9+-ni]+)\}/g, (_, grp: string) => toSuperscript(grp))
    .replace(/\^([+-]?[0-9]+|n)\b/g, (_, grp: string) => toSuperscript(grp))
    // Subscripts like H_2O, v_1
    .replace(/_\{([0-9+-]+)\}/g, (_, grp: string) => toSubscript(grp))
    .replace(/_([0-9]+)/g, (_, grp: string) => toSubscript(grp))
    // Common Greek & physics symbols
    .replace(/\bpi\b/g, 'π')
    .replace(/\btheta\b/gi, 'θ')
    .replace(/\bomega\b/gi, 'ω')
    .replace(/\balpha\b/gi, 'α')
    .replace(/\bbeta\b/gi, 'β')
    .replace(/\bgamma\b/gi, 'γ')
    .replace(/\bdelta\b/g, 'Δ')
    .replace(/\blambda\b/gi, 'λ')
    .replace(/\bsqrt\s*\(([^)]+)\)/gi, '√($1)')
    .replace(/\bsqrt\b/gi, '√')
    .replace(/\btimes\b/gi, '×')
    .replace(/->/g, '→')
    .replace(/<=/g, '≤')
    .replace(/>=/g, '≥')
    .replace(/!=/g, '≠')
    .replace(/\+-/g, '±')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .trim();
}

export function escapeSvgXml(input: string): string {
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function wrapSvgLines(text: string, maxCharsPerLine: number): string[] {
  const safeMax = Math.max(18, maxCharsPerLine);
  const paragraphs = String(text || '').split('\n');
  const lines: string[] = [];

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) {
      if (lines.length > 0 && lines[lines.length - 1] !== '') {
        lines.push('');
      }
      continue;
    }

    const words = trimmed.split(/\s+/);
    let current = '';

    for (const word of words) {
      if (!current) {
        current = word;
      } else if (current.length + 1 + word.length <= safeMax) {
        current = `${current} ${word}`;
      } else {
        lines.push(current);
        current = word;
      }
    }
    if (current) {
      lines.push(current);
    }
  }

  return lines.length > 0 ? lines : [''];
}

function encodeSvgDataUrl(svgMarkup: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`;
}

export function renderQuestionImageDataUrl(params: {
  questionNumber?: number;
  subjectName?: string;
  chapterName?: string;
  questionText: string;
  theme?: QuestionImageTheme;
}): string {
  const theme = params.theme ?? 'light';
  const prettyText = formatScientificNotation(params.questionText || 'Refer to the question prompt.');
  const width = 760;
  const lineHeight = 29;
  const lines = wrapSvgLines(prettyText, 64);

  const hasHeader = Boolean(params.questionNumber || params.subjectName || params.chapterName);
  const topOffset = hasHeader ? 68 : 38;
  const height = Math.max(122, topOffset + lines.length * lineHeight + 28);

  const palette =
    theme === 'dark'
      ? {
          bg: '#0F182D',
          border: '#1E3A5F',
          accentBar: '#3B82F6',
          badgeBg: '#1E293B',
          badgeText: '#7DD3FC',
          metaText: '#94A3B8',
          bodyText: '#F8FAFC',
        }
      : {
          bg: '#FFFFFF',
          border: '#E2E8F0',
          accentBar: '#2563EB',
          badgeBg: '#EFF6FF',
          badgeText: '#1D4ED8',
          metaText: '#64748B',
          bodyText: '#0F172A',
        };

  const qBadge = params.questionNumber ? `Q${params.questionNumber}` : 'QUESTION';
  const metaParts = [params.subjectName, params.chapterName].filter(Boolean).join(' · ');

  const textElements = lines
    .map((line, i) => {
      const y = topOffset + i * lineHeight;
      return `<text x="28" y="${y}" fill="${palette.bodyText}" font-family="'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="18.5" font-weight="500">${escapeSvgXml(line)}</text>`;
    })
    .join('');

  const headerSvg = hasHeader
    ? `<rect x="24" y="18" width="${Math.max(54, qBadge.length * 10 + 18)}" height="26" rx="8" fill="${palette.badgeBg}" />
       <text x="34" y="36" fill="${palette.badgeText}" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="13" font-weight="700">${escapeSvgXml(qBadge)}</text>
       ${
         metaParts
           ? `<text x="${34 + Math.max(54, qBadge.length * 10 + 18) + 8}" y="36" fill="${palette.metaText}" font-family="'DM Sans', -apple-system, sans-serif" font-size="13" font-weight="600">${escapeSvgXml(metaParts.slice(0, 74))}</text>`
           : ''
       }`
    : '';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="14" fill="${palette.bg}" stroke="${palette.border}" stroke-width="1.5" />
    <rect x="1" y="14" width="5" height="${height - 28}" rx="2.5" fill="${palette.accentBar}" />
    ${headerSvg}
    ${textElements}
  </svg>`;

  return encodeSvgDataUrl(svg);
}

export function renderOptionImageDataUrl(params: {
  label: string;
  text: string;
  theme?: QuestionImageTheme;
  state?: OptionVisualState;
}): string {
  const theme = params.theme ?? 'light';
  const state = params.state ?? 'default';
  const label = String(params.label || 'A').slice(0, 2).toUpperCase();
  const prettyText = formatScientificNotation(params.text || `Option ${label}`);
  const width = 540;
  const lineHeight = 25;
  const lines = wrapSvgLines(prettyText, 44);
  const height = Math.max(66, 26 + lines.length * lineHeight + 16);

  const palettes: Record<
    QuestionImageTheme,
    Record<
      OptionVisualState,
      { bg: string; border: string; badgeBg: string; badgeText: string; bodyText: string }
    >
  > = {
    light: {
      default: {
        bg: '#FFFFFF',
        border: '#E2E8F0',
        badgeBg: '#F1F5F9',
        badgeText: '#0F172A',
        bodyText: '#1E293B',
      },
      selected: {
        bg: '#EFF6FF',
        border: '#2563EB',
        badgeBg: '#2563EB',
        badgeText: '#FFFFFF',
        bodyText: '#0B1B3B',
      },
      correct: {
        bg: '#ECFDF5',
        border: '#10B981',
        badgeBg: '#10B981',
        badgeText: '#FFFFFF',
        bodyText: '#064E3B',
      },
      wrong: {
        bg: '#FFF1F2',
        border: '#F43F5E',
        badgeBg: '#F43F5E',
        badgeText: '#FFFFFF',
        bodyText: '#881337',
      },
    },
    dark: {
      default: {
        bg: '#111A2E',
        border: '#1E293B',
        badgeBg: '#1E293B',
        badgeText: '#E2E8F0',
        bodyText: '#F1F5F9',
      },
      selected: {
        bg: '#172554',
        border: '#38BDF8',
        badgeBg: '#2563EB',
        badgeText: '#FFFFFF',
        bodyText: '#FFFFFF',
      },
      correct: {
        bg: '#064E3B',
        border: '#34D399',
        badgeBg: '#10B981',
        badgeText: '#FFFFFF',
        bodyText: '#ECFDF5',
      },
      wrong: {
        bg: '#4C0519',
        border: '#FB7185',
        badgeBg: '#E11D48',
        badgeText: '#FFFFFF',
        bodyText: '#FFE4E6',
      },
    },
  };

  const p = palettes[theme][state];
  const startY = lines.length === 1 ? Math.round(height / 2 + 6) : 34;

  const textElements = lines
    .map((line, i) => {
      const y = startY + i * lineHeight;
      return `<text x="68" y="${y}" fill="${p.bodyText}" font-family="'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16.5" font-weight="600">${escapeSvgXml(line)}</text>`;
    })
    .join('');

  const badgeY = Math.round((height - 34) / 2);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="12" fill="${p.bg}" stroke="${p.border}" stroke-width="1.5" />
    <rect x="16" y="${badgeY}" width="34" height="34" rx="9" fill="${p.badgeBg}" />
    <text x="33" y="${badgeY + 22}" text-anchor="middle" fill="${p.badgeText}" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="15" font-weight="800">${escapeSvgXml(label)}</text>
    ${textElements}
  </svg>`;

  return encodeSvgDataUrl(svg);
}

/**
 * Returns the custom uploaded/cropped question image if available, otherwise
 * renders a crisp auto-generated image card from `questionText`.
 */
export function resolveQuestionImageSrc(
  question: Pick<
    TestQuestionRecord,
    'questionImageUrl' | 'questionText' | 'questionNumber' | 'subjectName' | 'chapterName'
  >,
  theme: QuestionImageTheme = 'light'
): { src: string; isCustomImage: boolean; alt: string } {
  const custom = (question.questionImageUrl ?? '').trim();
  const alt = question.questionText?.trim()
    ? `Question ${question.questionNumber}: ${question.questionText.trim().slice(0, 220)}`
    : `Question ${question.questionNumber}`;

  if (custom) {
    return { src: custom, isCustomImage: true, alt };
  }

  return {
    src: renderQuestionImageDataUrl({
      questionNumber: question.questionNumber,
      subjectName: question.subjectName,
      chapterName: question.chapterName,
      questionText: question.questionText || `Question ${question.questionNumber}`,
      theme,
    }),
    isCustomImage: false,
    alt,
  };
}

/**
 * Returns the custom uploaded/cropped option image if available, otherwise
 * renders a crisp auto-generated option image card for Option A/B/C/D.
 */
export function resolveOptionImageSrc(
  question: Pick<TestQuestionRecord, 'optionImageUrls' | 'optionTexts'>,
  optionIndex: number,
  options?: { theme?: QuestionImageTheme; state?: OptionVisualState }
): { src: string; isCustomImage: boolean; alt: string; label: string } {
  const label = OPTION_LETTERS[optionIndex] ?? String(optionIndex + 1);
  const custom = (question.optionImageUrls?.[optionIndex] ?? '').trim();
  const optText = (question.optionTexts?.[optionIndex] ?? '').trim();
  const alt = optText ? `Option ${label}: ${optText}` : `Option ${label}`;

  if (custom) {
    return { src: custom, isCustomImage: true, alt, label };
  }

  return {
    src: renderOptionImageDataUrl({
      label,
      text: optText || `Option ${label}`,
      theme: options?.theme ?? 'light',
      state: options?.state ?? 'default',
    }),
    isCustomImage: false,
    alt,
    label,
  };
}
