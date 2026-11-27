import type { LiveTeacherLessonRequest, LiveTeacherStep } from './liveTeacherEngine';

export type VisemeId = 'rest' | 'AA' | 'EE' | 'OH' | 'OO' | 'FV' | 'MBP' | 'LTH';

export interface VisemeFrame {
  viseme: VisemeId;
  startMs: number;
  endMs: number;
  openness: number; // 0..1 vertical jaw openness
  width: number; // 0.35..1.15 horizontal mouth stretch
  wordIndex: number;
  charIndex: number;
}

export interface VisemeSample {
  viseme: VisemeId;
  openness: number;
  width: number;
  jawDropPx: number;
  activeWordIndex: number;
  energy: number; // 0..1 simulated acoustic envelope for waveform bars
}

export interface HandwritingStrokeLine {
  id: string;
  kind: 'heading' | 'equation' | 'note' | 'tip';
  text: string;
  startMs: number;
  durationMs: number;
}

export interface QuickClassroomTopic {
  id: string;
  label: string;
  subjectName: string;
  chapterName: string;
  questionText: string;
}

export const QUICK_CLASSROOM_TOPICS: QuickClassroomTopic[] = [
  {
    id: 'physics-incline',
    label: 'Incline FBD',
    subjectName: 'Physics',
    chapterName: 'Laws of Motion & Friction',
    questionText: 'Block of mass m sliding down a rough inclined plane of angle θ with friction μ — derive acceleration.',
  },
  {
    id: 'physics-circuit',
    label: 'Kirchhoff Loop',
    subjectName: 'Physics',
    chapterName: 'Current Electricity & Circuits',
    questionText: 'Find the equivalent resistance and branch current in a multi-loop circuit with EMF E and internal resistance r.',
  },
  {
    id: 'physics-optics',
    label: 'Convex Lens',
    subjectName: 'Physics',
    chapterName: 'Ray Optics & Optical Instruments',
    questionText: 'An object is placed at distance 30 cm in front of a convex lens of focal length 20 cm. Find image distance and magnification.',
  },
  {
    id: 'chemistry-organic',
    label: 'SN1 vs SN2',
    subjectName: 'Chemistry',
    chapterName: 'Organic Reaction Mechanisms',
    questionText: 'Compare SN1 carbocation rearrangement vs SN2 backside nucleophilic attack in alkyl halides.',
  },
  {
    id: 'maths-calculus',
    label: 'King’s Integral',
    subjectName: 'Mathematics',
    chapterName: 'Definite Integration',
    questionText: 'Evaluate the definite integral I = ∫₀^(π/2) [sin(x) / (sin(x) + cos(x))] dx using King’s property.',
  },
];

const VISEME_METRICS: Record<VisemeId, { openness: number; width: number }> = {
  rest: { openness: 0.05, width: 0.88 },
  MBP: { openness: 0.04, width: 0.78 },
  FV: { openness: 0.24, width: 0.94 },
  LTH: { openness: 0.36, width: 0.9 },
  EE: { openness: 0.42, width: 1.12 },
  OO: { openness: 0.56, width: 0.54 },
  OH: { openness: 0.74, width: 0.68 },
  AA: { openness: 0.92, width: 0.96 },
};

/**
 * Maps a character (and optional lookahead digraph) to an acoustic-visual mouth viseme.
 * Works seamlessly across both English and phonetic Hinglish scripts.
 */
