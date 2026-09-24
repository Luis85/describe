import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { beforeEach, describe, it } from 'mocha';
import { browser, expect } from '@wdio/globals';
import { obsidianPage } from 'wdio-obsidian-service';
import { AxeBuilder } from '@axe-core/webdriverio';
import { choose, field, fill, frontmatter, modal, save, settings } from './helpers';

beforeEach(async () => {
  // A fresh copied vault resets both notes AND plugin settings, unlike resetVault alone.
  await browser.reloadObsidian({ vault: path.resolve('tests/e2e/vault'), copy: true });
});

describe('Describe in the real Obsidian host', () => {
  it('registers one native menu action and cancels without side effects', async () => {
    await obsidianPage.disablePlugin('describe');
    await obsidianPage.enablePlugin('describe');
    await browser.executeObsidian(({ app, obsidian }) => {
      const file = app.vault.getFileByPath('Assets/reference.svg');
      if (!file) throw new Error('Fixture missing.');
      const menu = new obsidian.Menu();
      app.workspace.trigger('file-menu', menu, file, 'file-explorer');
      menu.showAtPosition({ x: 40, y: 40 });
    });
    const entries = browser.$$('.menu-item-title=Describe!');
    await expect(entries).toBeElementsArrayOfSize(1);
    await browser.$('.menu-item-title=Describe!').click();
    await expect(modal()).toBeDisplayed();
    await browser.$('.describe-modal button=Cancel').click();
    assert.deepEqual((await settings()).extensionPaths, {});
    assert.equal(await browser.executeObsidian(({ app }) => app.vault.getFolderByPath('Descriptions') !== null), false);
  });

  it('saves arbitrary-extension metadata using the real YAML parser', async () => {
    const original = await obsidianPage.read('Assets/sample.custom');
    await choose('Assets/sample.custom');
    await fill();
    await browser.$('.describe-metadata summary').click();
    await field('Tags').setValue('#home home project/kitchen');
    await field('Category').setValue('Reference');
    await field('Color hex value').setValue('#AABBCC');
    await field('Aliases').setValue('Kitchen reference\nMendez, Luis');
    const note = await save('Descriptions/Native description.md');
    assert.deepEqual(await frontmatter('Descriptions/Native description.md'), {
      type: 'ItemDescription', source: '[[Assets/sample.custom]]', name: 'Native description',
      extension: 'custom', description: 'A full description from a real host.',
      tags: ['home', 'project/kitchen'], category: 'Reference', color: '#aabbcc', aliases: ['Kitchen reference', 'Mendez, Luis'],
    });
    assert.ok(!note.includes('![['));
    assert.equal(await obsidianPage.read('Assets/sample.custom'), original);
    assert.equal((await settings()).extensionPaths['file:custom'], 'Descriptions');
  });

  it('creates a custom local folder and embeds an image without modifying it', async () => {
    await choose('Assets/reference.svg');
    await fill('Image description');
    await field('Save this description in').selectByAttribute('value', 'subfolder');
    await field('Descriptions subfolder').setValue('Metadata/Descriptions');
    await expect(browser.$('.describe-destination')).toHaveText(expect.stringContaining('Assets/Metadata/Descriptions/Image description.md'));
    const note = await save('Assets/Metadata/Descriptions/Image description.md');
    assert.ok(note.includes('![[Assets/reference.svg]]'));
    const resolved = await browser.executeObsidian(({ app }) =>
      app.metadataCache.getFirstLinkpathDest('Assets/reference.svg', 'Assets/Metadata/Descriptions/Image description.md')?.path);
    assert.equal(resolved, 'Assets/reference.svg');
  });

  it('places folder descriptions inside the selected folder', async () => {
    await choose('Projects/Home');
    await fill('Folder context');
    await field('Save this description in').selectByAttribute('value', 'same-folder');
    const note = await save('Projects/Home/Folder context.md');
    assert.ok(note.includes('[[Projects/Home/]]'));
    assert.equal((await frontmatter('Projects/Home/Folder context.md')).extension, 'folder');
  });

  it('keeps a draft after invalid input and creates collision-safe notes', async () => {
    await choose('Assets/reference.svg');
    await fill('Same name');
    await browser.$('.describe-metadata summary').click();
    await field('Tags').setValue('123');
    await browser.$('.describe-modal button[type="submit"]').click();
    await expect(browser.$('.describe-error')).toHaveText(expect.stringContaining('Invalid tag'));
    await expect(field('Description')).toHaveValue('A full description from a real host.');
    await field('Tags').setValue('valid');
    const original = await save('Descriptions/Same name.md');
    await choose('Assets/reference.svg');
    await fill('Same name', 'Second note.');
    await save('Descriptions/Same name (2).md');
    assert.equal(await obsidianPage.read('Descriptions/Same name.md'), original);
  });

  it('remembers first-use routing across a real plugin reload', async () => {
    await choose('Assets/reference.svg');
    await fill('First');
    await field('Default folder for this file type').setValue('Image notes');
    await save('Image notes/First.md');
    await obsidianPage.disablePlugin('describe');
    await obsidianPage.enablePlugin('describe');
    await choose('Assets/reference.svg');
    await expect(browser.$('.describe-first-use')).not.toExist();
    await expect(browser.$('.describe-destination')).toHaveText(expect.stringContaining('Image notes/reference.md'));
  });

  it('renders native declarative settings rather than a mocked settings tab', async () => {
    await browser.executeObsidianCommand('app:open-settings');
    await browser.$('.vertical-tab-nav-item=Describe').click();
    const subfolder = browser.$('//div[contains(@class,"setting-item")][.//div[text()="Descriptions subfolder"]]//input');
    await subfolder.setValue('Context');
    await browser.keys('Tab');
    await browser.waitUntil(async () => (await settings()).subfolder === 'Context');
    await browser.keys('Escape');
    await choose('Assets/reference.svg');
    await field('Save this description in').selectByAttribute('value', 'subfolder');
    await expect(field('Descriptions subfolder')).toHaveValue('Context');
  });

  it('has no automated WCAG A/AA violations or horizontal modal overflow', async () => {
    await choose('Assets/reference.svg');
    await browser.$('.describe-metadata summary').click();
    const result = await new AxeBuilder({ client: browser }).include('.describe-modal')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    await writeFile('reports/native/accessibility.json', JSON.stringify(result, null, 2));
    assert.deepEqual(result.violations.map(violation => ({ id: violation.id, nodes: violation.nodes.map(node => node.target) })), []);
    const fits = await browser.execute(() => {
      const element = document.querySelector<HTMLElement>('.describe-modal');
      return element !== null && element.scrollWidth <= element.clientWidth + 1;
    });
    assert.equal(fits, true);
  });
});
