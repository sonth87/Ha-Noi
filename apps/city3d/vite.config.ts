/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// fileURLToPath (not URL.pathname): the project folder name contains a space
const dir = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@render': dir('./src/render'), '@view': dir('./src/view'), '@ui': dir('./src/ui') } },
  server: { port: 5190 },
  test: { include: ['src/**/*.test.ts'], environment: 'node' },
});
