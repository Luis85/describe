import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist', emptyOutDir: true, target: 'es2022', minify: false, sourcemap: false,
    lib: { entry: 'src/main.ts', formats: ['cjs'], fileName: () => 'main.js' },
    rollupOptions: { external: ['obsidian'], output: { exports: 'default', inlineDynamicImports: true } },
  },
});
