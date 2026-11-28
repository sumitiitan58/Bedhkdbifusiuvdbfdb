import { useEffect, useRef, useState } from 'react';
import { applyWhiteChromaKey } from '../../utils/chromaKey';
import prepsbotFallbackImg from '../../assets/images/bot_prepsbot_cutout.png';

interface ChromaKeyMascotVideoProps {
  src?: string;
  onClick?: () => void;
  className?: string;
}

/**
 * Renders a looping vertical (9:16) solid-white-background AI mascot video onto a
 * real-time HTML5 <canvas> with white-background chroma-key removal + edge feathering,
 * plus a soft cyan/orange radial platform shadow underneath the robot's feet so it
 * floats natively like a 3D model directly over the dark obsidian grid.
 */
export function ChromaKeyMascotVideo({
  src = '/video_1.mp4',
  onClick,
  className = '',
}: ChromaKeyMascotVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const frameCountRef = useRef(0);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    let rafId = 0;
    let disposed = false;
    let scratchMask: Uint8Array | undefined;
    let scratchQueue: Int32Array | undefined;

    const processFrame = () => {
      if (disposed) return;

      if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
        // Keep internal canvas crisp & fast (max 360px width for smooth 60fps CPU chroma-key)
        const targetWidth = Math.min(360, video.videoWidth);
        const targetHeight = Math.round((video.videoHeight / video.videoWidth) * targetWidth);

        if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const total = targetWidth * targetHeight;
          scratchMask = new Uint8Array(total);
          scratchQueue = new Int32Array(total);
        }

        try {
          ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
          const frame = ctx.getImageData(0, 0, targetWidth, targetHeight);
          applyWhiteChromaKey(
            frame.data,
            targetWidth,
            targetHeight,
            {
              hardThreshold: 228,
              softThreshold: 178,
              maxChroma: 30,
              featherPasses: 2,
            },
            scratchMask,
            scratchQueue
          );
          ctx.putImageData(frame, 0, 0);

          frameCountRef.current += 1;
          if (frameCountRef.current === 1) {
            setVideoReady(true);
            canvas.setAttribute('data-chroma-active', 'true');
          }
          if (frameCountRef.current % 15 === 1) {
            canvas.setAttribute('data-frames-rendered', String(frameCountRef.current));
          }
        } catch {
          // SecurityError or transient decode stall — gracefully keep previous frame
        }
      }

      rafId = window.requestAnimationFrame(processFrame);
    };

    const ensurePlay = () => {
      video.muted = true;
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          // Autoplay policy handled; muted+playsInline succeeds in all modern browsers
        });
      }
    };

    const handleLoaded = () => {
      setVideoFailed(false);
      ensurePlay();
    };

    const handleError = () => {
      setVideoFailed(true);
    };

    video.addEventListener('loadeddata', handleLoaded);
    video.addEventListener('canplay', handleLoaded);
    video.addEventListener('error', handleError);

    if (video.readyState >= 2) {
      ensurePlay();
    } else {
      video.load();
    }

    rafId = window.requestAnimationFrame(processFrame);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(rafId);
      video.removeEventListener('loadeddata', handleLoaded);
      video.removeEventListener('canplay', handleLoaded);
      video.removeEventListener('error', handleError);
    };
  }, [src]);

  return (
    <div
      className={`relative flex flex-col items-center justify-center select-none ${className}`}
      data-testid="mascot-video-stage"
    >
      {/* Hidden source <video> — muted, looping, autoplay, playsInline, zero controls */}
      <video
        ref={videoRef}
        src={src}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        crossOrigin="anonymous"
        aria-hidden="true"
        tabIndex={-1}
        data-testid="mascot-source-video"
        className="pointer-events-none absolute opacity-0 w-px h-px overflow-hidden"
      />

      {/* Ambient 3D Halo Aura behind the floating mascot */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-4 top-8 bottom-12 rounded-full opacity-70 blur-3xl"
        style={{
          background:
            'radial-gradient(circle at 50% 42%, rgba(0, 212, 255, 0.24), rgba(37, 99, 235, 0.14) 44%, rgba(255, 122, 0, 0.12) 72%, transparent 85%)',
        }}
      />

      {/* Interactive Transparent 3D-Style Canvas Surface */}
      <button
        type="button"
        onClick={onClick}
        aria-label='Wake PrepsBot — say "Hello Buddy" or click to talk'
        title='Say "Hello Buddy" or click PrepsBot to talk'
        className="relative z-10 flex items-center justify-center bg-transparent border-0 p-0 -my-10 focus-visible:outline-[#00D4FF] rounded-3xl group cursor-pointer"
      >
        <canvas
          ref={canvasRef}
          data-testid="mascot-chroma-canvas"
          aria-label="Animated 3D PrepsBot mascot"
          className={`w-[245px] sm:w-[275px] aspect-[9/16] object-contain drop-shadow-[0_18px_28px_rgba(0,212,255,0.22)] transition-transform duration-300 group-hover:scale-[1.03] ${
            videoReady && !videoFailed ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Instant fallback image while video first frame decodes or if video fails */}
        {(!videoReady || videoFailed) && (
          <img
            src={prepsbotFallbackImg}
            alt="PrepsBot 3D AI study mascot"
            className="absolute w-[195px] sm:w-[220px] h-auto object-contain prepsbot-float drop-shadow-[0_16px_26px_rgba(0,212,255,0.28)]"
          />
        )}
      </button>

      {/* Soft Glowing Cyan / Orange Radial Platform Shadow under Robot Feet */}
      <div
        aria-hidden="true"
        data-testid="mascot-platform-shadow"
        className="relative z-0 -mt-20 sm:-mt-24 w-52 sm:w-60 h-10 flex items-center justify-center pointer-events-none"
      >
        <div
          className="absolute inset-0 rounded-full blur-xl opacity-90"
          style={{
            background:
              'radial-gradient(ellipse at 50% 50%, rgba(0, 212, 255, 0.5) 0%, rgba(255, 122, 0, 0.36) 48%, rgba(37, 99, 235, 0.14) 72%, transparent 100%)',
          }}
        />
        <div
          className="w-36 sm:w-44 h-3.5 rounded-full border border-[#00D4FF]/45 shadow-[0_0_24px_rgba(0,212,255,0.45),0_0_32px_rgba(255,122,0,0.3)]"
          style={{
            background:
              'radial-gradient(ellipse at 50% 50%, rgba(0, 212, 255, 0.28), rgba(255, 122, 0, 0.18) 65%, transparent 100%)',
          }}
        />
      </div>
    </div>
  );
}
