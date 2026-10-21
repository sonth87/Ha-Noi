// ESLint for packages/* (and later apps/city3d): the package dependency rules from docs/ai/conventions.md §1.
// apps/svg keeps its own config (frozen, ADR-032).
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import { defineConfig } from 'eslint/config';

const UP = { group: ['../*'], message: 'Dùng alias hoặc tên gói thay vì ../' };
const NO_UI = { group: ['react', 'react/*', 'react-dom', 'react-dom/*', 'three', 'three/*'], message: 'Gói này không được dùng React / three.js (conventions §1).' };
const NO_DOM = ['window', 'document', 'localStorage', 'sessionStorage', 'navigator', 'performance', 'requestAnimationFrame', 'setTimeout', 'setInterval']
  .map(name => ({ name, message: 'Gói thuần: không DOM, không thời gian (conventions §1).' }));
const NO_IMPURE = [
  { object: 'Math', property: 'random', message: 'Dùng rng có seed trong @my-city/core.' },
  { object: 'Date', property: 'now', message: 'Gói thuần không đọc thời gian.' },
];
const pure = (files, extra, up = UP) => ({
  files, ignores: ['**/*.test.ts', '**/scripts/**'],
  rules: {
    'no-restricted-imports': ['error', { patterns: [up, NO_UI, ...extra] }],
    'no-restricted-globals': ['error', ...NO_DOM],
    'no-restricted-properties': ['error', ...NO_IMPURE],
  },
});

export default defineConfig(
  { ignores: ['**/dist', '**/node_modules', '.claude', 'apps/svg'] },
  {
    files: ['**/*.{ts,tsx,js,mjs}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: { ecmaVersion: 2022, globals: { ...globals.browser, ...globals.node } },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-restricted-imports': ['error', { patterns: [UP] }],
    },
  },
  // core knows nothing of OSM or any renderer
  pure(['packages/core/**/*.ts'], [{ group: ['@my-city/*', '!@my-city/core'], message: 'core chỉ được import chính nó (conventions §1).' }]),
  // osm-import: OSM data → city model; may use core and osm-data only
  pure(['packages/osm-import/**/*.ts'], [{ group: ['@my-city/*', '!@my-city/core', '!@my-city/osm-data'], message: 'osm-import chỉ được dùng core và osm-data.' }]),
  // osm-data: data and its types only; the JSON lives in data/, next to src/
  pure(['packages/osm-data/src/**/*.ts'], [{ group: ['@my-city/*'], message: 'osm-data không phụ thuộc gói nào.' }], { regex: '^\\.\\./(?!data/)', message: UP.message }),
  pure(['packages/theme/**/*.ts'], [{ group: ['@my-city/*'], message: 'theme không phụ thuộc gói nào.' }]),
  // apps/city3d (conventions §1): render/ builds three.js objects from the city model, no React, no DOM;
  // view/ drives the scene in the browser; ui/ is React and reaches the scene only through view/
  { files: ['apps/city3d/**/*.{ts,tsx}'], plugins: { 'react-hooks': reactHooks }, rules: { ...reactHooks.configs.recommended.rules } },
  {
    files: ['apps/city3d/src/render/**/*.ts'], ignores: ['**/*.test.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [UP, { group: ['react', 'react/*', 'react-dom', 'react-dom/*', '@view/*', '@ui/*'], message: 'render/ chỉ dựng đối tượng three.js từ mô hình (conventions §1).' }] }],
      'no-restricted-globals': ['error', ...NO_DOM],
      'no-restricted-properties': ['error', ...NO_IMPURE],
    },
  },
  {
    files: ['apps/city3d/src/ui/**/*.{ts,tsx}'],
    rules: { 'no-restricted-imports': ['error', { patterns: [UP, { group: ['three', 'three/*', '@render/*'], message: 'ui/ chỉ nói chuyện với cảnh qua view/ (conventions §1).' }] }] },
  },
);
