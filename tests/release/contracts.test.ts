import { afterEach, describe, expect, it } from 'vitest';
import { readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { assertDirectoryIdentity, assertPublicationApproval, compareVersions, packageRelease, stableVersion, validateMetadata, verifyPackage } from '../../scripts/release-contract.mjs';
import { fixture, lock, manifest, pkg, source, versions } from './fixtures';

const directories: string[] = [];
async function setup(): Promise<string> { const root = await fixture(); directories.push(root); return root; }
afterEach(async () => { await Promise.all(directories.splice(0).map(root => rm(root, { recursive: true, force: true }))); });

describe('release version and identity policy', () => {
  it.each(['v1.0.0', '01.0.0', '1.0', '1.0.0-beta', '1.0.0+build', '1.0.0\n', '../1.0.0', '1.0.0; echo unsafe'])('rejects %j', version => {
    expect(() => stableVersion(version)).toThrow();
  });
  it('compares versions numerically rather than lexically', () => {
    expect(compareVersions('1.10.0', '1.9.9')).toBe(1);
    expect(compareVersions('1.0.0', '2.0.0')).toBe(-1);
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
  });
  it('validates manifest, package, lockfile and compatibility together', () => {
    expect(validateMetadata(manifest, pkg, versions, lock)).toEqual(manifest);
    expect(() => validateMetadata(manifest, { ...pkg, version: '2.0.0' }, versions, lock)).toThrow();
    expect(() => validateMetadata(manifest, pkg, {}, lock)).toThrow();
    expect(() => validateMetadata({ ...manifest, description: 'Missing period' }, pkg, versions, lock)).toThrow();
    expect(() => validateMetadata({ ...manifest, fundingUrl: 'https://example.com' }, pkg, versions, lock)).toThrow();
    expect(() => validateMetadata({ ...manifest, minAppVersion: '1.12.0' }, pkg, versions, lock)).toThrow();
    expect(() => validateMetadata(manifest, pkg, versions, { ...lock, version: '0.0.0' })).toThrow();
  });
  it('rejects a conflicting directory ID but accepts its own existing listing', () => {
    expect(() => assertDirectoryIdentity([{ id: 'other', repo: 'example/other' }])).not.toThrow();
    expect(() => assertDirectoryIdentity([{ id: 'describe', repo: 'Luis85/describe' }])).not.toThrow();
    expect(() => assertDirectoryIdentity([{ id: 'describe', repo: 'another/plugin' }])).toThrow();
  });
});

describe('deterministic release packages', () => {
  it('produces stable hashes without timestamps and verifies all five assets', async () => {
    const root = await setup();
    const first = await packageRelease(root, source);
    expect(await packageRelease(root, source)).toEqual(first);
    expect(await verifyPackage(path.join(root, 'reports/release/package'))).toEqual(first);
  });
  it.each(['main.js', 'manifest.json', 'styles.css', 'SHA256SUMS', 'release-metadata.json'])('rejects tampered %s', async file => {
    const root = await setup(); await packageRelease(root, source);
    await writeFile(path.join(root, 'reports/release/package', file), 'tampered');
    await expect(verifyPackage(path.join(root, 'reports/release/package'))).rejects.toThrow();
  });
  it('refuses unexpected distribution files and unreviewed release notes', async () => {
    const root = await setup();
    await writeFile(path.join(root, 'dist/data.json'), 'private settings');
    await expect(packageRelease(root, source)).rejects.toThrow('three installable');
    await rm(path.join(root, 'dist/data.json'));
    await writeFile(path.join(root, 'docs/releases/1.0.0.md'), 'TODO '.repeat(30));
    await expect(packageRelease(root, source)).rejects.toThrow('Review release notes');
  });
  it('requires version, payload checksum, acceptance and a specific HTTPS evidence link', () => {
    const payload = 'a'.repeat(64);
    const approval = `publish 1.0.0 ${payload}`;
    expect(() => assertPublicationApproval('1.0.0', payload, approval, 'true', 'https://github.com/Luis85/describe/issues/10')).not.toThrow();
    expect(() => assertPublicationApproval('1.0.0', payload, '', 'true', 'https://example.com/evidence')).toThrow();
    expect(() => assertPublicationApproval('1.0.0', payload, approval, 'false', 'https://example.com/evidence')).toThrow();
    expect(() => assertPublicationApproval('1.0.0', payload, approval, 'true', 'https://example.com')).toThrow();
    expect(() => assertPublicationApproval('1.0.0', payload, approval, 'true', 'http://example.com/evidence')).toThrow();
    expect(() => assertPublicationApproval('1.0.0', payload, approval, 'true', 'https://user:secret@example.com/evidence')).toThrow();
  });
  it('writes a checksum entry for every installable asset', async () => {
    const root = await setup(); await packageRelease(root, source);
    const checksums = await readFile(path.join(root, 'reports/release/package/SHA256SUMS'), 'utf8');
    expect(checksums.trim().split('\n')).toHaveLength(3);
    expect(checksums).toMatch(/^[a-f0-9]{64}  main\.js/mu);
  });
});
