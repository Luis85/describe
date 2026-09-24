import { describe, expect, it } from 'vitest';
import { ObsidianDescriptionVault, toSource } from '../../src/infrastructure/obsidian-vault';
import { asFile, asVault, createApp } from '../support/app';
import { TFile, TFolder } from '../support/obsidian-mock';

describe('Obsidian vault adapter', () => {
  it('maps files, folders and extensionless items', () => {
    expect(toSource(asFile(new TFile('A/image.JPG')))).toMatchObject({ kind: 'file', name: 'image', extension: 'jpg' });
    expect(toSource(asFile(new TFile('README')))).toMatchObject({ extension: '', name: 'README' });
    expect(toSource(asFile(new TFolder('Projects')))).toMatchObject({ kind: 'folder', name: 'Projects' });
    expect(() => toSource(asFile(new TFolder('/')))).toThrow('inside the vault');
  });
  it('checks source kinds, not just paths', () => {
    const { vault } = createApp(); const adapter = new ObsidianDescriptionVault(asVault(vault));
    expect(adapter.sourceExists({ kind: 'folder', path: 'Assets', name: '', extension: '' })).toBe(true);
    expect(adapter.sourceExists({ kind: 'file', path: 'Assets', name: '', extension: '' })).toBe(false);
    expect(adapter.exists('Assets')).toBe(true);
  });
  it('creates nested folders once and writes through the public Vault API', async () => {
    const { vault, contents } = createApp(); const adapter = new ObsidianDescriptionVault(asVault(vault));
    await adapter.ensureFolder('Descriptions/Images');
    await adapter.ensureFolder('Descriptions/Images');
    await adapter.ensureFolder('');
    await adapter.create('Descriptions/Images/Test.md', 'content');
    expect(vault.createFolder).toHaveBeenCalledTimes(2);
    expect(contents.get('Descriptions/Images/Test.md')).toBe('content');
  });
  it('rejects hidden, configured, and file-blocked destinations', async () => {
    const { vault } = createApp(); const adapter = new ObsidianDescriptionVault(asVault(vault));
    await expect(adapter.ensureFolder('.obsidian/plugins')).rejects.toThrow('outside');
    await expect(adapter.ensureFolder('Assets/.hidden')).rejects.toThrow('outside');
    await expect(adapter.ensureFolder('Assets/photo.png/Notes')).rejects.toThrow('blocks');
    vault.configDir = 'Configuration';
    await expect(adapter.ensureFolder('Configuration/Notes')).rejects.toThrow('outside');
  });
  it('accepts a folder created concurrently and propagates other errors', async () => {
    const { vault, files } = createApp(); const adapter = new ObsidianDescriptionVault(asVault(vault));
    vault.createFolder.mockImplementationOnce(path => { files.set(path, new TFolder(path)); return Promise.reject(new Error('Exists')); });
    await expect(adapter.ensureFolder('Concurrent')).resolves.toBeUndefined();
    vault.createFolder.mockRejectedValueOnce(new Error('Read only'));
    await expect(adapter.ensureFolder('Blocked')).rejects.toThrow('Read only');
  });
});
