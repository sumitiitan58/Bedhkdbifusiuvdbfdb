import { useEffect, useRef } from 'react';
import {
  ADSTERRA_NATIVE_CONTAINER_ID,
  ADSTERRA_NATIVE_SCRIPT_SRC,
} from '../../utils/downloadGate';

const SCRIPT_DATA_ATTR = 'data-prepskm-adsterra-native';

interface NativeBannerAdProps {
  className?: string;
}

/**
 * Reusable Adsterra Native Banner placement.
 * Renders the exact required container wrapper and guarantees the external
 * Adsterra invoke script is injected at most once across React re-renders.
 */
export function NativeBannerAd({ className = '' }: NativeBannerAdProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[${SCRIPT_DATA_ATTR}="true"]`
    );
    if (existingScript) return;

    const script = document.createElement('script');
    script.async = true;
    script.setAttribute('data-cfasync', 'false');
    script.setAttribute(SCRIPT_DATA_ATTR, 'true');
    script.src = ADSTERRA_NATIVE_SCRIPT_SRC;

    const mountTarget = wrapperRef.current ?? document.body;
    mountTarget.appendChild(script);
  }, []);

  return (
    <aside
      ref={wrapperRef}
      aria-label="Sponsored study resources"
      data-testid="native-banner-ad"
      className={`my-6 flex justify-center w-full overflow-hidden ${className}`}
    >
      <div
        id={ADSTERRA_NATIVE_CONTAINER_ID}
        className="w-full max-w-5xl flex justify-center"
      />
    </aside>
  );
}
