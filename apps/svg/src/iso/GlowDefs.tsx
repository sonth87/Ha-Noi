/* The three glow filters from iso-glow (MIT). userSpaceOnUse keeps them working on perfectly
   horizontal or vertical paths (a zero-height bbox would vanish under the default filter region).
   Light theme has no glow: glow/soft pass the drawing through, bloom draws nothing. */
import { useTheme } from '@iso/theme';

const REGION = { filterUnits: 'userSpaceOnUse', x: -2000, y: -2000, width: 6000, height: 6000 } as const;

export function GlowDefs() {
  const { resolved } = useTheme();
  const light = resolved === 'light';
  const pass = <feMerge><feMergeNode in="SourceGraphic" /></feMerge>;
  return (
    <svg className="fx" aria-hidden="true">
      <defs>
        <filter id="glow" {...REGION}>
          {light ? pass : <>
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </>}
        </filter>
        <filter id="soft" {...REGION}>
          {light ? pass : <>
            <feGaussianBlur stdDeviation="2.2" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </>}
        </filter>
        <filter id="bloom" {...REGION}>
          {light ? <feFlood floodOpacity="0" /> : <feGaussianBlur stdDeviation="9" />}
        </filter>
      </defs>
    </svg>
  );
}
