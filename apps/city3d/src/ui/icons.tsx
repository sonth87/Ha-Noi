/* One line-icon set for the shell (24-unit grid, 2 px stroke, round caps), drawn in currentColor so every icon
   takes its button's colour (A8: colours only through the theme tokens). */
import type { ReactNode } from 'react';

const PATHS = {
  search: <><circle cx="11" cy="11" r="7.5" /><path d="m20.5 20.5-4.2-4.2" /></>,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  chevronRight: <path d="m9 6 6 6-6 6" />,
  arrowLeft: <><path d="m11 18-6-6 6-6" /><path d="M19 12H5" /></>,
  mapPin: <><path d="M19.5 10c0 5.5-7.5 11.5-7.5 11.5S4.5 15.5 4.5 10a7.5 7.5 0 0 1 15 0Z" /><circle cx="12" cy="10" r="2.6" /></>,
  cube: <><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="M3.3 7 12 12l8.7-5M12 22V12" /></>,
  target: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="3" /><path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
  moon: <path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11Z" />,
  sliders: <><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  rotate: <><path d="M21 12a9 9 0 1 1-9-9c2.5 0 4.9 1 6.7 2.7L21 8" /><path d="M21 3v5h-5" /></>,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
  globe: <><circle cx="12" cy="12" r="9.5" /><path d="M12 2.5a14.5 14.5 0 0 0 0 19 14.5 14.5 0 0 0 0-19M2.5 12h19" /></>,
  view: <><circle cx="12" cy="12" r="9.5" /><circle cx="12" cy="12" r="3" /><path d="M12 2.5V9M4.9 19.1l5-5M19.1 19.1l-5-5" /></>,
  car: <><path d="M5 17h14v-4.5l-1.8-4.6A2 2 0 0 0 15.3 6.6H8.7a2 2 0 0 0-1.9 1.3L5 12.5Z" /><path d="M5 12.5h14" /><circle cx="8" cy="17" r="1.8" /><circle cx="16" cy="17" r="1.8" /></>,
  train: <><rect x="5" y="3" width="14" height="14" rx="3" /><path d="M5 11h14M9 21l1.5-4M15 21l-1.5-4" /><circle cx="9" cy="14" r=".8" /><circle cx="15" cy="14" r=".8" /></>,
  bulb: <><path d="M9 18h6M10 21.5h4" /><path d="M15 14.5c.2-1 .7-1.7 1.5-2.5A6 6 0 1 0 6 8c0 1.4.5 2.7 1.5 3.6.8.8 1.3 1.6 1.5 2.9" /></>,
  layers: <><path d="m12 3 9.5 5-9.5 5-9.5-5Z" /><path d="m2.5 13 9.5 5 9.5-5" /></>,
  info: <><circle cx="12" cy="12" r="9.5" /><path d="M12 11v6M12 7.5h.01" /></>,
  signpost: <><path d="M12 3v18M5 6h12l2.5 2.5L17 11H5ZM19 14H7l-2.5 2.5L7 19h12Z" /></>,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}

/** compass needle, turned against the view's heading so it keeps pointing north */
export function CompassNeedle({ heading }: { heading: number }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" className="compass-needle-svg" style={{ transform: `rotate(${-heading}deg)` }}>
      <polygon points="12,2.2 15.4,12 8.6,12" className="compass-north-tip" />
      <polygon points="12,21.8 15.4,12 8.6,12" className="compass-south-tip" />
      <circle cx="12" cy="12" r="1.8" className="compass-pivot" />
    </svg>
  );
}

/** the figure dragged onto a street or a Metro line to see it from there */
export function Pegman({ size = 20 }: { size?: number }) {
  return (
    <svg width={size * 0.9} height={size} viewBox="0 0 24 26" fill="currentColor" aria-hidden="true" className="pegman-svg">
      <circle cx="12" cy="4.6" r="3.3" />
      <path d="M8.2 9.2c-1.3 0-2.3 1-2.3 2.3v4.4c0 .8.6 1.4 1.3 1.4h.9v6.1c0 .9.7 1.6 1.6 1.6h.8c.8 0 1.4-.6 1.4-1.4v-4.6h.2v4.6c0 .8.6 1.4 1.4 1.4h.8c.9 0 1.6-.7 1.6-1.6v-6.1h.9c.7 0 1.3-.6 1.3-1.4v-4.4c0-1.3-1-2.3-2.3-2.3H8.2Z" />
    </svg>
  );
}
