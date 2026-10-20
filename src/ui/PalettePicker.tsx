/* Accent swatches (radio group), as in the iso-glow shell. */
import { accentKey } from '@iso/palettes';
import { useTheme } from '@iso/theme';
import type { CSSProperties } from 'react';

export function PalettePicker() {
  const { accents, accent, setAccent } = useTheme();
  return (
    <div className="swatches" role="radiogroup" aria-label="Màu đèn">
      {accents.map(a => {
        const k = accentKey(a);
        return (
          <button key={k} type="button" role="radio" aria-checked={k === accent} aria-label={a[0]} title={a[0]}
            style={{ '--sw': a[1] } as CSSProperties} onClick={() => setAccent(k)}>
            <i />
          </button>
        );
      })}
    </div>
  );
}
