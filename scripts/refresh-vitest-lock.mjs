import { run } from './process.mjs';

// One-time migration lock generation. No dependency install scripts are executed here.
if (process.env.GITHUB_REF_NAME !== 'test/vitest-native-acceptance' || process.env.GITHUB_EVENT_NAME !== 'push') {
  throw new Error('Unexpected migration-lock context.');
}
run('npm', ['install', '--package-lock-only', '--ignore-scripts', '--no-audit', '--no-fund']);
run('git', ['config', 'user.name', 'github-actions[bot]']);
run('git', ['config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com']);
run('git', ['add', 'package-lock.json']);
run('git', ['commit', '-m', 'chore: regenerate native Vitest dependency graph without Mocha']);
run('git', ['push', 'origin', 'HEAD:test/vitest-native-acceptance']);
