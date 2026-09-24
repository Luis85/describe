import { describe, expect, it, vi } from 'vitest';
import type { Plugin as ObsidianPlugin, SettingDefinitionList } from 'obsidian';
import { SettingsStore } from '../../src/application/settings-store';
import { DescribeSettingsTab } from '../../src/presentation/settings-tab';
import { createApp, manifest } from '../support/app';
import { Plugin, Notice } from '../support/obsidian-mock';

function setup() {
  const app = createApp().app;
  const persist = vi.fn().mockResolvedValue(undefined);
  const store = new SettingsStore(null, persist);
  const tab = new DescribeSettingsTab(app, new Plugin(app, manifest) as unknown as ObsidianPlugin, store);
  return { tab, store, persist };
}

describe('declarative settings', () => {
  it('exposes native folder controls and searchable extension rows', async () => {
    const { tab, store } = setup(); await store.remember('file:png', 'Pictures');
    const definitions = tab.getSettingDefinitions();
    const list = definitions[1] as SettingDefinitionList;
    expect(list.type).toBe('list'); expect(list.items?.[0]).toMatchObject({ name: '.png', control: { type: 'folder', key: 'route:file:png' } });
    expect(list.search?.match({ name: '.PNG' }, 'png')).toBe(true);
    expect(tab.getControlValue('route:file:png')).toBe('Pictures');
  });
  it('persists supported controls and rejects unsupported values', async () => {
    const { tab, store } = setup();
    await tab.setControlValue('defaultFolder', 'Notes');
    await tab.setControlValue('subfolder', 'Metadata');
    await tab.setControlValue('defaultMode', 'same-folder');
    await tab.setControlValue('openAfterSave', false);
    await tab.setControlValue('route:file:png', '');
    expect(store.value).toMatchObject({ defaultFolder: 'Notes', subfolder: 'Metadata', defaultMode: 'same-folder', openAfterSave: false, extensionPaths: { 'file:png': '' } });
    expect(tab.getControlValue('defaultFolder')).toBe('Notes');
    expect(tab.getControlValue('subfolder')).toBe('Metadata');
    expect(tab.getControlValue('defaultMode')).toBe('same-folder');
    expect(tab.getControlValue('openAfterSave')).toBe(false);
    expect(tab.getControlValue('unknown')).toBeUndefined();
    await expect(tab.setControlValue('defaultMode', 'invalid')).rejects.toThrow('Unsupported');
  });
  it('allows forgetting a mapping and reports persistence failure', async () => {
    const { tab, store, persist } = setup(); await store.remember('folder', 'Folders');
    const list = tab.getSettingDefinitions()[1] as SettingDefinitionList;
    list.onDelete?.(0);
    await vi.waitFor(() => expect(store.value.extensionPaths).toEqual({}));
    persist.mockRejectedValueOnce(new Error('Read only'));
    await expect(tab.setControlValue('defaultFolder', 'Other')).rejects.toThrow('Read only');
    expect(store.value.defaultFolder).toBe('Descriptions');
    expect(Notice.messages).toContain('Read only');
  });
});
