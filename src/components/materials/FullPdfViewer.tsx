import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Layers,
  Loader2,
  Maximize2,
  Minimize2,
  ScrollText,
  Volume2,
  VolumeX,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useDownloadGate } from '../../context/DownloadGateContext';
import { GuestDownloadBadge } from '../monetization/GuestDownloadBadge';
import {
  canTurnNext,
  canTurnPrev,
  formatBookPageLabel,
  getNextBookPage,
  getPrevBookPage,
  getVisibleBookPages,
  normalizeBookPage,
  type BookViewMode,
} from '../../utils/bookReader';
import {
  isSoundEnabled,
  playBookClose,
  playBookOpen,
  playClick,
  playPageFlip,
  playToggle,
  playZoomTick,
  setSoundEnabled,
} from '../../utils/soundEffects';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export interface FullPdfViewerProps {
  url: string;
  title: string;
  fileName?: string;
  materialId?: string;
  subtitle?: string;
  heightClassName?: string;
  /** When true, renders directly as an edge-to-edge full-viewport book reader */
  fullPage?: boolean;
  onClose?: () => void;
  onDownloadApproved?: () => void;
}

interface BookPageCanvasProps {
  pdfDoc: pdfjsLib.PDFDocumentProxy;
  pageNumber: number;
  scale: number;
  maxWidth: number;
  maxHeight?: number;
  side?: 'left' | 'right' | 'single';
  onSnapshotReady?: (pageNum: number, dataUrl: string) => void;
}

