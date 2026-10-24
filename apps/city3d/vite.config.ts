/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// fileURLToPath (not URL.pathname): the project folder name contains a space
const dir = (p: string) => fileURLToPath(new URL(p, import.meta.url));

/** Rewrite Google Maps–style `/@21.0092471,105.8243958,...` routes (which contain dots) to `/` in dev/preview */
const spaAtRoute = () => {
  const rewrite = (req: { url?: string }, _res: unknown, next: () => void) => {
    if (req.url && /^\/@-?\d/.test(req.url)) {
      const qIdx = req.url.indexOf('?');
      req.url = qIdx >= 0 ? `/${req.url.slice(qIdx)}` : '/';
    }
    next();
  };
  return {
    name: 'spa-at-route',
    configureServer(server: { middlewares: { use: (fn: typeof rewrite) => void } }) {
      server.middlewares.use(rewrite);
    },
    configurePreviewServer(server: { middlewares: { use: (fn: typeof rewrite) => void } }) {
      server.middlewares.use(rewrite);
    },
  };
};

export default defineConfig({
  plugins: [spaAtRoute(), react()],
  resolve: {
    alias: {
      '@render': dir('./src/render'),
      '@view': dir('./src/view'),
      '@ui': dir('./src/ui'),
      '@my-city/core': dir('../../packages/core/src/index.ts'),
      '@my-city/osm-import': dir('../../packages/osm-import/src/index.ts'),
      '@my-city/osm-data': dir('../../packages/osm-data/src/index.ts'),
    },
  },
  server: { port: 5190 },
  build: {
    chunkSizeWarningLimit: 4500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'three';
          if (id.includes('node_modules/react')) return 'vendor';
        },
      },
    },
  },
  test: { include: ['src/**/*.test.ts'], environment: 'node' },
});

