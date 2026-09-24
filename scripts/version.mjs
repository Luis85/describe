import { readFile, writeFile } from 'node:fs/promises';
const read = async file => JSON.parse(await readFile(file, 'utf8'));
const { version } = await read('package.json');
if (!/^\d+\.\d+\.\d+$/u.test(version)) throw new Error('Use an unprefixed stable semantic version.');
const manifest = await read('manifest.json');
manifest.version = version;
const versions = await read('versions.json');
versions[version] = manifest.minAppVersion;
for (const [file, value] of [['manifest.json', manifest], ['versions.json', versions]]) {
  await writeFile(file, JSON.stringify(value, null, 2) + '\n');
}
