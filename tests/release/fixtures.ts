import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

export const source = 'a'.repeat(40);
export const manifest = { id: 'describe', name: 'Describe', version: '1.0.0', minAppVersion: '1.13.7', isDesktopOnly: false, author: 'Luis Mendez', description: 'Describe files and folders.' };
export const pkg = { version: '1.0.0', license: 'MIT' };
export const versions = { '1.0.0': '1.13.7' };
export const lock = { version: '1.0.0', packages: { '': { version: '1.0.0' }, dependency: { version: '2.0.0', integrity: 'unchanged' } } };

export async function writeJson(root: string, filename: string, value: unknown): Promise<void> {
  await writeFile(path.join(root, filename), `${JSON.stringify(value, null, 2)}\n`);
}

export async function fixture(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'describe-release-test-'));
  for (const folder of ['dist', 'docs/prds', 'docs/releases']) await mkdir(path.join(root, folder), { recursive: true });
  for (const [file, value] of Object.entries({ 'manifest.json': manifest, 'dist/manifest.json': manifest, 'package.json': pkg, 'versions.json': versions, 'package-lock.json': lock })) await writeJson(root, file, value);
  for (const file of ['README.md', 'LICENSE', 'docs/prds/describe.md', 'docs/releasing.md']) await writeFile(path.join(root, file), 'Synthetic release verification fixture.');
  await writeFile(path.join(root, 'dist/main.js'), 'module.exports = class Describe {};');
  await writeFile(path.join(root, 'dist/styles.css'), '.describe-modal { display: block; }\n');
  await writeFile(path.join(root, 'docs/releases/1.0.0.md'), '# Describe 1.0.0\n\nCreate description notes for files and folders. This release preserves original files and supports per-extension destinations.\n');
  await writeFile(path.join(root, 'CHANGELOG.md'), '# Changelog\n\n## Unreleased\n\nImprove release verification and deterministic packaging while preserving the original item and existing notes.\n');
  return root;
}

interface Asset { id: number; name: string; size: number; state: string }
interface Release { id: number; tag_name: string; draft: boolean; prerelease: boolean; assets: Asset[]; html_url: string; body?: string }

export class FakeGitHub {
  tag: string | null = null;
  remoteManifest = structuredClone(manifest);
  merged = true;
  changedFiles: { filename: string; previous_filename?: string }[] = [];
  privateRepository = false;
  releases: Release[] = [];
  writes: { method: string; endpoint: string; body: unknown }[] = [];
  uploads: string[] = [];
  contents = new Map<number, Buffer>();
  failUpload: string | undefined;
  missingUploadState = false;

  async get(endpoint: string): Promise<unknown> {
    if (endpoint === 'repos/Luis85/describe') return { full_name: 'Luis85/describe', private: this.privateRepository, default_branch: 'main' };
    if (endpoint.includes('/commits/')) return { sha: 'b'.repeat(40) };
    if (endpoint.includes('/compare/')) return { merge_base_commit: { sha: this.merged ? source : 'c'.repeat(40) }, files: this.changedFiles };
    if (endpoint.includes('/contents/')) return { encoding: 'base64', content: Buffer.from(JSON.stringify(this.remoteManifest)).toString('base64') };
    if (endpoint.includes('/git/ref/')) return this.tag ? { object: { type: 'commit', sha: this.tag } } : null;
    if (endpoint.includes('/releases?')) return this.releases;
    if (endpoint.includes('/releases/')) return this.releases.find(release => endpoint.endsWith(`/${release.id}`));
    throw new Error(`Unexpected endpoint: ${endpoint}`);
  }

  async send(method: string, endpoint: string, body: Record<string, unknown>): Promise<unknown> {
    this.writes.push({ method, endpoint, body });
    if (endpoint.endsWith('/git/refs')) { this.tag = String(body.sha); return {}; }
    if (method === 'POST' && endpoint.endsWith('/releases')) {
      const release: Release = { id: 1, tag_name: String(body.tag_name), draft: true, prerelease: false, assets: [], html_url: 'https://github.com/Luis85/describe/releases/tag/1.0.0' };
      this.releases.push(release); return release;
    }
    if (method === 'PATCH') {
      const release = this.releases[0];
      if (!release) throw new Error('Missing fake release.');
      release.draft = Boolean(body.draft); release.body = String(body.body);
      return release;
    }
    throw new Error(`Unexpected mutation: ${endpoint}`);
  }

  async download(id: number): Promise<Buffer> {
    const content = this.contents.get(id);
    if (!content) throw new Error('Missing fake asset.');
    return content;
  }

  async upload(_version: string, filename: string): Promise<void> {
    const name = path.basename(filename);
    if (name === this.failUpload) throw new Error('Simulated upload interruption.');
    const release = this.releases[0];
    if (!release) throw new Error('Missing fake release.');
    const content = await readFile(filename);
    const id = this.contents.size + 1;
    this.contents.set(id, content);
    release.assets.push({ id, name, size: content.length, state: this.missingUploadState ? 'starter' : 'uploaded' });
    this.uploads.push(name);
  }
}
