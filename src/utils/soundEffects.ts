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
    gain.gain.exponentialRampToValueAtTime(gainPeak, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + durationSec + 0.01);
  } catch {
    // ignore audio errors in restricted environments
  }
}

export function playClick(): void {
  playTone(620, 410, 0.04, 0.032, 'triangle');
}

export function playToggle(on: boolean): void {
  if (on) {
    playTone(440, 660, 0.065, 0.04, 'sine');
  } else {
    playTone(520, 340, 0.065, 0.035, 'sine');
  }
}

export function playSuccess(): void {
  playTone(523.25, 523.25, 0.09, 0.04, 'sine', 0);
  playTone(659.25, 659.25, 0.09, 0.045, 'sine', 0.075);
  playTone(783.99, 783.99, 0.14, 0.05, 'sine', 0.15);
}

export function playWarning(): void {
  playTone(880, 740, 0.12, 0.08, 'sawtooth', 0);
  playTone(880, 660, 0.15, 0.085, 'sawtooth', 0.15);
}
