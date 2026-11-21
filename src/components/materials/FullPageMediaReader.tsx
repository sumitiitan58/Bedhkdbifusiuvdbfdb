import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Download,
  Film,
  Image as ImageIcon,
  Paperclip,
  Volume2,
  VolumeX,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { FullPdfViewer } from './FullPdfViewer';
import { GuestDownloadBadge } from '../monetization/GuestDownloadBadge';
import { useDownloadGate } from '../../context/DownloadGateContext';
import {
  isSoundEnabled,
  playBookClose,
  playBookOpen,
  playClick,
  playTheaterOpen,
  playToggle,
  playZoomTick,
  setSoundEnabled,
} from '../../utils/soundEffects';
import type { MaterialAttachment } from '../../types';

export interface FullPageMediaItem {
  id: string;
  title: string;
  sectionName?: string;
  description?: string;
  url: string;
  fileName?: string;
  thumbnailUrl?: string;
  mediaKind: 'pdf' | 'video' | 'image';
  youtubeId?: string | null;
  attachments?: MaterialAttachment[];
  resumeSeconds?: number;
}

interface FullPageMediaReaderProps {
  item: FullPageMediaItem;
  isBookmarked?: boolean;
  onToggleBookmark?: () => void;
  onClose: () => void;
  onDownloadApproved?: () => void;
}

/**
 * Full-page edge-to-edge immersive reader/theater for PDFs, Videos, and Images.
 * Replaces small boxed popup previews with a dedicated full-viewport study experience
 * featuring book page-turning animation, cinema video stage, and interactive SFX.
 */
