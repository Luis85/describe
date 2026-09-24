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
      // The test host intentionally implements DOM extensions and fake Obsidian objects.
      'obsidianmd/prefer-create-el': 'off',
      'obsidianmd/no-tfile-tfolder-cast': 'off',
      'obsidianmd/no-global-this': 'off',
      'obsidianmd/no-unsupported-api': 'off',
      // jsdom has one document; it is not an Obsidian popout window.
      'obsidianmd/prefer-active-doc': 'off',
      // Both default and custom configuration paths are deliberate negative-test fixtures.
      'obsidianmd/hardcoded-config-path': 'off',
      '@typescript-eslint/no-empty-function': 'off',
    },
  },
]);
