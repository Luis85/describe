import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PLUGIN_ASSETS, verifyPackage } from './release-contract.mjs';

const original = path.resolve('reports/release/package');
const downloaded = path.resolve('reports/artifact-roundtrip/reports/release/package');
const expected = await verifyPackage(original);
const actual = await verifyPackage(downloaded);
assert.deepEqual(actual, expected, 'Downloaded release metadata must match the reviewed package.');
for (const name of [...PLUGIN_ASSETS, 'SHA256SUMS', 'release-metadata.json']) {
  assert.deepEqual(await readFile(path.join(downloaded, name)), await readFile(path.join(original, name)), `${name} changed during artifact transfer.`);
}
console.log('Artifact v8 download and all five release-package files verified byte-for-byte. No release was created.');
