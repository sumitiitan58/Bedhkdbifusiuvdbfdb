import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, type PanInfo } from 'motion/react';
import {
  Bookmark,
  BookmarkCheck,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Loader2,
  Minus,
  MinusCircle,
  Sparkles,
  X,
  XCircle,
  ZoomIn,
} from 'lucide-react';
import type {
  QuestionTimingRecord,
  StudentAnswerValue,
  TestQuestionRecord,
} from '../../types';
import type { GeminiQuestionExplanation } from '../../services/geminiClient';
import { usePlatformData } from '../../context/PlatformDataContext';
import { usePrepskm2 } from '../../context/Prepskm2Context';
import { ThemeContext } from '../../context/ThemeProvider';
import {
  resolveOptionImageSrc,
  resolveQuestionImageSrc,
} from '../../utils/questionImageRenderer';
import { playClick } from '../../utils/soundEffects';
import { QuestionZoomModal, type QuestionZoomPayload } from './QuestionZoomModal';

const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;

export type SolutionReviewStatus = 'correct' | 'wrong' | 'skipped';

export interface SolutionReviewItem {
  question: TestQuestionRecord;
  studentAnswer: StudentAnswerValue | undefined;
  status: SolutionReviewStatus;
  deltaMarks?: number;
  timing?: QuestionTimingRecord;
}

interface SolutionCardDeckProps {
  items: SolutionReviewItem[];
  title?: string;
  onExplainWithAi?: (question: TestQuestionRecord) => void | Promise<void>;
  aiExplanations?: Record<string, GeminiQuestionExplanation>;
  aiLoadingId?: string | null;
  aiErrorById?: Record<string, string>;
}

function formatStudentAnswer(
  q: TestQuestionRecord,
  ans: StudentAnswerValue | undefined
): string {
  if (!ans) return 'Unattempted';
  if (q.questionType === 'integer' && ans.type === 'integer') {
    return ans.value.trim() || 'Unattempted';
  }
  if (ans.type === 'single-mcq') {
    return ans.selectedIndex !== null ? `Option ${OPTION_LETTERS[ans.selectedIndex]}` : 'Unattempted';
  }
  if (ans.type === 'multi-mcq') {
    return ans.selectedIndices.length > 0
      ? ans.selectedIndices.map((i) => `Option ${OPTION_LETTERS[i]}`).join(', ')
      : 'Unattempted';
  }
  return 'Unattempted';
}

function formatOfficialAnswer(q: TestQuestionRecord): string {
  if (q.questionType === 'integer') {
    return q.numericalAnswer ?? '—';
  }
  return (q.correctOptionIndices ?? []).map((i) => `Option ${OPTION_LETTERS[i]}`).join(', ') || '—';
}

