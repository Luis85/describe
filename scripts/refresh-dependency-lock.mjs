import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

// One-time maintenance on this exact branch. Resolution never executes package lifecycle scripts.
// Removed before merging; production CI has no repository write permissions.
assert.equal(process.env.GITHUB_REPOSITORY, 'Luis85/describe');
assert.equal(process.env.GITHUB_EVENT_NAME, 'push');
assert.equal(process.env.GITHUB_REF_NAME, 'chore/dependency-maintenance');
const run = (command, args) => execFileSync(command, args, { stdio: 'inherit', timeout: 180_000 });
run('npm', ['install', '--package-lock-only', '--ignore-scripts']);
const changed = execFileSync('git', ['diff', '--name-only'], { encoding: 'utf8' }).trim();
assert.equal(changed, 'package-lock.json', 'Only the dependency lock may change during maintenance.');
run('git', ['config', 'user.name', 'github-actions[bot]']);
run('git', ['config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com']);
run('git', ['add', 'package-lock.json']);
run('git', ['commit', '-m', 'chore: lock reviewed dependency updates without incompatible Mocha 12']);
// Ordinary push, not forced; concurrent branch edits cause a safe rejection.
run('git', ['push', 'origin', 'HEAD:chore/dependency-maintenance']);
