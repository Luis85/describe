import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compareVersions, json, readJson, stableVersion } from './release-contract.mjs';

/** Prepare a reviewable change; never commit, tag or publish from this function.
 * @param {string} root @param {string} version @param {boolean} dryRun */
export async function prepareRelease(root, version, dryRun = false) {
  stableVersion(version);
  const [pkg, manifest, versions, lock] = await Promise.all(['package.json', 'manifest.json', 'versions.json', 'package-lock.json'].map(file => readJson(path.join(root, file))));
  assert.ok(compareVersions(version, manifest.version) >= 0, 'Cannot prepare an older version.');
  stableVersion(manifest.minAppVersion);
  assert.ok(compareVersions(manifest.minAppVersion, '1.13.7') >= 0);
  assert.ok(!versions[version] || versions[version] === manifest.minAppVersion, 'Do not rewrite a compatibility entry with a different minimum version.');
  const changelog = await readFile(path.join(root, 'CHANGELOG.md'), 'utf8');
  const sections = changelog.split(/^## /mu).slice(1);
  const section = sections.find(text => text.startsWith('Unreleased') || text.startsWith(`${version} `));
  assert.ok(section, 'Add a ## Unreleased section to CHANGELOG.md before preparing a new version.');
  const body = section.slice(section.indexOf('\n') + 1).trim();
  assert.ok(body.length >= 80, 'Write user-facing release notes before preparing a version.');
  pkg.version = version; manifest.version = version; lock.version = version;
  lock.packages[''].version = version; versions[version] = manifest.minAppVersion;
  const notesPath = `docs/releases/${version}.md`;
  const existing = await readFile(path.join(root, notesPath), 'utf8').catch(error => {
    if (error.code !== 'ENOENT') throw error;
    return undefined;
  });
  const files = {
    'package.json': json(pkg), 'manifest.json': json(manifest),
    'versions.json': json(versions), 'package-lock.json': json(lock),
    [notesPath]: existing ?? `# Describe ${version}\n\nRequires Obsidian ${manifest.minAppVersion} or newer.\n\n${body}\n`,
  };
  // All validation and reads finish before the first write. Use git to review/revert local changes.
  if (!dryRun) {
    await mkdir(path.join(root, 'docs', 'releases'), { recursive: true });
    for (const [file, content] of Object.entries(files)) await writeFile(path.join(root, file), content);
  }
  return Object.keys(files);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await prepareRelease(process.cwd(), process.argv[2] ?? '', process.argv.includes('--dry-run'));
  console.log('Release files prepared for review. No commit, tag or publication was performed.');
}