export function FullPageMediaReader({
  item,
  isBookmarked = false,
  onToggleBookmark,
  onClose,
  onDownloadApproved,
}: FullPageMediaReaderProps) {
  const { requestPdfDownload } = useDownloadGate();
  const [soundOn, setSoundOn] = useState<boolean>(() => isSoundEnabled());
  const [showNotesDrawer, setShowNotesDrawer] = useState<boolean>(
    Boolean(item.attachments && item.attachments.length > 0)
  );
  const [imageScale, setImageScale] = useState<number>(1);

  useEffect(() => {
    if (item.mediaKind === 'video') {
      playTheaterOpen();
    } else if (item.mediaKind === 'image') {
      playBookOpen();
    }
  }, [item.mediaKind, item.id]);

  // Lock background page scroll and listen for Escape key for Video & Image full-page views
  useEffect(() => {
    if (item.mediaKind === 'pdf') return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        playBookClose();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [item.mediaKind, onClose]);

  const handleToggleSound = () => {
    const next = !soundOn;
    setSoundEnabled(next);
    setSoundOn(next);
    if (next) playToggle(true);
  };

  const handleExit = () => {
    playBookClose();
    onClose();
  };

  // PDF renders directly in the Full-Page 3D Book Reader
  if (item.mediaKind === 'pdf') {
    return (
      <FullPdfViewer
        url={item.url}
        title={item.title}
        subtitle={item.sectionName}
        fileName={item.fileName}
        materialId={item.id}
        fullPage
        onClose={onClose}
        onDownloadApproved={onDownloadApproved}
      />
    );
  }

  // VIDEO & IMAGE render in an edge-to-edge Full-Page Theater / Sheet Stage
  const attachments = item.attachments ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.985 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
      role="dialog"
      aria-modal="true"
      aria-label={`Full-page viewer for ${item.title}`}
      data-testid={
        item.mediaKind === 'video'
          ? 'full-page-video-theater'
          : 'full-page-image-reader'
      }
      className="fixed inset-0 z-50 w-screen h-screen flex flex-col bg-gradient-to-b from-[#060B17] via-[#0A1326] to-[#050914] text-slate-100"
    >
      {/* Top Cinema / Reader Bar */}
      <header className="px-3 sm:px-5 h-14 bg-[#070E1F]/95 border-b border-slate-800/90 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={handleExit}
            aria-label="Back to chapter materials"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-100 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <div className="min-w-0 flex items-center gap-2">
            {item.mediaKind === 'video' ? (
              <Film className="w-4 h-4 text-[#F97316] shrink-0 hidden sm:block" />
            ) : (
              <ImageIcon className="w-4 h-4 text-cyan-400 shrink-0 hidden sm:block" />
            )}
            <div className="min-w-0">
              <h2 className="font-display text-xs sm:text-sm font-bold text-white truncate">
                {item.title}
              </h2>
              {item.sectionName && (
                <p className="text-[11px] text-slate-400 truncate hidden sm:block">
                  {item.sectionName} · {item.mediaKind === 'video' ? 'Full-Page Video Theater' : 'Full-Page Formula Sheet'}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {item.mediaKind === 'image' && (
            <>
              <span className="hidden lg:inline-flex mr-1">
                <GuestDownloadBadge compact darkSurface />
              </span>
              <button
                type="button"
                onClick={() => {
                  playZoomTick(false);
                  setImageScale((s) => Math.max(0.6, Number((s - 0.2).toFixed(2))));
                }}
                aria-label="Zoom out image"
                className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-700/80 text-slate-200 hover:bg-slate-800"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  playZoomTick(true);
                  setImageScale((s) => Math.min(2.2, Number((s + 0.2).toFixed(2))));
                }}
                aria-label="Zoom in image"
                className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-700/80 text-slate-200 hover:bg-slate-800"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() =>
                  void requestPdfDownload({
                    url: item.url,
                    fileName: item.fileName || `${item.title}.png`,
                    title: item.title,
                    materialId: item.id,
                    onApproved: onDownloadApproved,
                  })
                }
                className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
            </>
          )}

          {item.mediaKind === 'video' && attachments.length > 0 && (
            <button
              type="button"
              onClick={() => {
                playClick();
                setShowNotesDrawer((v) => !v);
              }}
              className={`inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap ${
                showNotesDrawer
                  ? 'bg-cyan-500 text-slate-950 border-cyan-500'
                  : 'border-slate-700 text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Paperclip className="w-3.5 h-3.5" />
              <span>Attached PDFs ({attachments.length})</span>
            </button>
          )}

          {onToggleBookmark && (
            <button
              type="button"
              onClick={() => {
                playClick();
                onToggleBookmark();
              }}
              aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark material'}
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

          <button
            type="button"
            onClick={handleToggleSound}
            aria-label={soundOn ? 'Mute viewer sound effects' : 'Enable viewer sound effects'}
            className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-700/80 text-slate-200 hover:bg-slate-800 transition-colors"
          >
            {soundOn ? (
              <Volume2 className="w-4 h-4 text-cyan-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-400" />
            )}
          </button>
        </div>
      </header>

      {/* Main Full-Page Stage */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-3 sm:p-6 overflow-auto">
          {item.mediaKind === 'video' ? (
            <div className="w-full h-full max-w-6xl max-h-[82vh] aspect-video rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-[0_24px_60px_-15px_rgba(0,0,0,0.9)]">
              {item.youtubeId ? (
                <iframe
                  title={item.title}
                  src={`https://www.youtube.com/embed/${item.youtubeId}?autoplay=1${
                    item.resumeSeconds ? `&start=${item.resumeSeconds}` : ''
                  }`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              ) : (
                <video
                  src={item.url}
                  poster={item.thumbnailUrl}
                  controls
                  controlsList="nodownload"
                  disablePictureInPicture
                  onContextMenu={(e) => e.preventDefault()}
                  autoPlay
                  className="w-full h-full"
                />
              )}
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center overflow-auto">
              <img
                src={item.url}
                alt={item.title}
                style={{ transform: `scale(${imageScale})` }}
                className="max-h-[82vh] max-w-full rounded-xl object-contain transition-transform duration-200 shadow-2xl"
              />
            </div>
          )}

          {item.description && (
            <p className="mt-4 max-w-4xl text-xs sm:text-sm text-slate-300 text-center leading-relaxed">
              {item.description}
            </p>
          )}
        </div>

        {/* Attached PDFs Side Panel inside Full-Page Video Theater */}
        {item.mediaKind === 'video' && attachments.length > 0 && showNotesDrawer && (
          <aside className="w-full lg:w-80 xl:w-96 bg-[#0B1426] border-t lg:border-t-0 lg:border-l border-slate-800 p-4 overflow-y-auto space-y-3 shrink-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-sm font-bold text-white flex items-center gap-1.5">
                <Paperclip className="w-4 h-4 text-cyan-400" />
                Attached Class PDFs
              </h3>
              <GuestDownloadBadge compact darkSurface />
            </div>
            <div className="space-y-2">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{att.title}</p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {att.fileName || 'PDF Notes'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      void requestPdfDownload({
                        url: att.fileUrl,
                        fileName: att.fileName || `${att.title}.pdf`,
                        title: att.title,
                        materialId: item.id,
                        onApproved: onDownloadApproved,
                      })
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold shrink-0 whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>PDF</span>
                  </button>
                </div>
              ))}
            </div>
          </aside>
        )}
      </div>
    </motion.div>
  );
}
