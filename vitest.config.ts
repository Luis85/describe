import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { obsidian: fileURLToPath(new URL('./tests/support/obsidian-mock.ts', import.meta.url)) } },
  test: {
    include: ['tests/**/*.test.ts'], environment: 'node', setupFiles: ['tests/support/dom.ts'],
    coverage: {
      provider: 'v8', include: ['src/**/*.ts'], reporter: ['text', 'json-summary', 'html'],
      thresholds: { lines: 80, statements: 80, functions: 80, branches: 70 },
    },
  },
});
