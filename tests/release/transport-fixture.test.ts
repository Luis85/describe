import { readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { FakeGitHub, fixture, source } from './fixtures';

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

describe('release transport test-double contracts', () => {
  it('keeps reads side-effect free and rejects unspecified endpoints', async () => {
    const api = new FakeGitHub();
    expect(await api.get('repos/Luis85/describe')).toMatchObject({ private: false, default_branch: 'main' });
    expect(await api.get('repos/Luis85/describe/git/ref/tags/1.0.0')).toBeNull();
    await expect(api.get('unexpected')).rejects.toThrow('Unexpected endpoint');
    expect(api.writes).toEqual([]);
    expect(api.uploads).toEqual([]);
  });

  it('models tag creation, uploaded bytes and draft publication consistently', async () => {
    const root = await fixture(); roots.push(root);
    const api = new FakeGitHub();
    await api.send('POST', 'repos/Luis85/describe/git/refs', { sha: source });
    expect(await api.get('repos/Luis85/describe/git/ref/tags/1.0.0')).toEqual({ object: { type: 'commit', sha: source } });
    await api.send('POST', 'repos/Luis85/describe/releases', { tag_name: '1.0.0' });
    const filename = path.join(root, 'dist/main.js');
    await api.upload('1.0.0', filename);
    expect(await api.download(1)).toEqual(await readFile(filename));
    expect(api.releases[0]?.assets[0]).toMatchObject({ id: 1, name: 'main.js', state: 'uploaded' });
    expect(await api.send('PATCH', 'repos/Luis85/describe/releases/1', { draft: false, body: 'Reviewed' }))
      .toMatchObject({ draft: false, body: 'Reviewed' });
    expect(api.writes.map(write => write.method)).toEqual(['POST', 'POST', 'PATCH']);
  });

  it('does not invent uploaded assets when transfer fails', async () => {
    const root = await fixture(); roots.push(root);
    const api = new FakeGitHub();
    await api.send('POST', 'repos/Luis85/describe/releases', { tag_name: '1.0.0' });
    api.failUpload = 'main.js';
    await expect(api.upload('1.0.0', path.join(root, 'dist/main.js'))).rejects.toThrow('Simulated upload interruption');
    await expect(api.download(1)).rejects.toThrow('Missing fake asset');
    expect(api.uploads).toEqual([]);
    expect(api.releases[0]?.assets).toEqual([]);
    expect(api.contents.size).toBe(0);
  });
});
