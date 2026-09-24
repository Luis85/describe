import { defineConfig } from 'eslint/config';
import obsidianmd from 'eslint-plugin-obsidianmd';

export default defineConfig([
  { ignores: ['dist/**', 'coverage/**', '.obsidian/**', '.obsidian-cache/**', 'reports/**', 'scripts/**', '*.config.ts', '*.config.mjs'] },
  ...obsidianmd.configs.recommended,
  { files: ['src/**/*.ts', 'tests/**/*.{ts,mts}'], languageOptions: { parserOptions: { projectService: true } } },
  {
    files: ['src/**/*.ts'],
    rules: { 'max-lines': ['error', { max: 400, skipBlankLines: true, skipComments: true }] },
  },
  {
    files: ['tests/**/*.{ts,mts}'],
    rules: {
      'max-lines': ['error', { max: 450, skipBlankLines: true, skipComments: true }],
      // The test host intentionally implements DOM extensions and fake Obsidian objects.
      'obsidianmd/prefer-create-el': 'off',
      'obsidianmd/no-tfile-tfolder-cast': 'off',
      'obsidianmd/no-global-this': 'off',
      'obsidianmd/no-unsupported-api': 'off',
      // Tests execute in Node/jsdom or a sandboxed host, not the shipped plugin runtime.
      'import/no-nodejs-modules': 'off',
      'obsidianmd/prefer-active-doc': 'off',
      'obsidianmd/hardcoded-config-path': 'off',
      '@typescript-eslint/no-empty-function': 'off',
    },
  },
]);
