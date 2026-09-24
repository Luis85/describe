import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { run } from './process.mjs';

// Temporary maintenance job: resolve only the reviewed Node-24 typings change.
// No dependency lifecycle scripts execute in this write-enabled job.
const branch = 'chore/post-vitest-dependencies';
assert.equal(process.env.GITHUB_REPOSITORY, 'Luis85/describe');
assert.equal(process.env.GITHUB_REF_NAME, branch);
assert.equal(process.env.GITHUB_EVENT_NAME, 'push');
const before = JSON.parse(await readFile('package.json', 'utf8'));
const available = JSON.parse(run('npm', ['view', '@types/node@24', 'version', '--json'], true));
const versions = (Array.isArray(available) ? available : [available]).filter(version => /^24\.\d+\.\d+$/u.test(version));
versions.sort((a, b) => {
  const left = a.split('.').map(Number); const right = b.split('.').map(Number);
  return left[1] - right[1] || left[2] - right[2];
});
const version = versions.at(-1);
assert.ok(version, 'The registry did not return a stable Node 24 typings version.');
run('npm', ['install', '--save-dev', '--save-exact', '--package-lock-only', '--ignore-scripts', `@types/node@${version}`]);
const after = JSON.parse(await readFile('package.json', 'utf8'));
assert.deepEqual(after, { ...before, devDependencies: { ...before.devDependencies, '@types/node': version } });
const files = run('git', ['diff', '--name-only'], true).trim().split('\n').filter(Boolean);
assert.ok(files.length > 0 && files.every(file => ['package.json', 'package-lock.json'].includes(file)));
console.log(`Resolved @types/node ${version}; ESLint ${after.devDependencies.eslint}; no runtime or release changes.`);
run('git', ['config', 'user.name', 'github-actions[bot]']);
run('git', ['config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com']);
run('git', ['add', '--', 'package.json', 'package-lock.json']);
run('git', ['commit', '-m', `chore: align Node declarations to the supported baseline (${version})`]);
run('git', ['push', 'origin', `HEAD:${branch}`]);
