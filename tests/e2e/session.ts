import path from 'node:path';
import { remote } from 'webdriverio';
import ObsidianWorkerService, { launcher, type startWdioSession } from 'wdio-obsidian-service';
import { SessionLifecycle } from '../support/session-lifecycle';

export type NativeBrowser = Awaited<ReturnType<typeof startWdioSession>>;
type SessionConfig = Parameters<typeof startWdioSession>[0];

export const requestedVersion = process.env.OBSIDIAN_VERSION ?? '1.13.7';
export const mobileEmulation = process.env.OBSIDIAN_UI === 'mobile-emulation';

export function createNativeSession(afterReady: (browser: NativeBrowser) => Promise<void> = async () => undefined): SessionLifecycle<NativeBrowser> {
  const capabilities: WebdriverIO.Capabilities = {
    browserName: 'obsidian',
    'wdio:obsidianOptions': {
      appVersion: requestedVersion, installerVersion: 'latest',
      plugins: [path.resolve('dist')], vault: path.resolve('tests/e2e/vault'),
      copy: true, emulateMobile: mobileEmulation,
    },
    ...(mobileEmulation ? { 'goog:chromeOptions': {
      mobileEmulation: { deviceMetrics: { width: 390, height: 844, touch: false } },
    } } : {}),
  };
  const config: SessionConfig = {
    capabilities, cacheDir: path.resolve('.obsidian-cache'),
    logLevel: 'warn', waitforTimeout: 10_000, waitforInterval: 100,
    connectionRetryTimeout: 30_000, connectionRetryCount: 0,
  };
  // Same setup sequence as startWdioSession(), but retain the service to call
  // afterSession() on success AND partial failure. These exported lifecycle hooks
  // are an explicitly version-pinned integration seam, not a Vitest WDIO adapter.
  const preparation = new launcher({}, capabilities, config);
  const worker = new ObsidianWorkerService({}, capabilities, config);
  return new SessionLifecycle({
    async prepare() {
      await preparation.onPrepare(config, [capabilities]);
      await worker.beforeSession(config, capabilities);
    },
    connect: () => remote(config),
    async initialize(browser) {
      await worker.before(capabilities, [], browser);
      await afterReady(browser);
    },
    disconnect: browser => browser.deleteSession(),
    cleanup: () => worker.afterSession(),
  });
}
