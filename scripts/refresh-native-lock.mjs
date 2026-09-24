import { run } from './process.mjs';

// Temporary, branch-restricted dependency maintenance. Removed after lock verification.
if (process.env.GITHUB_REF_NAME !== 'feat/describe-plugin' || process.env.GITHUB_EVENT_NAME !== 'push') {
  throw new Error('Unexpected lock refresh context.');
}
run('npm', ['install', '--package-lock-only', '--ignore-scripts']);
run('git', ['config', 'user.name', 'github-actions[bot]']);
run('git', ['config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com']);
run('git', ['add', 'package-lock.json']);
run('git', ['commit', '-m', 'chore: lock native Obsidian acceptance tooling']);
run('git', ['push', 'origin', 'HEAD:feat/describe-plugin']);
