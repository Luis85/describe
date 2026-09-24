import { describe, expect, it, vi } from 'vitest';
import { CreateDescription } from '../../src/application/create-description';
import { SettingsStore } from '../../src/application/settings-store';
import { MemoryVault, image, request } from '../support/fixtures';

describe('create description use case', () => {
  it('creates missing directories and a structured note', async () => {
    const vault = new MemoryVault();
    const path = await new CreateDescription(vault).execute(request());
    expect(path).toBe('Descriptions/Summer photo.md');
    expect(vault.ensureFolder).toHaveBeenCalledWith('Descriptions');
    expect(vault.notes.get(path)).toContain('type: "ItemDescription"');
  });
  it('never overwrites an existing note', async () => {
    const vault = new MemoryVault();
    vault.notes.set('Descriptions/Summer photo.md', 'original');
    vault.notes.set('Descriptions/Summer photo (2).md', 'also original');
    const path = await new CreateDescription(vault).execute(request());
    expect(path).toBe('Descriptions/Summer photo (3).md');
    expect(vault.notes.get('Descriptions/Summer photo.md')).toBe('original');
  });
  it('serializes simultaneous saves', async () => {
    const service = new CreateDescription(new MemoryVault());
    expect(await Promise.all([service.execute(request()), service.execute(request())]))
      .toEqual(['Descriptions/Summer photo.md', 'Descriptions/Summer photo (2).md']);
  });
  it('takes an input snapshot before queuing', async () => {
    const vault = new MemoryVault();
    const req = request();
    const saved = new CreateDescription(vault).execute(req);
    req.description.name = 'changed';
    req.storage.configuredFolder = 'changed';
    expect(await saved).toBe('Descriptions/Summer photo.md');
  });
  it('validates before any write', async () => {
    const vault = new MemoryVault();
    const req = request(); req.description.name = '';
    await expect(new CreateDescription(vault).execute(req)).rejects.toThrow('name');
    expect(vault.ensureFolder).not.toHaveBeenCalled();
    expect(vault.create).not.toHaveBeenCalled();
  });
  it('rejects a deleted source', async () => {
    const vault = new MemoryVault(); vault.sources.clear();
    await expect(new CreateDescription(vault).execute(request())).rejects.toThrow('no longer exists');
    expect(vault.create).not.toHaveBeenCalled();
  });
  it('detects a source move during asynchronous folder creation', async () => {
    const vault = new MemoryVault();
    let source = image;
    vault.ensureFolder.mockImplementation(() => { source = { ...image, path: 'Moved/photo.JPG' }; return Promise.resolve(); });
    const req = request(); req.source = () => source;
    await expect(new CreateDescription(vault).execute(req)).rejects.toThrow('source changed');
    expect(vault.create).not.toHaveBeenCalled();
  });
  it('propagates I/O errors and allows a later retry', async () => {
    const vault = new MemoryVault();
    vault.create.mockRejectedValueOnce(new Error('Disk full'));
    const service = new CreateDescription(vault);
    await expect(service.execute(request())).rejects.toThrow('Disk full');
    await expect(service.execute(request())).resolves.toBe('Descriptions/Summer photo.md');
  });
  it('propagates blocked directory failures', async () => {
    const vault = new MemoryVault(); vault.ensureFolder.mockRejectedValueOnce(new Error('Blocked'));
    await expect(new CreateDescription(vault).execute(request())).rejects.toThrow('Blocked');
    expect(vault.create).not.toHaveBeenCalled();
  });
  it('retries a path collision caused by another writer', async () => {
    const vault = new MemoryVault();
    vault.create.mockImplementationOnce(path => { vault.notes.set(path, 'other writer'); return Promise.reject(new Error('Exists')); });
    expect(await new CreateDescription(vault).execute(request())).toBe('Descriptions/Summer photo (2).md');
    expect(vault.notes.get('Descriptions/Summer photo.md')).toBe('other writer');
  });
  it('bounds collision attempts', async () => {
    const vault = new MemoryVault();
    vi.spyOn(vault, 'exists').mockReturnValue(true);
    await expect(new CreateDescription(vault).execute(request())).rejects.toThrow('Too many');
    expect(vault.create).not.toHaveBeenCalled();
  });
});

describe('settings transactions', () => {
  it('persists known extensions and explicit root mappings', async () => {
    const persist = vi.fn().mockResolvedValue(undefined);
    const store = new SettingsStore(null, persist);
    await store.remember('file:png', '');
    expect(store.value.extensionPaths).toEqual({ 'file:png': '' });
    expect(persist).toHaveBeenCalledOnce();
    await store.forget('file:png');
    expect(store.value.extensionPaths).toEqual({});
  });
  it('avoids lost updates when two modals save together', async () => {
    const store = new SettingsStore(null, () => Promise.resolve());
    await Promise.all([store.remember('file:png', 'Images'), store.remember('file:mp3', 'Audio')]);
    expect(store.value.extensionPaths).toEqual({ 'file:png': 'Images', 'file:mp3': 'Audio' });
  });
  it('rolls back a failed persistence operation and recovers the queue', async () => {
    const persist = vi.fn().mockRejectedValueOnce(new Error('Storage failed')).mockResolvedValue(undefined);
    const store = new SettingsStore(null, persist);
    await expect(store.remember('file:png', 'Images')).rejects.toThrow('Storage failed');
    expect(store.value.extensionPaths).toEqual({});
    await store.remember('file:png', 'Images');
    expect(store.value.extensionPaths['file:png']).toBe('Images');
  });
});
