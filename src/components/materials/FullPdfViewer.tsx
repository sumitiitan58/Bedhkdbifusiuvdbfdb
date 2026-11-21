import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  Download,
  ExternalLink,
  FileText,
  Loader2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface FullPdfViewerProps {
  url: string;
  title: string;
  fileName?: string;
  heightClassName?: string;
}

interface PdfPageCanvasProps {
  pdfDoc: pdfjsLib.PDFDocumentProxy;
  pageNumber: number;
  scale: number;
}

function PdfPageCanvas({ pdfDoc, pageNumber, scale }: PdfPageCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let renderTask: pdfjsLib.RenderTask | null = null;

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(pageNumber);
        if (cancelled) return;
        const baseViewport = page.getViewport({ scale: 1 });
        const containerWidth = containerRef.current?.clientWidth
          ? Math.max(280, Math.min(920, containerRef.current.clientWidth - 24))
          : 760;
        const fitScale = (containerWidth / baseViewport.width) * scale;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const viewport = page.getViewport({ scale: fitScale });
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        renderTask = page.render({ canvasContext: ctx, viewport, canvas });
        await renderTask.promise;
        if (!cancelled) setRendered(true);
      } catch (err) {
        if (!cancelled && (err as { name?: string })?.name !== 'RenderingCancelledException') {
          console.warn(`PDF page ${pageNumber} render error:`, err);
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
  }, [pdfDoc, pageNumber, scale]);

  return (
    <div
      ref={containerRef}
      data-testid={`pdf-page-${pageNumber}`}
      className="w-full flex flex-col items-center"
    >
      <div className="relative bg-white shadow-md border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
        {!rendered && (
          <div className="w-[320px] sm:w-[640px] h-[420px] flex items-center justify-center bg-slate-50 text-slate-400 text-xs gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Rendering page {pageNumber}…</span>
          </div>
        )}
        <canvas
          ref={canvasRef}
          className={rendered ? 'block max-w-full h-auto' : 'hidden'}
        />
      </div>
      <span className="mt-1.5 text-[11px] font-mono text-slate-500 dark:text-slate-400">
        Page {pageNumber}
      </span>
    </div>
  );
}

export function FullPdfViewer({
  url,
  title,
  fileName,
  heightClassName = 'h-[72vh]',
}: FullPdfViewerProps) {
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [fallbackToIframe, setFallbackToIframe] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    let loadedDoc: pdfjsLib.PDFDocumentProxy | null = null;

    setLoading(true);
    setFallbackToIframe(false);
    setPdfDoc(null);
    setNumPages(0);

    const loadPdf = async () => {
      try {
        const loadingTask = pdfjsLib.getDocument({ url });
        const doc = await loadingTask.promise;
        if (cancelled) {
          void doc.destroy();
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
      if (loadedDoc) {
        void loadedDoc.destroy();
      }
    };
  }, [url]);

  return (
    <div className="flex flex-col w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/90 dark:bg-slate-950 overflow-hidden">
      {/* Toolbar */}
      <div className="px-3 py-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-4 h-4 text-[#2563EB] shrink-0" />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
            {numPages > 0 ? `Full PDF · ${numPages} ${numPages === 1 ? 'Page' : 'Pages'}` : 'Full PDF Viewer'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {!fallbackToIframe && numPages > 0 && (
            <>
              <button
                type="button"
                onClick={() => setScale((s) => Math.max(0.75, Number((s - 0.2).toFixed(2))))}
                aria-label="Zoom out PDF"
                className="inline-flex items-center justify-center h-7 w-7 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono text-slate-600 dark:text-slate-300 w-10 text-center">
                {Math.round(scale * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setScale((s) => Math.min(2, Number((s + 0.2).toFixed(2))))}
                aria-label="Zoom in PDF"
                className="inline-flex items-center justify-center h-7 w-7 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          <a
            href={url}
            download={fileName || `${title}.pdf`}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0B1B3B] hover:bg-[#142B59] text-white text-[11px] font-semibold"
          >
            <Download className="w-3 h-3" />
            <span>Download</span>
          </a>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-semibold"
          >
            <ExternalLink className="w-3 h-3" />
            <span>Open Tab</span>
          </a>
        </div>
      </div>

      {/* Scrollable multi-page body */}
      <div
        data-testid="full-pdf-scroll-container"
        className={`${heightClassName} overflow-y-auto px-3 sm:px-5 py-4 space-y-5`}
      >
        {loading && (
          <div className="h-full min-h-[260px] flex flex-col items-center justify-center gap-2 text-slate-500 dark:text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-[#2563EB]" />
            <p className="text-xs font-medium">Loading all pages of {title}…</p>
          </div>
        )}

        {!loading && pdfDoc && !fallbackToIframe && (
          <div className="space-y-5 pb-4">
            {Array.from({ length: numPages }, (_, idx) => idx + 1).map((pageNum) => (
              <PdfPageCanvas
                key={pageNum}
                pdfDoc={pdfDoc}
                pageNumber={pageNum}
                scale={scale}
              />
            ))}
          </div>
        )}

        {!loading && fallbackToIframe && (
          <div className="w-full h-full min-h-[460px] flex flex-col gap-2">
            <iframe
              src={url}
              title={title}
              className="w-full flex-1 min-h-[460px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white"
            />
            <p className="text-[11px] text-center text-slate-500 dark:text-slate-400">
              External PDF loaded via native browser viewer. Use “Open Tab” or “Download” if your device restricts embedded frames.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
