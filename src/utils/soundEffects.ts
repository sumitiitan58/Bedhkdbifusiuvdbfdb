const SOUND_STORAGE_KEY = 'prepskm-sound-enabled';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) {
    try {
      audioCtx = new Ctor();
    } catch {
      return null;
    }
  }
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const raw = window.localStorage.getItem(SOUND_STORAGE_KEY);
    return raw === null ? true : raw === 'true';
  } catch {
    return true;
  }
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SOUND_STORAGE_KEY, String(enabled));
  } catch {
    // ignore storage errors
  }
}

function playTone(
  freqStart: number,
  freqEnd: number,
  durationSec: number,
  gainPeak: number,
  type: OscillatorType = 'sine',
  delaySec = 0
): void {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime + delaySec;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), now + durationSec);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainPeak, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + durationSec + 0.015);
  } catch {
    // ignore audio errors in restricted environments
  }
}

/** Crisp tactile UI pop for buttons & selections */
export function playClick(): void {
  playTone(680, 440, 0.036, 0.028, 'triangle', 0);
  playTone(1020, 860, 0.025, 0.014, 'sine', 0.006);
}

/** Gentle chime for tab switches & bottom navigation */
export function playNav(): void {
  playTone(540, 680, 0.055, 0.025, 'sine', 0);
  playTone(810, 960, 0.045, 0.015, 'triangle', 0.02);
}

/** Smooth up/down glide for toggles */
export function playToggle(on: boolean): void {
  if (on) {
    playTone(460, 700, 0.065, 0.035, 'sine', 0);
    playTone(700, 920, 0.05, 0.018, 'triangle', 0.035);
  } else {
    playTone(540, 340, 0.065, 0.03, 'sine', 0);
  }
}

/** Warm harmonic triad arpeggio for completion, submission & save */
export function playSuccess(): void {
  playTone(523.25, 523.25, 0.09, 0.035, 'sine', 0);
  playTone(659.25, 659.25, 0.09, 0.04, 'sine', 0.065);
  playTone(783.99, 783.99, 0.11, 0.042, 'sine', 0.13);
  playTone(1046.5, 1046.5, 0.16, 0.035, 'triangle', 0.195);
}

/** Shimmering harmonic chord when Gemini AI completes analysis or extraction */
export function playAiSparkle(): void {
  playTone(587.33, 659.25, 0.08, 0.03, 'sine', 0);
  playTone(880, 987.77, 0.1, 0.028, 'triangle', 0.06);
  playTone(1174.66, 1318.51, 0.15, 0.024, 'sine', 0.12);
}

/** Distinct double-pulse alert for CBT exam room-exit warnings */
export function playWarning(): void {
  playTone(880, 720, 0.12, 0.075, 'sawtooth', 0);
  playTone(880, 620, 0.15, 0.08, 'sawtooth', 0.14);
}
