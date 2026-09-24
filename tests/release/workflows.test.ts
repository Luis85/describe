import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

interface Step { uses?: string; run?: string; with?: Record<string, unknown> }
interface Job { needs?: string[]; uses?: string; if?: string; environment?: string; permissions?: Record<string, string>; steps?: Step[] }
interface Workflow { on: Record<string, unknown>; permissions: Record<string, string>; concurrency?: { 'cancel-in-progress': boolean | string }; jobs: Record<string, Job> }
const workflow = (file: string): Workflow => parse(readFileSync(`.github/workflows/${file}.yml`, 'utf8')) as Workflow;

describe('release workflow safety contracts', () => {
  it('requires quality and native acceptance before a privileged distribution job', () => {
    const value = workflow('release');
    expect(value.permissions).toEqual({ contents: 'read' });
    expect(value.jobs.distribute?.needs).toEqual(['plan', 'quality', 'native']);
    expect(value.jobs.distribute?.permissions).toEqual({ contents: 'write' });
    expect(value.jobs.distribute?.environment).toBe('obsidian-release');
    expect(value.jobs.distribute?.if).toContain("!= 'check'");
    expect(value.concurrency?.['cancel-in-progress']).toBe(false);
  });
  it('does not install dependencies or rebuild in the write-token job', () => {
    const steps = workflow('release').jobs.distribute?.steps ?? [];
    expect(steps.some(step => step.run?.includes('release.mjs execute'))).toBe(true);
    expect(steps.some(step => /npm|test:e2e|build\.mjs/u.test(step.run ?? ''))).toBe(false);
  });
  it('pins external actions and does not interpolate inputs into shell commands', () => {
    for (const name of ['release', 'prepare-release', 'ci', 'native']) {
      for (const job of Object.values(workflow(name).jobs)) for (const step of job.steps ?? []) {
        if (step.uses) expect(step.uses).toMatch(/^actions\/[a-z-]+@[a-f0-9]{40}$/u);
        expect(step.run ?? '').not.toMatch(/\$\{\{\s*inputs\./u);
        if (step.uses?.startsWith('actions/checkout@')) expect(step.with?.['persist-credentials']).toBe(false);
      }
    }
  });
  it('reuses the regular quality and native suites instead of omitting them on release', () => {
    expect(workflow('release').jobs.quality?.uses).toBe('./.github/workflows/ci.yml');
    expect(workflow('release').jobs.native?.uses).toBe('./.github/workflows/native.yml');
    expect(workflow('ci').on).toHaveProperty('workflow_call');
    expect(workflow('native').on).toHaveProperty('workflow_call');
  });
  it('only runs preparation when deliberately dispatched', () => {
    expect(Object.keys(workflow('prepare-release').on)).toEqual(['workflow_dispatch']);
    expect(workflow('prepare-release').jobs.prepare?.permissions).toEqual({ contents: 'write', 'pull-requests': 'write' });
  });
});
