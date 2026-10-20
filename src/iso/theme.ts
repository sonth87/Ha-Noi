/* Theme + accent state shared by the app shell and GlowDefs (FR-24). */
import { createContext, useContext } from 'react';
import type { Accent } from '@iso/palettes';

export type ThemeMode = 'system' | 'dark' | 'light';
export type ResolvedTheme = 'dark' | 'light';

export interface ThemeState {
  mode: ThemeMode;
  resolved: ResolvedTheme;
  setMode(mode: ThemeMode): void;
  accents: readonly Accent[];
  accent: string;
  setAccent(key: string): void;
}

export const ThemeContext = createContext<ThemeState | null>(null);

export function useTheme(): ThemeState {
  const t = useContext(ThemeContext);
  if (!t) throw new Error('useTheme must be used inside <ThemeProvider>');
  return t;
}

/** Per-viewer convenience only; storage can be missing or throw (private mode), so every access is guarded. */
export const storage = {
  get(key: string): string | null {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  set(key: string, value: string): void {
    try { localStorage.setItem(key, value); } catch { /* ignore */ }
  },
};
