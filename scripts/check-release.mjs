import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const read = async file => JSON.parse(await readFile(file, 'utf8'));
const manifest = await read('manifest.json');
const pkg = await read('package.json');
const versions = await read('versions.json');
assert.match(manifest.id, /^[a-z0-9-]+$/u);
assert.match(manifest.version, /^\d+\.\d+\.\d+$/u);
assert.equal(manifest.version, pkg.version);
assert.equal(manifest.minAppVersion, '1.13.7');
assert.equal(versions[manifest.version], manifest.minAppVersion);
assert.equal(manifest.isDesktopOnly, false);
assert.ok(manifest.name && manifest.author && manifest.description);
assert.deepEqual(await read('dist/manifest.json'), manifest);
const bundle = await readFile('dist/main.js', 'utf8');
assert.ok(bundle.length > 500);
assert.ok((await readFile('dist/styles.css', 'utf8')).length > 0);
const module = { exports: {} };
class HostClass {}
const host = new Proxy({}, { get: () => HostClass });
vm.runInNewContext(bundle, {
  module, exports: module.exports,
  require(id) { assert.equal(id, 'obsidian', `Unexpected runtime dependency: ${id}`); return host; },
}, { timeout: 1000 });
assert.equal(typeof module.exports, 'function', 'Obsidian requires a directly exported CommonJS plugin class.');
console.log(`Release contract valid: ${manifest.id} ${manifest.version}, desktop and mobile.`);
