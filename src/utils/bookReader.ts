export type BookViewMode = 'spread' | 'single' | 'scroll';

/**
 * Normalize the starting page of a book spread so two-page spreads stay aligned
 * (Pages 1–2, 3–4, 5–6, etc.) and always stay within [1, numPages].
 */
export function normalizeBookPage(
  page: number,
  numPages: number,
  twoPageMode: boolean
): number {
  if (numPages <= 0) return 1;
  const clamped = Math.min(numPages, Math.max(1, Math.floor(page)));
  if (!twoPageMode || numPages === 1) return clamped;
  // Align spreads to odd left-hand pages: 1-2, 3-4, 5-6...
  return clamped % 2 === 0 ? clamped - 1 : clamped;
}

/**
 * Return the page numbers visible on screen for the given page index and view mode.
 */
export function getVisibleBookPages(
  currentPage: number,
  numPages: number,
  twoPageMode: boolean
): number[] {
  if (numPages <= 0) return [];
  const start = normalizeBookPage(currentPage, numPages, twoPageMode);
  if (!twoPageMode || numPages === 1) return [start];
  if (start + 1 <= numPages) return [start, start + 1];
  return [start];
}

/**
 * Compute the next page anchor when flipping forward.
 */
export function getNextBookPage(
  currentPage: number,
  numPages: number,
  twoPageMode: boolean
): number {
  if (numPages <= 1) return 1;
  const start = normalizeBookPage(currentPage, numPages, twoPageMode);
  const step = twoPageMode ? 2 : 1;
  const next = start + step;
  if (next > numPages) return start;
  return normalizeBookPage(next, numPages, twoPageMode);
}

/**
 * Compute the previous page anchor when flipping backward.
 */
export function getPrevBookPage(
  currentPage: number,
  numPages: number,
  twoPageMode: boolean
): number {
  if (numPages <= 1) return 1;
  const start = normalizeBookPage(currentPage, numPages, twoPageMode);
  const step = twoPageMode ? 2 : 1;
  const prev = Math.max(1, start - step);
  return normalizeBookPage(prev, numPages, twoPageMode);
}

export function canTurnNext(
  currentPage: number,
  numPages: number,
  twoPageMode: boolean
): boolean {
  if (numPages <= 1) return false;
  const visible = getVisibleBookPages(currentPage, numPages, twoPageMode);
  const lastVisible = visible[visible.length - 1] ?? 1;
  return lastVisible < numPages;
}

export function canTurnPrev(
  currentPage: number,
  numPages: number,
  twoPageMode: boolean
): boolean {
  if (numPages <= 1) return false;
  const start = normalizeBookPage(currentPage, numPages, twoPageMode);
  return start > 1;
}

export function formatBookPageLabel(
  visiblePages: number[],
  numPages: number
): string {
  if (numPages <= 0 || visiblePages.length === 0) return 'Loading…';
  if (visiblePages.length === 2) {
    return `Pages ${visiblePages[0]}–${visiblePages[1]} of ${numPages}`;
  }
  return `Page ${visiblePages[0]} of ${numPages}`;
}
