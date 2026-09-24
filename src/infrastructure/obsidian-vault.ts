import { TFile, TFolder, type TAbstractFile, type Vault } from 'obsidian';
import type { DescriptionVault } from '../application/create-description';
import type { SourceItem } from '../domains/descriptions/model';

export function toSource(file: TAbstractFile): SourceItem {
  if (file instanceof TFile) {
    return { kind: 'file', path: file.path, name: file.basename, extension: file.extension.toLowerCase() };
  }
  if (!(file instanceof TFolder) || file.isRoot()) throw new Error('Choose a file or a folder inside the vault.');
  return { kind: 'folder', path: file.path, name: file.name, extension: '' };
}

export class ObsidianDescriptionVault implements DescriptionVault {
  constructor(private readonly vault: Vault) {}

  sourceExists(source: SourceItem): boolean {
    const found = this.vault.getAbstractFileByPath(source.path);
    return source.kind === 'file' ? found instanceof TFile : found instanceof TFolder;
  }

  exists(path: string): boolean {
    return this.vault.getAbstractFileByPath(path) !== null;
  }

  async ensureFolder(path: string): Promise<void> {
    const config = this.vault.configDir;
    if (path === config || path.startsWith(`${config}/`) || path.split('/').some(part => part.startsWith('.'))) {
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
