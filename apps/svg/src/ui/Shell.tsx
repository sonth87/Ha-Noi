/* App frame: top bar (brand, accent picker, theme, prev/next), sidebar + figure, credit footer. */
import type { ReactNode } from 'react';
import { PalettePicker } from '@ui/PalettePicker';
import { ThemeToggle } from '@ui/ThemeToggle';

interface Props {
  sidebar: ReactNode;
  onPrev(): void;
  onNext(): void;
  children: ReactNode;
}

export function Shell({ sidebar, onPrev, onNext, children }: Props) {
  return (
    <div className="wrap">
      <header className="top">
        <span className="hi brand"><span className="dot" />My City · Thái Hà</span>
        <PalettePicker />
        <ThemeToggle />
        <div className="arrows">
          <button type="button" className="pill" onClick={onPrev} aria-label="Cảnh trước">← Prev</button>
          <button type="button" className="pill" onClick={onNext} aria-label="Cảnh sau">Next →</button>
        </div>
      </header>
      <div className="layout">
        {sidebar}
        {children}
      </div>
      <footer className="made-with">
        <a href="https://iso-glow.vercel.app" target="_blank" rel="noopener">Made with ISO-GLOW ↗</a>
      </footer>
    </div>
  );
}