function BookPageCanvas({
  pdfDoc,
  pageNumber,
  scale,
  maxWidth,
  maxHeight,
  side = 'single',
  onSnapshotReady,
}: BookPageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const snapshotCbRef = useRef(onSnapshotReady);
  snapshotCbRef.current = onSnapshotReady;
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let renderTask: pdfjsLib.RenderTask | null = null;
    setRendered(false);

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(pageNumber);
        if (cancelled) return;
        const baseViewport = page.getViewport({ scale: 1 });
        const widthFit = maxWidth / baseViewport.width;
        const heightFit = maxHeight ? maxHeight / baseViewport.height : Number.POSITIVE_INFINITY;
        const fitScale = Math.max(0.45, Math.min(widthFit, heightFit)) * scale;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const viewport = page.getViewport({ scale: fitScale });

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const transform = dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined;
        renderTask = page.render({
          canvasContext: ctx,
          viewport,
          canvas,
          ...(transform ? { transform } : {}),
        });
        await renderTask.promise;
        if (!cancelled) {
          setRendered(true);
          if (snapshotCbRef.current) {
            try {
              snapshotCbRef.current(pageNumber, canvas.toDataURL('image/jpeg', 0.72));
            } catch {
              // ignore tainted canvas
            }
          }
        }
      } catch (err) {
        const errName = (err as { name?: string })?.name;
        if (!cancelled && errName !== 'RenderingCancelledException') {
          console.warn(`PDF page ${pageNumber} render error:`, err);
          setRendered(true);
        }
      }
    };

    void renderPage();

    return () => {
      cancelled = true;
      if (renderTask) {
        try {
          renderTask.cancel();
        } catch {
          // ignore
        }
      }
    };
  }, [pdfDoc, pageNumber, scale, maxWidth, maxHeight]);

  const cornerClass =
    side === 'left'
      ? 'rounded-l-md rounded-r-none'
      : side === 'right'
        ? 'rounded-r-md rounded-l-none'
        : 'rounded-lg';

  return (
    <div
      data-testid={`pdf-page-${pageNumber}`}
      className={`relative bg-[#FFFDF9] overflow-hidden select-none ${cornerClass}`}
    >
      <canvas
        ref={canvasRef}
        className={`block max-w-full h-auto transition-opacity duration-200 ${
          rendered ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {!rendered && (
        <div className="absolute inset-0 min-w-[240px] min-h-[320px] flex flex-col items-center justify-center bg-[#F8F6F0] text-slate-400 text-xs gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-cyan-600" />
          <span>Turning to page {pageNumber}…</span>
        </div>
      )}

      {/* Subtle realistic paper gutter & lighting vignette */}
      {side === 'left' && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-slate-950/22 via-slate-900/6 to-transparent"
        />
      )}
      {side === 'right' && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-slate-950/22 via-slate-900/6 to-transparent"
        />
      )}

      {/* Subtle page number watermark on book leaf footer */}
      {rendered && (
        <span
          className={`pointer-events-none absolute bottom-2 px-2 py-0.5 rounded bg-slate-900/65 text-white/90 font-mono text-[10px] tabular-nums ${
            side === 'left' ? 'left-2.5' : 'right-2.5'
          }`}
        >
          {pageNumber}
        </span>
      )}
    </div>
  );
}

interface FlipState {
  id: number;
  direction: 'next' | 'prev';
  snapshotUrl?: string;
}

export function FullPdfViewer({
  url,
  title,
  fileName,
  materialId,
  subtitle,
  heightClassName = 'h-[76vh]',
  fullPage = false,
  onClose,
  onDownloadApproved,
}: FullPdfViewerProps) {
  const { requestPdfDownload } = useDownloadGate();

  const [isExpandedFullPage, setIsExpandedFullPage] = useState<boolean>(fullPage);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [fallbackToIframe, setFallbackToIframe] = useState<boolean>(false);
  const [soundOn, setSoundOn] = useState<boolean>(() => isSoundEnabled());
  const [flipState, setFlipState] = useState<FlipState | null>(null);
  const [viewportWidth, setViewportWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1280
  );
  const [viewportHeight, setViewportHeight] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerHeight : 860
  );
  const [viewMode, setViewMode] = useState<BookViewMode>(() =>
    typeof window !== 'undefined' && window.innerWidth >= 1024 ? 'spread' : 'single'
  );

  const pageSnapshotsRef = useRef<Map<number, string>>(new Map());
  const touchStartXRef = useRef<number | null>(null);
  const flipTimerRef = useRef<number | null>(null);

  const effectiveFullPage = fullPage || isExpandedFullPage;
  const twoPageActive = viewMode === 'spread' && viewportWidth >= 900 && numPages > 1;

  // Play book open SFX when entering full-page mode
  useEffect(() => {
    if (effectiveFullPage) {
      playBookOpen();
    }
  }, [effectiveFullPage]);

  // Lock background page scroll while in full-page book mode
  useEffect(() => {
    if (!effectiveFullPage) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [effectiveFullPage]);

  // Track viewport size for crisp book page fit
  useEffect(() => {
    const onResize = () => {
      setViewportWidth(window.innerWidth);
      setViewportHeight(window.innerHeight);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Load PDF document via PDF.js
  useEffect(() => {
    let cancelled = false;
    let loadedDoc: pdfjsLib.PDFDocumentProxy | null = null;

    setLoading(true);
    setFallbackToIframe(false);
    setPdfDoc(null);
    setNumPages(0);
    setCurrentPage(1);
    pageSnapshotsRef.current.clear();

    const loadPdf = async () => {
      try {
        const loadingTask = pdfjsLib.getDocument({ url });
        const doc = await loadingTask.promise;
        if (cancelled) {
          void doc.cleanup();
          return;
        }
        loadedDoc = doc;
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          console.warn('PDF.js direct load failed, falling back to browser iframe viewer:', err);
          setFallbackToIframe(true);
          setLoading(false);
        }
      }
    };

    void loadPdf();

    return () => {
      cancelled = true;
      if (flipTimerRef.current) window.clearTimeout(flipTimerRef.current);
      if (loadedDoc) {
        void loadedDoc.cleanup();
      }
    };
  }, [url]);

  const visiblePages = useMemo(
    () => getVisibleBookPages(currentPage, numPages, twoPageActive),
    [currentPage, numPages, twoPageActive]
  );

  const hasNext = canTurnNext(currentPage, numPages, twoPageActive);
  const hasPrev = canTurnPrev(currentPage, numPages, twoPageActive);

  const triggerFlipAnimation = useCallback(
    (direction: 'next' | 'prev', outgoingPageNum?: number) => {
      playPageFlip(direction);
      const snap = outgoingPageNum
        ? pageSnapshotsRef.current.get(outgoingPageNum)
        : undefined;
      setFlipState({ id: Date.now(), direction, snapshotUrl: snap });
      if (flipTimerRef.current) window.clearTimeout(flipTimerRef.current);
      flipTimerRef.current = window.setTimeout(() => {
        setFlipState(null);
      }, 480);
    },
    []
  );

  const handleNextPage = useCallback(() => {
    if (!hasNext) return;
    const outgoing = visiblePages[visiblePages.length - 1];
    const next = getNextBookPage(currentPage, numPages, twoPageActive);
    triggerFlipAnimation('next', outgoing);
    setCurrentPage(next);
  }, [currentPage, hasNext, numPages, triggerFlipAnimation, twoPageActive, visiblePages]);

  const handlePrevPage = useCallback(() => {
    if (!hasPrev) return;
    const outgoing = visiblePages[0];
    const prev = getPrevBookPage(currentPage, numPages, twoPageActive);
    triggerFlipAnimation('prev', outgoing);
    setCurrentPage(prev);
  }, [currentPage, hasPrev, numPages, triggerFlipAnimation, twoPageActive, visiblePages]);

  const handleJumpToPage = useCallback(
    (targetPage: number) => {
      if (numPages <= 0) return;
      const normalized = normalizeBookPage(targetPage, numPages, twoPageActive);
      if (normalized === normalizeBookPage(currentPage, numPages, twoPageActive)) return;
      const direction: 'next' | 'prev' = normalized > currentPage ? 'next' : 'prev';
      const outgoing =
        direction === 'next'
          ? visiblePages[visiblePages.length - 1]
          : visiblePages[0];
      triggerFlipAnimation(direction, outgoing);
      setCurrentPage(normalized);
    },
    [currentPage, numPages, triggerFlipAnimation, twoPageActive, visiblePages]
  );

  const handleCloseViewer = useCallback(() => {
    playBookClose();
    if (fullPage && onClose) {
      onClose();
    } else {
      setIsExpandedFullPage(false);
    }
  }, [fullPage, onClose]);

  // Keyboard navigation in book mode & Escape to close full page
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

      if (e.key === 'Escape' && effectiveFullPage) {
        e.preventDefault();
        handleCloseViewer();
        return;
      }
      if (viewMode === 'scroll') return;

      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        handleNextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        handlePrevPage();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [effectiveFullPage, handleCloseViewer, handleNextPage, handlePrevPage, viewMode]);

  const handleSnapshotReady = useCallback((pageNum: number, dataUrl: string) => {
    pageSnapshotsRef.current.set(pageNum, dataUrl);
  }, []);

  const handleToggleSound = () => {
    const next = !soundOn;
    setSoundEnabled(next);
    setSoundOn(next);
    if (next) playToggle(true);
  };

  const handleDownloadClick = () => {
    void requestPdfDownload({
      url,
      fileName: fileName || `${title}.pdf`,
      title,
      materialId,
      onApproved: onDownloadApproved,
    });
  };

  // Compute crisp page dimensions that fit cleanly inside the book frame
  const pageMaxWidth = useMemo(() => {
    const horizontalPadding = effectiveFullPage ? 96 : 64;
    const availW = Math.max(280, viewportWidth - horizontalPadding);
    if (twoPageActive) {
      return Math.min(540, Math.floor((availW - 44) / 2));
    }
    return Math.min(720, availW);
  }, [effectiveFullPage, twoPageActive, viewportWidth]);

  const pageMaxHeight = useMemo(() => {
    if (viewMode === 'scroll') return undefined;
    if (effectiveFullPage) {
      return Math.max(360, viewportHeight - 178);
    }
    return Math.max(340, Math.min(640, Math.floor(viewportHeight * 0.62)));
  }, [effectiveFullPage, viewMode, viewportHeight]);

  const pageLabel = formatBookPageLabel(visiblePages, numPages);

  const rootContainerClass = effectiveFullPage
    ? 'fixed inset-0 z-50 w-screen h-screen flex flex-col bg-gradient-to-b from-[#070D1B] via-[#0B162C] to-[#060B17] text-slate-100'
    : 'flex flex-col w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-b from-[#0B1426] via-[#0F1B33] to-[#0B1426] text-slate-100 overflow-hidden shadow-lg';

  return (
    <motion.div
      initial={effectiveFullPage ? { opacity: 0, scale: 0.985 } : false}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
      role={effectiveFullPage ? 'dialog' : undefined}
      aria-modal={effectiveFullPage ? 'true' : undefined}
      aria-label={effectiveFullPage ? `Full-page book reader for ${title}` : undefined}
      data-testid={effectiveFullPage ? 'full-page-pdf-reader' : 'inline-book-pdf-reader'}
      className={rootContainerClass}
    >
      {/* Top Book Reader Toolbar */}
      <div className="px-3 sm:px-5 h-14 bg-[#081022]/95 border-b border-slate-800/90 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          {effectiveFullPage && (
            <button
              type="button"
              onClick={handleCloseViewer}
              aria-label="Exit full-page reader"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-100 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          )}
          <div className="min-w-0 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-cyan-400 shrink-0 hidden sm:block" />
            <div className="min-w-0">
              <h2 className="font-display text-xs sm:text-sm font-bold text-white truncate">
                {title}
              </h2>
              <p className="text-[11px] text-slate-400 truncate hidden md:block">
                {subtitle
                  ? `${subtitle} · ${pageLabel}`
                  : numPages > 0
                    ? `Interactive Book Reader · ${pageLabel}`
                    : 'Interactive Book Reader'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Guest Credit Indicator */}
          <span className="hidden xl:inline-flex mr-1">
            <GuestDownloadBadge compact darkSurface />
          </span>

          {/* Book Mode / Scroll Mode Switch */}
          {!fallbackToIframe && numPages > 0 && (
            <div className="hidden md:inline-flex items-center p-0.5 rounded-xl bg-slate-900 border border-slate-800">
              {viewportWidth >= 900 && numPages > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    setViewMode('spread');
                  }}
                  aria-label="Two-page book spread view"
                  aria-pressed={viewMode === 'spread'}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap ${
                    viewMode === 'spread'
                      ? 'bg-cyan-500 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Book</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  playClick();
                  setViewMode('single');
                }}
                aria-label="Single page flip view"
                aria-pressed={viewMode === 'single'}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap ${
                  viewMode === 'single'
                    ? 'bg-cyan-500 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Single</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  playClick();
                  setViewMode('scroll');
                }}
                aria-label="Continuous scroll view"
                aria-pressed={viewMode === 'scroll'}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap ${
                  viewMode === 'scroll'
                    ? 'bg-cyan-500 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <ScrollText className="w-3.5 h-3.5" />
                <span>Scroll</span>
              </button>
            </div>
          )}

          {/* Zoom Controls */}
          {!fallbackToIframe && numPages > 0 && (
            <div className="hidden sm:inline-flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  playZoomTick(false);
                  setScale((s) => Math.max(0.75, Number((s - 0.15).toFixed(2))));
                }}
                aria-label="Zoom out PDF"
                className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-700/80 text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono text-slate-300 w-10 text-center tabular-nums">
                {Math.round(scale * 100)}%
              </span>
              <button
                type="button"
                onClick={() => {
                  playZoomTick(true);
                  setScale((s) => Math.min(1.75, Number((s + 0.15).toFixed(2))));
                }}
                aria-label="Zoom in PDF"
                className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-700/80 text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Page-Turn SFX Toggle */}
          <button
            type="button"
            onClick={handleToggleSound}
            aria-label={soundOn ? 'Mute book sound effects' : 'Enable book sound effects'}
            title={soundOn ? 'Page-turn SFX on' : 'Page-turn SFX muted'}
            className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-700/80 text-slate-200 hover:bg-slate-800 transition-colors"
          >
            {soundOn ? (
              <Volume2 className="w-4 h-4 text-cyan-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {/* Expand / Collapse Full Page (when embedded on MaterialDetailPage) */}
          {!fullPage && (
            <button
              type="button"
              onClick={() => {
                if (isExpandedFullPage) {
                  playBookClose();
                  setIsExpandedFullPage(false);
                } else {
                  setIsExpandedFullPage(true);
                }
              }}
              aria-label={isExpandedFullPage ? 'Exit full-page view' : 'Open full-page book view'}
              className="inline-flex items-center gap-1.5 px-2.5 h-8 rounded-lg border border-slate-700/80 text-slate-200 hover:bg-slate-800 text-[11px] font-semibold transition-colors whitespace-nowrap"
            >
              {isExpandedFullPage ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="hidden sm:inline">Exit Full Page</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="hidden sm:inline">Full Page</span>
                </>
              )}
            </button>
          )}

          {/* Gated Download PDF Button */}
          <button
            type="button"
            onClick={handleDownloadClick}
            data-testid="pdf-viewer-download-btn"
            className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* Main Book Reading Stage */}
      <div
        data-testid="full-pdf-scroll-container"
        onTouchStart={(e) => {
          touchStartXRef.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          if (viewMode === 'scroll' || touchStartXRef.current === null) return;
          const endX = e.changedTouches[0]?.clientX ?? touchStartXRef.current;
          const deltaX = endX - touchStartXRef.current;
          touchStartXRef.current = null;
          if (Math.abs(deltaX) > 48) {
            if (deltaX < 0) handleNextPage();
            else handlePrevPage();
          }
        }}
        className={`relative flex-1 overflow-auto flex flex-col items-center justify-center px-3 sm:px-8 py-4 sm:py-6 ${
          effectiveFullPage ? '' : heightClassName
        }`}
      >
        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 text-slate-300 py-16">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
            <p className="text-sm font-medium">Opening book pages of {title}…</p>
          </div>
        )}

        {/* BOOK FLIP MODE (Spread or Single Page with 3D Page-Turning Animation) */}
        {!loading && pdfDoc && !fallbackToIframe && viewMode !== 'scroll' && (
          <div className="relative flex items-center justify-center w-full max-w-6xl">
            {/* Floating Left Page Turn Button */}
            <button
              type="button"
              onClick={handlePrevPage}
              disabled={!hasPrev}
              aria-label="Turn to previous page"
              data-testid="book-prev-page-btn"
              className="hidden sm:inline-flex items-center justify-center h-11 w-11 rounded-full bg-slate-900/90 border border-slate-700/80 text-white hover:border-cyan-400 hover:text-cyan-300 disabled:opacity-25 disabled:cursor-not-allowed transition-all mr-3 lg:mr-5 shrink-0 shadow-lg"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* 3D Open Hardcover Book Frame */}
            <div
              style={{ perspective: '2200px' }}
              className="relative flex items-center justify-center max-w-full"
            >
              {/* Hardcover Book Binding Shell + Stacked Paper Edge Depth */}
              <div
                data-testid="book-stage"
                className="relative p-2 sm:p-3 rounded-xl bg-gradient-to-b from-[#16233E] via-[#0F1B33] to-[#142038] border border-cyan-500/20 shadow-[0_24px_60px_-15px_rgba(0,0,0,0.85)]"
              >
                {/* Realistic stacked paper edges on left & right */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none hidden sm:block absolute inset-y-3 -left-1 w-1.5 rounded-l bg-gradient-to-r from-slate-300/80 via-[#F4EFE4] to-slate-200/90 opacity-85"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none hidden sm:block absolute inset-y-3 -right-1 w-1.5 rounded-r bg-gradient-to-l from-slate-300/80 via-[#F4EFE4] to-slate-200/90 opacity-85"
                />

                {/* Visible Book Spread / Leaf Surface */}
                <div className="relative flex items-stretch justify-center overflow-hidden rounded-lg bg-[#E9E4D8] shadow-inner">
                  {twoPageActive ? (
                    <>
                      {/* Left Page */}
                      <div
                        onClick={hasPrev ? handlePrevPage : undefined}
                        className={`relative ${hasPrev ? 'cursor-pointer' : ''}`}
                      >
                        <BookPageCanvas
                          pdfDoc={pdfDoc}
                          pageNumber={visiblePages[0]}
                          scale={scale}
                          maxWidth={pageMaxWidth}
                          maxHeight={pageMaxHeight}
                          side="left"
                          onSnapshotReady={handleSnapshotReady}
                        />
                      </div>

                      {/* Book Center Spine Crease */}
                      <div
                        aria-hidden="true"
                        className="w-[3px] shrink-0 bg-gradient-to-r from-slate-900/45 via-slate-950/75 to-slate-900/45 z-10"
                      />

                      {/* Right Page (or subtle blank back leaf on last odd page) */}
                      {visiblePages[1] ? (
                        <div
                          onClick={hasNext ? handleNextPage : undefined}
                          className={`relative ${hasNext ? 'cursor-pointer' : ''}`}
                        >
                          <BookPageCanvas
                            pdfDoc={pdfDoc}
                            pageNumber={visiblePages[1]}
                            scale={scale}
                            maxWidth={pageMaxWidth}
                            maxHeight={pageMaxHeight}
                            side="right"
                            onSnapshotReady={handleSnapshotReady}
                          />
                        </div>
                      ) : (
                        <div
                          style={{
                            width: `${Math.min(pageMaxWidth, 420)}px`,
                          }}
                          className="min-h-[360px] bg-[#FAF8F2] flex flex-col items-center justify-center p-8 text-center text-slate-400"
                        >
                          <BookOpen className="w-8 h-8 text-slate-300 mb-2" />
                          <p className="font-display text-sm font-semibold text-slate-500">
                            End of Chapter Notes
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            {title}
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    /* Single Page Book Leaf */
                    <BookPageCanvas
                      pdfDoc={pdfDoc}
                      pageNumber={visiblePages[0] ?? 1}
                      scale={scale}
                      maxWidth={pageMaxWidth}
                      maxHeight={pageMaxHeight}
                      side="single"
                      onSnapshotReady={handleSnapshotReady}
                    />
                  )}

                  {/* 3D Animated Turning Page Leaf Overlay */}
                  <AnimatePresence>
                    {flipState && (
                      <motion.div
                        key={flipState.id}
                        aria-hidden="true"
                        data-testid="book-page-turn-leaf"
                        initial={{
                          rotateY: 0,
                          opacity: 0.98,
                        }}
                        animate={{
                          rotateY: flipState.direction === 'next' ? -172 : 172,
                          opacity: [1, 1, 0.92, 0],
                        }}
                        exit={{ opacity: 0 }}
                        transition={{
                          duration: 0.46,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        style={{
                          transformStyle: 'preserve-3d',
                          transformOrigin: twoPageActive
                            ? flipState.direction === 'next'
                              ? 'left center'
                              : 'right center'
                            : flipState.direction === 'next'
                              ? 'left center'
                              : 'right center',
                          left: twoPageActive
                            ? flipState.direction === 'next'
                              ? '50%'
                              : '0%'
                            : '0%',
                          width: twoPageActive ? '50%' : '100%',
                        }}
                        className="pointer-events-none absolute inset-y-0 z-30 rounded-md overflow-hidden bg-[#FFFDF8] shadow-[0_12px_36px_rgba(0,0,0,0.45)] border border-slate-300/80"
                      >
                        {flipState.snapshotUrl ? (
                          <img
                            src={flipState.snapshotUrl}
                            alt=""
                            className="w-full h-full object-contain bg-[#FFFDF8]"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-[#FFFDF9] via-[#F7F3E9] to-[#EDE7D9]" />
                        )}
                        {/* Dynamic specular paper-fold highlight */}
                        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/20 via-white/35 to-slate-900/15" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Floating Right Page Turn Button */}
            <button
              type="button"
              onClick={handleNextPage}
              disabled={!hasNext}
              aria-label="Turn to next page"
              data-testid="book-next-page-btn"
              className="hidden sm:inline-flex items-center justify-center h-11 w-11 rounded-full bg-slate-900/90 border border-slate-700/80 text-white hover:border-cyan-400 hover:text-cyan-300 disabled:opacity-25 disabled:cursor-not-allowed transition-all ml-3 lg:ml-5 shrink-0 shadow-lg"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* CONTINUOUS SCROLL MODE (Optional fallback toggle) */}
        {!loading && pdfDoc && !fallbackToIframe && viewMode === 'scroll' && (
          <div className="w-full max-w-4xl space-y-5 pb-6 self-center my-auto">
            {Array.from({ length: numPages }, (_, idx) => idx + 1).map((pageNum) => (
              <div key={pageNum} className="flex flex-col items-center">
                <BookPageCanvas
                  pdfDoc={pdfDoc}
                  pageNumber={pageNum}
                  scale={scale}
                  maxWidth={Math.min(780, viewportWidth - 48)}
                  side="single"
                />
              </div>
            ))}
          </div>
        )}

        {/* EXTERNAL PDF IFRAME FALLBACK */}
        {!loading && fallbackToIframe && (
          <div className="w-full h-full min-h-[480px] flex flex-col gap-2">
            <iframe
              src={url}
              title={title}
              className="w-full flex-1 min-h-[480px] rounded-xl border border-slate-700 bg-white"
            />
            <p className="text-xs text-center text-slate-400">
              External PDF loaded via browser frame. Use “Download PDF” to save offline.
            </p>
          </div>
        )}
      </div>

      {/* Bottom Book Navigation & Scrubber Bar */}
      {!loading && !fallbackToIframe && numPages > 0 && viewMode !== 'scroll' && (
        <div className="px-3 sm:px-6 py-2.5 bg-[#081022]/95 border-t border-slate-800/90 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevPage}
              disabled={!hasPrev}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 text-xs font-semibold text-slate-100 hover:border-cyan-400 disabled:opacity-35 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Prev</span>
            </button>

            <span
              data-testid="book-page-indicator"
              className="text-xs font-mono font-semibold text-cyan-300 tabular-nums px-1.5 whitespace-nowrap"
            >
              {pageLabel}
            </span>

            <button
              type="button"
              onClick={handleNextPage}
              disabled={!hasNext}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 text-xs font-semibold text-slate-100 hover:border-cyan-400 disabled:opacity-35 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Interactive Page Scrubber */}
          <div className="flex-1 min-w-[140px] max-w-md flex items-center gap-3">
            <label htmlFor="book-page-slider" className="sr-only">
              Jump to PDF page
            </label>
            <input
              id="book-page-slider"
              type="range"
              min={1}
              max={numPages}
              value={visiblePages[0] ?? 1}
              onChange={(e) => handleJumpToPage(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          <div className="hidden lg:flex items-center gap-2 text-[11px] text-slate-400">
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            <span>Use ← / → keys or swipe to flip pages</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
