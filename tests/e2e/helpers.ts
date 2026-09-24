import { expect } from 'vitest';
import type { NativeBrowser } from './session';

export function createDescriptionPage(browser: NativeBrowser) {
  const modal = () => browser.$('.describe-modal');
  const field = (label: string) => browser.$(`.describe-modal [aria-label=${JSON.stringify(label)}]`);
  const page = browser.getObsidianPage();
  return {
    modal, field,
    async choose(path: string): Promise<void> {
      await browser.executeObsidianCommand('describe:choose-item');
      await browser.$('.prompt-input').setValue(path);
      await expect.poll(() => browser.$('.suggestion-item').getText()).toContain(path);
      await browser.keys('Enter');
      await expect.poll(() => modal().isDisplayed()).toBe(true);
    },
    async fill(name = 'Native description', description = 'A full description from a real host.'): Promise<void> {
      await field('Name').setValue(name);
      await field('Description').setValue(description);
    },
    async save(path: string): Promise<string> {
      await browser.$('.describe-modal button[type="submit"]').click();
      await expect.poll(() => modal().isExisting()).toBe(false);
      await expect.poll(() => browser.executeObsidian(({ app }, target) => app.vault.getFileByPath(target) !== null, path)).toBe(true);
      return page.read(path);
    },
    async frontmatter(path: string): Promise<Record<string, unknown>> {
      return browser.executeObsidian(async ({ app, obsidian }, target) => {
        const file = app.vault.getFileByPath(target);
        if (!file) throw new Error('Expected note was not created.');
        const header = (await app.vault.read(file)).split('---\n')[1];
        if (!header) throw new Error('Expected YAML frontmatter.');
        return obsidian.parseYaml(header) as Record<string, unknown>;
      }, path);
    },
    async settings(): Promise<{ extensionPaths: Record<string, string>; subfolder?: string }> {
      return browser.executeObsidian(async ({ app }) => {
        const path = `${app.vault.configDir}/plugins/describe/data.json`;
        if (!await app.vault.adapter.exists(path)) return { extensionPaths: {} };
        return JSON.parse(await app.vault.adapter.read(path)) as { extensionPaths: Record<string, string>; subfolder?: string };
      });
    },
    async openSettings(): Promise<{ mainWindow: string; settingsWindow: string }> {
      const mainWindow = await browser.getWindowHandle();
      await browser.executeObsidianCommand('app:open-settings');
      let settingsWindow = mainWindow;
      await expect.poll(async () => {
        for (const handle of await browser.getWindowHandles()) {
          await browser.switchToWindow(handle);
          if (await browser.$('.vertical-tab-nav-item=Describe').isExisting()) {
            settingsWindow = handle;
            return true;
          }
        }
        return false;
      }).toBe(true);
      await browser.$('.vertical-tab-nav-item=Describe').click();
      return { mainWindow, settingsWindow };
    },
    async closeSettings(windows: { mainWindow: string; settingsWindow: string }): Promise<void> {
      await browser.switchToWindow(windows.settingsWindow);
      if (windows.settingsWindow === windows.mainWindow) {
        await browser.keys('Escape');
        await expect.poll(() => browser.$('.vertical-tab-nav-item=Describe').isExisting()).toBe(false);
      } else await browser.closeWindow();
      await browser.switchToWindow(windows.mainWindow);
    },
  };
}
