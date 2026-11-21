export const FREE_DOWNLOADS_STORAGE_KEY = 'prepskm_free_downloads';
export const ADSTERRA_SMARTLINK_URL = 'https://araplhn.org/4/ad4e2feb46f5aaef517104f2cf3cd26b';
export const ADSTERRA_NATIVE_SCRIPT_SRC =
  'https://bauval.org/21/86a8a2957646419fc65cd69a6f034684';
export const ADSTERRA_NATIVE_CONTAINER_ID = 'container-86a8a2957646419fc65cd69a6f034684';

export const INITIAL_GUEST_DOWNLOAD_CREDITS = 1;
export const AD_UNLOCK_DOWNLOAD_CREDITS = 3;
export const AD_VERIFY_COUNTDOWN_SECONDS = 15;

export interface StorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

export interface DownloadEvaluationInput {
  isLoggedIn: boolean;
  currentCredits: number;
}

export interface DownloadEvaluationResult {
  allowed: boolean;
  requiresGate: boolean;
  nextCredits: number;
}

/**
 * Parse a stored guest download count string.
 * Returns null if the raw string is missing or not a valid non-negative integer.
 */
export function parseStoredGuestCredits(raw: string | null): number | null {
  if (raw === null) return null;
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

/**
 * Read guest download credits from localStorage under `prepskm_free_downloads`.
 * Automatically initializes the key to "1" when absent or corrupted.
 */
export function readOrInitGuestCredits(storage?: StorageLike | null): number {
  const store =
    storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
  if (!store) return INITIAL_GUEST_DOWNLOAD_CREDITS;

  try {
    const raw = store.getItem(FREE_DOWNLOADS_STORAGE_KEY);
    const parsed = parseStoredGuestCredits(raw);
    if (parsed !== null) {
      return parsed;
    }
    store.setItem(
      FREE_DOWNLOADS_STORAGE_KEY,
      String(INITIAL_GUEST_DOWNLOAD_CREDITS)
    );
    return INITIAL_GUEST_DOWNLOAD_CREDITS;
  } catch {
    return INITIAL_GUEST_DOWNLOAD_CREDITS;
  }
}

/**
 * Persist guest download credits cleanly to localStorage.
 */
export function writeGuestCredits(
  credits: number,
  storage?: StorageLike | null
): number {
  const safeCredits = Math.max(0, Math.floor(credits));
  const store =
    storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
  if (store) {
    try {
      store.setItem(FREE_DOWNLOADS_STORAGE_KEY, String(safeCredits));
    } catch {
      // ignore storage quota errors
    }
  }
  return safeCredits;
}

/**
 * Evaluate whether a PDF download request can proceed immediately or must open the gate modal.
 * - Logged-in users always bypass the ad gate without consuming guest credits.
 * - Guests with >= 1 credit proceed immediately and consume 1 credit.
 * - Guests with 0 credits are intercepted by the Ad/Sign-In gate.
 */
export function evaluateDownloadRequest({
  isLoggedIn,
  currentCredits,
}: DownloadEvaluationInput): DownloadEvaluationResult {
  if (isLoggedIn) {
    return {
      allowed: true,
      requiresGate: false,
      nextCredits: Math.max(0, Math.floor(currentCredits)),
    };
  }

  const safeCredits = Math.max(0, Math.floor(currentCredits));
  if (safeCredits > 0) {
    return {
      allowed: true,
      requiresGate: false,
      nextCredits: safeCredits - 1,
    };
  }

  return {
    allowed: false,
    requiresGate: true,
    nextCredits: 0,
  };
}

/**
 * Unlock 3 guest downloads after completing the 15-second Adsterra Smartlink verification timer.
 */
export function unlockGuestCreditsAfterAd(storage?: StorageLike | null): number {
  return writeGuestCredits(AD_UNLOCK_DOWNLOAD_CREDITS, storage);
}
