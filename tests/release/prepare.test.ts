import { afterEach, describe, expect, it } from 'vitest';
import { readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { prepareRelease } from '../../scripts/prepare-release.mjs';
import { fixture, lock } from './fixtures';

const directories: string[] = [];
async function setup(): Promise<string> { const root = await fixture(); directories.push(root); return root; }
afterEach(async () => { await Promise.all(directories.splice(0).map(root => rm(root, { recursive: true, force: true }))); });

describe('release preparation without remote side effects', () => {
  it('synchronizes all version files without changing dependency resolutions', async () => {
    const root = await setup(); await prepareRelease(root, '1.1.0');
    for (const file of ['package.json', 'manifest.json', 'package-lock.json']) expect(await readFile(path.join(root, file), 'utf8')).toContain('"version": "1.1.0"');
    const text = await readFile(path.join(root, 'package-lock.json'), 'utf8');
    expect(text).toContain(lock.packages.dependency.integrity);
    expect(await readFile(path.join(root, 'versions.json'), 'utf8')).toContain('"1.0.0": "1.13.7"');
    expect(await readFile(path.join(root, 'docs/releases/1.1.0.md'), 'utf8')).toContain('Improve release verification');
  });
  it('supports a dry run without modifying files', async () => {
    const root = await setup();
    const before = await readFile(path.join(root, 'package.json'), 'utf8');
    await prepareRelease(root, '1.2.0', true);
    expect(await readFile(path.join(root, 'package.json'), 'utf8')).toBe(before);
    await expect(readFile(path.join(root, 'docs/releases/1.2.0.md'))).rejects.toThrow();
  });
  it('preserves already reviewed release notes when rerun', async () => {
    const root = await setup();
    const before = await readFile(path.join(root, 'docs/releases/1.0.0.md'), 'utf8');
    await prepareRelease(root, '1.0.0');
    expect(await readFile(path.join(root, 'docs/releases/1.0.0.md'), 'utf8')).toBe(before);
  });
  it('rejects version regressions and absent notes before writing anything', async () => {
    const root = await setup();
    const before = await readFile(path.join(root, 'manifest.json'), 'utf8');
    await expect(prepareRelease(root, '0.9.0')).rejects.toThrow('older');
    await writeFile(path.join(root, 'CHANGELOG.md'), '# Empty changelog');
    await expect(prepareRelease(root, '1.0.1')).rejects.toThrow('Unreleased');
    expect(await readFile(path.join(root, 'manifest.json'), 'utf8')).toBe(before);
  });
});
