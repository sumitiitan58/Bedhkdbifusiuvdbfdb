import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Layers,
  Loader2,
  Maximize,
  Maximize2,
  Minimize,
  Minimize2,
  RotateCcw,
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
  /** When true, renders directly as an edge-to-edge full-screen portal PDF reader */
  fullPage?: boolean;
  isBookmarked?: boolean;
  onToggleBookmark?: () => void;
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
        const fitScale = Math.max(0.5, Math.min(widthFit, heightFit)) * scale;
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
      className={`relative bg-[#FFFDF9] overflow-hidden select-none shadow-[0_12px_36px_rgba(0,0,0,0.45)] ${cornerClass}`}
    >
      <canvas
        ref={canvasRef}
        className={`block max-w-full h-auto transition-opacity duration-200 ${
          rendered ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {!rendered && (
        <div className="min-w-[260px] min-h-[380px] flex flex-col items-center justify-center bg-[#F8F6F0] text-slate-400 text-xs gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-cyan-600" />
          <span>Rendering page {pageNumber}…</span>
        </div>
      )}

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

      {rendered && (
        <span
          className={`pointer-events-none absolute bottom-2 px-2 py-0.5 rounded bg-slate-900/70 text-white/95 font-mono text-[10px] tabular-nums ${
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
  heightClassName = 'h-[80vh]',
  fullPage = false,
  isBookmarked = false,
  onToggleBookmark,
  onClose,
  onDownloadApproved,
}: FullPdfViewerProps) {
  const { requestPdfDownload } = useDownloadGate();

  const [isExpandedFullPage, setIsExpandedFullPage] = useState<boolean>(fullPage);
  const [isBrowserFullscreen, setIsBrowserFullscreen] = useState<boolean>(false);
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
  // Default to full-width continuous Scroll mode for crystal-clear full-screen PDF reading
  const [viewMode, setViewMode] = useState<BookViewMode>('scroll');

  const viewerRootRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const scrollPageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const pageSnapshotsRef = useRef<Map<number, string>>(new Map());
  const touchStartXRef = useRef<number | null>(null);
  const flipTimerRef = useRef<number | null>(null);

  const effectiveFullPage = fullPage || isExpandedFullPage;
  const twoPageActive = viewMode === 'spread' && viewportWidth >= 900 && numPages > 1;

  useEffect(() => {
    if (effectiveFullPage) {
      playBookOpen();
    }
  }, [effectiveFullPage]);

  // Lock background scroll while full-screen viewer is active
  useEffect(() => {
    if (!effectiveFullPage) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [effectiveFullPage]);

  // Sync native browser Fullscreen API state
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsBrowserFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  // Track viewport size for crisp edge-to-edge fit
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
    scrollPageRefs.current.clear();

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

  // Live current-page tracking in Scroll mode
  useEffect(() => {
    if (viewMode !== 'scroll' || !pdfDoc || numPages <= 0 || !scrollContainerRef.current) return;
    const root = scrollContainerRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        let bestPage = -1;
        let bestRatio = 0;
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio > bestRatio) {
            const p = Number(entry.target.getAttribute('data-page-num'));
            if (p > 0) {
              bestRatio = entry.intersectionRatio;
              bestPage = p;
            }
          }
        }
        if (bestPage > 0) {
          setCurrentPage(bestPage);
        }
      },
      { root, threshold: [0.25, 0.5, 0.75] }
    );

    scrollPageRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [numPages, pdfDoc, viewMode]);

  const visiblePages = useMemo(
    () => getVisibleBookPages(currentPage, numPages, twoPageActive),
    [currentPage, numPages, twoPageActive]
  );

  const hasNext =
    viewMode === 'scroll'
      ? currentPage < numPages
      : canTurnNext(currentPage, numPages, twoPageActive);
  const hasPrev =
    viewMode === 'scroll'
      ? currentPage > 1
      : canTurnPrev(currentPage, numPages, twoPageActive);

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

  const scrollToPageNumber = useCallback((targetPage: number) => {
    const el = scrollPageRefs.current.get(targetPage);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setCurrentPage(targetPage);
  }, []);

  const handleNextPage = useCallback(() => {
    if (!hasNext) return;
    if (viewMode === 'scroll') {
      playClick();
      scrollToPageNumber(Math.min(numPages, currentPage + 1));
      return;
    }
    const outgoing = visiblePages[visiblePages.length - 1];
    const next = getNextBookPage(currentPage, numPages, twoPageActive);
    triggerFlipAnimation('next', outgoing);
    setCurrentPage(next);
  }, [
    currentPage,
    hasNext,
    numPages,
    scrollToPageNumber,
    triggerFlipAnimation,
    twoPageActive,
    viewMode,
    visiblePages,
  ]);

  const handlePrevPage = useCallback(() => {
    if (!hasPrev) return;
    if (viewMode === 'scroll') {
      playClick();
      scrollToPageNumber(Math.max(1, currentPage - 1));
      return;
    }
    const outgoing = visiblePages[0];
    const prev = getPrevBookPage(currentPage, numPages, twoPageActive);
    triggerFlipAnimation('prev', outgoing);
    setCurrentPage(prev);
  }, [
    currentPage,
    hasPrev,
    numPages,
    scrollToPageNumber,
    triggerFlipAnimation,
    twoPageActive,
    viewMode,
    visiblePages,
  ]);

  const handleJumpToPage = useCallback(
    (targetPage: number) => {
      if (numPages <= 0) return;
      const clamped = Math.max(1, Math.min(numPages, targetPage));
      if (viewMode === 'scroll') {
        scrollToPageNumber(clamped);
        return;
      }
      const normalized = normalizeBookPage(clamped, numPages, twoPageActive);
      if (normalized === normalizeBookPage(currentPage, numPages, twoPageActive)) return;
      const direction: 'next' | 'prev' = normalized > currentPage ? 'next' : 'prev';
      const outgoing =
        direction === 'next'
          ? visiblePages[visiblePages.length - 1]
          : visiblePages[0];
      triggerFlipAnimation(direction, outgoing);
      setCurrentPage(normalized);
    },
    [
      currentPage,
      numPages,
      scrollToPageNumber,
      triggerFlipAnimation,
      twoPageActive,
      viewMode,
      visiblePages,
    ]
  );

  const handleCloseViewer = useCallback(() => {
    playBookClose();
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    }
    if (fullPage && onClose) {
      onClose();
    } else {
      setIsExpandedFullPage(false);
    }
  }, [fullPage, onClose]);

  const handleToggleBrowserFullscreen = useCallback(async () => {
    playClick();
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        const target = viewerRootRef.current ?? document.documentElement;
        if (target.requestFullscreen) {
          await target.requestFullscreen();
        }
      }
    } catch {
      // Ignore if fullscreen API is blocked by iframe sandbox
    }
  }, []);

  // Keyboard navigation & Escape to exit full-screen viewer
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

  // Compute crisp full-screen page dimensions
  const scrollPageMaxWidth = useMemo(() => {
    const horizontalPadding = effectiveFullPage ? 32 : 44;
    const availW = Math.max(280, viewportWidth - horizontalPadding);
    return effectiveFullPage ? Math.min(1120, availW) : Math.min(960, availW);
  }, [effectiveFullPage, viewportWidth]);

  const pageMaxWidth = useMemo(() => {
    const horizontalPadding = effectiveFullPage ? 96 : 64;
    const availW = Math.max(280, viewportWidth - horizontalPadding);
    if (twoPageActive) {
      return Math.min(580, Math.floor((availW - 44) / 2));
    }
    return Math.min(920, availW);
  }, [effectiveFullPage, twoPageActive, viewportWidth]);

  const pageMaxHeight = useMemo(() => {
    if (viewMode === 'scroll') return undefined;
    if (effectiveFullPage) {
      return Math.max(400, viewportHeight - 168);
    }
    return Math.max(360, Math.min(680, Math.floor(viewportHeight * 0.66)));
  }, [effectiveFullPage, viewMode, viewportHeight]);

  const pageLabel =
    viewMode === 'scroll'
      ? numPages > 0
        ? `Page ${currentPage} of ${numPages}`
        : 'Loading PDF…'
      : formatBookPageLabel(visiblePages, numPages);

  const rootContainerClass = effectiveFullPage
    ? 'fixed inset-0 z-[9999] w-screen h-[100dvh] flex flex-col bg-[#070D1B] text-slate-100'
    : 'flex flex-col w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-[#0B1426] text-slate-100 overflow-hidden shadow-lg';

  const viewerNode = (
    <motion.div
      ref={viewerRootRef}
      initial={effectiveFullPage ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      role={effectiveFullPage ? 'dialog' : undefined}
      aria-modal={effectiveFullPage ? 'true' : undefined}
      aria-label={effectiveFullPage ? `Full-screen PDF reader for ${title}` : undefined}
      data-testid={effectiveFullPage ? 'full-page-pdf-reader' : 'inline-book-pdf-reader'}
      className={rootContainerClass}
    >
      {/* Top Full-Screen PDF Toolbar */}
      <div className="px-3 sm:px-5 h-14 bg-[#081022] border-b border-slate-800/90 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          {effectiveFullPage && (
            <button
              type="button"
              onClick={handleCloseViewer}
              aria-label="Exit full-screen PDF reader"
              data-testid="pdf-viewer-close-btn"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          )}
          <div className="min-w-0 flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400 shrink-0 hidden sm:block" />
            <div className="min-w-0">
              <h2 className="font-display text-xs sm:text-sm font-bold text-white truncate">
                {title}
              </h2>
              <p className="text-[11px] text-slate-400 truncate hidden md:block">
                {subtitle ? `${subtitle} · ${pageLabel}` : pageLabel}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <span className="hidden xl:inline-flex mr-1">
            <GuestDownloadBadge compact darkSurface />
          </span>

          {/* Reading Mode Switch: Full Scroll (default) | Single | Book */}
          {!fallbackToIframe && numPages > 0 && (
            <div className="hidden md:inline-flex items-center p-0.5 rounded-xl bg-slate-900 border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  playClick();
                  setViewMode('scroll');
                }}
                aria-label="Full-screen continuous scroll view"
                aria-pressed={viewMode === 'scroll'}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap ${
                  viewMode === 'scroll'
                    ? 'bg-cyan-500 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <ScrollText className="w-3.5 h-3.5" />
                <span>Full Scroll</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  playClick();
                  setViewMode('single');
                }}
                aria-label="Single page view"
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
            </div>
          )}

          {/* Zoom Controls */}
          {!fallbackToIframe && numPages > 0 && (
            <div className="hidden sm:inline-flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  playZoomTick(false);
                  setScale((s) => Math.max(0.7, Number((s - 0.15).toFixed(2))));
                }}
                aria-label="Zoom out PDF"
                className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-700/80 text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  playClick();
                  setScale(1);
                }}
                title="Reset zoom to 100%"
                className="text-[11px] font-mono text-slate-300 hover:text-white w-11 text-center tabular-nums"
              >
                {Math.round(scale * 100)}%
              </button>
              <button
                type="button"
                onClick={() => {
                  playZoomTick(true);
                  setScale((s) => Math.min(2, Number((s + 0.15).toFixed(2))));
                }}
                aria-label="Zoom in PDF"
                className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-700/80 text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              {scale !== 1 && (
                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    setScale(1);
                  }}
                  aria-label="Reset zoom"
                  className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-700/80 text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Bookmark Toggle */}
          {onToggleBookmark && (
            <button
              type="button"
              onClick={() => {
                playClick();
                onToggleBookmark();
              }}
              aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark PDF'}
              className={`inline-flex items-center justify-center h-8 w-8 rounded-lg border transition-colors ${
                isBookmarked
                  ? 'bg-[#F97316] border-[#F97316] text-white'
                  : 'border-slate-700/80 text-slate-200 hover:bg-slate-800'
              }`}
            >
              {isBookmarked ? (
                <BookmarkCheck className="w-4 h-4" />
              ) : (
                <Bookmark className="w-4 h-4" />
              )}
            </button>
          )}

          {/* SFX Toggle */}
          <button
            type="button"
            onClick={handleToggleSound}
            aria-label={soundOn ? 'Mute sound effects' : 'Enable sound effects'}
            className="hidden sm:inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-700/80 text-slate-200 hover:bg-slate-800 transition-colors"
          >
            {soundOn ? (
              <Volume2 className="w-4 h-4 text-cyan-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {/* Native Browser Fullscreen Button (in fullPage) OR Expand Full-Screen Button (inline) */}
          {effectiveFullPage ? (
            <button
              type="button"
              onClick={() => void handleToggleBrowserFullscreen()}
              aria-label={isBrowserFullscreen ? 'Exit monitor fullscreen' : 'Enter monitor fullscreen'}
              title={isBrowserFullscreen ? 'Exit Fullscreen' : 'Browser Fullscreen'}
              className="hidden sm:inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-700/80 text-slate-200 hover:bg-slate-800 transition-colors"
            >
              {isBrowserFullscreen ? (
                <Minimize className="w-3.5 h-3.5 text-cyan-400" />
              ) : (
                <Maximize className="w-3.5 h-3.5 text-cyan-400" />
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsExpandedFullPage(true)}
              aria-label="Open full-screen PDF reader"
              data-testid="pdf-expand-fullscreen-btn"
              className="inline-flex items-center gap-1.5 px-2.5 h-8 rounded-lg border border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 text-[11px] font-semibold transition-colors whitespace-nowrap"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Full Screen</span>
            </button>
          )}

          {/* Exit Expanded Full Screen when toggled from inline */}
          {!fullPage && isExpandedFullPage && (
            <button
              type="button"
              onClick={handleCloseViewer}
              aria-label="Exit full-screen view"
              className="inline-flex items-center gap-1.5 px-2.5 h-8 rounded-lg border border-slate-700/80 text-slate-200 hover:bg-slate-800 text-[11px] font-semibold transition-colors whitespace-nowrap"
            >
              <Minimize2 className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Exit</span>
            </button>
          )}

          {/* Download PDF */}
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

      {/* Main Full-Screen PDF Reading Stage */}
      <div
        ref={scrollContainerRef}
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
        className={`relative flex-1 min-h-0 overflow-auto flex flex-col items-center ${
          viewMode === 'scroll'
            ? 'justify-start px-2 sm:px-6 py-4 sm:py-6'
            : 'justify-center px-3 sm:px-8 py-4 sm:py-6'
        } ${effectiveFullPage ? '' : heightClassName}`}
      >
        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 text-slate-300 py-20 my-auto">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
            <p className="text-sm font-medium">Loading full-screen PDF: {title}…</p>
          </div>
        )}

        {/* DEFAULT: FULL-SCREEN CONTINUOUS VERTICAL SCROLL MODE */}
        {!loading && pdfDoc && !fallbackToIframe && viewMode === 'scroll' && (
          <div className="w-full flex flex-col items-center gap-4 sm:gap-5 pb-8">
            {Array.from({ length: numPages }, (_, idx) => idx + 1).map((pageNum) => (
              <div
                key={pageNum}
                data-page-num={pageNum}
                ref={(el) => {
                  if (el) scrollPageRefs.current.set(pageNum, el);
                  else scrollPageRefs.current.delete(pageNum);
                }}
                className="flex flex-col items-center max-w-full"
              >
                <BookPageCanvas
                  pdfDoc={pdfDoc}
                  pageNumber={pageNum}
                  scale={scale}
                  maxWidth={scrollPageMaxWidth}
                  side="single"
                />
              </div>
            ))}
          </div>
        )}

        {/* OPTIONAL: SINGLE PAGE / TWO-PAGE BOOK FLIP MODE */}
        {!loading && pdfDoc && !fallbackToIframe && viewMode !== 'scroll' && (
          <div className="relative flex items-center justify-center w-full max-w-6xl my-auto">
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

            <div
              style={{ perspective: '2200px' }}
              className="relative flex items-center justify-center max-w-full"
            >
              <div
                data-testid="book-stage"
                className="relative p-2 sm:p-3 rounded-xl bg-gradient-to-b from-[#16233E] via-[#0F1B33] to-[#142038] border border-cyan-500/20 shadow-[0_24px_60px_-15px_rgba(0,0,0,0.85)]"
              >
                <div className="relative flex items-stretch justify-center overflow-hidden rounded-lg bg-[#E9E4D8] shadow-inner">
                  {twoPageActive ? (
                    <>
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

                      <div
                        aria-hidden="true"
                        className="w-[3px] shrink-0 bg-gradient-to-r from-slate-900/45 via-slate-950/75 to-slate-900/45 z-10"
                      />

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
                          style={{ width: `${Math.min(pageMaxWidth, 420)}px` }}
                          className="min-h-[360px] bg-[#FAF8F2] flex flex-col items-center justify-center p-8 text-center text-slate-400"
                        >
                          <BookOpen className="w-8 h-8 text-slate-300 mb-2" />
                          <p className="font-display text-sm font-semibold text-slate-500">
                            End of Document
                          </p>
                          <p className="text-xs text-slate-400 mt-1">{title}</p>
                        </div>
                      )}
                    </>
                  ) : (
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

                  <AnimatePresence>
                    {flipState && (
                      <motion.div
                        key={flipState.id}
                        aria-hidden="true"
                        data-testid="book-page-turn-leaf"
                        initial={{ rotateY: 0, opacity: 0.98 }}
                        animate={{
                          rotateY: flipState.direction === 'next' ? -172 : 172,
                          opacity: [1, 1, 0.92, 0],
                        }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.46, ease: [0.22, 1, 0.36, 1] }}
                        style={{
                          transformStyle: 'preserve-3d',
                          transformOrigin:
                            flipState.direction === 'next' ? 'left center' : 'right center',
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
                        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/20 via-white/35 to-slate-900/15" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

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

        {/* BROWSER IFRAME FALLBACK */}
        {!loading && fallbackToIframe && (
          <div className="w-full h-full min-h-[520px] flex flex-col gap-2">
            <iframe
              src={url}
              title={title}
              className="w-full flex-1 min-h-[520px] rounded-xl border border-slate-700 bg-white"
            />
            <p className="text-xs text-center text-slate-400">
              Loaded via native PDF frame. Use “Download PDF” to save offline.
            </p>
          </div>
        )}
      </div>

      {/* Bottom Full-Screen Page Navigation & Scrubber Bar */}
      {!loading && !fallbackToIframe && numPages > 0 && (
        <div className="px-3 sm:px-6 py-2.5 bg-[#081022] border-t border-slate-800/90 flex flex-wrap items-center justify-between gap-3 shrink-0">
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

          <div className="flex-1 min-w-[140px] max-w-md flex items-center gap-3">
            <label htmlFor="book-page-slider" className="sr-only">
              Jump to PDF page
            </label>
            <input
              id="book-page-slider"
              type="range"
              min={1}
              max={numPages}
              value={viewMode === 'scroll' ? currentPage : (visiblePages[0] ?? 1)}
              onChange={(e) => handleJumpToPage(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          <div className="hidden lg:flex items-center gap-2 text-[11px] text-slate-400">
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              {viewMode === 'scroll'
                ? 'Scroll pages smoothly or drag slider to jump · Press Esc to exit'
                : 'Use ← / → keys or swipe to turn pages · Press Esc to exit'}
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );

  if (effectiveFullPage && typeof document !== 'undefined') {
    return createPortal(viewerNode, document.body);
  }

  return viewerNode;
}
