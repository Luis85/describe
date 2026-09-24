import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const required = [
  'registers one native menu action and cancels without side effects',
  'saves arbitrary-extension metadata using the real YAML parser',
  'creates a custom local folder and embeds an image without modifying it',
  'places folder descriptions inside the selected folder',
  'keeps a draft after invalid input and creates collision-safe notes',
  'renders and persists native declarative settings in the host settings window',
  'has no automated WCAG A/AA violations or horizontal modal overflow',
  'remembers first-use routing across a real plugin reload',
  'releases the app, driver and copied directories after a test body rejects',
  'releases an acquired real session when final initialization rejects',
];
const script = path.resolve('scripts/check-native-results.mjs');
const roots: string[] = [];
const successful = () => ({ success: true, testResults: [{ assertionResults: required.map(title => ({ title, status: 'passed' })) }] });

afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

async function runGate(report: unknown) {
  const root = await mkdtemp(path.join(tmpdir(), 'describe-native-result-')); roots.push(root);
  await mkdir(path.join(root, 'reports/native'), { recursive: true });
  if (report !== undefined) await writeFile(path.join(root, 'reports/native/vitest-results.json'), JSON.stringify(report));
  const result = spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8', timeout: 10_000 });
  expect(result.error).toBeUndefined();
  return result;
}

describe('executed native acceptance gate', () => {
  it('accepts all eight product and two cleanup scenarios when executed successfully', async () => {
    const result = await runGate(successful());
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('10 executed native Vitest cases');
  });

  it.each(['skipped', 'pending', 'failed', 'todo'])('rejects a %s scenario even with an overall success flag', async status => {
    const report = successful();
    const first = report.testResults[0]?.assertionResults[0];
    if (!first) throw new Error('Missing test fixture.');
    first.status = status;
    expect((await runGate(report)).status).toBe(1);
  });

  it('rejects a missing scenario even when a different passing case keeps the count unchanged', async () => {
    const report = successful();
    const first = report.testResults[0]?.assertionResults[0];
    if (!first) throw new Error('Missing test fixture.');
    first.title = 'Unrelated passing test';
    expect((await runGate(report)).status).toBe(1);
  });

  it('rejects duplicate required scenario execution', async () => {
    const report = successful();
    report.testResults[0]?.assertionResults.push({ title: required[0] ?? '', status: 'passed' });
    expect((await runGate(report)).status).toBe(1);
  });

  it('rejects an overall failure despite all listed assertions passing', async () => {
    expect((await runGate({ ...successful(), success: false })).status).toBe(1);
  });

  it.each([undefined, {}, { success: true, testResults: [] }])('fails closed on absent or incomplete reports: %j', async report => {
    expect((await runGate(report)).status).toBe(1);
  });
});
