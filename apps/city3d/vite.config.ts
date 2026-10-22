/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// fileURLToPath (not URL.pathname): the project folder name contains a space
const dir = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  plugins: [react()],
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
          if (id.includes('nga-tu-thai-ha.osm.json') || id.includes('packages/osm-data')) return 'osm-data';
          if (id.includes('node_modules/three')) return 'three';
          if (id.includes('node_modules/react')) return 'vendor';
        },
      },
    },
  },
  test: { include: ['src/**/*.test.ts'], environment: 'node' },
});

