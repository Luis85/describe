import assert from 'node:assert/strict';
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repository = fileURLToPath(new URL('..', import.meta.url));
const sandbox = await mkdtemp(path.join(tmpdir(), 'describe-installer-check-'));
const assets = ['main.js', 'manifest.json', 'styles.css'];
const manifest = JSON.parse(await readFile(path.join(repository, 'manifest.json'), 'utf8'));
const destination = fixture => path.join(fixture, '.obsidian', 'plugins', manifest.id);
let passed = 0;

async function fixture(name) {
  const directory = path.join(sandbox, name);
  await mkdir(path.join(directory, 'scripts'), { recursive: true });
  await mkdir(path.join(directory, 'dist'));
  await copyFile(path.join(repository, 'scripts', 'test-build.mjs'), path.join(directory, 'scripts', 'test-build.mjs'));
  // The production build is verified separately. This fixture isolates the exact installer.
  await writeFile(path.join(directory, 'scripts', 'build.mjs'), 'export {};\n');
  await copyFile(path.join(repository, 'manifest.json'), path.join(directory, 'manifest.json'));
  for (const asset of assets) await copyFile(path.join(repository, 'dist', asset), path.join(directory, 'dist', asset));
  return directory;
}

function install(directory, succeeds) {
  const result = spawnSync(process.execPath, [path.join(directory, 'scripts', 'test-build.mjs')], {
    cwd: directory, encoding: 'utf8', timeout: 30_000,
  });
  assert.ifError(result.error);
  assert.equal(result.status === 0, succeeds, `${result.stdout}\n${result.stderr}`);
  return result;
}

async function check(name, operation) {
  await operation();
  passed += 1;
  console.log(`PASS: ${name}`);
}

try {
  await check('fresh install copies exactly the three release assets', async () => {
    const directory = await fixture('fresh');
    install(directory, true);
    assert.deepEqual((await readdir(destination(directory))).sort(), [...assets].sort());
    for (const asset of assets) {
      assert.deepEqual(await readFile(path.join(destination(directory), asset)), await readFile(path.join(directory, 'dist', asset)));
    }
  });

  await check('reinstallation preserves plugin data and unrelated vault settings', async () => {
    const directory = await fixture('preservation');
    install(directory, true);
    await writeFile(path.join(destination(directory), 'data.json'), '{"keep":"plugin data"}');
    await writeFile(path.join(directory, '.obsidian', 'app.json'), '{"keep":"vault settings"}');
    await writeFile(path.join(destination(directory), 'main.js'), 'old plugin asset');
    install(directory, true);
    assert.equal(await readFile(path.join(destination(directory), 'data.json'), 'utf8'), '{"keep":"plugin data"}');
    assert.equal(await readFile(path.join(directory, '.obsidian', 'app.json'), 'utf8'), '{"keep":"vault settings"}');
    assert.deepEqual(await readFile(path.join(destination(directory), 'main.js')), await readFile(path.join(directory, 'dist', 'main.js')));
  });

  await check('an incomplete package leaves the existing assets untouched', async () => {
    const directory = await fixture('incomplete');
    install(directory, true);
    const before = await Promise.all(assets.map(asset => readFile(path.join(destination(directory), asset))));
    await writeFile(path.join(directory, 'dist', 'main.js'), 'must not replace the installed asset');
    await rm(path.join(directory, 'dist', 'styles.css'));
    install(directory, false);
    for (const [index, asset] of assets.entries()) assert.deepEqual(await readFile(path.join(destination(directory), asset)), before[index]);
    assert.equal((await readdir(destination(directory))).some(name => name.startsWith('.install-')), false);
  });

  await check('a file obstructing the vault directory is never replaced', async () => {
    const directory = await fixture('obstruction');
    await writeFile(path.join(directory, '.obsidian'), 'keep this file');
    install(directory, false);
    assert.equal(await readFile(path.join(directory, '.obsidian'), 'utf8'), 'keep this file');
  });

  await check('a linked vault directory cannot redirect writes outside the fixture', async () => {
    const directory = await fixture('linked');
    const outside = path.join(sandbox, 'linked-target');
    await mkdir(outside);
    await writeFile(path.join(outside, 'sentinel.txt'), 'unchanged');
    await symlink(outside, path.join(directory, '.obsidian'), process.platform === 'win32' ? 'junction' : 'dir');
    install(directory, false);
    assert.deepEqual(await readdir(outside), ['sentinel.txt']);
    assert.equal(await readFile(path.join(outside, 'sentinel.txt'), 'utf8'), 'unchanged');
  });

  await check('an unsafe manifest identifier is rejected', async () => {
    const directory = await fixture('identifier');
    await writeFile(path.join(directory, 'manifest.json'), JSON.stringify({ ...manifest, id: '../outside' }));
    install(directory, false);
    assert.equal((await readdir(directory)).includes('.obsidian'), false);
  });

  console.log(`${passed} installer contracts passed. All filesystem mutations were confined to disposable fixtures.`);
} finally {
  await rm(sandbox, { recursive: true, force: true });
}
