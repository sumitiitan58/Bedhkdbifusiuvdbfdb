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

/** Synthesize filtered noise burst for authentic paper rustle & book sounds */
function playNoiseSweep(
  filterFreqStart: number,
  filterFreqMid: number,
  filterFreqEnd: number,
  durationSec: number,
  gainPeak: number,
  q = 1.4,
  delaySec = 0
): void {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const sampleRate = ctx.sampleRate;
    const frameCount = Math.max(1, Math.floor(sampleRate * durationSec));
    const buffer = ctx.createBuffer(1, frameCount, sampleRate);
    const data = buffer.getChannelData(0);

    // Pink-tinted soft paper noise
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < frameCount; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + white * 0.029;
      b1 = 0.985 * b1 + white * 0.032;
      b2 = 0.950 * b2 + white * 0.048;
      data[i] = (b0 + b1 + b2 + white * 0.18) * 0.9;
    }

    const now = ctx.currentTime + delaySec;
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(q, now);
    filter.frequency.setValueAtTime(filterFreqStart, now);
    filter.frequency.exponentialRampToValueAtTime(filterFreqMid, now + durationSec * 0.42);
    filter.frequency.exponentialRampToValueAtTime(filterFreqEnd, now + durationSec);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainPeak, now + durationSec * 0.18);
    gain.gain.exponentialRampToValueAtTime(gainPeak * 0.65, now + durationSec * 0.65);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    source.start(now);
    source.stop(now + durationSec + 0.02);
  } catch {
    // ignore audio errors in restricted environments
  }
}

/** Realistic paper page-turning SFX for the full-page book PDF reader */
export function playPageFlip(direction: 'next' | 'prev' = 'next'): void {
  if (direction === 'next') {
    // Crisp upward paper lift + sweeping turn + soft page settle
    playNoiseSweep(950, 2650, 720, 0.24, 0.16, 1.35, 0);
    playTone(210, 115, 0.075, 0.028, 'sine', 0.17);
  } else {
    // Slightly warmer reverse page rustle + settle
    playNoiseSweep(1250, 2100, 620, 0.23, 0.15, 1.4, 0);
    playTone(185, 105, 0.075, 0.026, 'sine', 0.16);
  }
}

/** Hardcover book opening swoosh & soft leaf rustle */
export function playBookOpen(): void {
  playNoiseSweep(520, 1750, 880, 0.3, 0.14, 1.1, 0);
  playTone(320, 480, 0.11, 0.022, 'sine', 0.04);
  playTone(480, 640, 0.12, 0.018, 'triangle', 0.1);
}

/** Gentle hardcover book closing thump */
export function playBookClose(): void {
  playNoiseSweep(1100, 620, 320, 0.16, 0.11, 1.2, 0);
  playTone(190, 78, 0.11, 0.045, 'sine', 0.06);
}

/** Subtle cinema reveal chime when entering full-page video theater */
export function playTheaterOpen(): void {
  playTone(392, 440, 0.12, 0.025, 'sine', 0);
  playTone(523.25, 587.33, 0.14, 0.024, 'triangle', 0.055);
  playTone(783.99, 783.99, 0.18, 0.02, 'sine', 0.12);
}

/** Delicate mechanical lens tick for zoom in/out controls */
export function playZoomTick(zoomIn: boolean): void {
  playTone(zoomIn ? 620 : 520, zoomIn ? 840 : 390, 0.045, 0.022, 'triangle', 0);
}

/** Crisp subtle ascending two-note listening chime when "Preps AI" wake word is detected */
export function playWakeChime(): void {
  playTone(587.33, 659.25, 0.075, 0.036, 'sine', 0);
  playTone(880, 1046.5, 0.12, 0.032, 'sine', 0.065);
}

/** Ascending pitch-scaled arcade combo chime (Web Audio API, zero external assets) */
export function playComboChime(comboCount = 1): void {
  const clamped = Math.max(1, Math.min(8, comboCount));
  const semitoneBoost = Math.pow(2, (clamped - 1) / 12);
  const base = 523.25 * semitoneBoost;
  playTone(base, base * 1.12, 0.08, 0.038, 'triangle', 0);
  playTone(base * 1.25, base * 1.5, 0.11, 0.036, 'sine', 0.055);
  if (clamped >= 3) {
    playTone(base * 1.5, base * 2, 0.16, 0.032, 'sine', 0.11);
  }
}

