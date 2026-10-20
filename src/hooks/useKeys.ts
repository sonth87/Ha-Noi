/* Global keyboard routing: the active scene gets first refusal, then PageUp/PageDown switch scenes.
   Same rules as the iso-glow shell: ignore modified keys, and let Enter/Space activate a focused button. */
import { useEffect, useRef } from 'react';

export function useKeys(handler: (e: KeyboardEvent) => boolean): void {
  const ref = useRef(handler);
  useEffect(() => { ref.current = handler; });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as Element | null;
      if (t?.closest?.('button') && (e.key === 'Enter' || e.key === ' ')) return;
      if (t?.closest?.('input, textarea, select')) return;
      if (ref.current(e)) e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
