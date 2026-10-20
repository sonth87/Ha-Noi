import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/dm-mono/400.css';
import '@fontsource/dm-mono/500.css';
import '@fontsource/be-vietnam-pro/700.css';   // shop-sign lettering, full Vietnamese (ADR-017)
import '@iso/tokens.css';
import '@styles/app.css';
import '@styles/city.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
