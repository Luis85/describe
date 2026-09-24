import { Buffer } from 'node:buffer';
import { describe, expect, it } from 'vitest';
import { destinationFolder, folderPath, noteBasename, pathError } from '../../src/domains/storage/paths';
import { defaultSettings, loadSettings } from '../../src/domains/storage/settings';
import { folder, image } from '../support/fixtures';

const choice = { mode: 'configured' as const, configuredFolder: 'Descriptions/Images', subfolder: 'My descriptions/nested' };

describe('destination paths', () => {
  it('supports all three locations for files', () => {
    expect(destinationFolder(image, choice)).toBe('Descriptions/Images');
    expect(destinationFolder(image, { ...choice, mode: 'same-folder' })).toBe('Assets');
    expect(destinationFolder(image, { ...choice, mode: 'subfolder' })).toBe('Assets/My descriptions/nested');
  });
  it('uses the selected folder itself as the folder-local base', () => {
    expect(destinationFolder(folder, { ...choice, mode: 'same-folder' })).toBe('Projects/Home');
    expect(destinationFolder(folder, { ...choice, mode: 'subfolder' })).toBe('Projects/Home/My descriptions/nested');
  });
  it('handles vault-root files and explicit root destinations', () => {
    expect(destinationFolder({ ...image, path: 'image.png' }, { ...choice, mode: 'same-folder' })).toBe('');
    expect(folderPath('')).toBe('');
    expect(folderPath('/')).toBe('');
    expect(folderPath('  Notes\\Images/  ')).toBe('Notes/Images');
  });
  it.each([
    '../notes', 'A/../B', '/tmp/notes', 'C:\\notes', 'A//B', '.obsidian', 'A/.hidden',
    'A/./B', 'A/B.', 'A /B', 'CON', 'A:x', 'A|B', 'A?B', 'A\u0001B', 'A\u007fB',
  ])('rejects unsafe destination %s', value => {
    expect(() => folderPath(value)).toThrow();
    expect(pathError(value)).toBeTypeOf('string');
  });
  it('rejects an empty local subfolder', () => {
    expect(() => folderPath('', false)).toThrow('non-empty');
    expect(pathError('Notes')).toBeUndefined();
  });
  it.each([
    ['A/B: C?', 'A B C'], ['CON', '_CON'], ['..', 'Description'], ['folder [draft]', 'folder draft'],
    [' hello   world. ', 'hello world'], ['normal', 'normal'], ['A\u0001B\u007fC', 'A B C'],
  ])('creates portable filenames for %s', (name, expected) => {
    expect(noteBasename(name)).toBe(expected);
  });
  it('limits Unicode filenames without splitting surrogate pairs', () => {
    const name = noteBasename('😀'.repeat(200));
    expect(Array.from(name)).toHaveLength(60);
    expect(Buffer.byteLength(`${name} (1000).md`)).toBeLessThanOrEqual(255);
  });
});

describe('persisted settings', () => {
  it('starts with no known extensions and independent default objects', () => {
    const first = defaultSettings();
    first.extensionPaths['file:png'] = 'Images';
    expect(defaultSettings().extensionPaths).toEqual({});
  });
  it.each([null, undefined, 7, 'bad', []])('recovers safely from %j', value => {
    expect(loadSettings(value)).toEqual(defaultSettings());
  });
  it('keeps root mappings and normalizes case without prototype pollution', () => {
    const value = loadSettings({ extensionPaths: { 'file:JPG': '', folder: 'Folders', 'file:__proto__': 'Files', '__proto__': 'unsafe' }, openAfterSave: false });
    expect(value.extensionPaths).toEqual({ 'file:jpg': '', folder: 'Folders', 'file:__proto__': 'Files' });
    expect(value.openAfterSave).toBe(false);
  });
  it('discards corrupt paths, modes, and mapping types', () => {
    expect(loadSettings({ defaultFolder: '../escape', subfolder: '', defaultMode: 'anything', extensionPaths: { 'file:png': '../escape', bad: 'Notes', 'file:zip': 4 } }))
      .toEqual(defaultSettings());
  });
  it('restores valid storage preferences', () => {
    expect(loadSettings({ defaultFolder: '', subfolder: 'Metadata', defaultMode: 'subfolder' }))
      .toMatchObject({ defaultFolder: '', subfolder: 'Metadata', defaultMode: 'subfolder' });
  });
});
