import { defineConfig } from 'eslint/config';
import obsidianmd from 'eslint-plugin-obsidianmd';

export default defineConfig([
  { ignores: ['dist/**', 'coverage/**', '.obsidian/**', 'scripts/**', '*.config.ts', '*.config.mjs'] },
  ...obsidianmd.configs.recommended,
  { files: ['src/**/*.ts', 'tests/**/*.ts'], languageOptions: { parserOptions: { projectService: true } } },
  {
    files: ['src/**/*.ts'],
    rules: { 'max-lines': ['error', { max: 400, skipBlankLines: false, skipComments: false }] },
  },
  {
    files: ['tests/**/*.ts'],
    rules: {
      'max-lines': ['error', { max: 450, skipBlankLines: false, skipComments: false }],
      // The test host intentionally implements a minimal DOM and fake Obsidian objects.
      'obsidianmd/prefer-create-el': 'off',
      'obsidianmd/no-tfile-tfolder-cast': 'off',
      'obsidianmd/no-global-this': 'off',
      'obsidianmd/no-unsupported-api': 'off',
      '@typescript-eslint/no-empty-function': 'off',
    },
  },
]);
