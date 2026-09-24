import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

interface Package {
  version: string;
  engines: { node: string };
  devDependencies: Record<string, string>;
}
interface Lock { packages: Record<string, { version?: string; devDependencies?: Record<string, string> }> }
interface EffectiveLintConfig { rules: Record<string, unknown> }
const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as Package;
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8')) as Lock;
const nodeRequire = createRequire(path.resolve('package.json'));
const baseline = readFileSync('.nvmrc', 'utf8').trim();
const installedVersion = (name: string): string => {
  const file = nodeRequire.resolve(`${name}/package.json`);
  return (JSON.parse(readFileSync(file, 'utf8')) as { version: string }).version;
};

describe('post-migration toolchain contracts', () => {
  it('aligns root Node declarations with the minimum supported runtime major', () => {
    expect(baseline).toMatch(/^\d+$/u);
    expect(pkg.engines.node.startsWith(`^${baseline}.`)).toBe(true);
    expect(installedVersion('@types/node').split('.')[0]).toBe(baseline);
  });

  it.each(['eslint', '@types/node'])('keeps %s exact, locked and installed consistently', name => {
    const declared = pkg.devDependencies[name];
    expect(declared).toMatch(/^\d+\.\d+\.\d+$/u);
    expect(installedVersion(name)).toBe(declared);
    expect(lock.packages['']?.devDependencies?.[name]).toBe(declared);
    expect(lock.packages[`node_modules/${name}`]?.version).toBe(declared);
  });

  it('loads the intended root ESLint rather than an upstream nested compatibility copy', () => {
    expect(ESLint.version).toBe(pkg.devDependencies.eslint);
    expect(ESLint.version).toMatch(/^10\./u);
  });

  it('keeps source and native-test LOC and mobile import boundaries active under ESLint 10', { timeout: 15_000 }, async () => {
    const linter = new ESLint();
    const source = await linter.calculateConfigForFile('src/main.ts') as EffectiveLintConfig;
    const native = await linter.calculateConfigForFile('tests/e2e/vitest.config.mts') as EffectiveLintConfig;
    expect(source.rules['max-lines']).toEqual([2, { max: 400, skipBlankLines: true, skipComments: true }]);
    expect(native.rules['max-lines']).toEqual([2, { max: 450, skipBlankLines: true, skipComments: true }]);
    expect(source.rules['obsidianmd/no-nodejs-modules']).toEqual([2]);
    expect(native.rules['obsidianmd/no-nodejs-modules']).toEqual([0]);
  });
});
