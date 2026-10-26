/* The one container for every menu and panel of the shell (ADR-063). On a wide screen it is a floating card next
   to the control that opened it; on a phone it is a bottom sheet over a dimmed backdrop, so it can be read and
   closed with a thumb. Always: a title, a 44 px close button, Esc (handled by the shell) and a tap outside close it.
   Pointer and wheel events stay inside, so using a menu never pans or zooms the map. */
import type { ReactNode } from 'react';
import { Icon } from './icons';

export function Sheet({
  title, closeLabel, onClose, children, className = '', side = 'left', headExtra,
}: {
  title: string;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  /** which edge it hangs from on a wide screen */
  side?: 'left' | 'right';
  headExtra?: ReactNode;
}) {
  const stop = (e: { stopPropagation(): void }) => e.stopPropagation();
  return (
    <div className={`sheet-layer side-${side}`} onPointerDown={stop} onPointerUp={stop} onWheel={stop} onDoubleClick={stop}>
      <div className="sheet-backdrop" onClick={onClose} aria-hidden="true" />
      <section className={`sheet ui-surface ${className}`} role="dialog" aria-label={title}>
        <span className="sheet-grip" aria-hidden="true" />
        <header className="sheet-head">
          <h2>{title}</h2>
          {headExtra}
          <button type="button" className="close-btn" onClick={onClose} aria-label={closeLabel} title={closeLabel}>
            <Icon name="close" size={20} />
          </button>
        </header>
        <div className="sheet-body">{children}</div>
      </section>
    </div>
  );
}
