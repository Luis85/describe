// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import DescribePlugin from '../../src/main';
import { DescriptionModal, type DescriptionModalOptions } from '../../src/presentation/description-modal';
import { ItemPicker } from '../../src/presentation/item-picker';
import { defaultSettings } from '../../src/domains/storage/settings';
import { createApp, manifest } from '../support/app';
import { image } from '../support/fixtures';
import { Modal, Notice, Plugin } from '../support/obsidian-mock';

function submit(modal: DescriptionModal): void {
  const field = modal.contentEl.querySelector<HTMLTextAreaElement>('[aria-label="Description"]');
  if (!field) throw new Error('Description input is missing.');
  field.value = 'Keep this draft';
  field.dispatchEvent(new Event('input', { bubbles: true }));
  modal.contentEl.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
}

afterEach(() => {
  for (const modal of Modal.instances) modal.close();
  Modal.instances.length = 0;
  Notice.messages.length = 0;
  document.body.replaceChildren();
});

describe('lifecycle and source identity regressions', () => {
  it('closes an open item picker on unload and ignores stale command callbacks', async () => {
    const plugin = new DescribePlugin(createApp().app, manifest);
    await plugin.onload();
    const state = plugin as unknown as Plugin;
    const command = state.commands.find(item => item.id === 'choose-item');
    command?.callback?.();
    const picker = Modal.instances.find(item => item instanceof ItemPicker);
    expect(picker?.contentEl.isConnected).toBe(true);
    plugin.onunload();
    expect(picker?.contentEl.isConnected).toBe(false);
    const count = Modal.instances.length;
    command?.callback?.();
    expect(Modal.instances).toHaveLength(count);
  });

  it('rejects an extension change rather than saving with another type’s old route', () => {
    let source = image;
    const save = vi.fn<DescriptionModalOptions['save']>();
    const modal = new DescriptionModal(createApp().app, {
      source: () => source, settings: defaultSettings(), save, closed: vi.fn(),
    });
    modal.open();
    source = { ...image, path: 'Assets/photo.mp3', extension: 'mp3' };
    submit(modal);
    expect(save).not.toHaveBeenCalled();
    expect(modal.contentEl.textContent).toContain('file type changed');
    expect(modal.contentEl.querySelector<HTMLTextAreaElement>('textarea')?.value).toBe('Keep this draft');
  });

  it('does not close twice or notify after a pending save is disposed', async () => {
    let finish: ((result: { path: string; warnings: string[] }) => void) | undefined;
    const closed = vi.fn();
    const modal = new DescriptionModal(createApp().app, {
      source: () => image, settings: defaultSettings(), closed,
      save: () => new Promise(resolve => { finish = resolve; }),
    });
    modal.open();
    submit(modal);
    modal.dispose();
    modal.dispose();
    finish?.({ path: 'Descriptions/Saved.md', warnings: ['Do not display this after unload'] });
    await Promise.resolve();
    expect(closed).toHaveBeenCalledTimes(1);
    expect(Notice.messages).toEqual([]);
    expect(modal.contentEl.isConnected).toBe(false);
  });
});
