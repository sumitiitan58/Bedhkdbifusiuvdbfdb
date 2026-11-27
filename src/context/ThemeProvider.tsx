import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { ThemeMode } from '../types';
import { getNextTheme, resolveInitialTheme, THEME_STORAGE_KEY } from '../utils/theme';

export type BackdropThemeId = 'nebula' | 'emerald' | 'solar' | 'arctic';

export const BACKDROP_THEMES: Array<{
  id: BackdropThemeId;
  label: string;
  swatch: string;
}> = [
  { id: 'nebula', label: 'Quantum Aurora', swatch: 'linear-gradient(135deg, #00B4FF, #7C3AED, #F27B13)' },
  { id: 'emerald', label: 'Synthesis Prism', swatch: 'linear-gradient(135deg, #10B981, #06B6D4, #3B82F6)' },
  { id: 'solar', label: 'Solar Flare', swatch: 'linear-gradient(135deg, #F97316, #EC4899, #6366F1)' },
  { id: 'arctic', label: 'Crystal Frost', swatch: 'linear-gradient(135deg, #38BDF8, #818CF8, #2DD4BF)' },
];

const BACKDROP_STORAGE_KEY = 'prepskm_backdrop_theme_v1';

export interface ThemeContextValue {
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  backdropTheme: BackdropThemeId;
  setBackdropTheme: (next: BackdropThemeId) => void;
  cycleBackdropTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: ReactNode;
}

function getInitialBrowserTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    stored = null;
  }
  const prefersDark =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;
  return resolveInitialTheme(stored, prefersDark);
}

function getInitialBackdropTheme(): BackdropThemeId {
  if (typeof window === 'undefined') return 'nebula';
  try {
    const stored = window.localStorage.getItem(BACKDROP_STORAGE_KEY) as BackdropThemeId | null;
    if (stored && BACKDROP_THEMES.some((t) => t.id === stored)) {
      return stored;
    }
  } catch {
    // ignore storage errors
  }
  return 'nebula';
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeMode>(getInitialBrowserTheme);
  const [backdropTheme, setBackdropThemeState] = useState<BackdropThemeId>(getInitialBackdropTheme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    root.style.colorScheme = theme;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage quota errors
    }
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.backdrop = backdropTheme;
    try {
      window.localStorage.setItem(BACKDROP_STORAGE_KEY, backdropTheme);
    } catch {
      // Ignore storage quota errors
    }
  }, [backdropTheme]);

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => getNextTheme(prev));
  }, []);

  const setBackdropTheme = useCallback((next: BackdropThemeId) => {
    setBackdropThemeState(next);
  }, []);

  const cycleBackdropTheme = useCallback(() => {
    setBackdropThemeState((prev) => {
      const idx = BACKDROP_THEMES.findIndex((t) => t.id === prev);
      const nextIdx = (idx + 1) % BACKDROP_THEMES.length;
      return BACKDROP_THEMES[nextIdx].id;
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
      toggleTheme,
      backdropTheme,
      setBackdropTheme,
      cycleBackdropTheme,
    }),
    [theme, setTheme, toggleTheme, backdropTheme, setBackdropTheme, cycleBackdropTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
