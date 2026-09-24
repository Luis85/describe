import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { json, readJson, stableVersion } from './release-contract.mjs';

const { version } = await readJson('package.json');
stableVersion(version);
const manifest = await readJson('manifest.json');
const versions = await readJson('versions.json');
assert.ok(!versions[version] || versions[version] === manifest.minAppVersion, 'Do not rewrite an existing compatibility entry.');
manifest.version = version;
versions[version] = manifest.minAppVersion;
for (const [file, value] of [['manifest.json', manifest], ['versions.json', versions]]) await writeFile(file, json(value));
