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
      '@iso': dir('./src/iso'),
      '@ui': dir('./src/ui'),
      '@scenes': dir('./src/scenes'),
      '@hooks': dir('./src/hooks'),
      '@styles': dir('./src/styles'),
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
