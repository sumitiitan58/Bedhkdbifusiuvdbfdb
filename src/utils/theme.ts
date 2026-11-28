import type { ThemeMode } from '../types';

export const THEME_STORAGE_KEY = 'prepskm_theme_v1';

export function parseStoredTheme(_raw: string | null | undefined): ThemeMode | null {
  return 'dark';
}

export function resolveInitialTheme(
  _storedRaw: string | null | undefined,
  _systemPrefersDark: boolean
): ThemeMode {
  return 'dark';
}

export function getNextTheme(_current: ThemeMode): ThemeMode {
  return 'dark';
}
