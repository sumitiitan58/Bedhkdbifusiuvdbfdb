import type { ThemeMode } from '../types';

export const THEME_STORAGE_KEY = 'prepskm_theme_v1';

export function parseStoredTheme(raw: string | null | undefined): ThemeMode | null {
  if (raw === 'light' || raw === 'dark') {
    return raw;
  }
  return null;
}

export function resolveInitialTheme(
  storedRaw: string | null | undefined,
  systemPrefersDark: boolean
): ThemeMode {
  const stored = parseStoredTheme(storedRaw);
  if (stored) return stored;
  return systemPrefersDark ? 'dark' : 'light';
}

export function getNextTheme(current: ThemeMode): ThemeMode {
  return current === 'light' ? 'dark' : 'light';
}
