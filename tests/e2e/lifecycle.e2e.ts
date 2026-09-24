import { existsSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { createNativeSession, type NativeBrowser } from './session';
import { withSession } from '../support/session-lifecycle';
import { caseDirectory, writeEvidence } from './diagnostics';

function ownedResources(browser: NativeBrowser) {
  const args = browser.requestedCapabilities['goog:chromeOptions']?.args ?? [];
  const config = args.find(value => value.startsWith('--user-data-dir='))?.slice('--user-data-dir='.length);
  if (!config) throw new Error('The service did not expose its owned configuration directory.');
  return { vault: browser.getVaultPath(), config, driver: `http://${browser.options.hostname}:${browser.options.port}/status` };
}

async function assertReleased(resources: ReturnType<typeof ownedResources>): Promise<void> {
  expect(existsSync(resources.vault)).toBe(false);
  expect(existsSync(resources.config)).toBe(false);
  await expect.poll(async () => {
    try { await fetch(resources.driver, { signal: AbortSignal.timeout(1_000) }); return false; }
    catch { return true; }
  }, { timeout: 10_000, interval: 100 }).toBe(true);
}

describe('actual standalone session failure cleanup', () => {
  test('releases the app, driver and copied directories after a test body rejects', async ({ task }) => {
    let resources: ReturnType<typeof ownedResources> | undefined;
    const session = createNativeSession();
    await expect(withSession(session, async browser => {
      resources = ownedResources(browser);
      throw new Error('Intentional native body failure');
    })).rejects.toThrow('Intentional native body failure');
    expect(resources).toBeDefined();
    if (!resources) throw new Error('The real session never started.');
    await assertReleased(resources);
    await session.close(); // idempotence after a real failed operation
    await writeEvidence(await caseDirectory(task.id, task.name), 'cleanup', { passed: true, phase: 'body' });
  });

  test('releases an acquired real session when final initialization rejects', async ({ task }) => {
    let resources: ReturnType<typeof ownedResources> | undefined;
    const session = createNativeSession(async browser => {
      resources = ownedResources(browser);
      throw new Error('Intentional native readiness failure');
    });
    await expect(session.start()).rejects.toThrow('Intentional native readiness failure');
    expect(resources).toBeDefined();
    if (!resources) throw new Error('The real session was not acquired.');
    await assertReleased(resources);
    await session.close();
    await writeEvidence(await caseDirectory(task.id, task.name), 'cleanup', { passed: true, phase: 'initialization' });
  });
});
