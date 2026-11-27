import { useMemo } from 'react';
import katex from 'katex';

export interface MathSegment {
  type: 'text' | 'inline-math' | 'block-math';
  content: string;
}

/**
 * Splits prose containing $...$ or $$...$$ LaTeX blocks into typed segments
 * for safe, crisp KaTeX rendering without raw HTML injection.
 */
export function parseMathTextSegments(input: string): MathSegment[] {
  if (!input) return [];
  const segments: MathSegment[] = [];
  const regex = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(input)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: input.slice(lastIndex, match.index),
      });
    }
    const token = match[0];
    if (token.startsWith('$$') && token.endsWith('$$')) {
      segments.push({
        type: 'block-math',
        content: token.slice(2, -2).trim(),
      });
    } else {
      segments.push({
        type: 'inline-math',
        content: token.slice(1, -1).trim(),
      });
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < input.length) {
    segments.push({
      type: 'text',
      content: input.slice(lastIndex),
    });
  }

  return segments;
}

interface KatexFormulaProps {
  latex: string;
  displayMode?: boolean;
  className?: string;
}

export function KatexFormula({
  latex,
  displayMode = false,
  className = '',
}: KatexFormulaProps) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(latex, {
        displayMode,
        throwOnError: false,
        strict: false,
        trust: false,
      });
    } catch {
      return '';
    }
  }, [latex, displayMode]);

  if (!html) {
    return <span className={`font-mono ${className}`}>{latex}</span>;
  }

  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

interface RichMathTextProps {
  text: string;
  className?: string;
}

function renderInlineBold(text: string, keyPrefix: number) {
  const parts = text.split(/(\*\*[^*]+?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={`${keyPrefix}-b-${i}`} className="font-bold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={`${keyPrefix}-t-${i}`}>{part}</span>;
  });
}

export function RichMathText({ text, className = '' }: RichMathTextProps) {
  const segments = useMemo(() => parseMathTextSegments(text), [text]);

  return (
    <span className={className}>
      {segments.map((seg, idx) => {
        if (seg.type === 'block-math') {
          return (
            <span key={idx} className="block my-2 overflow-x-auto">
              <KatexFormula latex={seg.content} displayMode />
            </span>
          );
        }
        if (seg.type === 'inline-math') {
          return <KatexFormula key={idx} latex={seg.content} />;
        }
        return <span key={idx}>{renderInlineBold(seg.content, idx)}</span>;
      })}
    </span>
  );
}
