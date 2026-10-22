import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const dir = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@core': dir('./src/core'),
      '@render': dir('./src/render'),
      '@building': dir('./src/building'),
      '@iso': dir('./src/iso'),
      '@ui': dir('./src/ui'),
      '@scenes': dir('./src/scenes'),
      '@hooks': dir('./src/hooks'),
      '@styles': dir('./src/styles'),
    },
  },
  build: {
    outDir: dir('../../iso-glow/js'),
    emptyOutDir: false,
    lib: {
      entry: dir('./src/iso-glow-entry.ts'),
      name: 'MY_CITY',
      formats: ['iife'],
      fileName: () => 'my-city.js',
    },
  },
});
