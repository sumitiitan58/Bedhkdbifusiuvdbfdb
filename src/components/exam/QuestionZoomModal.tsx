import { useEffect, useState } from 'react';
import { RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react';
import { playClick } from '../../utils/soundEffects';

export interface QuestionZoomPayload {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  text?: string;
  optionTexts?: string[];
  kind?: 'question' | 'solution';
}

interface QuestionZoomModalProps {
  payload: QuestionZoomPayload | null;
  onClose: () => void;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;
const MIN_ZOOM = 100;
const MAX_ZOOM = 240;
const ZOOM_STEP = 25;

export function QuestionZoomModal({ payload, onClose }: QuestionZoomModalProps) {
  const [zoomPercent, setZoomPercent] = useState(125);

  useEffect(() => {
    if (!payload) return;
    setZoomPercent(125);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setZoomPercent((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP));
      } else if (e.key === '-') {
        e.preventDefault();
        setZoomPercent((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP));
      } else if (e.key === '0') {
        e.preventDefault();
        setZoomPercent(125);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [payload, onClose]);

  if (!payload) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Zoomed view: ${payload.title}`}
      className="fixed inset-0 z-[70] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-5"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          playClick();
          onClose();
        }
      }}
    >
      <div className="w-full max-w-4xl max-h-[92vh] bg-white dark:bg-[#0E1629] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Top Control Bar */}
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-[#111A2E] flex flex-wrap items-center justify-between gap-2.5">
          <div className="min-w-0">
            <h3 className="font-display text-sm sm:text-base font-bold text-[#0B1B3B] dark:text-white truncate">
              {payload.title}
            </h3>
            {payload.subtitle && (
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {payload.subtitle}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              aria-label="Zoom out"
              disabled={zoomPercent <= MIN_ZOOM}
              onClick={() => {
                playClick();
                setZoomPercent((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP));
              }}
              className="min-w-10 min-h-10 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 inline-flex items-center justify-center transition-colors"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <span className="font-mono text-xs font-bold tabular-nums text-[#0B1B3B] dark:text-slate-200 min-w-[3.2rem] text-center">
              {zoomPercent}%
            </span>

            <button
              type="button"
              aria-label="Zoom in"
              disabled={zoomPercent >= MAX_ZOOM}
              onClick={() => {
                playClick();
                setZoomPercent((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP));
              }}
              className="min-w-10 min-h-10 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 inline-flex items-center justify-center transition-colors"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            <button
              type="button"
              aria-label="Reset zoom"
              onClick={() => {
                playClick();
                setZoomPercent(125);
              }}
              className="min-w-10 min-h-10 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center justify-center transition-colors"
              title="Reset zoom"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              type="button"
              aria-label="Close zoomed view"
              onClick={() => {
                playClick();
                onClose();
              }}
              className="min-w-10 min-h-10 px-2.5 rounded-xl bg-[#0B1B3B] hover:bg-[#1E293B] dark:bg-slate-800 dark:hover:bg-slate-700 text-white inline-flex items-center justify-center transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Zoom Canvas */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-100/90 dark:bg-[#080F1E]">
          {payload.imageUrl ? (
            <div className="min-h-[220px] flex items-start justify-center">
              <div
                className="rounded-xl bg-white border border-slate-200 shadow-sm p-3 sm:p-4 transition-all duration-150"
                style={{ width: `${zoomPercent}%`, maxWidth: 'none', minWidth: '100%' }}
              >
                <img
                  src={payload.imageUrl}
                  alt={payload.title}
                  className="w-full h-auto object-contain select-none"
                />
              </div>
            </div>
          ) : (
            <div
              className="rounded-xl bg-white dark:bg-[#111A2E] border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4 mx-auto max-w-3xl"
              style={{ fontSize: `${Math.round((zoomPercent / 100) * 16)}px` }}
            >
              {payload.text && (
                <p className="leading-relaxed text-slate-900 dark:text-slate-100 whitespace-pre-line">
                  {payload.text}
                </p>
              )}
              {payload.optionTexts && payload.optionTexts.some(Boolean) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                  {payload.optionTexts.map((opt, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/60 flex items-start gap-2.5 text-slate-800 dark:text-slate-200"
                    >
                      <span className="font-mono font-bold text-[#2563EB] dark:text-sky-400">
                        ({OPTION_LETTERS[idx]})
                      </span>
                      <span>{opt}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Subtle Footer Hint */}
        <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#111A2E] flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span>Scroll or swipe inside frame to inspect diagrams and formulas clearly.</span>
          <span className="hidden sm:inline font-mono">Keys: + / − / Esc</span>
        </div>
      </div>
    </div>
  );
}
