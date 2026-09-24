import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { appendFile } from 'node:fs/promises';
import path from 'node:path';
import { REPOSITORY, PLUGIN_ASSETS, assertDirectoryIdentity, digest, packageRelease, readProject, stableVersion, verifyPackage } from './release-contract.mjs';
import { executeRelease, tagCommit, verifyRemoteSource } from './release-github.mjs';

const root = process.cwd();
const directory = path.join(root, 'reports', 'release', 'package');
const mode = process.env.RELEASE_MODE ?? 'check';
const prefix = `repos/${REPOSITORY}`;
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', timeout: 60_000 }).trim();
const command = (...args) => execFileSync('gh', args, { encoding: 'utf8', timeout: 60_000, maxBuffer: 10_000_000 });
const api = {
  async get(endpoint, optional = false) {
    const result = spawnSync('gh', ['api', endpoint], { encoding: 'utf8', timeout: 60_000, maxBuffer: 10_000_000 });
    if (result.error) throw result.error;
    if (result.status !== 0) {
      if (optional && /\(HTTP 404\)/u.test(result.stderr)) return null;
      throw new Error(`GitHub read failed: ${endpoint}: ${result.stderr}`);
    }
    return JSON.parse(result.stdout);
  },
  async send(method, endpoint, body) {
    return JSON.parse(execFileSync('gh', ['api', '--method', method, endpoint, '--input', '-'], {
      input: JSON.stringify(body), encoding: 'utf8', timeout: 60_000,
    }));
  },
  async download(id) {
    assert.ok(Number.isSafeInteger(id) && id > 0);
    return execFileSync('gh', ['api', `${prefix}/releases/assets/${id}`, '-H', 'Accept: application/octet-stream'], { timeout: 60_000, maxBuffer: 10_000_000 });
  },
  async upload(version, file) { command('release', 'upload', version, file, '--repo', REPOSITORY); },
};

async function directoryCheck() {
  const response = await fetch('https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugins.json', { signal: AbortSignal.timeout(30_000) });
  assert.ok(response.ok, `Directory lookup failed: ${response.status}.`);
  const entries = await response.json();
  assert.ok(Array.isArray(entries) && entries.length > 0, 'Directory returned no entries.');
  assertDirectoryIdentity(entries);
}

async function summary(text) {
  console.log(text);
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, `${text}\n`);
}

async function plan() {
  assert.equal(process.env.GITHUB_REPOSITORY, REPOSITORY, 'Release automation is restricted to the canonical repository.');
  assert.ok(['check', 'draft', 'publish'].includes(mode));
  const { manifest } = await readProject(root);
  const version = stableVersion(process.env.RELEASE_VERSION ?? manifest.version);
  assert.equal(version, manifest.version);
  const repository = await api.get(prefix);
  if (process.env.GITHUB_EVENT_NAME === 'workflow_dispatch') assert.equal(process.env.GITHUB_REF_NAME, repository.default_branch, 'Run Release from the default branch.');
  else {
    assert.equal(process.env.GITHUB_REF_TYPE, 'tag');
    assert.equal(process.env.GITHUB_REF_NAME, version);
    assert.notEqual(mode, 'publish', 'Tag pushes may create drafts only.');
  }
  const existing = await tagCommit(api, version);
  const source = existing ?? git('rev-parse', 'HEAD');
  if (mode === 'publish') assert.ok(existing, 'Create the draft first.');
  await verifyRemoteSource(api, source, manifest);
  await directoryCheck();
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `source=${source}\nversion=${version}\nminimum=${manifest.minAppVersion}\nmode=${mode}\n`);
  await summary(`## Release plan\nVersion: ${version}\n\nSource: ${source}\n\nMode: ${mode}\n\nRegistry identity check passed; this does not reserve an ID or approve a listing.`);
}

async function verifyPublic(version, metadata) {
  for (const name of PLUGIN_ASSETS) {
    // No authentication: verify the URLs Obsidian users need, not only a token's view.
    const url = `https://github.com/${REPOSITORY}/releases/download/${stableVersion(version)}/${name}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    assert.ok(response.ok, `Public asset unavailable (${response.status}): ${name}.`);
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.equal(digest(bytes), metadata.assets[name], `Public asset integrity failed: ${name}.`);
  }
  await summary(`Public installable assets verified for ${version}. Directory approval remains separate.`);
}

switch (process.argv[2]) {
  case 'plan': await plan(); break;
  case 'package': {
    const metadata = await packageRelease(root, git('rev-parse', 'HEAD'));
    await summary(`## Candidate package\nVersion: ${metadata.version}\n\nSource: ${metadata.sourceCommit}\n\nPayload SHA-256: ${metadata.payloadSha256}\n\nPublication confirmation: \`publish ${metadata.version} ${metadata.payloadSha256}\`\n\nNo tag or release was created by packaging.`);
    break;
  }
  case 'execute': {
    assert.equal(process.env.GITHUB_ACTIONS, 'true', 'Execute releases through the reviewed GitHub workflow.');
    assert.equal(process.env.GITHUB_REPOSITORY, REPOSITORY);
    assert.ok(['workflow_dispatch', 'push'].includes(process.env.GITHUB_EVENT_NAME ?? ''));
    if (mode === 'publish') assert.equal(process.env.GITHUB_EVENT_NAME, 'workflow_dispatch');
    const source = git('rev-parse', 'HEAD');
    await directoryCheck();
    const result = await executeRelease({
      root, directory, mode, version: process.env.RELEASE_VERSION, sourceCommit: source,
      approval: process.env.RELEASE_APPROVAL ?? '', manualChecks: process.env.RELEASE_MANUAL_CHECKS ?? 'false',
      evidence: process.env.RELEASE_EVIDENCE ?? '', actor: process.env.GITHUB_ACTOR ?? '',
    }, api);
    await summary(`## Release result\n${result.state}: ${result.url}\n\nPayload: ${result.metadata.payloadSha256}`);
    if (result.state !== 'draft') await verifyPublic(result.metadata.version, result.metadata);
    break;
  }
  case 'verify': {
    const metadata = await verifyPackage(directory);
    await verifyPublic(metadata.version, metadata);
    break;
  }
  default: throw new Error('Use plan, package, execute or verify. Packaging is safe; execute requires GitHub Actions.');
}
