import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { browser } from '@wdio/globals';

const appVersion = process.env.OBSIDIAN_VERSION ?? '1.13.7';
const emulateMobile = process.env.OBSIDIAN_UI === 'mobile-emulation';
const output = path.resolve('reports/native');

export const config: WebdriverIO.Config = {
  runner: 'local', framework: 'mocha', injectGlobals: false,
  specs: [path.resolve('tests/e2e/**/*.e2e.ts')], maxInstances: 1,
  capabilities: [{
    browserName: 'obsidian',
    'wdio:obsidianOptions': {
      appVersion, installerVersion: 'latest',
      plugins: [path.resolve('dist')], vault: path.resolve('tests/e2e/vault'), emulateMobile,
    },
    ...(emulateMobile ? { 'goog:chromeOptions': {
      mobileEmulation: { deviceMetrics: { width: 390, height: 844, touch: false } },
    } } : {}),
  }],
  services: ['obsidian'], reporters: ['obsidian'],
  cacheDir: path.resolve('.obsidian-cache'), outputDir: output,
  mochaOpts: { ui: 'bdd', timeout: 90_000, retries: 0 },
  waitforTimeout: 10_000, waitforInterval: 100,
  logLevel: 'warn',
  async before() {
    await mkdir(output, { recursive: true });
    await writeFile(path.join(output, 'environment.json'), JSON.stringify({
      appVersion: browser.getObsidianVersion(), installerVersion: browser.getObsidianInstallerVersion(),
      platform: process.platform, ui: emulateMobile ? 'desktop mobile emulation, NOT a device test' : 'desktop',
      commit: process.env.GITHUB_SHA ?? 'local',
    }, null, 2));
  },
  async afterTest(test, _context, result) {
    if (result.passed) return;
    const name = test.title.replace(/[^a-z0-9]+/giu, '-').slice(0, 100);
    await browser.saveScreenshot(path.join(output, `${name}.png`));
    await writeFile(path.join(output, `${name}.html`), await browser.getPageSource());
  },
};
