import { Notice, PluginSettingTab, type App, type Plugin, type SettingDefinitionItem } from 'obsidian';
import type { SettingsStore } from '../application/settings-store';
import { extensionLabel } from '../domains/descriptions/model';
import { folderPath, pathError } from '../domains/storage/paths';

export class DescribeSettingsTab extends PluginSettingTab {
  constructor(app: App, plugin: Plugin, private readonly store: SettingsStore) { super(app, plugin); }

  override getSettingDefinitions(): SettingDefinitionItem[] {
    const keys = Object.keys(this.store.value.extensionPaths).sort();
    return [
      {
        type: 'group', heading: 'Storage', items: [
          { name: 'Default folder', desc: 'Suggested when a new file extension is first described.',
            control: { type: 'folder', key: 'defaultFolder', includeRoot: true, validate: value => pathError(value) } },
          { name: 'Default location', desc: 'Each description can override this choice.',
            control: { type: 'dropdown', key: 'defaultMode', options: {
              configured: 'Configured folder', 'same-folder': 'Same folder', subfolder: 'Descriptions subfolder',
            } } },
          { name: 'Descriptions subfolder', desc: 'A relative subfolder name. Nested paths are allowed.',
            control: { type: 'text', key: 'subfolder', validate: value => pathError(value, false) } },
          { name: 'Open after saving', control: { type: 'toggle', key: 'openAfterSave' } },
        ],
      },
      {
        type: 'list', heading: 'Known file types',
        emptyState: 'Describe a file or folder to configure its default destination.',
        search: { placeholder: 'Filter file types', match: (definition, query) => definition.name.toLowerCase().includes(query.toLowerCase()) },
        items: keys.map(key => ({
          name: extensionLabel(key), desc: 'Default destination. Delete this mapping to be asked again.',
          control: { type: 'folder' as const, key: `route:${key}`, includeRoot: true, validate: (value: string) => pathError(value) },
        })),
        onDelete: index => {
          const key = keys[index];
          if (key === undefined) return;
          void this.store.forget(key).then(() => this.update()).catch(() => new Notice('Could not remove the file-type mapping.'));
        },
      },
    ];
  }

  override getControlValue(key: string): unknown {
    if (key.startsWith('route:')) return this.store.value.extensionPaths[key.slice(6)];
    switch (key) {
      case 'defaultFolder': return this.store.value.defaultFolder;
      case 'defaultMode': return this.store.value.defaultMode;
      case 'subfolder': return this.store.value.subfolder;
      case 'openAfterSave': return this.store.value.openAfterSave;
      default: return undefined;
    }
  }

  override async setControlValue(key: string, value: unknown): Promise<void> {
    try {
      await this.store.change(next => {
        if (key.startsWith('route:') && typeof value === 'string') {
          next.extensionPaths[key.slice(6)] = folderPath(value);
        } else if (key === 'defaultFolder' && typeof value === 'string') {
          next.defaultFolder = folderPath(value);
        } else if (key === 'subfolder' && typeof value === 'string') {
          next.subfolder = folderPath(value, false);
        } else if (key === 'openAfterSave' && typeof value === 'boolean') {
          next.openAfterSave = value;
        } else if (key === 'defaultMode' && (value === 'configured' || value === 'same-folder' || value === 'subfolder')) {
          next.defaultMode = value;
        } else throw new Error('Unsupported setting value.');
      });
    } catch (error) {
      new Notice(error instanceof Error ? error.message : 'Could not save this setting.');
      this.update();
      throw error;
    }
  }
}
