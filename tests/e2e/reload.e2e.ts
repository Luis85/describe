import path from 'node:path';
import { beforeEach, describe, it } from 'mocha';
import { browser, expect } from '@wdio/globals';
import { obsidianPage } from 'wdio-obsidian-service';
import { choose, field, fill, save } from './helpers';

beforeEach(async () => {
  await browser.reloadObsidian({ vault: path.resolve('tests/e2e/vault'), copy: true });
});

describe('routing persistence across a real host reload', () => {
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
});
