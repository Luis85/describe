import { FuzzySuggestModal, TFile, TFolder, type App, type TAbstractFile } from 'obsidian';
import { canDescribePath } from '../domains/storage/eligibility';

export class ItemPicker extends FuzzySuggestModal<TAbstractFile> {
  constructor(app: App, private readonly choose: (file: TAbstractFile) => void, private readonly closed: () => void = () => undefined) {
    super(app);
    this.setPlaceholder('Choose a file or folder to describe');
  }

  override getItems(): TAbstractFile[] {
    return this.app.vault.getAllLoadedFiles().filter(file =>
      canDescribePath(file.path, this.app.vault.configDir)
      && (file instanceof TFile || (file instanceof TFolder && !file.isRoot())));
  }

  override getItemText(file: TAbstractFile): string { return file.path; }
  override onChooseItem(file: TAbstractFile): void { this.choose(file); }
  override onClose(): void { super.onClose(); this.closed(); }
}
