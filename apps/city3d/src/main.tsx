import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/dm-mono/400.css';
import '@fontsource/dm-mono/500.css';
import '@my-city/theme/tokens.css';
import { PALETTES, accentCss } from '@my-city/theme';
import '@ui/app.css';
import { App } from '@ui/App';
import { ErrorBoundary } from '@ui/ErrorBoundary';

// accent tokens for the "city" palette; Sodium (the street-lamp orange) by default
document.head.insertAdjacentHTML('beforeend', `<style>${accentCss(PALETTES.city)}</style>`);
document.documentElement.dataset.accent = 'sodium';

createRoot(document.getElementById('root')!).render(<StrictMode><ErrorBoundary><App /></ErrorBoundary></StrictMode>);
