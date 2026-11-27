import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Eraser, Lightbulb, PenTool, RotateCcw } from 'lucide-react';
import type { LiveTeacherStep } from '../../utils/liveTeacherEngine';
import { buildHandwritingLines } from '../../utils/lipSyncEngine';
import { KatexFormula } from '../math/KatexFormula';

export type BoardSurfaceTheme = 'blackboard' | 'whiteboard';

interface HandwritingStepCardProps {
  step: LiveTeacherStep;
  isCurrent: boolean;
  isPlaying: boolean;
  speed: number;
  replayNonce: number;
  handRaised: boolean;
  surface: BoardSurfaceTheme;
  onSelectStep: () => void;
  cardRef?: React.Ref<HTMLDivElement>;
}

export function HandwritingStepCard({
  step,
  isCurrent,
  isPlaying,
  speed,
  replayNonce,
  handRaised,
  surface,
  onSelectStep,
  cardRef,
}: HandwritingStepCardProps) {
  const lines = useMemo(() => buildHandwritingLines(step, speed), [step, speed]);
  const totalDurationMs = useMemo(() => {
    const last = lines[lines.length - 1];
    return last ? last.startMs + last.durationMs : 1200;
  }, [lines]);

  // Previous completed steps appear already written; active step writes progressively in real time!
  const [elapsedMs, setElapsedMs] = useState(isCurrent ? 0 : totalDurationMs + 200);
  const [localReplay, setLocalReplay] = useState(0);

  useEffect(() => {
    if (!isCurrent) {
      setElapsedMs(totalDurationMs + 200);
      return;
    }
    setElapsedMs(0);
  }, [isCurrent, step.stepNumber, replayNonce, localReplay, totalDurationMs]);

  useEffect(() => {
    if (!isCurrent) return;
    if (!isPlaying && elapsedMs > 0) return;

    let rafId = 0;
    let lastTs = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(80, now - lastTs);
      lastTs = now;
      setElapsedMs((prev) => {
        const next = prev + dt;
        return next >= totalDurationMs + 160 ? totalDurationMs + 160 : next;
      });
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [isCurrent, isPlaying, totalDurationMs, step.stepNumber, replayNonce, localReplay]);

  const isLightBoard = surface === 'whiteboard';
  const headingLine = lines[0];
  const eqLine = lines[1];
  const noteLine = lines[2];
  const tipLine = lines[3];

  const getRevealedText = (line: (typeof lines)[number]) => {
    if (!line) return { visible: '', writing: false, done: true };
    if (!isCurrent || elapsedMs >= line.startMs + line.durationMs) {
      return { visible: line.text, writing: false, done: true };
    }
    if (elapsedMs <= line.startMs) {
      return { visible: '', writing: false, done: false };
    }
    const progress = (elapsedMs - line.startMs) / Math.max(1, line.durationMs);
    const charCount = Math.max(1, Math.ceil(progress * line.text.length));
    return {
      visible: line.text.slice(0, charCount),
      writing: charCount < line.text.length,
      done: false,
    };
  };

  const headingState = getRevealedText(headingLine);
  const eqState = getRevealedText(eqLine);
  const noteState = getRevealedText(noteLine);
  const tipState = getRevealedText(tipLine);

  const penNib = (
    <span
      aria-hidden="true"
      className={`inline-flex items-center ml-1 align-middle animate-pulse ${
        isLightBoard ? 'text-[#1D56C6]' : 'text-[#00B4FF]'
      }`}
    >
      <PenTool className="w-3.5 h-3.5 -rotate-90" />
    </span>
  );

  return (
    <motion.article
      ref={cardRef}
      data-testid={`handwriting-step-${step.stepNumber}`}
      initial={{ opacity: 0, y: 14, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      onClick={onSelectStep}
      className={`rounded-2xl border p-3.5 sm:p-4 space-y-2.5 cursor-pointer transition-all ${
        isLightBoard
          ? isCurrent
            ? 'bg-white border-[#1D56C6] shadow-[0_10px_28px_-10px_rgba(29,86,198,0.28)] text-slate-900'
            : 'bg-white/85 border-slate-200 hover:border-slate-300 text-slate-800'
          : isCurrent
            ? 'bg-[#0F1B33]/95 border-[#00B4FF] shadow-[0_0_26px_rgba(0,180,255,0.2),inset_0_1px_0_rgba(255,255,255,0.08)] text-slate-100'
            : 'bg-[#0D1324]/75 border-white/10 opacity-85 hover:opacity-100 hover:border-white/25 text-slate-200'
      }`}
    >
      {/* Handwritten Step Heading + Animated Chalk Underline */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`h-6 w-6 rounded-lg font-mono text-xs font-extrabold inline-flex items-center justify-center shrink-0 ${
              isCurrent
                ? isLightBoard
                  ? 'bg-[#1D56C6] text-white'
                  : 'bg-[#00B4FF] text-[#070A12]'
                : isLightBoard
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                  : 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40'
            }`}
          >
            {isCurrent ? step.stepNumber : <CheckCircle2 className="w-3.5 h-3.5" />}
          </span>
          <div className="min-w-0">
            <h3
              className={`font-handwriting text-xl sm:text-2xl font-bold leading-tight ${
                isLightBoard ? 'text-[#0E234E]' : 'text-white'
              }`}
            >
              {headingState.visible || `Step ${step.stepNumber}`}
              {headingState.writing && penNib}
            </h3>
            {/* Hand-drawn animated underline stroke */}
            <svg viewBox="0 0 220 8" className="w-40 h-2 overflow-visible" aria-hidden="true">
              <motion.path
                d="M 2 5 Q 60 1 115 5 T 218 4"
                fill="none"
                stroke={isLightBoard ? '#1D56C6' : '#00B4FF'}
                strokeWidth="2.2"
                strokeLinecap="round"
                initial={{ pathLength: isCurrent ? 0 : 1 }}
                animate={{ pathLength: headingState.done ? 1 : 0.25 }}
                transition={{ duration: 0.45 }}
              />
            </svg>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isCurrent && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLocalReplay((n) => n + 1);
              }}
              aria-label={`Replay handwriting for step ${step.stepNumber}`}
              title="Replay step handwriting"
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono font-semibold border transition-colors ${
                isLightBoard
                  ? 'bg-slate-100 border-slate-200 text-slate-600 hover:text-[#1D56C6]'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:text-[#00B4FF]'
              }`}
            >
              <RotateCcw className="w-3 h-3" />
              Ink
            </button>
          )}
          {isCurrent && (
            <span
              className={`text-[10px] font-mono font-bold uppercase ${
                isLightBoard ? 'text-[#D97706]' : 'text-amber-300'
              }`}
            >
              {handRaised ? 'Paused' : isPlaying ? 'Writing…' : 'Active'}
            </span>
          )}
        </div>
      </div>

      {/* Animated Handwritten Equation Stroke + Verified KaTeX Box */}
      <div
        className={`px-3 py-2.5 rounded-xl border border-dashed space-y-1.5 overflow-x-auto ${
          isLightBoard
            ? 'bg-blue-50/70 border-[#1D56C6]/35'
            : 'bg-[#070B14] border-[#00B4FF]/30'
        }`}
      >
        <div
          className={`font-handwriting text-lg sm:text-xl font-bold tracking-wide min-h-[26px] ${
            isLightBoard ? 'text-[#1D56C6]' : 'text-[#38BDF8]'
          }`}
        >
          {eqState.visible}
          {eqState.writing && penNib}
        </div>
        {eqState.done && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
            className={`pt-1.5 border-t ${isLightBoard ? 'border-blue-200/80' : 'border-white/10'}`}
          >
            <KatexFormula
              latex={step.boardLatex}
              displayMode
              className={`text-sm sm:text-base font-bold ${
                isLightBoard ? 'text-[#0E234E]' : 'text-[#00B4FF]'
              }`}
            />
          </motion.div>
        )}
      </div>

      {/* Handwritten Step Explanation */}
      <p
        className={`font-handwriting text-lg sm:text-[21px] leading-snug min-h-[28px] ${
          isLightBoard ? 'text-slate-800' : 'text-slate-100'
        }`}
      >
        {noteState.visible}
        {noteState.writing && penNib}
      </p>

      {/* Handwritten Exam Pro-Tip */}
      {(tipState.visible || !isCurrent) && (
        <div
          className={`flex items-start gap-2 px-3 py-2 rounded-xl border text-xs ${
            isLightBoard
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-amber-500/10 border-amber-400/25 text-amber-200'
          }`}
        >
          <Lightbulb className="w-3.5 h-3.5 text-[#F27B13] shrink-0 mt-0.5" />
          <span className="font-handwriting text-base sm:text-lg leading-snug">
            {tipState.visible}
            {tipState.writing && penNib}
          </span>
        </div>
      )}
    </motion.article>
  );
}

interface StudentSketchOverlayProps {
  active: boolean;
  inkColor: string;
  clearSignal: number;
}

/**
 * Zero-cost interactive HTML5 Canvas overlay letting students annotate/circle directly on the whiteboard.
 */
export function StudentSketchOverlay({
  active,
  inkColor,
  clearSignal,
}: StudentSketchOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [clearSignal]);

  const getCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  return (
    <canvas
      ref={canvasRef}
      data-testid="student-whiteboard-canvas"
      onPointerDown={(e) => {
        if (!active) return;
        drawingRef.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        const ctx = e.currentTarget.getContext('2d');
        if (!ctx) return;
        const { x, y } = getCoords(e);
        ctx.strokeStyle = inkColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x, y);
      }}
      onPointerMove={(e) => {
        if (!active || !drawingRef.current) return;
        const ctx = e.currentTarget.getContext('2d');
        if (!ctx) return;
        const { x, y } = getCoords(e);
        ctx.lineTo(x, y);
        ctx.stroke();
      }}
      onPointerUp={(e) => {
        drawingRef.current = false;
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      }}
      onPointerCancel={() => {
        drawingRef.current = false;
      }}
      className={`absolute inset-0 w-full h-full z-20 ${
        active ? 'pointer-events-auto cursor-crosshair touch-none' : 'pointer-events-none'
      }`}
    />
  );
}

interface WhiteboardToolbarProps {
  surface: BoardSurfaceTheme;
  onChangeSurface: (next: BoardSurfaceTheme) => void;
  annotateActive: boolean;
  onToggleAnnotate: () => void;
  inkColor: string;
  onSelectInkColor: (color: string) => void;
  onClearInk: () => void;
}

const INK_SWATCHES = [
  { id: 'cyan', label: 'Cyan marker', color: '#00B4FF' },
  { id: 'amber', label: 'Amber marker', color: '#F27B13' },
  { id: 'emerald', label: 'Emerald marker', color: '#10B981' },
];

export function WhiteboardToolbar({
  surface,
  onChangeSurface,
  annotateActive,
  onToggleAnnotate,
  inkColor,
  onSelectInkColor,
  onClearInk,
}: WhiteboardToolbarProps) {
  const isLight = surface === 'whiteboard';
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div
        role="group"
        aria-label="Board surface theme"
        className={`inline-flex items-center p-0.5 rounded-lg border text-[11px] font-semibold ${
          isLight ? 'bg-slate-100 border-slate-300' : 'bg-[#070B14] border-white/10'
        }`}
      >
        <button
          type="button"
          aria-pressed={surface === 'blackboard'}
          onClick={() => onChangeSurface('blackboard')}
          className={`px-2.5 py-1 rounded-md whitespace-nowrap transition-colors ${
            surface === 'blackboard'
              ? 'bg-[#00B4FF] text-[#070A12] font-bold'
              : isLight
                ? 'text-slate-600 hover:text-slate-900'
                : 'text-slate-400 hover:text-white'
          }`}
        >
          Blackboard
        </button>
        <button
          type="button"
          aria-pressed={surface === 'whiteboard'}
          onClick={() => onChangeSurface('whiteboard')}
          className={`px-2.5 py-1 rounded-md whitespace-nowrap transition-colors ${
            surface === 'whiteboard'
              ? 'bg-[#1D56C6] text-white font-bold'
              : isLight
                ? 'text-slate-600 hover:text-slate-900'
                : 'text-slate-400 hover:text-white'
          }`}
        >
          Whiteboard
        </button>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-pressed={annotateActive}
          onClick={onToggleAnnotate}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold whitespace-nowrap transition-colors ${
            annotateActive
              ? 'bg-[#F27B13] border-amber-300 text-[#070A12] font-bold'
              : isLight
                ? 'bg-white border-slate-300 text-slate-700 hover:border-[#1D56C6]'
                : 'bg-[#070B14] border-white/15 text-slate-300 hover:border-[#00B4FF]'
          }`}
        >
          <PenTool className="w-3.5 h-3.5" />
          {annotateActive ? 'Drawing On' : 'Annotate'}
        </button>

        {annotateActive && (
          <>
            {INK_SWATCHES.map((swatch) => (
              <button
                key={swatch.id}
                type="button"
                aria-label={swatch.label}
                onClick={() => onSelectInkColor(swatch.color)}
                style={{ backgroundColor: swatch.color }}
                className={`w-5 h-5 rounded-full border-2 transition-transform ${
                  inkColor === swatch.color ? 'border-white scale-110' : 'border-transparent opacity-75'
                }`}
              />
            ))}
            <button
              type="button"
              onClick={onClearInk}
              aria-label="Clear board annotations"
              title="Clear board annotations"
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-semibold transition-colors ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-700 hover:text-rose-600'
                  : 'bg-[#070B14] border-white/15 text-slate-300 hover:text-rose-300'
              }`}
            >
              <Eraser className="w-3.5 h-3.5" />
              Clear
            </button>
          </>
        )}
      </div>
    </div>
  );
}
