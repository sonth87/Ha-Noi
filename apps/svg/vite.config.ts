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
  // the 3D lab is its own page (ADR-031)
  build: { rollupOptions: { input: { main: dir('./index.html'), lab3d: dir('./lab-3d.html') } } },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
