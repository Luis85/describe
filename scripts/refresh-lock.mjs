import { run } from './process.mjs';

// One-time dependency maintenance for this feature branch, removed after lock verification.
if (process.env.GITHUB_REF_NAME !== 'feat/describe-plugin' || process.env.GITHUB_EVENT_NAME !== 'push') {
  throw new Error('Lock refresh is restricted to the feature-branch push workflow.');
}
run('npm', ['install', '--package-lock-only', '--ignore-scripts']);
run('git', ['config', 'user.name', 'github-actions[bot]']);
run('git', ['config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com']);
run('git', ['add', 'package-lock.json']);
run('git', ['commit', '-m', 'chore: lock patched Vitest and YAML development dependencies']);
run('git', ['push', 'origin', 'HEAD:feat/describe-plugin']);