export function charToViseme(char: string, nextChar = ''): VisemeId {
  const c = char.toLowerCase();
  const n = nextChar.toLowerCase();
  const pair = c + n;

  if (!c || /[\s,.;:!?()[\]{}"'—–-]/.test(c)) return 'rest';

  if (pair === 'th' || pair === 'dh') return 'LTH';
  if (pair === 'ph' || pair === 'bh') return 'FV';
  if (pair === 'oo' || pair === 'ou' || pair === 'ow') return 'OO';
  if (pair === 'ee' || pair === 'ea' || pair === 'ii') return 'EE';
  if (pair === 'aa' || pair === 'ah') return 'AA';

  if (c === 'p' || c === 'b' || c === 'm') return 'MBP';
  if (c === 'f' || c === 'v') return 'FV';
  if (c === 'a') return 'AA';
  if (c === 'e' || c === 'i' || c === 'y') return 'EE';
  if (c === 'o') return 'OH';
  if (c === 'u' || c === 'w' || c === 'q') return 'OO';
  if (c === 't' || c === 'd' || c === 'n' || c === 'l' || c === 's' || c === 'z' || c === 'r') {
    return 'LTH';
  }
  if (/[0-9]/.test(c)) return 'OH';
  return 'LTH';
}

/**
 * Generates a deterministic millisecond-indexed viseme timeline for browser-native TTS lip-syncing.
 * Scales smoothly with playback speed (`rate`) and supports real-time re-anchoring via `onboundary`.
 */
export function textToVisemeTimeline(text: string, rate = 1): VisemeFrame[] {
  const clean = text.trim();
  if (!clean) return [];

  const safeRate = Math.max(0.5, Math.min(2.2, rate || 1));
  const baseCharMs = 56 / safeRate;
  const frames: VisemeFrame[] = [];

  let cursorMs = 0;
  let wordIndex = 0;
  let prevWasSpace = true;

  for (let i = 0; i < clean.length; i += 1) {
    const ch = clean[i];
    const next = clean[i + 1] ?? '';

    if (/\s/.test(ch)) {
      if (!prevWasSpace) {
        wordIndex += 1;
        const pauseMs = Math.round(34 / safeRate);
        frames.push({
          viseme: 'rest',
          startMs: cursorMs,
          endMs: cursorMs + pauseMs,
          openness: VISEME_METRICS.rest.openness,
          width: VISEME_METRICS.rest.width,
          wordIndex,
          charIndex: i,
        });
        cursorMs += pauseMs;
      }
      prevWasSpace = true;
      continue;
    }

    prevWasSpace = false;

    if (/[.,!?;:]/.test(ch)) {
      const pauseMs = Math.round((ch === ',' ? 120 : 200) / safeRate);
      frames.push({
        viseme: 'rest',
        startMs: cursorMs,
        endMs: cursorMs + pauseMs,
        openness: VISEME_METRICS.rest.openness,
        width: VISEME_METRICS.rest.width,
        wordIndex,
        charIndex: i,
      });
      cursorMs += pauseMs;
      continue;
    }

    const viseme = charToViseme(ch, next);
    const metrics = VISEME_METRICS[viseme];
    const isVowel = viseme === 'AA' || viseme === 'EE' || viseme === 'OH' || viseme === 'OO';
    const durMs = Math.round(baseCharMs * (isVowel ? 1.28 : 0.82));

    frames.push({
      viseme,
      startMs: cursorMs,
      endMs: cursorMs + durMs,
      openness: metrics.openness,
      width: metrics.width,
      wordIndex,
      charIndex: i,
    });
    cursorMs += durMs;
  }

  return frames;
}

/**
 * Finds the timeline offset (ms) corresponding to a SpeechSynthesis `onboundary` charIndex.
 */
export function findTimelineMsForCharIndex(timeline: VisemeFrame[], charIndex: number): number | null {
  if (!timeline.length || charIndex < 0) return null;
  for (let i = 0; i < timeline.length; i += 1) {
    if (timeline[i].charIndex >= charIndex) {
      return timeline[i].startMs;
    }
  }
  return timeline[timeline.length - 1]?.startMs ?? null;
}

/**
 * Samples smoothly interpolated mouth geometry and acoustic energy at `elapsedMs`.
 */
export function sampleVisemeAtTime(timeline: VisemeFrame[], elapsedMs: number): VisemeSample {
  if (!timeline.length || elapsedMs < 0) {
    return {
      viseme: 'rest',
      openness: 0.05,
      width: 0.88,
      jawDropPx: 0,
      activeWordIndex: 0,
      energy: 0.04,
    };
  }

  const last = timeline[timeline.length - 1];
  if (elapsedMs >= last.endMs) {
    return {
      viseme: 'rest',
      openness: 0.05,
      width: 0.88,
      jawDropPx: 0,
      activeWordIndex: last.wordIndex,
      energy: 0.04,
    };
  }

  // Binary search for active frame
  let lo = 0;
  let hi = timeline.length - 1;
  let idx = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const f = timeline[mid];
    if (elapsedMs < f.startMs) {
      hi = mid - 1;
    } else if (elapsedMs >= f.endMs) {
      lo = mid + 1;
    } else {
      idx = mid;
      break;
    }
  }

  const frame = timeline[idx] ?? last;
  const span = Math.max(1, frame.endMs - frame.startMs);
  const progress = Math.max(0, Math.min(1, (elapsedMs - frame.startMs) / span));
  // Natural bell-shaped syllable articulation envelope
  const bell = Math.sin(progress * Math.PI);
  const dynamicOpen =
    frame.viseme === 'rest' || frame.viseme === 'MBP'
      ? frame.openness
      : frame.openness * (0.45 + 0.55 * bell);

  const energy =
    frame.viseme === 'rest'
      ? 0.06
      : Math.min(1, 0.24 + dynamicOpen * 0.72 + Math.sin(elapsedMs * 0.03) * 0.06);

  return {
    viseme: frame.viseme,
    openness: Number(dynamicOpen.toFixed(3)),
    width: frame.width,
    jawDropPx: Number((dynamicOpen * 5.2).toFixed(2)),
    activeWordIndex: frame.wordIndex,
    energy: Number(Math.max(0.05, Math.min(1, energy)).toFixed(3)),
  };
}

/**
 * Formats a LaTeX equation into readable chalk/marker handwriting tokens for animated whiteboard rendering
 * (displayed alongside the exact KaTeX render for dual-channel clarity).
 */
export function latexToHandwrittenReadable(latex: string): string {
  return latex
    .replace(/\\vec\{([^}]+)\}/g, '$1')
    .replace(/\\text\{([^}]+)\}/g, '$1')
    .replace(/\\mathbf\{([^}]+)\}/g, '$1')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1) / ($2)')
    .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
    .replace(/\\int_\{?([^}\s]+)\}?\^\{?([^}\s]+)\}?/g, '∫[$1 to $2] ')
    .replace(/\\int_([^ ]+)/g, '∫($1) ')
    .replace(/\\theta/g, 'θ')
    .replace(/\\mu/g, 'μ')
    .replace(/\\pi/g, 'π')
    .replace(/\\alpha/g, 'α')
    .replace(/\\beta/g, 'β')
    .replace(/\\Delta/g, 'Δ')
    .replace(/\\Sigma/g, 'Σ')
    .replace(/\\omega/g, 'ω')
    .replace(/\\sin/g, ' sin ')
    .replace(/\\cos/g, ' cos ')
    .replace(/\\tan/g, ' tan ')
    .replace(/\\ln/g, ' ln ')
    .replace(/\\implies/g, ' => ')
    .replace(/\\longrightarrow/g, ' -> ')
    .replace(/\\to/g, ' -> ')
    .replace(/\\parallel/g, '∥')
    .replace(/\\cdot/g, '·')
    .replace(/\\times/g, '×')
    .replace(/\\quad/g, '   ')
    .replace(/\\[;,!:]/g, ' ')
    .replace(/\\circ/g, '°')
    .replace(/_\{([^}]+)\}/g, '($1)')
    .replace(/_([A-Za-z0-9∥]+)/g, '$1')
    .replace(/[\{\}]/g, '')
    .replace(/[\u20D0-\u20FF]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Builds progressively timed handwritten whiteboard stroke lines for a lesson step.
 */
export function buildHandwritingLines(step: LiveTeacherStep, rate = 1): HandwritingStrokeLine[] {
  const safeRate = Math.max(0.5, Math.min(2.2, rate || 1));
  const msPerChar = 24 / safeRate;

  const rawItems: Array<{ kind: HandwritingStrokeLine['kind']; text: string }> = [
    { kind: 'heading', text: `Step ${step.stepNumber}: ${step.title}` },
    { kind: 'equation', text: latexToHandwrittenReadable(step.boardLatex) },
    { kind: 'note', text: step.boardNotes },
    { kind: 'tip', text: `Exam Tip: ${step.proTip}` },
  ];

  let cursor = 120;
  return rawItems.map((item, idx) => {
    const durationMs = Math.max(420, Math.round(item.text.length * msPerChar));
    const line: HandwritingStrokeLine = {
      id: `hw-s${step.stepNumber}-${idx}`,
      kind: item.kind,
      text: item.text,
      startMs: cursor,
      durationMs,
    };
    cursor += durationMs + Math.round(140 / safeRate);
    return line;
  });
}

/**
 * Converts a spoken student voice query into a LiveTeacherLessonRequest so the tutor can
 * dynamically launch a fresh handwritten whiteboard explanation on the spot.
 */
export function buildLessonRequestFromVoiceQuery(query: string): LiveTeacherLessonRequest {
  const clean = query.trim();
  const lower = clean.toLowerCase();

  let subjectName = 'Physics';
  if (/organic|sn1|sn2|alkene|benzene|aldehyde|ketone|mole|kinetics|equilibrium|reaction|chemistry/i.test(lower)) {
    subjectName = 'Chemistry';
  } else if (/integral|derivative|calculus|matrix|matrices|vector|probability|quadratic|math/i.test(lower)) {
    subjectName = 'Mathematics';
  } else if (/dna|rna|genetics|cell|mitosis|photosynthesis|ncert|biology|enzyme|blood/i.test(lower)) {
    subjectName = 'Biology';
  }

  return {
    subjectName,
    questionText: clean,
    source: 'preps-ai',
  };
}
