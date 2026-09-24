// One-time branch setup; removed once the generated lockfile is committed.
import { existsSync } from 'node:fs';
import { run } from './process.mjs';
if (!existsSync('package-lock.json')) {
  if (process.env.GITHUB_REF_NAME !== 'feat/describe-plugin') throw new Error('Unexpected bootstrap branch.');
  run('npm', ['install', '--package-lock-only', '--ignore-scripts']);
  run('git', ['config', 'user.name', 'github-actions[bot]']);
  run('git', ['config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com']);
  run('git', ['add', 'package-lock.json']);
  run('git', ['commit', '-m', 'chore: lock build and test dependencies']);
  run('git', ['push', 'origin', 'HEAD:feat/describe-plugin']);
}
