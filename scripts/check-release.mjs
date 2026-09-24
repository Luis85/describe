import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { readJson, readProject } from './release-contract.mjs';

const { manifest } = await readProject(process.cwd());
assert.deepEqual(await readJson('dist/manifest.json'), manifest);
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
console.log(`Package contract valid: ${manifest.id} ${manifest.version}, desktop and mobile. This is not marketplace approval.`);
