// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Menu, MenuItem } from 'obsidian';
import DescribePlugin from '../../src/main';
import { DescriptionModal } from '../../src/presentation/description-modal';
import { ItemPicker } from '../../src/presentation/item-picker';
import { asFile, createApp, manifest } from '../support/app';
import { Modal, Notice, Plugin, TFile, TFolder } from '../support/obsidian-mock';

async function setup() {
  const host = createApp();
  const plugin = new DescribePlugin(host.app, manifest);
  await plugin.onload();
  const state = plugin as unknown as Plugin;
  return { ...host, plugin, state };
}
function menu() {
  let click: (() => void) | undefined;
  const entry = { setTitle: vi.fn().mockReturnThis(), setIcon: vi.fn().mockReturnThis(), onClick(callback: () => void) { click = callback; return this; } };
  const result = { addItem(callback: (item: MenuItem) => void) { callback(entry as unknown as MenuItem); return this; } };
  return { menu: result as unknown as Menu, entry, click: () => click?.() };
}
function lastModal(): DescriptionModal {
  const modal = Modal.instances.slice().reverse().find(item => item instanceof DescriptionModal);
  if (!(modal instanceof DescriptionModal)) throw new Error('Missing modal.');
  return modal;
}
function saveModal(modal: DescriptionModal): void {
  const field = modal.contentEl.querySelector<HTMLTextAreaElement>('[aria-label="Description"]');
  if (!field) throw new Error('No description input.');
  field.value = 'My description'; field.dispatchEvent(new Event('input', { bubbles: true }));
  modal.contentEl.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
}
afterEach(() => { Modal.instances.length = 0; Notice.messages.length = 0; document.body.replaceChildren(); });

describe('plugin integration with the public host contract', () => {
  it('registers Describe! for arbitrary extensions and folders, but not the vault root', async () => {
    const { plugin, files, events } = await setup();
    const handler = events.get('file-menu');
    const file = new TFile('custom.unknown'); files.set(file.path, file);
    const itemMenu = menu(); handler?.(itemMenu.menu, asFile(file));
    expect(itemMenu.entry.setTitle).toHaveBeenCalledWith('Describe!');
    itemMenu.click(); expect(lastModal().contentEl.textContent).toContain('custom.unknown');
    const folderMenu = menu(); handler?.(folderMenu.menu, asFile(new TFolder('Assets')));
    expect(folderMenu.entry.setTitle).toHaveBeenCalledWith('Describe!');
    const rootMenu = menu(); handler?.(rootMenu.menu, asFile(new TFolder('/')));
    expect(rootMenu.entry.setTitle).not.toHaveBeenCalled();
    plugin.onunload(); expect(document.body.textContent).toBe('');
  });
  it('creates the note, remembers the extension and opens the saved file', async () => {
    const { plugin, state, contents, openFile } = await setup();
    state.commands[0]?.checkCallback?.(false);
    saveModal(lastModal());
    await vi.waitFor(() => expect(contents.size).toBe(1));
    await vi.waitFor(() => expect(openFile).toHaveBeenCalledOnce());
    expect(state.data).toMatchObject({ extensionPaths: { 'file:png': 'Descriptions' } });
    expect(contents.get('Descriptions/photo.md')).toContain('My description');
    plugin.onunload();
  });
  it('does not duplicate a note when optional settings persistence fails', async () => {
    const { plugin, state, contents } = await setup();
    vi.spyOn(plugin, 'saveData').mockRejectedValueOnce(new Error('Read only'));
    state.commands[0]?.checkCallback?.(false); saveModal(lastModal());
    await vi.waitFor(() => expect(Notice.messages.some(message => message.includes('could not be remembered'))).toBe(true));
    expect(contents.size).toBe(1); plugin.onunload();
  });
  it('does not duplicate a note if opening it fails', async () => {
    const { plugin, state, contents, openFile } = await setup(); openFile.mockRejectedValueOnce(new Error('View failed'));
    state.commands[0]?.checkCallback?.(false); saveModal(lastModal());
    await vi.waitFor(() => expect(Notice.messages.some(message => message.includes('could not be opened'))).toBe(true));
    expect(contents.size).toBe(1); plugin.onunload();
  });
  it('offers an any-file picker and checks the active-file command', async () => {
    const { plugin, state, app, files } = await setup();
    expect(state.commands[0]?.checkCallback?.(true)).toBe(true);
    files.delete('Assets/photo.png'); expect(state.commands[0]?.checkCallback?.(true)).toBe(false);
    state.commands[1]?.callback?.();
    const choose = vi.fn(); const picker = new ItemPicker(app, choose);
    expect(picker.getItems()).toHaveLength(1);
    const folder = asFile(new TFolder('Assets'));
    expect(picker.getItemText(folder)).toBe('Assets'); picker.onChooseItem(folder);
    expect(choose).toHaveBeenCalledWith(folder);
    expect(state.settingsTabs[0]).toBeDefined();
    plugin.onunload();
  });
  it('resolves a rename at save time and rejects a deleted source', async () => {
    const { plugin, state, files, contents } = await setup();
    state.commands[0]?.checkCallback?.(false);
    const file = files.get('Assets/photo.png');
    if (!file) throw new Error('Missing fixture.');
    files.delete(file.path); file.path = 'Assets/renamed.png'; files.set(file.path, file);
    saveModal(lastModal());
    await vi.waitFor(() => expect(contents.get('Descriptions/photo.md')).toContain('[[Assets/renamed.png]]'));
    files.set('Assets/photo.png', new TFile('Assets/photo.png'));
    state.commands[0]?.checkCallback?.(false); const modal = lastModal(); files.delete('Assets/photo.png'); saveModal(modal);
    await vi.waitFor(() => expect(modal.contentEl.textContent).toContain('no longer exists'));
    expect(contents.size).toBe(1); plugin.onunload();
  });
});
