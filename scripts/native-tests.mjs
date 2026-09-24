import { mkdir } from 'node:fs/promises';
import { run } from './process.mjs';
import './build.mjs';

await mkdir('reports/native', { recursive: true });
run('wdio', ['run', 'tests/e2e/wdio.conf.mts']);
