import { run } from './process.mjs';

// Temporary, branch-restricted maintenance; only the package lock is committed.
if (process.env.GITHUB_REF_NAME !== 'feat/describe-plugin' || process.env.GITHUB_EVENT_NAME !== 'push') {
  throw new Error('Unexpected dependency refresh context.');
}
run('npm', ['update', '--package-lock-only', '--ignore-scripts']);
run('git', ['config', 'user.name', 'github-actions[bot]']);
run('git', ['config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com']);
run('git', ['add', 'package-lock.json']);
run('git', ['commit', '-m', 'chore: lock patched native test dependencies']);
run('git', ['push', 'origin', 'HEAD:feat/describe-plugin']);
