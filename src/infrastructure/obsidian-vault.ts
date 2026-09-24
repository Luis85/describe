import { TFile, TFolder, type TAbstractFile, type Vault } from 'obsidian';
import type { DescriptionVault } from '../application/create-description';
import type { SourceItem } from '../domains/descriptions/model';
import { canDescribePath, isProtectedPath } from '../domains/storage/eligibility';

export function toSource(file: TAbstractFile, configDir = ''): SourceItem {
  if (!canDescribePath(file.path, configDir)) throw new Error('Choose a visible file or a folder inside the vault, outside its configuration directory.');
  if (file instanceof TFile) {
    return { kind: 'file', path: file.path, name: file.basename, extension: file.extension.toLowerCase() };
  }
  if (!(file instanceof TFolder) || file.isRoot()) throw new Error('Choose a file or a folder inside the vault.');
  return { kind: 'folder', path: file.path, name: file.name, extension: '' };
}

export class ObsidianDescriptionVault implements DescriptionVault {
  constructor(private readonly vault: Vault) {}

  sourceExists(source: SourceItem): boolean {
    if (!canDescribePath(source.path, this.vault.configDir)) return false;
    const found = this.vault.getAbstractFileByPath(source.path);
    return source.kind === 'file' ? found instanceof TFile : found instanceof TFolder;
  }

  exists(path: string): boolean {
    return this.vault.getAbstractFileByPath(path) !== null;
  }

  async ensureFolder(path: string): Promise<void> {
    if (isProtectedPath(path, this.vault.configDir)) {
      throw new Error('Description notes must be stored outside hidden and configuration folders.');
    }
    if (!path) return;
    let current = '';
    for (const segment of path.split('/')) {
      current = current ? `${current}/${segment}` : segment;
      const existing = this.vault.getAbstractFileByPath(current);
      if (existing instanceof TFolder) continue;
      if (existing) throw new Error(`A file blocks the destination folder: ${current}`);
      try { await this.vault.createFolder(current); }
      catch (error) {
        if (!(this.vault.getAbstractFileByPath(current) instanceof TFolder)) throw error;
      }
    }
  }

  async create(path: string, content: string): Promise<void> {
    await this.vault.create(path, content);
  }
}
