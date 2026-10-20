/* Theme (system / dark / light) and accent colour, written to <html data-theme data-accent>
   exactly as the iso-glow template does, so the ported token CSS applies unchanged. */
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { PALETTES, accentCss, accentKey, type PaletteName } from '@iso/palettes';
import { ThemeContext, storage, type ThemeMode, type ThemeState } from '@iso/theme';

const MODE_KEY = 'my-city-theme';
const ACCENT_KEY = 'my-city-accent';
const lightQuery = () => matchMedia('(prefers-color-scheme: light)');

function subscribeSystem(fn: () => void) {
  const mq = lightQuery();
  mq.addEventListener('change', fn);
  return () => mq.removeEventListener('change', fn);
}

export function ThemeProvider({ palette, children }: { palette: PaletteName; children: ReactNode }) {
  const accents = PALETTES[palette];
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const m = storage.get(MODE_KEY);
    return m === 'dark' || m === 'light' ? m : 'system';
  });
  const [accent, setAccentState] = useState<string>(() => {
    const saved = storage.get(ACCENT_KEY);
    return accents.some(a => accentKey(a) === saved) ? saved! : accentKey(accents[0]);
  });
  const systemLight = useSyncExternalStore(subscribeSystem, () => lightQuery().matches, () => false);
  const resolved = mode === 'system' ? (systemLight ? 'light' : 'dark') : mode;

  useEffect(() => {
    const root = document.documentElement;
    if (mode === 'system') delete root.dataset.theme; else root.dataset.theme = mode;
    root.dataset.accent = accent;
  }, [mode, accent]);

  const setMode = useCallback((m: ThemeMode) => { setModeState(m); storage.set(MODE_KEY, m); }, []);
  const setAccent = useCallback((k: string) => {
    if (!accents.some(a => accentKey(a) === k)) return;
    setAccentState(k); storage.set(ACCENT_KEY, k);
  }, [accents]);

  const value = useMemo<ThemeState>(() => ({ mode, resolved, setMode, accents, accent, setAccent }),
    [mode, resolved, setMode, accents, accent, setAccent]);
  const css = useMemo(() => accentCss(accents), [accents]);

  return (
    <ThemeContext.Provider value={value}>
      <style>{css}</style>
      {children}
    </ThemeContext.Provider>
  );
}
