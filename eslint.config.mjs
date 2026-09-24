import { defineConfig } from 'eslint/config';
import obsidianmd from 'eslint-plugin-obsidianmd';

// The host preset targets .ts; explicitly reuse its TypeScript parser for native .mts tests.
const parser = obsidianmd.configs.recommended.find(config => config.languageOptions?.parser)?.languageOptions.parser;
if (!parser) throw new Error('The Obsidian ESLint preset must provide a TypeScript parser.');

export default defineConfig([
  { ignores: ['dist/**', 'coverage/**', '.obsidian/**', '.obsidian-cache/**', 'reports/**', 'scripts/**', '*.config.ts', '*.config.mjs'] },
  ...obsidianmd.configs.recommended,
  { files: ['src/**/*.ts', 'tests/**/*.{ts,mts}'], languageOptions: { parser, parserOptions: { projectService: true } } },
  {
    files: ['src/**/*.ts'],
    rules: { 'max-lines': ['error', { max: 400, skipBlankLines: true, skipComments: true }] },
  },
  {
    files: ['tests/**/*.{ts,mts}'],
    rules: {
      'max-lines': ['error', { max: 450, skipBlankLines: true, skipComments: true }],
      // Test-only host/DOM doubles and Node runners are not the shipped plugin runtime.
      'obsidianmd/prefer-create-el': 'off',
      'obsidianmd/no-tfile-tfolder-cast': 'off',
      'obsidianmd/no-global-this': 'off',
      'obsidianmd/no-unsupported-api': 'off',
      'import/no-nodejs-modules': 'off',
      'obsidianmd/prefer-active-doc': 'off',
      'obsidianmd/hardcoded-config-path': 'off',
      '@typescript-eslint/no-empty-function': 'off',
    },
  },
]);
