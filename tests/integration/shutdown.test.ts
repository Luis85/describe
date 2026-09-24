// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import DescribePlugin from '../../src/main';
import { DescriptionModal } from '../../src/presentation/description-modal';
import { ItemPicker } from '../../src/presentation/item-picker';
import { createApp, manifest } from '../support/app';
import { Modal, Notice, Plugin, TFile, TFolder } from '../support/obsidian-mock';

function saveLastModal(): void {
  const modal = Modal.instances.filter(item => item instanceof DescriptionModal).at(-1);
  const field = modal?.contentEl.querySelector<HTMLTextAreaElement>('[aria-label="Description"]');
  if (!field) throw new Error('Expected description modal.');
  field.value = 'Queued description'; field.dispatchEvent(new Event('input', { bubbles: true }));
  modal?.contentEl.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
}

afterEach(() => {
  for (const modal of Modal.instances) modal.close();
  Modal.instances.length = 0; Notice.messages.length = 0; document.body.replaceChildren();
});

describe('plugin shutdown and eligibility', () => {
  it('cannot activate after being unloaded during settings initialization', async () => {
    const host = createApp(); const plugin = new DescribePlugin(host.app, manifest);
    let finish: ((data: unknown) => void) | undefined;
    vi.spyOn(plugin, 'loadData').mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const loading = plugin.onload(); plugin.onunload(); finish?.(null); await loading;
    expect((plugin as unknown as Plugin).commands).toEqual([]);
    expect(host.events.size).toBe(0);
  });
  it('prevents queued writes and optional follow-up operations after unloading', async () => {
    const host = createApp(); const plugin = new DescribePlugin(host.app, manifest); await plugin.onload();
    const state = plugin as unknown as Plugin;
    let finish: (() => void) | undefined;
    host.vault.create.mockImplementationOnce((path, content) => new Promise(resolve => {
      finish = () => {
        const file = new TFile(path); host.files.set(path, file); host.contents.set(path, content); resolve(file);
      };
    }));
    state.commands[0]?.checkCallback?.(false); saveLastModal();
    await vi.waitFor(() => expect(host.vault.create).toHaveBeenCalledTimes(1));
    state.commands[0]?.checkCallback?.(false); saveLastModal();
    plugin.onunload(); finish?.();
    await vi.waitFor(() => expect(host.contents.size).toBe(1));
    // Flush the next task after the controlled promise chain, not a guessed I/O delay.
    await new Promise(resolve => window.setTimeout(resolve, 0));
    expect(host.vault.create).toHaveBeenCalledTimes(1);
    expect(state.data).toBeNull(); expect(host.openFile).not.toHaveBeenCalled();
    expect(Notice.messages).toEqual([]);
    expect(state.commands[0]?.checkCallback?.(true)).toBe(false);
  });
  it('excludes hidden and custom configuration targets from the picker', () => {
    const host = createApp(); host.vault.configDir = 'Configuration';
    host.files.set('Configuration', new TFolder('Configuration'));
    host.files.set('Configuration/data.json', new TFile('Configuration/data.json'));
    host.files.set('Assets/.hidden', new TFile('Assets/.hidden'));
    const picker = new ItemPicker(host.app, vi.fn());
    expect(picker.getItems().map(file => file.path)).toEqual(['Assets', 'Assets/photo.png']);
  });
});
