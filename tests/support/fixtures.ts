import { vi } from 'vitest';
import type { DescriptionVault, CreateRequest } from '../../src/application/create-description';
import type { DescriptionInput, SourceItem } from '../../src/domains/descriptions/model';

export const image: SourceItem = { kind: 'file', path: 'Assets/photo.JPG', name: 'photo', extension: 'JPG' };
export const folder: SourceItem = { kind: 'folder', path: 'Projects/Home', name: 'Home', extension: '' };
export const input: DescriptionInput = { name: 'Summer photo', description: 'A sunny afternoon.', tags: '', category: '', color: '', aliases: '' };

export class MemoryVault implements DescriptionVault {
  sources = new Set([image.path, folder.path]);
  notes = new Map<string, string>();
  folders = new Set<string>();
  sourceExists(source: SourceItem): boolean { return this.sources.has(source.path); }
  exists(path: string): boolean { return this.notes.has(path); }
  ensureFolder = vi.fn((path: string) => { this.folders.add(path); return Promise.resolve(); });
  create = vi.fn((path: string, content: string) => {
    if (this.notes.has(path)) return Promise.reject(new Error('File already exists.'));
    this.notes.set(path, content);
    return Promise.resolve();
  });
}

export function request(): CreateRequest {
  return { source: () => image, description: { ...input }, storage: { mode: 'configured', configuredFolder: 'Descriptions', subfolder: 'descriptions' } };
}
