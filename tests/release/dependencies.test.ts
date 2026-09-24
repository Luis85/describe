import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

interface Package { version: string; devDependencies: Record<string, string>; overrides?: Record<string, string> }
interface Group { patterns?: string[]; 'update-types'?: string[] }
interface Update {
  'package-ecosystem': string;
  'open-pull-requests-limit': number;
  groups: Record<string, Group>;
  ignore?: Array<{ 'dependency-name': string; versions?: string[]; 'update-types'?: string[] }>;
}
interface Step { uses?: string; run?: string; with?: Record<string, unknown> }
interface Workflow { jobs: Record<string, { steps?: Step[] }> }
const nodeRequire = createRequire(path.resolve('package.json'));
const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as Package;
const readPackage = (file: string): Package => JSON.parse(readFileSync(file, 'utf8')) as Package;
const readWorkflow = (name: string): Workflow => parse(readFileSync(`.github/workflows/${name}.yml`, 'utf8')) as Workflow;
const updates = (parse(readFileSync('.github/dependabot.yml', 'utf8')) as { updates: Update[] }).updates;
const retired = ['mocha', '@types/mocha', '@wdio/mocha-framework', '@wdio/cli', '@wdio/local-runner', '@wdio/spec-reporter', 'wdio-obsidian-reporter'];

describe('dependency compatibility and update policy', () => {
  it('removes the Mocha runner and adapters from the entire locked graph', () => {
    const lock = JSON.parse(readFileSync('package-lock.json', 'utf8')) as { packages: Record<string, unknown> };
    for (const name of retired) {
      expect(pkg.devDependencies[name]).toBeUndefined();
      expect(Object.keys(lock.packages).some(key => key.endsWith(`node_modules/${name}`))).toBe(false);
      expect(() => nodeRequire.resolve(`${name}/package.json`)).toThrow();
    }
    expect(pkg.overrides?.['serialize-javascript']).toBeUndefined();
  });

  it('keeps the installed Vitest runner and coverage provider at the same version', () => {
    const runner = readPackage(nodeRequire.resolve('vitest/package.json'));
    const coverage = readPackage(nodeRequire.resolve('@vitest/coverage-v8/package.json'));
    expect(runner.version).toBe(coverage.version);
    expect(runner.version).toBe(pkg.devDependencies.vitest);
    expect(coverage.version).toBe(pkg.devDependencies['@vitest/coverage-v8']);
  });

  it('groups routine updates and limits the only major hold to baseline Node typings', () => {
    const npm = updates.find(update => update['package-ecosystem'] === 'npm');
    expect(npm?.groups['native-testing']?.['update-types']).toEqual(['minor', 'patch']);
    expect(npm?.groups['development-tooling']?.['update-types']).toEqual(['minor', 'patch']);
    expect(npm?.groups.vitest?.patterns).toEqual(['vitest', '@vitest/*']);
    expect(npm?.['open-pull-requests-limit']).toBeGreaterThan(0);
    expect(updates.flatMap(update => update.ignore ?? [])).toEqual([
      { 'dependency-name': '@types/node', 'update-types': ['version-update:semver-major'] },
    ]);
    expect(readFileSync('scripts/audit.mjs', 'utf8')).toContain('--audit-level=moderate');
  });

  it('executes native tests through isolated Node Vitest without WDIO globals or a mocked host', () => {
    const config = readFileSync('tests/e2e/vitest.config.mts', 'utf8');
    expect(config).toContain("environment: 'node'");
    expect(config).toContain('fileParallelism: false');
    expect(config).toContain('passWithNoTests: false');
    expect(config).not.toMatch(/alias\s*:/u);
    expect(readFileSync('scripts/native-tests.mjs', 'utf8')).toContain("run('vitest'");
    for (const file of readdirSync('tests/e2e').filter(name => /\.(?:ts|mts)$/u.test(name))) {
      expect(readFileSync(`tests/e2e/${file}`, 'utf8')).not.toMatch(/from ['"](?:mocha|@wdio\/globals)['"]/u);
    }
  });

  it('executes the same pinned artifact downloader in CI and release with strict digests', () => {
    const download = (name: string): Step | undefined => Object.values(readWorkflow(name).jobs)
      .flatMap(job => job.steps ?? []).find(step => step.uses?.startsWith('actions/download-artifact@'));
    const ci = download('ci');
    const release = download('release');
    expect(ci).toBeDefined();
    expect(ci?.uses).toBe(release?.uses);
    expect(ci?.uses).toMatch(/@[a-f0-9]{40}$/u);
    expect(ci?.with?.['digest-mismatch']).toBe('error');
    expect(release?.with?.['digest-mismatch']).toBe('error');
    expect(readWorkflow('ci').jobs.verify?.steps?.some(step => step.run === 'node scripts/check-artifact-roundtrip.mjs')).toBe(true);
  });
});
