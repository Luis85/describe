import { vi } from 'vitest';
import type { App, Menu, PluginManifest, TAbstractFile as ObsidianFile, Vault } from 'obsidian';
import { TAbstractFile, TFile, TFolder } from './obsidian-mock';

export const manifest: PluginManifest = {
  id: 'describe', name: 'Describe', version: '1.0.0', minAppVersion: '1.13.7',
  author: 'Luis Mendez', description: 'Descriptions', isDesktopOnly: false,
};

export function createApp() {
  const files = new Map<string, TAbstractFile>([['/', new TFolder('/')], ['Assets', new TFolder('Assets')], ['Assets/photo.png', new TFile('Assets/photo.png')]]);
  const contents = new Map<string, string>();
  const events = new Map<string, (menu: Menu, file: ObsidianFile) => void>();
  const vault = {
    configDir: '.obsidian',
    getAbstractFileByPath: (path: string) => files.get(path) ?? null,
    getFileByPath: (path: string) => { const file = files.get(path); return file instanceof TFile ? file : null; },
    getAllLoadedFiles: () => [...files.values()],
    createFolder: vi.fn((path: string) => {
      if (files.has(path)) return Promise.reject(new Error('Exists'));
      const folder = new TFolder(path); files.set(path, folder); return Promise.resolve(folder);
    }),
    create: vi.fn((path: string, content: string) => {
      if (files.has(path)) return Promise.reject(new Error('Exists'));
      const file = new TFile(path); files.set(path, file); contents.set(path, content); return Promise.resolve(file);
    }),
  };
  const openFile = vi.fn().mockResolvedValue(undefined);
  const workspace = {
    on: (event: string, callback: (menu: Menu, file: ObsidianFile) => void) => { events.set(event, callback); return {}; },
    getActiveFile: () => vault.getFileByPath('Assets/photo.png'),
    getLeaf: () => ({ openFile }),
  };
  return { app: { vault, workspace } as unknown as App, vault, workspace, files, contents, events, openFile };
}

export function asVault(vault: ReturnType<typeof createApp>['vault']): Vault { return vault as unknown as Vault; }
export function asFile(file: TAbstractFile): ObsidianFile { return file as unknown as ObsidianFile; }
