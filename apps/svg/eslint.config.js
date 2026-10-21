// ESLint: React rules + the layer dependency rules from docs/architecture/decisions.md (ADR-015)
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { defineConfig } from 'eslint/config';

const REACT = { group: ['react', 'react/*', 'react-dom', 'react-dom/*'], message: 'Tầng này không được dùng React (ADR-015).' };
const NO_DOM_GLOBALS = ['window', 'document', 'localStorage', 'sessionStorage', 'navigator', 'performance', 'requestAnimationFrame', 'setTimeout', 'setInterval']
  .map(name => ({ name, message: 'core/ và render/ phải thuần: không DOM, không thời gian (ADR-015).' }));
const NO_IMPURE = [
  { object: 'Math', property: 'random', message: 'Dùng rng có seed trong @core/rng.' },
  { object: 'Date', property: 'now', message: 'core/ và render/ không đọc thời gian.' },
];

export default defineConfig(
  { ignores: ['dist', 'node_modules', '.claude'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: { ecmaVersion: 2022, globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // _-prefixed params are deliberate (default hooks that subclasses override)
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // cross-folder imports go through aliases so the layer rules below can see them
      'no-restricted-imports': ['error', { patterns: [{ group: ['../*'], message: 'Dùng alias (@core, @render, …) thay vì ../' }] }],
    },
  },
  {
    files: ['src/core/**/*.ts'],
    ignores: ['src/core/**/*.test.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [
        { group: ['../*'], message: 'Dùng alias.' },
        REACT,
        { group: ['@render/*', '@scenes/*', '@ui/*', '@hooks/*', '@iso/*', '@styles/*'], message: 'core/ chỉ được import trong core/ (ADR-015).' },
      ] }],
      'no-restricted-globals': ['error', ...NO_DOM_GLOBALS],
      'no-restricted-properties': ['error', ...NO_IMPURE],
    },
  },
  {
    files: ['src/render/**/*.ts'],
    ignores: ['src/render/**/*.test.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [
        { group: ['../*'], message: 'Dùng alias.' },
        REACT,
        { group: ['@scenes/*', '@ui/*', '@hooks/*', '@styles/*'], message: 'render/ chỉ được import core/ và iso/kernel, iso/frame (ADR-015).' },
        { group: ['@iso/*', '!@iso/kernel', '!@iso/frame'], message: 'render/ chỉ được dùng @iso/kernel và @iso/frame.' },
      ] }],
      'no-restricted-globals': ['error', ...NO_DOM_GLOBALS],
      'no-restricted-properties': ['error', ...NO_IMPURE],
    },
  },
  {
    files: ['src/ui/**/*.{ts,tsx}', 'src/hooks/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [
        { group: ['../*'], message: 'Dùng alias.' },
        { group: ['@render/*'], message: 'ui/ và hooks/ không gọi renderer trực tiếp (ADR-015).' },
      ] }],
    },
  },
);
