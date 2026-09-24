import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

interface Package { version: string; devDependencies: Record<string, string>; engines: Record<string, string> }
interface Group { patterns?: string[]; 'update-types'?: string[] }
interface Update {
  'package-ecosystem': string;
  'open-pull-requests-limit': number;
  groups: Record<string, Group>;
  ignore?: Array<{ 'dependency-name': string; versions?: string[] }>;
}
interface Step { uses?: string; run?: string; with?: Record<string, unknown> }
interface Workflow { jobs: Record<string, { steps?: Step[] }> }
const nodeRequire = createRequire(path.resolve('package.json'));
const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as Package;
const readPackage = (file: string): Package => JSON.parse(readFileSync(file, 'utf8')) as Package;
const readWorkflow = (name: string): Workflow => parse(readFileSync(`.github/workflows/${name}.yml`, 'utf8')) as Workflow;
const updates = (parse(readFileSync('.github/dependabot.yml', 'utf8')) as { updates: Update[] }).updates;

describe('dependency compatibility and update policy', () => {
  it('uses the same Mocha instance in native tests and the installed WebdriverIO adapter', () => {
    const adapterRequire = createRequire(nodeRequire.resolve('@wdio/mocha-framework'));
    expect(adapterRequire.resolve('mocha')).toBe(nodeRequire.resolve('mocha'));
    const resolved = readPackage(adapterRequire.resolve('mocha/package.json'));
    expect(resolved.version).toBe(pkg.devDependencies.mocha);
    // Regression for the executed Mocha 12 failure. Revisit with the adapter migration in #9.
    expect(existsSync(adapterRequire.resolve('mocha/lib/cli/run-helpers.js'))).toBe(true);
  });

  it('keeps the installed Vitest runner and coverage provider at the same version', () => {
    const runner = readPackage(nodeRequire.resolve('vitest/package.json'));
    const coverage = readPackage(nodeRequire.resolve('@vitest/coverage-v8/package.json'));
    expect(runner.version).toBe(coverage.version);
    expect(runner.version).toBe(pkg.devDependencies.vitest);
    expect(coverage.version).toBe(pkg.devDependencies['@vitest/coverage-v8']);
  });

  it('groups routine native and tooling updates without including major migrations', () => {
    const npm = updates.find(update => update['package-ecosystem'] === 'npm');
    expect(npm?.groups['native-testing']?.['update-types']).toEqual(['minor', 'patch']);
    expect(npm?.groups['development-tooling']?.['update-types']).toEqual(['minor', 'patch']);
    expect(npm?.groups.vitest?.patterns).toEqual(['vitest', '@vitest/*']);
    expect(npm?.['open-pull-requests-limit']).toBeGreaterThan(0);
  });

  it('limits compatibility exclusions to the documented Mocha 12 range', () => {
    const ignored = updates.flatMap(update => update.ignore ?? []);
    expect(ignored).toEqual([{ 'dependency-name': 'mocha', versions: ['>=12.0.0 <13.0.0'] }]);
    expect(readFileSync('scripts/audit.mjs', 'utf8')).toContain('--audit-level=moderate');
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
