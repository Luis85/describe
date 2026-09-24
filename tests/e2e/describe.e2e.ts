import { expect, describe } from 'vitest';
import { AxeBuilder } from '@axe-core/webdriverio';
import { test } from './fixture';
import { writeEvidence } from './diagnostics';

describe('Describe in the real Obsidian host', () => {
  test('registers one native menu action and cancels without side effects', async ({ native: { browser, page, ui } }) => {
    await page.disablePlugin('describe');
    await page.enablePlugin('describe');
    await browser.executeObsidian(({ app, obsidian }) => {
      const file = app.vault.getFileByPath('Assets/reference.svg');
      if (!file) throw new Error('Fixture missing.');
      const menu = new obsidian.Menu();
      app.workspace.trigger('file-menu', menu, file, 'file-explorer');
      menu.showAtPosition({ x: 40, y: 40 });
    });
    await expect.poll(() => browser.$$('.menu-item-title=Describe!').length).toBe(1);
    await browser.$('.menu-item-title=Describe!').click();
    await expect.poll(() => ui.modal().isDisplayed()).toBe(true);
    await ui.modal().$('button=Cancel').click();
    await expect.poll(() => ui.modal().isExisting()).toBe(false);
    expect((await ui.settings()).extensionPaths).toEqual({});
    expect(await browser.executeObsidian(({ app }) => app.vault.getFolderByPath('Descriptions') !== null)).toBe(false);
  });

  test('saves arbitrary-extension metadata using the real YAML parser', async ({ native: { browser, page, ui } }) => {
    const original = await page.read('Assets/sample.custom');
    await ui.choose('Assets/sample.custom');
    await ui.fill();
    await browser.$('.describe-metadata summary').click();
    await ui.field('Tags').setValue('#home home project/kitchen');
    await ui.field('Category').setValue('Reference');
    await ui.field('Color hex value').setValue('#AABBCC');
    await ui.field('Aliases').setValue('Kitchen reference\nMendez, Luis');
    const note = await ui.save('Descriptions/Native description.md');
    expect(await ui.frontmatter('Descriptions/Native description.md')).toEqual({
      type: 'ItemDescription', source: '[[Assets/sample.custom]]', name: 'Native description',
      extension: 'custom', description: 'A full description from a real host.',
      tags: ['home', 'project/kitchen'], category: 'Reference', color: '#aabbcc', aliases: ['Kitchen reference', 'Mendez, Luis'],
    });
    expect(note).not.toContain('![[');
    expect(await page.read('Assets/sample.custom')).toBe(original);
    expect((await ui.settings()).extensionPaths['file:custom']).toBe('Descriptions');
  });

  test('creates a custom local folder and embeds an image without modifying it', async ({ native: { browser, page, ui } }) => {
    const original = await page.read('Assets/reference.svg');
    await ui.choose('Assets/reference.svg');
    await ui.fill('Image description');
    await ui.field('Save this description in').selectByAttribute('value', 'subfolder');
    await ui.field('Descriptions subfolder').setValue('Metadata/Descriptions');
    await expect.poll(() => browser.$('.describe-destination').getText()).toContain('Assets/Metadata/Descriptions/Image description.md');
    expect(await ui.save('Assets/Metadata/Descriptions/Image description.md')).toContain('![[Assets/reference.svg]]');
    expect(await page.read('Assets/reference.svg')).toBe(original);
    expect(await browser.executeObsidian(({ app }) =>
      app.metadataCache.getFirstLinkpathDest('Assets/reference.svg', 'Assets/Metadata/Descriptions/Image description.md')?.path)).toBe('Assets/reference.svg');
  });

  test('places folder descriptions inside the selected folder', async ({ native: { ui } }) => {
    await ui.choose('Projects/Home');
    await ui.fill('Folder context');
    await ui.field('Save this description in').selectByAttribute('value', 'same-folder');
    expect(await ui.save('Projects/Home/Folder context.md')).toContain('[[Projects/Home/]]');
    expect((await ui.frontmatter('Projects/Home/Folder context.md')).extension).toBe('folder');
  });

  test('keeps a draft after invalid input and creates collision-safe notes', async ({ native: { browser, page, ui } }) => {
    await ui.choose('Assets/reference.svg');
    await ui.fill('Same name');
    await browser.$('.describe-metadata summary').click();
    await ui.field('Tags').setValue('123');
    await browser.$('.describe-modal button[type="submit"]').click();
    await expect.poll(() => browser.$('.describe-error').getText()).toContain('Invalid tag');
    expect(await ui.field('Description').getValue()).toBe('A full description from a real host.');
    await ui.field('Tags').setValue('valid');
    const original = await ui.save('Descriptions/Same name.md');
    await ui.choose('Assets/reference.svg');
    await ui.fill('Same name', 'Second note.');
    await ui.save('Descriptions/Same name (2).md');
    expect(await page.read('Descriptions/Same name.md')).toBe(original);
  });

  test('renders and persists native declarative settings in the host settings window', async ({ native: { browser, ui } }) => {
    const windows = await ui.openSettings();
    const row = '//div[contains(concat(" ",normalize-space(@class)," ")," setting-item ")]';
    const subfolder = browser.$(`${row}[.//div[@class="setting-item-name" and normalize-space(.)="Descriptions subfolder"]]//input`);
    await expect.poll(() => subfolder.getValue()).toBe('descriptions');
    await subfolder.setValue('Context');
    await browser.keys('Tab');
    await browser.switchToWindow(windows.mainWindow);
    await expect.poll(async () => (await ui.settings()).subfolder).toBe('Context');
    await ui.closeSettings(windows);
    await ui.choose('Assets/reference.svg');
    await ui.field('Save this description in').selectByAttribute('value', 'subfolder');
    expect(await ui.field('Descriptions subfolder').getValue()).toBe('Context');
  });

  test('has no automated WCAG A/AA violations or horizontal modal overflow', async ({ native: { browser, ui, directory } }) => {
    await ui.choose('Assets/reference.svg');
    await browser.$('.describe-metadata summary').click();
    expect(await ui.modal().$$('iframe').length).toBe(0);
    // Electron lacks window/new. This documented fallback omits cross-origin
    // frames (absent here); no accessibility rules are disabled.
    const result = await new AxeBuilder({ client: browser }).include('.describe-modal').setLegacyMode()
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    await writeEvidence(directory, 'accessibility', result);
    expect(result.violations.map(violation => ({ id: violation.id, nodes: violation.nodes.map(node => node.target) }))).toEqual([]);
    expect(await browser.execute(() => {
      const element = document.querySelector<HTMLElement>('.describe-modal');
      return element !== null && element.scrollWidth <= element.clientWidth + 1;
    })).toBe(true);
  });
});
