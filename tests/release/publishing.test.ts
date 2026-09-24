import { afterEach, describe, expect, it } from 'vitest';
import { rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { packageRelease, RELEASE_ASSETS } from '../../scripts/release-contract.mjs';
import { executeRelease, verifyRemoteSource } from '../../scripts/release-github.mjs';
import { FakeGitHub, fixture, manifest, source } from './fixtures';

const directories: string[] = [];
async function setup() {
  const root = await fixture(); directories.push(root);
  const metadata = await packageRelease(root, source);
  const options = { root, directory: path.join(root, 'reports/release/package'), mode: 'draft', version: '1.0.0', sourceCommit: source,
    approval: `publish 1.0.0 ${metadata.payloadSha256}`, manualChecks: 'true', evidence: 'https://example.com/acceptance/1', actor: 'Luis85' };
  return { options, api: new FakeGitHub() };
}
afterEach(async () => { await Promise.all(directories.splice(0).map(root => rm(root, { recursive: true, force: true }))); });

describe('release state machine with a fake GitHub API', () => {
  it('creates a draft, uploads exact assets and leaves it unpublished', async () => {
    const { options, api } = await setup();
    expect((await executeRelease(options, api)).state).toBe('draft');
    expect(api.tag).toBe(source);
    expect(api.uploads).toEqual(RELEASE_ASSETS);
    expect(api.releases[0]?.draft).toBe(true);
    expect(api.writes.some(call => call.method === 'PATCH')).toBe(false);
  });
  it('resumes an interrupted upload without replacing assets', async () => {
    const { options, api } = await setup(); api.failUpload = 'styles.css';
    await expect(executeRelease(options, api)).rejects.toThrow('interruption');
    expect(api.uploads).toEqual(['main.js', 'manifest.json']);
    api.failUpload = undefined;
    await executeRelease(options, api);
    expect(api.uploads).toEqual(RELEASE_ASSETS);
    const count = api.writes.length;
    await executeRelease(options, api);
    expect(api.writes).toHaveLength(count);
    expect(api.uploads).toHaveLength(5);
  });
  it('requires an existing draft and explicit publication approval before any write', async () => {
    const { options, api } = await setup();
    await expect(executeRelease({ ...options, mode: 'publish' }, api)).rejects.toThrow('draft');
    expect(api.writes).toEqual([]);
    await executeRelease(options, api); const before = api.writes.length;
    await expect(executeRelease({ ...options, mode: 'publish', approval: '' }, api)).rejects.toThrow('Publication requires');
    expect(api.writes).toHaveLength(before);
  });
  it('publishes only after asset verification and records the maintainer attestation', async () => {
    const { options, api } = await setup();
    await executeRelease(options, api);
    expect((await executeRelease({ ...options, mode: 'publish' }, api)).state).toBe('published');
    expect(api.releases[0]?.draft).toBe(false);
    expect(api.releases[0]?.body).toContain('Manual acceptance attested by @Luis85');
    const writes = api.writes.length;
    expect((await executeRelease({ ...options, mode: 'publish' }, api)).state).toBe('already-published');
    expect(api.writes).toHaveLength(writes);
  });
  it('refuses to move an existing tag', async () => {
    const { options, api } = await setup(); api.tag = 'd'.repeat(40);
    await expect(executeRelease(options, api)).rejects.toThrow('will not be moved');
    expect(api.writes).toEqual([]);
  });
  it('refuses an unmerged source or changed default-branch build inputs', async () => {
    const { options, api } = await setup(); api.merged = false;
    await expect(executeRelease(options, api)).rejects.toThrow('merged');
    api.merged = true; api.changedFiles = [{ filename: 'src/main.ts' }];
    await expect(executeRelease(options, api)).rejects.toThrow('build inputs changed');
    api.changedFiles = [{ filename: 'docs/archived-code.ts', previous_filename: 'src/main.ts' }];
    await expect(executeRelease(options, api)).rejects.toThrow('build inputs changed');
    expect(api.writes).toEqual([]);
  });
  it('allows documentation-only follow-up commits but rejects a different advertised version', async () => {
    const { api } = await setup(); api.changedFiles = [{ filename: 'docs/manual-acceptance.md' }];
    await expect(verifyRemoteSource(api, source, manifest)).resolves.toBe('main');
    api.remoteManifest.version = '1.1.0';
    await expect(verifyRemoteSource(api, source, manifest)).rejects.toThrow('advertise');
  });
  it('refuses a private repository', async () => {
    const { options, api } = await setup(); api.privateRepository = true;
    await expect(executeRelease(options, api)).rejects.toThrow('public repository');
    expect(api.writes).toEqual([]);
  });
  it('does not overwrite altered draft assets or upload extras', async () => {
    const { options, api } = await setup(); await executeRelease(options, api);
    api.contents.set(1, Buffer.from('altered'));
    const count = api.writes.length;
    await expect(executeRelease(options, api)).rejects.toThrow('differs');
    expect(api.writes).toHaveLength(count);
    expect(api.uploads).toHaveLength(5);
  });
  it('rejects release-note changes after packaging', async () => {
    const { options, api } = await setup();
    await writeFile(path.join(options.root, 'docs/releases/1.0.0.md'), 'Changed since the candidate was packaged.');
    await expect(executeRelease(options, api)).rejects.toThrow('notes changed');
    expect(api.writes).toEqual([]);
  });
  it('rejects incomplete remote uploads', async () => {
    const { options, api } = await setup(); api.missingUploadState = true;
    await expect(executeRelease(options, api)).rejects.toThrow();
    expect(api.releases[0]?.draft).toBe(true);
  });
});
