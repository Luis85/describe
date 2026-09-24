import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { appendFile } from 'node:fs/promises';
import { prepareRelease } from './prepare-release.mjs';
import { REPOSITORY, stableVersion } from './release-contract.mjs';

assert.equal(process.env.GITHUB_ACTIONS, 'true');
assert.equal(process.env.GITHUB_REPOSITORY, REPOSITORY);
assert.equal(process.env.GITHUB_EVENT_NAME, 'workflow_dispatch');
const version = stableVersion(process.env.RELEASE_VERSION ?? '');
const gh = (...args) => execFileSync('gh', args, { encoding: 'utf8', timeout: 60_000 }).trim();
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', timeout: 60_000 }).trim();
const repository = JSON.parse(gh('api', `repos/${REPOSITORY}`));
assert.equal(process.env.GITHUB_REF_NAME, repository.default_branch, 'Prepare releases from the default branch.');
const branch = `release/${version}`;
const existing = JSON.parse(gh('pr', 'list', '--repo', REPOSITORY, '--state', 'open', '--head', branch, '--base', repository.default_branch, '--json', 'url'));
if (existing.length) {
  console.log(`Existing release PR preserved: ${existing[0].url}`);
} else {
  const remote = git('ls-remote', '--heads', 'origin', `refs/heads/${branch}`);
  assert.equal(remote, '', 'A release branch already exists without an open PR. Inspect it; automation will not overwrite it.');
  assert.equal(git('ls-remote', '--tags', 'origin', `refs/tags/${version}`), '', 'This version already has a tag. Prepare a new version.');
  git('switch', '-c', branch);
  const files = await prepareRelease(process.cwd(), version);
  git('add', '--', ...files);
  const difference = spawnSync('git', ['diff', '--cached', '--quiet']);
  if (difference.error) throw difference.error;
  assert.ok(difference.status === 0 || difference.status === 1);
  if (difference.status === 0) {
    console.log(`Version ${version} is already prepared. Run Release in check mode, then create a draft.`);
  } else {
    git('config', 'user.name', 'github-actions[bot]');
    git('config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com');
    git('commit', '-m', `chore: prepare Describe ${version}`);
    // Configure Git's credential helper, never place tokens in a URL or log them.
    gh('auth', 'setup-git');
    git('push', 'origin', `HEAD:refs/heads/${branch}`);
    const body = 'Prepared version files and release notes. No tag or release was published. Review the notes and dependency-lock diff, approve any GitHub workflow approval banner, complete docs/releases/acceptance-template.md, then merge only when ready to release. Execute the Release workflow from the default branch in check, draft and publish modes. Public distribution and Obsidian directory approval are separate steps.';
    const url = gh('pr', 'create', '--repo', REPOSITORY, '--base', repository.default_branch, '--head', branch, '--title', `Release Describe ${version}`, '--body', body);
    console.log(url);
    if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, `## Release preparation\n${url}\n\nNo tag, merge or publication performed.\n`);
  }
}