export function SolutionCardDeck({
  items,
  title = 'Question-by-Question Solutions',
  onExplainWithAi,
  aiExplanations,
  aiLoadingId,
  aiErrorById,
}: SolutionCardDeckProps) {
  const { bookmarkedQuestionIds, toggleQuestionBookmark } = usePlatformData();
  const { openLiveTeacher } = usePrepskm2();
  const imageTheme = useContext(ThemeContext)?.theme === 'dark' ? 'dark' : 'light';
  const [filterMode, setFilterMode] = useState<'all' | SolutionReviewStatus>('all');
  const [activeIndex, setActiveIndex] = useState(0);
  const [slideDir, setSlideDir] = useState<1 | -1>(1);
  const [zoomPayload, setZoomPayload] = useState<QuestionZoomPayload | null>(null);
  const bookmarkSet = useMemo(() => new Set(bookmarkedQuestionIds), [bookmarkedQuestionIds]);

  const numberStripRef = useRef<HTMLDivElement | null>(null);
  const numberBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const counts = useMemo(() => {
    let correct = 0;
    let wrong = 0;
    let skipped = 0;
    for (const item of items) {
      if (item.status === 'correct') correct++;
      else if (item.status === 'wrong') wrong++;
      else skipped++;
    }
    return { all: items.length, correct, wrong, skipped };
  }, [items]);

  const filteredItems = useMemo(() => {
    if (filterMode === 'all') return items;
    return items.filter((item) => item.status === filterMode);
  }, [filterMode, items]);

  const safeIndex = Math.min(activeIndex, Math.max(0, filteredItems.length - 1));
  const currentItem = filteredItems[safeIndex] ?? null;

  useEffect(() => {
    setActiveIndex(0);
    setSlideDir(1);
  }, [filterMode, items]);

  // Smoothly scroll the active question number button into center view inside the strip
  useEffect(() => {
    if (!currentItem) return;
    const btn = numberBtnRefs.current[currentItem.question.id];
    if (btn) {
      btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [currentItem]);

  const goToIndex = (targetIdx: number) => {
    if (filteredItems.length === 0) return;
    const clamped = Math.max(0, Math.min(filteredItems.length - 1, targetIdx));
    if (clamped === safeIndex) return;
    playClick();
    setSlideDir(clamped > safeIndex ? 1 : -1);
    setActiveIndex(clamped);
  };

  const handleNext = () => {
    if (safeIndex < filteredItems.length - 1) {
      goToIndex(safeIndex + 1);
    }
  };

  const handlePrev = () => {
    if (safeIndex > 0) {
      goToIndex(safeIndex - 1);
    }
  };

  // Keyboard arrow navigation when zoom lightbox is closed
  useEffect(() => {
    if (zoomPayload) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'ArrowRight') {
        if (safeIndex < filteredItems.length - 1) {
          e.preventDefault();
          setSlideDir(1);
          setActiveIndex((idx) => Math.min(filteredItems.length - 1, idx + 1));
        }
      } else if (e.key === 'ArrowLeft') {
        if (safeIndex > 0) {
          e.preventDefault();
          setSlideDir(-1);
          setActiveIndex((idx) => Math.max(0, idx - 1));
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [filteredItems.length, safeIndex, zoomPayload]);

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const swipePower = info.offset.x + info.velocity.x * 0.2;
    if (swipePower < -80 && safeIndex < filteredItems.length - 1) {
      handleNext();
    } else if (swipePower > 80 && safeIndex > 0) {
      handlePrev();
    }
  };

  const scrollNumberStrip = (delta: number) => {
    numberStripRef.current?.scrollBy({ left: delta, behavior: 'smooth' });
  };

  if (items.length === 0) {
    return (
      <div className="p-6 text-center rounded-2xl border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-500">
        No questions available for solution review.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header + Status Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <h2 className="font-display text-base font-bold text-[#0B1B3B] dark:text-white">
            {title}
          </h2>
          {filteredItems.length > 0 && (
            <span className="font-mono text-xs font-semibold tabular-nums text-slate-500 dark:text-slate-400">
              {safeIndex + 1} / {filteredItems.length}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Filter solutions by result">
          {(
            [
              { id: 'all', label: 'All', count: counts.all },
              { id: 'wrong', label: 'Wrong', count: counts.wrong },
              { id: 'correct', label: 'Correct', count: counts.correct },
              { id: 'skipped', label: 'Skipped', count: counts.skipped },
            ] as const
          ).map((tab) => {
            const active = filterMode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  playClick();
                  setFilterMode(tab.id);
                }}
                className={`min-h-8 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors tabular-nums ${
                  active
                    ? 'bg-[#0B1B3B] text-white border-[#0B1B3B] dark:bg-[#2563EB] dark:border-[#2563EB]'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Top Slideable Question Number Navigator Strip */}
      {filteredItems.length > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-[#111A2E]/90 p-2 space-y-1.5">
          <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Slide &amp; tap any question number to jump directly
            </span>
            <div className="hidden sm:flex items-center gap-3 font-medium">
              <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                <Check className="w-3 h-3" /> Correct
              </span>
              <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400">
                <X className="w-3 h-3" /> Wrong
              </span>
              <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
                <Minus className="w-3 h-3" /> Skipped
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label="Scroll question numbers left"
              onClick={() => scrollNumberStrip(-240)}
              className="hidden sm:inline-flex min-w-9 min-h-11 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div
              ref={numberStripRef}
              className="flex-1 flex items-center gap-1.5 overflow-x-auto py-1 px-0.5 scroll-smooth [scrollbar-width:thin]"
            >
              {filteredItems.map((item, idx) => {
                const isActive = idx === safeIndex;
                const statusStyles =
                  item.status === 'correct'
                    ? isActive
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
                    : item.status === 'wrong'
                      ? isActive
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/50'
                      : isActive
                        ? 'bg-[#0B1B3B] dark:bg-[#2563EB] text-white border-[#0B1B3B] dark:border-[#2563EB] shadow-sm'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800';

                return (
                  <button
                    key={item.question.id}
                    ref={(el) => {
                      numberBtnRefs.current[item.question.id] = el;
                    }}
                    type="button"
                    aria-current={isActive ? 'step' : undefined}
                    aria-label={`Question ${item.question.questionNumber} (${item.status})`}
                    onClick={() => goToIndex(idx)}
                    className={`min-w-11 h-11 px-2 rounded-xl border font-mono text-xs font-bold tabular-nums flex flex-col items-center justify-center shrink-0 transition-all ${statusStyles} ${
                      isActive ? 'ring-2 ring-[#2563EB]/40 dark:ring-sky-400/60 scale-[1.03]' : ''
                    }`}
                  >
                    <span className="leading-none">{item.question.questionNumber}</span>
                    <span className="mt-0.5 leading-none opacity-90">
                      {item.status === 'correct' ? (
                        <Check className="w-3 h-3" strokeWidth={2.75} />
                      ) : item.status === 'wrong' ? (
                        <X className="w-3 h-3" strokeWidth={2.75} />
                      ) : (
                        <Minus className="w-3 h-3" strokeWidth={2.5} />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              aria-label="Scroll question numbers right"
              onClick={() => scrollNumberStrip(240)}
              className="hidden sm:inline-flex min-w-9 min-h-11 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Stacked Swipeable Card Deck */}
      {!currentItem ? (
        <div className="p-8 text-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111A2E] text-sm text-slate-500">
          No questions match this filter.
        </div>
      ) : (
        <div className="relative pt-1 pb-6">
          {/* Depth Layer 2 (2 cards behind) */}
          {safeIndex + 2 < filteredItems.length && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-5 sm:inset-x-8 top-4 bottom-1 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-100/80 dark:bg-[#0D1527] translate-y-2 scale-[0.97]"
            />
          )}
          {/* Depth Layer 1 (next card peeking behind) */}
          {safeIndex + 1 < filteredItems.length && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-2.5 sm:inset-x-4 top-2.5 bottom-3 rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-[#10192D] shadow-xs translate-y-1 scale-[0.985]"
            />
          )}

          {/* Active Interactive Draggable Top Card */}
          <div className="relative overflow-hidden rounded-2xl">
            <AnimatePresence mode="popLayout" initial={false} custom={slideDir}>
              <motion.article
                key={currentItem.question.id}
                custom={slideDir}
                initial={{ opacity: 0, x: slideDir * 90, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: slideDir * -110, scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 360, damping: 32 }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.18}
                onDragEnd={handleDragEnd}
                className={`relative z-10 rounded-2xl border bg-white dark:bg-[#111A2E] shadow-md cursor-grab active:cursor-grabbing touch-pan-y ${
                  currentItem.status === 'correct'
                    ? 'border-emerald-300/90 dark:border-emerald-800/80'
                    : currentItem.status === 'wrong'
                      ? 'border-rose-300/90 dark:border-rose-800/80'
                      : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                {/* Card Top Metadata & Result Verdict */}
                <div className="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-slate-50/70 dark:bg-[#141F36] rounded-t-2xl">
                  <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm min-w-0">
                    <span className="font-mono font-extrabold text-[#0B1B3B] dark:text-white tabular-nums">
                      Q{currentItem.question.questionNumber}
                    </span>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <span className="font-semibold text-[#2563EB] dark:text-sky-400">
                      {currentItem.question.subjectName}
                    </span>
                    {currentItem.question.chapterName && (
                      <>
                        <span className="text-slate-300 dark:text-slate-700">·</span>
                        <span className="text-slate-600 dark:text-slate-300 truncate max-w-[260px] sm:max-w-md">
                          {currentItem.question.chapterName}
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs font-semibold tabular-nums shrink-0">
                    {currentItem.timing && (
                      <span className="font-mono text-slate-500 dark:text-slate-400">
                        {currentItem.timing.timeSpentSeconds}s · {currentItem.timing.paceCategory}
                      </span>
                    )}
                    {currentItem.status === 'correct' ? (
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                        Correct
                        {typeof currentItem.deltaMarks === 'number'
                          ? ` (+${currentItem.deltaMarks})`
                          : ''}
                      </span>
                    ) : currentItem.status === 'wrong' ? (
                      <span className="inline-flex items-center gap-1 font-bold text-rose-600 dark:text-rose-400">
                        <XCircle className="w-4 h-4" />
                        Wrong
                        {typeof currentItem.deltaMarks === 'number'
                          ? ` (${currentItem.deltaMarks})`
                          : ''}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-500 dark:text-slate-400">
                        <MinusCircle className="w-4 h-4" />
                        Skipped (0)
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        playClick();
                        toggleQuestionBookmark(currentItem.question.id);
                      }}
                      aria-pressed={bookmarkSet.has(currentItem.question.id)}
                      aria-label={
                        bookmarkSet.has(currentItem.question.id)
                          ? `Remove Question ${currentItem.question.questionNumber} from Important Vault`
                          : `Bookmark Question ${currentItem.question.questionNumber} to Important Vault`
                      }
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors ${
                        bookmarkSet.has(currentItem.question.id)
                          ? 'bg-[#F97316]/10 border-[#F97316] text-[#F97316]'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-[#F97316] hover:text-[#F97316]'
                      }`}
                    >
                      {bookmarkSet.has(currentItem.question.id) ? (
                        <BookmarkCheck className="w-3.5 h-3.5" />
                      ) : (
                        <Bookmark className="w-3.5 h-3.5" />
                      )}
                      <span>{bookmarkSet.has(currentItem.question.id) ? 'Saved' : 'Save'}</span>
                    </button>
                  </div>
                </div>

                {/* Card Body: Compact Question -> Answer Verdict -> Solution */}
                <div className="p-3 sm:p-4 space-y-3">
                  {/* TOP SECTION: QUESTION + ZOOM BUTTON */}
                  <div className="space-y-2">
                    {(() => {
                      const resolvedQImg = resolveQuestionImageSrc(currentItem.question, imageTheme);
                      return (
                        <>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                              Question {currentItem.question.questionNumber}
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                playClick();
                                setZoomPayload({
                                  title: `Question ${currentItem.question.questionNumber} — ${currentItem.question.subjectName}`,
                                  subtitle: currentItem.question.chapterName,
                                  imageUrl: resolvedQImg.src,
                                  text: currentItem.question.questionText,
                                  optionTexts: currentItem.question.optionTexts,
                                  kind: 'question',
                                });
                              }}
                              aria-label={`Zoom Question ${currentItem.question.questionNumber}`}
                              className="inline-flex items-center gap-1 min-h-7 px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-blue-50 hover:border-[#2563EB] hover:text-[#2563EB] dark:bg-slate-900 dark:hover:bg-blue-950/60 dark:hover:border-sky-400 dark:hover:text-sky-300 text-slate-700 dark:text-slate-200 transition-colors"
                            >
                              <ZoomIn className="w-3.5 h-3.5" />
                              Zoom
                            </button>
                          </div>

                          <div className="relative group rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F182D] p-2 overflow-x-auto">
                            <img
                              src={resolvedQImg.src}
                              alt={resolvedQImg.alt}
                              draggable={false}
                              onClick={() => {
                                playClick();
                                setZoomPayload({
                                  title: `Question ${currentItem.question.questionNumber} — ${currentItem.question.subjectName}`,
                                  subtitle: currentItem.question.chapterName,
                                  imageUrl: resolvedQImg.src,
                                  kind: 'question',
                                });
                              }}
                              className="w-full max-w-[680px] max-h-[210px] h-auto object-contain mx-auto cursor-zoom-in select-none rounded-lg"
                            />
                          </div>
                        </>
                      );
                    })()}

                    {currentItem.question.questionType !== 'integer' &&
                      (!currentItem.question.questionImageUrl?.startsWith('/assets/mocks/') ||
                        (currentItem.question.optionTexts ?? []).some(Boolean) ||
                        (currentItem.question.optionImageUrls ?? []).some(Boolean)) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                          {OPTION_LETTERS.map((letter, idx) => {
                            const isOfficial = (
                              currentItem.question.correctOptionIndices ?? []
                            ).includes(idx);
                            const ans = currentItem.studentAnswer;
                            const isPicked =
                              (ans?.type === 'single-mcq' && ans.selectedIndex === idx) ||
                              (ans?.type === 'multi-mcq' && ans.selectedIndices.includes(idx));
                            const visualState = isOfficial
                              ? 'correct'
                              : isPicked
                                ? 'wrong'
                                : 'default';
                            const resolvedOpt = resolveOptionImageSrc(currentItem.question, idx, {
                              theme: imageTheme,
                              state: visualState,
                            });

                            return (
                              <div
                                key={letter}
                                className={
                                  resolvedOpt.isCustomImage
                                    ? `p-2 rounded-xl border flex items-center gap-2.5 ${
                                        isOfficial
                                          ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40'
                                          : isPicked
                                            ? 'border-rose-400 bg-rose-50 dark:bg-rose-950/40'
                                            : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50'
                                      }`
                                    : 'rounded-xl overflow-hidden'
                                }
                              >
                                {resolvedOpt.isCustomImage && (
                                  <span className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                                    {letter}
                                  </span>
                                )}
                                <img
                                  src={resolvedOpt.src}
                                  alt={resolvedOpt.alt}
                                  draggable={false}
                                  className={
                                    resolvedOpt.isCustomImage
                                      ? 'max-h-24 w-auto object-contain rounded-lg bg-white'
                                      : 'w-full h-auto object-contain rounded-xl block'
                                  }
                                />
                              </div>
                            );
                          })}
                        </div>
                      )}
                  </div>

                  {/* MIDDLE SECTION: COMPACT ANSWER COMPARISON */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div
                      className={`px-3 py-2 rounded-xl border flex items-center justify-between gap-2 ${
                        currentItem.status === 'correct'
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/70'
                          : currentItem.status === 'wrong'
                            ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/70'
                            : 'bg-slate-50 dark:bg-slate-900/70 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                        Your Answer
                      </span>
                      <strong
                        className={`font-mono text-xs sm:text-sm font-bold ${
                          currentItem.status === 'correct'
                            ? 'text-emerald-800 dark:text-emerald-300'
                            : currentItem.status === 'wrong'
                              ? 'text-rose-700 dark:text-rose-300'
                              : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {formatStudentAnswer(currentItem.question, currentItem.studentAnswer)}
                      </strong>
                    </div>

                    <div className="px-3 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800/70 bg-emerald-50/60 dark:bg-emerald-950/25 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                        Correct
                      </span>
                      <strong className="font-mono text-xs sm:text-sm font-bold text-emerald-800 dark:text-emerald-300">
                        {formatOfficialAnswer(currentItem.question)}
                      </strong>
                    </div>
                  </div>

                  {/* BOTTOM SECTION: COMPACT DETAILED SOLUTION & LIVE TEACHER */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-bold uppercase tracking-wider text-[#0B1B3B] dark:text-sky-400">
                          Detailed Solution
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              playClick();
                              openLiveTeacher({
                                questionText:
                                  currentItem.question.questionText ||
                                  `Question ${currentItem.question.questionNumber} (${currentItem.question.subjectName} — ${currentItem.question.chapterName || 'Core Concept'})`,
                                subjectName: currentItem.question.subjectName,
                                chapterName: currentItem.question.chapterName,
                                solutionText: currentItem.question.solutionText,
                                officialAnswer: formatOfficialAnswer(currentItem.question),
                                studentAnswer: formatStudentAnswer(
                                  currentItem.question,
                                  currentItem.studentAnswer
                                ),
                                source: title.toLowerCase().includes('dpp')
                                  ? 'chapter-dpp'
                                  : 'cbt-analysis',
                              });
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-extrabold bg-gradient-to-r from-[#00B4FF] to-[#1D56C6] text-[#070A12] shadow-[0_0_16px_rgba(0,180,255,0.4)] hover:brightness-110 transition-all"
                          >
                            <GraduationCap className="w-3.5 h-3.5" />
                            Explain Like a Teacher
                          </button>

                          {currentItem.question.solutionImageUrl && (
                            <button
                              type="button"
                              onClick={() => {
                                playClick();
                                setZoomPayload({
                                  title: `Solution Q${currentItem.question.questionNumber} — ${currentItem.question.subjectName}`,
                                  subtitle: currentItem.question.chapterName,
                                  imageUrl: currentItem.question.solutionImageUrl,
                                  kind: 'solution',
                                });
                              }}
                              aria-label={`Zoom Solution ${currentItem.question.questionNumber}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-[#2563EB] hover:text-[#2563EB] dark:hover:border-sky-400 dark:hover:text-sky-300 transition-colors"
                            >
                              <ZoomIn className="w-3.5 h-3.5" />
                              Zoom Solution
                            </button>
                          )}

                          {onExplainWithAi && (
                            <button
                              type="button"
                              disabled={aiLoadingId === currentItem.question.id}
                              onClick={() => void onExplainWithAi(currentItem.question)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-sky-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors disabled:opacity-50"
                            >
                              {aiLoadingId === currentItem.question.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Sparkles className="w-3.5 h-3.5" />
                              )}
                              {aiLoadingId === currentItem.question.id
                                ? 'Explaining...'
                                : 'Explain with AI'}
                            </button>
                          )}
                        </div>
                      </div>

                      {currentItem.question.solutionImageUrl && (
                        <div className="rounded-xl bg-white p-2 border border-slate-200/90 dark:border-slate-700 overflow-x-auto">
                          <img
                            src={currentItem.question.solutionImageUrl}
                            alt={`Solution for Question ${currentItem.question.questionNumber}`}
                            draggable={false}
                            onClick={() => {
                              playClick();
                              setZoomPayload({
                                title: `Solution Q${currentItem.question.questionNumber} — ${currentItem.question.subjectName}`,
                                subtitle: currentItem.question.chapterName,
                                imageUrl: currentItem.question.solutionImageUrl,
                                kind: 'solution',
                              });
                            }}
                            className="w-full max-w-[640px] max-h-[220px] h-auto object-contain mx-auto cursor-zoom-in select-none"
                          />
                        </div>
                      )}

                      {currentItem.question.solutionText &&
                        !currentItem.question.solutionImageUrl?.startsWith('/assets/mocks/') && (
                          <p className="text-xs sm:text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                            {currentItem.question.solutionText}
                          </p>
                        )}

                      {aiErrorById?.[currentItem.question.id] && (
                        <p className="text-xs text-rose-600 dark:text-rose-400">
                          {aiErrorById[currentItem.question.id]}
                        </p>
                      )}

                      {aiExplanations?.[currentItem.question.id] && (
                        <div className="p-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/35 border border-blue-200 dark:border-blue-800 space-y-1.5 text-xs">
                          <p className="font-bold text-[#2563EB] dark:text-sky-400 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-[#F97316]" />
                            Concept Breakdown
                          </p>
                          <p className="text-slate-800 dark:text-slate-200">
                            <strong>Concept: </strong>
                            {aiExplanations[currentItem.question.id].coreConcept}
                          </p>
                          <ol className="list-decimal pl-4 space-y-0.5 text-slate-700 dark:text-slate-300">
                            {aiExplanations[currentItem.question.id].stepByStep.map(
                              (step, idx) => (
                                <li key={idx}>{step}</li>
                              )
                            )}
                          </ol>
                          {aiExplanations[currentItem.question.id].examShortcut && (
                            <p className="text-emerald-800 dark:text-emerald-300 font-medium pt-1">
                              <strong>10-Sec Shortcut: </strong>
                              {aiExplanations[currentItem.question.id].examShortcut}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                </div>

                {/* Card Bottom Deck Navigation Controls */}
                <div className="px-3.5 py-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-[#0F172A]/60 rounded-b-2xl">
                  <button
                    type="button"
                    disabled={safeIndex === 0}
                    onClick={handlePrev}
                    className="min-h-9 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-[#2563EB] disabled:opacity-40 inline-flex items-center gap-1 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Prev
                  </button>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center">
                    Swipe or use ← →
                  </p>

                  <button
                    type="button"
                    disabled={safeIndex >= filteredItems.length - 1}
                    onClick={handleNext}
                    className="min-h-9 px-3.5 py-1.5 rounded-xl bg-[#0B1B3B] hover:bg-[#1E293B] dark:bg-[#2563EB] dark:hover:bg-[#1D4ED8] text-white text-xs font-semibold disabled:opacity-40 inline-flex items-center gap-1 transition-colors"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.article>
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Enlarged Question / Solution Zoom Lightbox */}
      <QuestionZoomModal payload={zoomPayload} onClose={() => setZoomPayload(null)} />
    </div>
  );
}
