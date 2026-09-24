import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { obsidian: fileURLToPath(new URL('./tests/support/obsidian-mock.ts', import.meta.url)) } },
  test: {
    include: ['tests/**/*.test.ts'], environment: 'node', setupFiles: ['tests/support/dom.ts'],
    clearMocks: true, restoreMocks: true, unstubGlobals: true, unstubEnvs: true,
    coverage: {
      provider: 'v8', include: ['src/**/*.ts'], reporter: ['text', 'json-summary', 'html'],
      thresholds: { lines: 90, statements: 85, functions: 85, branches: 80 },
    },
  },
});
