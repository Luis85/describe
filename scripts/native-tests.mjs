import { mkdir } from 'node:fs/promises';
import { run } from './process.mjs';
import './build.mjs';

await mkdir('reports/native', { recursive: true });
run('vitest', ['run', '--config', 'tests/e2e/vitest.config.mts']);
await import('./check-native-results.mjs');
