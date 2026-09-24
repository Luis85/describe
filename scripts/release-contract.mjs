import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { lstat, mkdir, readFile, readdir, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';

export const PLUGIN_ASSETS = ['main.js', 'manifest.json', 'styles.css'];
export const RELEASE_ASSETS = [...PLUGIN_ASSETS, 'SHA256SUMS', 'release-metadata.json'];
export const REPOSITORY = 'Luis85/describe';

/** @param {string} value */
export function stableVersion(value) {
  assert.equal(value, value.trim(), 'Version must not contain surrounding whitespace.');
  assert.match(value, /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u, 'Use x.y.z without a v prefix, leading zeroes or prerelease suffix.');
  assert.ok(value.split('.').every(part => Number.isSafeInteger(Number(part))), 'Version component is too large.');
  return value;
}

/** @param {string} left @param {string} right */
export function compareVersions(left, right) {
  const a = stableVersion(left).split('.').map(Number);
  const b = stableVersion(right).split('.').map(Number);
  for (let index = 0; index < 3; index++) if (a[index] !== b[index]) return Math.sign(a[index] - b[index]);
  return 0;
}

/** @param {string | Buffer} value */
export function digest(value) { return createHash('sha256').update(value).digest('hex'); }
/** @param {unknown} value */
export function json(value) { return `${JSON.stringify(value, null, 2)}\n`; }
/** @param {string} file */
export async function readJson(file) { return JSON.parse(await readFile(file, 'utf8')); }

/** Metadata checks are local policy, not a replacement for Obsidian's review. */
export function validateMetadata(manifest, pkg, versions, lock) {
  assert.equal(manifest.id, 'describe');
  assert.ok(!manifest.id.includes('obsidian'));
  assert.equal(manifest.name, 'Describe');
  stableVersion(manifest.version);
  stableVersion(manifest.minAppVersion);
  assert.ok(compareVersions(manifest.minAppVersion, '1.13.7') >= 0, 'Minimum app cannot precede the requested baseline.');
  assert.equal(manifest.isDesktopOnly, false);
  assert.equal(manifest.version, pkg.version, 'Package/manifest version mismatch.');
  assert.equal(manifest.version, lock.version, 'Lockfile version mismatch.');
  assert.equal(manifest.version, lock.packages[''].version, 'Lockfile root package version mismatch.');
  assert.equal(versions[manifest.version], manifest.minAppVersion, 'Missing or inconsistent compatibility mapping.');
  for (const [version, minimum] of Object.entries(versions)) { stableVersion(version); stableVersion(String(minimum)); }
  assert.equal(pkg.license, 'MIT');
  assert.ok(typeof manifest.author === 'string' && manifest.author.trim());
  assert.ok(typeof manifest.description === 'string' && manifest.description.length <= 250 && manifest.description.endsWith('.'));
  assert.ok(!/^this is a plugin/iu.test(manifest.description));
  assert.ok(!/\p{Extended_Pictographic}/u.test(manifest.description));
  assert.ok(!Object.hasOwn(manifest, 'fundingUrl'), 'Do not publish sample or unconfigured donation links.');
  return manifest;
}

/** @param {string} root */
export async function readProject(root) {
  const [manifest, pkg, versions, lock] = await Promise.all(['manifest.json', 'package.json', 'versions.json', 'package-lock.json'].map(file => readJson(path.join(root, file))));
  validateMetadata(manifest, pkg, versions, lock);
  for (const file of ['README.md', 'LICENSE', 'docs/prds/describe.md', 'docs/releasing.md']) {
    assert.ok((await readFile(path.join(root, file), 'utf8')).trim(), `${file} must not be empty.`);
  }
  return { manifest, pkg, versions, lock };
}

/** @param {string} directory @param {string[]} names */
export async function hashAssets(directory, names = PLUGIN_ASSETS) {
  const hashes = {};
  for (const name of names) {
    const filename = path.join(directory, name);
    const info = await lstat(filename);
    assert.ok(info.isFile() && !info.isSymbolicLink(), `${name} must be a regular file.`);
    assert.ok(info.size > 0 && info.size <= 5_000_000, `Unexpected asset size: ${name}.`);
    hashes[name] = digest(await readFile(filename));
  }
  return hashes;
}

/** @param {Record<string, string>} hashes */
export function payloadDigest(hashes) {
  return digest(PLUGIN_ASSETS.map(name => `${name}:${hashes[name]}\n`).join(''));
}

/** @param {string} root @param {string} sourceCommit */
export async function packageRelease(root, sourceCommit) {
  assert.match(sourceCommit, /^[a-f0-9]{40}$/u, 'An exact source commit is required.');
  const { manifest } = await readProject(root);
  const dist = path.join(root, 'dist');
  assert.deepEqual((await readdir(dist)).sort(), [...PLUGIN_ASSETS].sort(), 'The plugin bundle must contain only the three installable assets.');
  assert.deepEqual(await readJson(path.join(dist, 'manifest.json')), manifest);
  const notes = await readFile(path.join(root, 'docs', 'releases', `${manifest.version}.md`), 'utf8');
  assert.ok(notes.trim().length >= 80 && !/\b(?:TODO|TBD|PLACEHOLDER)\b/u.test(notes), 'Review release notes before packaging.');
  const hashes = await hashAssets(dist);
  const metadata = {
    schemaVersion: 1, repository: REPOSITORY, pluginId: manifest.id,
    version: manifest.version, minAppVersion: manifest.minAppVersion,
    sourceCommit, payloadSha256: payloadDigest(hashes), assets: hashes, notesSha256: digest(notes),
  };
  const directory = path.join(root, 'reports', 'release', 'package');
  await mkdir(directory, { recursive: true });
  const unexpected = (await readdir(directory)).filter(name => !RELEASE_ASSETS.includes(name));
  assert.deepEqual(unexpected, [], 'Unexpected files in release staging directory.');
  for (const name of PLUGIN_ASSETS) await copyFile(path.join(dist, name), path.join(directory, name));
  await writeFile(path.join(directory, 'SHA256SUMS'), PLUGIN_ASSETS.map(name => `${hashes[name]}  ${name}\n`).join(''));
  await writeFile(path.join(directory, 'release-metadata.json'), json(metadata));
  return metadata;
}

/** @param {string} directory */
export async function verifyPackage(directory) {
  assert.deepEqual((await readdir(directory)).sort(), [...RELEASE_ASSETS].sort(), 'Release asset set is incomplete or contains extras.');
  await hashAssets(directory, RELEASE_ASSETS);
  const metadata = await readJson(path.join(directory, 'release-metadata.json'));
  const hashes = await hashAssets(directory);
  const manifest = await readJson(path.join(directory, 'manifest.json'));
  assert.equal(metadata.schemaVersion, 1);
  assert.equal(metadata.repository, REPOSITORY);
  assert.equal(metadata.pluginId, 'describe');
  stableVersion(metadata.version);
  stableVersion(metadata.minAppVersion);
  assert.match(metadata.sourceCommit, /^[a-f0-9]{40}$/u);
  assert.match(metadata.notesSha256, /^[a-f0-9]{64}$/u);
  assert.deepEqual(metadata.assets, hashes, 'Release asset hash mismatch.');
  assert.equal(metadata.payloadSha256, payloadDigest(hashes));
  assert.equal(manifest.version, metadata.version);
  assert.equal(manifest.minAppVersion, metadata.minAppVersion);
  assert.equal(manifest.id, metadata.pluginId);
  assert.equal(await readFile(path.join(directory, 'SHA256SUMS'), 'utf8'), PLUGIN_ASSETS.map(name => `${hashes[name]}  ${name}\n`).join(''));
  return metadata;
}

/** @param {string} version @param {string} payload @param {string} approval @param {string} manualChecks @param {string} evidence */
export function assertPublicationApproval(version, payload, approval, manualChecks, evidence) {
  assert.equal(approval, `publish ${stableVersion(version)} ${payload}`, 'Publication requires the exact version and payload SHA-256 from the draft run.');
  assert.equal(manualChecks, 'true', 'Complete the documented manual/device acceptance checklist first.');
  const url = new URL(evidence);
  assert.equal(url.protocol, 'https:');
  assert.ok(!url.username && !url.password, 'Evidence URL must not contain credentials.');
  assert.ok(url.hostname && url.pathname !== '/', 'Provide a specific acceptance evidence URL.');
}

/** @param {{id: string, repo: string}[]} entries */
export function assertDirectoryIdentity(entries) {
  assert.ok(Array.isArray(entries));
  for (const entry of entries) if (entry.id === 'describe') {
    assert.equal(entry.repo.toLowerCase(), REPOSITORY.toLowerCase(), 'Plugin ID is already assigned to a different repository.');
  }
}
