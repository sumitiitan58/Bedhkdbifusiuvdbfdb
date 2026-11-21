import { useEffect, useRef, useState } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { FileText, Loader2, ZoomIn, ZoomOut } from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export interface ActiveCropSelection {
  pageNumber: number;
  imageEl: HTMLImageElement;
  pixelCrop: PixelCrop;
}

interface PdfDirectCropCanvasProps {
  sourceFile: File | null;
  zoomPercent: number;
  onZoomChange: (nextZoom: number) => void;
  onActiveCropChange: (selection: ActiveCropSelection | null) => void;
  onPageCountDetected?: (count: number) => void;
  clearSignal: number;
}

interface RenderedPage {
  pageNumber: number;
  dataUrl: string;
}

export function PdfDirectCropCanvas({
  sourceFile,
  zoomPercent,
  onZoomChange,
  onActiveCropChange,
  onPageCountDetected,
  clearSignal,
}: PdfDirectCropCanvasProps) {
  const [pages, setPages] = useState<RenderedPage[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [activePage, setActivePage] = useState<number | null>(null);
  const [crop, setCrop] = useState<Crop | undefined>(undefined);
  const imgRefs = useRef<Record<number, HTMLImageElement | null>>({});

  // Reset active crop rectangle whenever parent captures a crop
  useEffect(() => {
    setCrop(undefined);
    setActivePage(null);
    onActiveCropChange(null);
  }, [clearSignal, onActiveCropChange]);

  useEffect(() => {
    if (!sourceFile) {
      setPages([]);
      setError(null);
      setLoading(false);
      onPageCountDetected?.(0);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setPages([]);
    setCrop(undefined);
    setActivePage(null);
    onActiveCropChange(null);

    const processFile = async () => {
      try {
        if (sourceFile.type.startsWith('image/')) {
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () =>
              typeof reader.result === 'string'
                ? resolve(reader.result)
                : reject(new Error('Could not read image'));
            reader.onerror = () => reject(new Error('Image read failed'));
            reader.readAsDataURL(sourceFile);
          });
          if (!cancelled) {
            setPages([{ pageNumber: 1, dataUrl }]);
            onPageCountDetected?.(1);
            setLoading(false);
          }
          return;
        }

        // Direct full PDF rendering into high-DPI page images for smooth scrolling + cropping
        const arrayBuffer = await sourceFile.arrayBuffer();
        const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        if (cancelled) {
          void pdfDoc.destroy();
          return;
        }

        const total = pdfDoc.numPages;
        onPageCountDetected?.(total);
        const rendered: RenderedPage[] = [];

        for (let p = 1; p <= total; p++) {
          if (cancelled) break;
          setLoadingProgress(`Rendering page ${p} of ${total}…`);
          const page = await pdfDoc.getPage(p);
          const viewport = page.getViewport({ scale: 1.65 });
          const canvas = document.createElement('canvas');
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;

          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          await page.render({ canvasContext: ctx, viewport, canvas }).promise;
          const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
          rendered.push({ pageNumber: p, dataUrl });

          // Stream pages progressively into state so admin can immediately start cropping page 1!
          if (!cancelled) {
            setPages([...rendered]);
          }
        }

        void pdfDoc.destroy();
        if (!cancelled) {
          setLoading(false);
          setLoadingProgress('');
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Could not render this PDF/image for cropping.'
          );
          setLoading(false);
        }
      }
    };

    void processFile();

    return () => {
      cancelled = true;
    };
  }, [sourceFile, onActiveCropChange, onPageCountDetected]);

  if (!sourceFile) {
    return (
      <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8 text-center bg-slate-50/70 dark:bg-slate-900/40">
        <FileText className="w-8 h-8 mx-auto text-[#2563EB] mb-2 opacity-80" />
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Upload a Full Multi-Page PDF Question Paper (or Image)
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
          Scroll freely up &amp; down through every page of the PDF, drag a crop box directly on any page for <strong>1. Question</strong> or <strong>2. Answer / Solution</strong>, and click <strong>Save &amp; Next</strong> right on the side panel.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 dark:bg-slate-900/80 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-4 h-4 text-[#2563EB] shrink-0" />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
            {sourceFile.name} ({pages.length} {pages.length === 1 ? 'page' : 'pages'} loaded)
          </span>
          {loading && loadingProgress && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#2563EB]">
              <Loader2 className="w-3 h-3 animate-spin" />
              {loadingProgress}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            aria-label="Zoom out paper"
            onClick={() => onZoomChange(Math.max(60, zoomPercent - 20))}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-xs font-semibold w-11 text-center tabular-nums">
            {zoomPercent}%
          </span>
          <button
            type="button"
            aria-label="Zoom in paper"
            onClick={() => onZoomChange(Math.min(220, zoomPercent + 20))}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* Vertically Scrollable Full PDF Pages */}
      <div
        data-testid="pdf-direct-crop-scroller"
        className="h-[640px] overflow-y-auto overflow-x-auto rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-200/70 dark:bg-slate-950 p-3 space-y-4"
      >
        {pages.length === 0 && loading && (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin text-[#2563EB]" />
            <p className="text-xs font-medium">{loadingProgress || 'Preparing PDF pages…'}</p>
          </div>
        )}

        {pages.map((p) => {
          const isActive = activePage === p.pageNumber;
          return (
            <div key={p.pageNumber} className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-400">
                  PAGE {p.pageNumber} {isActive ? '· Crop Active' : '· Drag anywhere to crop'}
                </span>
              </div>
              <div
                style={{ width: `${zoomPercent}%`, minWidth: '100%' }}
                className="bg-white rounded-lg shadow border border-slate-300 dark:border-slate-700 overflow-hidden"
              >
                <ReactCrop
                  crop={isActive ? crop : undefined}
                  onChange={(c) => {
                    setActivePage(p.pageNumber);
                    setCrop(c);
                  }}
                  onComplete={(pixelCrop) => {
                    const imgEl = imgRefs.current[p.pageNumber];
                    if (imgEl && pixelCrop.width >= 8 && pixelCrop.height >= 8) {
                      setActivePage(p.pageNumber);
                      onActiveCropChange({
                        pageNumber: p.pageNumber,
                        imageEl: imgEl,
                        pixelCrop,
                      });
                    } else {
                      onActiveCropChange(null);
                    }
                  }}
                >
                  <img
                    ref={(el) => {
                      imgRefs.current[p.pageNumber] = el;
                    }}
                    src={p.dataUrl}
                    alt={`Question Paper Page ${p.pageNumber}`}
                    className="max-w-none w-full h-auto block select-none"
                  />
                </ReactCrop>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
