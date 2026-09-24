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
