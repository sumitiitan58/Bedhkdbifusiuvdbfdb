import { useContext } from 'react';
import { ThemeContext } from '../context/ThemeProvider';
import type { ThemeContextValue } from '../context/ThemeProvider';

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
