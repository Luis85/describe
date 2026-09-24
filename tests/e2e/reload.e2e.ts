import { describe, expect } from 'vitest';
import { test } from './fixture';

describe('routing persistence across a real host reload', () => {
  test('remembers first-use routing across a real plugin reload', async ({ native: { browser, page, ui } }) => {
    await ui.choose('Assets/reference.svg');
    await ui.fill('First');
    await ui.field('Default folder for this file type').setValue('Image notes');
    await ui.save('Image notes/First.md');
    await page.disablePlugin('describe');
    await page.enablePlugin('describe');
    await ui.choose('Assets/reference.svg');
    expect(await browser.$('.describe-first-use').isExisting()).toBe(false);
    await expect.poll(() => browser.$('.describe-destination').getText()).toContain('Image notes/reference.md');
  });
});