/** Energy pulse blast sound when landing a hit in Mistake Boss Fight */
export function playBossHit(): void {
  playTone(880, 260, 0.14, 0.05, 'sawtooth', 0);
  playTone(1240, 620, 0.11, 0.035, 'triangle', 0.03);
  playTone(180, 75, 0.16, 0.06, 'sine', 0.08);
}

/** Short tactile buzzer for wrong arcade answers */
export function playArcadeWrong(): void {
  playTone(230, 165, 0.14, 0.055, 'sawtooth', 0);
  playTone(175, 130, 0.16, 0.05, 'triangle', 0.08);
}

/** Crisp directional swipe tick for 15-Minute Paper Scanner */
export function playSwipeTick(bucket: 'skip' | 'round2' | 'solve'): void {
  if (bucket === 'solve') {
    playTone(580, 860, 0.07, 0.032, 'sine', 0);
  } else if (bucket === 'round2') {
    playTone(460, 560, 0.07, 0.03, 'triangle', 0);
  } else {
    playTone(390, 270, 0.07, 0.03, 'triangle', 0);
  }
}

/** Pitch-varied tactical laser shot SFX */
export function playLaserShot(): void {
  const jitter = 0.92 + Math.random() * 0.16;
  playTone(940 * jitter, 280 * jitter, 0.085, 0.034, 'sawtooth', 0);
  playTone(1380 * jitter, 520 * jitter, 0.055, 0.02, 'triangle', 0.01);
}

/** Crisp hit marker confirmation sound */
export function playEnemyHit(): void {
  const jitter = 0.94 + Math.random() * 0.12;
  playTone(620 * jitter, 980 * jitter, 0.045, 0.028, 'triangle', 0);
}

/** Punchy impact burst when eliminating an arena target */
export function playEnemyEliminated(): void {
  playTone(340, 95, 0.16, 0.055, 'sawtooth', 0);
  playTone(740, 1180, 0.11, 0.032, 'sine', 0.03);
  playNoiseSweep(1400, 720, 220, 0.14, 0.08, 1.2, 0);
}

/** Tactical clip reload confirmation chime */
export function playReloadChime(): void {
  playTone(440, 554.37, 0.075, 0.034, 'triangle', 0);
  playTone(659.25, 880, 0.11, 0.038, 'sine', 0.065);
}

/** Uplifting 4-note revive fanfare when answering a Revive question correctly */
export function playReviveFanfare(): void {
  playTone(440, 440, 0.08, 0.036, 'sine', 0);
  playTone(554.37, 554.37, 0.085, 0.038, 'sine', 0.07);
  playTone(659.25, 659.25, 0.095, 0.04, 'triangle', 0.14);
  playTone(880, 987.77, 0.18, 0.042, 'sine', 0.21);
}

/** Glossy pitch-scaled bubble pop cascade SFX */
export function playBubblePop(clusterSize = 3): void {
  const count = Math.max(1, Math.min(5, clusterSize));
  for (let i = 0; i < count; i++) {
    const base = 480 * Math.pow(1.12, i);
    playTone(base, base * 1.45, 0.065, 0.032, 'sine', i * 0.035);
  }
}

/** Triumphant level-clear chord progression */
export function playLevelClear(): void {
  playTone(523.25, 523.25, 0.1, 0.04, 'triangle', 0);
  playTone(659.25, 659.25, 0.1, 0.042, 'sine', 0.08);
  playTone(783.99, 783.99, 0.12, 0.044, 'sine', 0.16);
  playTone(1046.5, 1174.66, 0.22, 0.046, 'triangle', 0.24);
}

/** Low-impact thud when player takes damage */
export function playPlayerDamage(): void {
  playTone(190, 72, 0.18, 0.065, 'sawtooth', 0);
  playNoiseSweep(700, 340, 140, 0.12, 0.085, 1.0, 0);
}
