import { Notice, Plugin, TFile, TFolder, type TAbstractFile } from 'obsidian';
import { CreateDescription, type CreateRequest } from './application/create-description';
import { SettingsStore } from './application/settings-store';
import { extensionKey } from './domains/descriptions/model';
import { ObsidianDescriptionVault, toSource } from './infrastructure/obsidian-vault';
import { DescriptionModal } from './presentation/description-modal';
import { ItemPicker } from './presentation/item-picker';
import { DescribeSettingsTab } from './presentation/settings-tab';

export default class DescribePlugin extends Plugin {
  private store!: SettingsStore;
  private creator!: CreateDescription;
  private settingsTab!: DescribeSettingsTab;
  private readonly modals = new Set<DescriptionModal | ItemPicker>();
  private active = false;

  override async onload(): Promise<void> {
    const data: unknown = await this.loadData();
    this.store = new SettingsStore(data, settings => this.saveData(settings));
    this.creator = new CreateDescription(new ObsidianDescriptionVault(this.app.vault));
    this.settingsTab = new DescribeSettingsTab(this.app, this, this.store);
    this.addSettingTab(this.settingsTab);
    this.active = true;
    this.registerEvent(this.app.workspace.on('file-menu', (menu, file) => {
      if (!(file instanceof TFile) && !(file instanceof TFolder)) return;
      if (file instanceof TFolder && file.isRoot()) return;
      menu.addItem(item => item.setTitle('Describe!').setIcon('file-pen-line').onClick(() => this.openDescription(file)));
    }));
    this.addCommand({
      id: 'current-file', name: 'Add description to current file',
      checkCallback: checking => {
        const file = this.app.workspace.getActiveFile();
        if (!file) return false;
        if (!checking) this.openDescription(file);
        return true;
      },
    });
    this.addCommand({ id: 'choose-item', name: 'Choose a file or folder', callback: () => this.openPicker() });
  }

  private openPicker(): void {
    if (!this.active) return;
    const picker = new ItemPicker(this.app, file => this.openDescription(file), () => { this.modals.delete(picker); });
    this.modals.add(picker);
    picker.open();
  }

  private openDescription(file: TAbstractFile): void {
    if (!this.active) return;
    try {
      const type = extensionKey(toSource(file));
      const source = () => {
        if (this.app.vault.getAbstractFileByPath(file.path) !== file) throw new Error('The selected item no longer exists.');
        const item = toSource(file);
        if (extensionKey(item) !== type) throw new Error('The source file type changed. Copy your draft, then reopen this dialog.');
        return item;
      };
      const modal = new DescriptionModal(this.app, {
        source, settings: this.store.value,
        save: (request, rememberFolder) => this.saveDescription(request, rememberFolder),
        closed: () => { this.modals.delete(modal); },
      });
      this.modals.add(modal);
      modal.open();
    } catch (error) { new Notice(error instanceof Error ? error.message : 'Could not open the description dialog.'); }
  }

  private async saveDescription(request: CreateRequest, rememberFolder: string | undefined): Promise<{ path: string; warnings: string[] }> {
    const key = extensionKey(request.source());
    const path = await this.creator.execute(request);
    const warnings: string[] = [];
    // Note creation is the commit point. Later failures must never invite a duplicate retry.
    if (rememberFolder !== undefined) {
      try {
        await this.store.remember(key, rememberFolder);
        if (this.active) this.settingsTab.update();
      } catch { warnings.push('Your note was saved, but the file-type destination could not be remembered. Set it again next time.'); }
    }
    if (this.active && this.store.value.openAfterSave) {
      try {
        const file = this.app.vault.getFileByPath(path);
        if (!file) throw new Error('Created note not found.');
        await this.app.workspace.getLeaf(false).openFile(file);
      } catch { warnings.push(`Your note was saved at ${path}, but could not be opened automatically.`); }
    }
    return { path, warnings };
  }

  override onunload(): void {
    this.active = false;
    for (const modal of this.modals) {
      if (modal instanceof DescriptionModal) modal.dispose();
      else modal.close();
    }
    this.modals.clear();
  }
}
