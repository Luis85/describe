import { browser, expect } from '@wdio/globals';
import { obsidianPage } from 'wdio-obsidian-service';

export const modal = () => browser.$('.describe-modal');
export const field = (label: string) => browser.$(`.describe-modal [aria-label="${label}"]`);

export async function choose(path: string): Promise<void> {
  await browser.executeObsidianCommand('describe:choose-item');
  await browser.$('.prompt-input').setValue(path);
  await expect(browser.$('.suggestion-item')).toHaveText(expect.stringContaining(path));
  await browser.keys('Enter');
  await expect(modal()).toBeDisplayed();
}

export async function fill(name = 'Native description', description = 'A full description from a real host.'): Promise<void> {
  await field('Name').setValue(name);
  await field('Description').setValue(description);
}

export async function save(path: string): Promise<string> {
  await browser.$('.describe-modal button[type="submit"]').click();
  await expect(modal()).not.toExist();
  await browser.waitUntil(() => browser.executeObsidian(({ app }, target) => app.vault.getFileByPath(target) !== null, path));
  return obsidianPage.read(path);
}

export async function frontmatter(path: string): Promise<Record<string, unknown>> {
  return browser.executeObsidian(async ({ app, obsidian }, target) => {
    const file = app.vault.getFileByPath(target);
    if (!file) throw new Error('Expected note was not created.');
    const text = await app.vault.read(file);
    const header = text.split('---\n')[1];
    if (!header) throw new Error('Expected YAML frontmatter.');
    return obsidian.parseYaml(header) as Record<string, unknown>;
  }, path);
}

export async function settings(): Promise<{ extensionPaths: Record<string, string>; subfolder?: string }> {
  return browser.executeObsidian(async ({ app }) => {
    const path = `${app.vault.configDir}/plugins/describe/data.json`;
    if (!await app.vault.adapter.exists(path)) return { extensionPaths: {} };
    return JSON.parse(await app.vault.adapter.read(path)) as { extensionPaths: Record<string, string>; subfolder?: string };
  });
}

export async function openDescribeSettings(): Promise<{ mainWindow: string; settingsWindow: string }> {
  const mainWindow = await browser.getWindowHandle();
  await browser.executeObsidianCommand('app:open-settings');
  let settingsWindow = mainWindow;
  // Desktop can open a separate host window; mobile emulation uses an in-window sheet.
  await browser.waitUntil(async () => {
    for (const handle of await browser.getWindowHandles()) {
      await browser.switchToWindow(handle);
      if (await browser.$('.vertical-tab-nav-item=Describe').isExisting()) {
        settingsWindow = handle;
        return true;
      }
    }
    return false;
  }, { timeoutMsg: 'The native Describe settings navigation did not appear in any host window.' });
  await browser.$('.vertical-tab-nav-item=Describe').click();
  return { mainWindow, settingsWindow };
}

export async function closeSettings(windows: { mainWindow: string; settingsWindow: string }): Promise<void> {
  await browser.switchToWindow(windows.settingsWindow);
  if (windows.settingsWindow === windows.mainWindow) {
    await browser.keys('Escape');
    await expect(browser.$('.vertical-tab-nav-item=Describe')).not.toExist();
  } else await browser.closeWindow();
  await browser.switchToWindow(windows.mainWindow);
}
