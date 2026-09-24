import { copyFile, lstat, mkdir, mkdtemp, readFile, rename, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import './build.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const manifest = JSON.parse(await readFile(path.join(root, 'manifest.json'), 'utf8'));
if (!/^[a-z0-9-]+$/u.test(manifest.id)) throw new Error('Unsafe plugin ID.');
let target = root;
// Do not follow symlinks out of the project, and never replace vault configuration.
for (const segment of ['.obsidian', 'plugins', manifest.id]) {
  target = path.join(target, segment);
  const info = await lstat(target).catch(error => { if (error.code !== 'ENOENT') throw error; });
  if (info && (!info.isDirectory() || info.isSymbolicLink())) throw new Error(`Unsafe install directory: ${target}`);
  if (!info) await mkdir(target);
}
const stage = await mkdtemp(path.join(target, '.install-'));
try {
  for (const file of ['main.js', 'manifest.json', 'styles.css']) {
    const dest = path.join(target, file);
    const info = await lstat(dest).catch(error => { if (error.code !== 'ENOENT') throw error; });
    if (info && (!info.isFile() || info.isSymbolicLink())) throw new Error(`Unsafe plugin file: ${dest}`);
    await copyFile(path.join(root, 'dist', file), path.join(stage, file));
  }
  for (const file of ['main.js', 'manifest.json', 'styles.css']) await rename(path.join(stage, file), path.join(target, file));
} finally { await rm(stage, { recursive: true, force: true }); }
console.log(`Installed into ${target}. Existing data.json and other vault settings were preserved.`);
console.log('Open this project as an Obsidian vault and enable Describe in Community plugins.');
