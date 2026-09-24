import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { REPOSITORY, RELEASE_ASSETS, compareVersions, digest, stableVersion, verifyPackage, assertPublicationApproval } from './release-contract.mjs';

const prefix = `repos/${REPOSITORY}`;
const BUILD_INPUTS = ['src/', 'scripts/', 'package.json', 'package-lock.json', 'manifest.json', 'versions.json', 'styles.css', 'vite.config.ts', 'tsconfig.json'];

/** @param {any} api @param {string} version */
export async function tagCommit(api, version) {
  const reference = await api.get(`${prefix}/git/ref/tags/${stableVersion(version)}`, true);
  if (reference === null) return null;
  let object = reference.object;
  for (let depth = 0; object.type === 'tag' && depth < 5; depth++) object = (await api.get(`${prefix}/git/tags/${object.sha}`)).object;
  assert.equal(object.type, 'commit', 'Tag must resolve to a commit.');
  assert.match(object.sha, /^[a-f0-9]{40}$/u);
  return object.sha;
}

/** @param {any} api */
export async function listReleases(api) {
  const releases = [];
  for (let page = 1; page <= 100; page++) {
    const next = await api.get(`${prefix}/releases?per_page=100&page=${page}`);
    assert.ok(Array.isArray(next));
    releases.push(...next);
    if (next.length < 100) return releases;
  }
  throw new Error('Release listing exceeded the safety limit.');
}

/** The source must be merged, advertised by default-branch manifest, and unchanged in build inputs.
 * @param {any} api @param {string} sourceCommit @param {any} manifest */
export async function verifyRemoteSource(api, sourceCommit, manifest) {
  assert.match(sourceCommit, /^[a-f0-9]{40}$/u);
  const repository = await api.get(prefix);
  assert.equal(repository.private, false, 'Community distribution requires a public repository.');
  assert.equal(repository.full_name.toLowerCase(), REPOSITORY.toLowerCase());
  const head = await api.get(`${prefix}/commits/${encodeURIComponent(repository.default_branch)}`);
  const comparison = await api.get(`${prefix}/compare/${sourceCommit}...${head.sha}`);
  assert.equal(comparison.merge_base_commit.sha, sourceCommit, 'Release source must be merged into the default branch.');
  assert.ok(comparison.files.length < 300, 'Comparison may be truncated; release a current, reviewed commit.');
  assert.ok(!comparison.files.some(file => [file.filename, file.previous_filename].filter(Boolean).some(filename => BUILD_INPUTS.some(input => input.endsWith('/') ? filename.startsWith(input) : filename === input))), 'Default-branch build inputs changed after this candidate. Prepare a new version; never move the old tag.');
  const file = await api.get(`${prefix}/contents/manifest.json?ref=${head.sha}`);
  assert.equal(file.encoding, 'base64');
  assert.deepEqual(JSON.parse(Buffer.from(file.content, 'base64').toString('utf8')), manifest, 'Default-branch manifest does not advertise this package.');
  return repository.default_branch;
}

/** @param {any} api @param {any} release @param {string} directory */
export async function verifyRemoteAssets(api, release, directory) {
  assert.deepEqual(release.assets.map(asset => asset.name).sort(), [...RELEASE_ASSETS].sort(), 'Remote release has missing or unexpected assets.');
  for (const name of RELEASE_ASSETS) {
    const asset = release.assets.find(item => item.name === name);
    assert.equal(asset.state, 'uploaded');
    const expected = await readFile(path.join(directory, name));
    assert.equal(asset.size, expected.length, `Remote size mismatch: ${name}.`);
    const actual = await api.download(asset.id);
    assert.equal(digest(actual), digest(expected), `Remote bytes do not match: ${name}.`);
  }
}

/** @param {any} options @param {any} api */
export async function executeRelease(options, api) {
  const { root, directory, mode, version, sourceCommit } = options;
  assert.ok(mode === 'draft' || mode === 'publish', 'Choose draft or publish.');
  const metadata = await verifyPackage(directory);
  assert.equal(metadata.version, stableVersion(version));
  assert.equal(metadata.sourceCommit, sourceCommit);
  const manifest = JSON.parse(await readFile(path.join(directory, 'manifest.json'), 'utf8'));
  const notes = await readFile(path.join(root, 'docs', 'releases', `${version}.md`), 'utf8');
  assert.equal(digest(notes), metadata.notesSha256, 'Release notes changed since packaging.');
  if (mode === 'publish') {
    assertPublicationApproval(version, metadata.payloadSha256, options.approval, options.manualChecks, options.evidence);
    assert.match(options.actor, /^[a-zA-Z0-9\[\]_-]+$/u, 'An authenticated workflow actor must be recorded.');
  }
  await verifyRemoteSource(api, sourceCommit, manifest);
  const releases = await listReleases(api);
  for (const release of releases.filter(item => !item.draft && !item.prerelease)) {
    if (/^\d+\.\d+\.\d+$/u.test(release.tag_name)) assert.ok(compareVersions(version, release.tag_name) >= 0, 'Refusing an older stable release.');
  }
  let release = releases.find(item => item.tag_name === version);
  const tag = await tagCommit(api, version);
  assert.ok(tag === null || tag === sourceCommit, 'Existing tag points elsewhere; it will not be moved.');
  if (mode === 'publish') assert.ok(release && tag, 'Create and review the draft release first.');
  if (release && !release.draft) {
    assert.equal(release.prerelease, false);
    assert.equal(tag, sourceCommit);
    await verifyRemoteAssets(api, release, directory);
    return { state: 'already-published', url: release.html_url, metadata };
  }
  if (!tag) await api.send('POST', `${prefix}/git/refs`, { ref: `refs/tags/${version}`, sha: sourceCommit });
  assert.equal(await tagCommit(api, version), sourceCommit);
  if (!release) {
    release = await api.send('POST', `${prefix}/releases`, {
      tag_name: version, target_commitish: sourceCommit, name: `Describe ${version}`,
      body: `${notes}\nSource: ${sourceCommit}\n\nPackage SHA-256: ${metadata.payloadSha256}\n`,
      draft: true, prerelease: false,
    });
  }
  assert.equal(release.prerelease, false);
  // Resume missing uploads, but never replace differing bytes or edit published releases.
  for (const asset of release.assets) {
    assert.ok(RELEASE_ASSETS.includes(asset.name), `Unexpected existing asset: ${asset.name}.`);
    assert.equal(digest(await api.download(asset.id)), digest(await readFile(path.join(directory, asset.name))), `Existing draft asset differs: ${asset.name}. Investigate instead of overwriting it.`);
  }
  for (const name of RELEASE_ASSETS) if (!release.assets.some(asset => asset.name === name)) await api.upload(version, path.join(directory, name));
  release = await api.get(`${prefix}/releases/${release.id}`);
  await verifyRemoteAssets(api, release, directory);
  if (mode === 'publish') {
    await verifyRemoteSource(api, sourceCommit, manifest);
    assert.equal(await tagCommit(api, version), sourceCommit);
    const body = `${notes}\nSource: ${sourceCommit}\n\nPackage SHA-256: ${metadata.payloadSha256}\n\nManual acceptance attested by @${options.actor}. Evidence: ${options.evidence}\n`;
    release = await api.send('PATCH', `${prefix}/releases/${release.id}`, { draft: false, prerelease: false, make_latest: 'true', body });
    assert.equal(release.draft, false);
    await verifyRemoteAssets(api, release, directory);
  }
  return { state: mode === 'publish' ? 'published' : 'draft', url: release.html_url, metadata };
}
