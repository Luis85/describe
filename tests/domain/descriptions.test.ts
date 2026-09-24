import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { describeItem } from '../../src/domains/descriptions/metadata';
import { renderDescription, sourceWikilink } from '../../src/domains/descriptions/markdown';
import { extensionKey, extensionLabel } from '../../src/domains/descriptions/model';
import { folder, image, input } from '../support/fixtures';

function properties(note: string): Record<string, unknown> {
  const frontmatter = note.split('---\n')[1];
  if (frontmatter === undefined) throw new Error('Missing frontmatter.');
  return parse(frontmatter) as Record<string, unknown>;
}

// Behavioral contracts are independent of the Obsidian runtime.
describe('description metadata', () => {
  it('normalizes tags, category, hex color and aliases', () => {
    expect(describeItem({ ...input, tags: '#Home, project/renovation HOME', category: ' Photo ', color: ' #AABBCC ', aliases: ' Summer\nVacation\nSUMMER' }))
      .toMatchObject({ tags: ['Home', 'project/renovation'], category: 'Photo', color: '#aabbcc', aliases: ['Summer', 'Vacation'] });
  });
  it('keeps commas inside an alias', () => {
    expect(describeItem({ ...input, aliases: 'Mendez, Luis\nLuis' }).aliases).toEqual(['Mendez, Luis', 'Luis']);
  });
  it.each(['', '   ', '\n'])('rejects an empty name %j', name => {
    expect(() => describeItem({ ...input, name })).toThrow('name');
  });
  it.each(['', ' \n '])('requires a description %j', description => {
    expect(() => describeItem({ ...input, description })).toThrow('description');
  });
  it.each(['123', 'a//b', '/a', 'a/', 'a!', 'a.b'])('rejects invalid tag %s', tags => {
    expect(() => describeItem({ ...input, tags })).toThrow('Invalid tag');
  });
  it.each(['red', '#abc', '#aabbccdd', '#zzzzzz'])('rejects invalid color %s', color => {
    expect(() => describeItem({ ...input, color })).toThrow('Color');
  });
  it('accepts Unicode and nested tags', () => {
    expect(describeItem({ ...input, tags: '#résumé 地图/旅程' }).tags).toEqual(['résumé', '地图/旅程']);
  });
  it('rejects multiline names, categories and long descriptions', () => {
    expect(() => describeItem({ ...input, name: 'A\nB' })).toThrow('one line');
    expect(() => describeItem({ ...input, category: 'A\nB' })).toThrow('one line');
    expect(() => describeItem({ ...input, description: 'a'.repeat(100_001) })).toThrow('too long');
  });
  it('normalizes line endings without trimming the full description', () => {
    expect(describeItem({ ...input, description: '  A\r\nB\rC  ' }).description).toBe('  A\nB\nC  ');
  });
});

describe('Markdown document contract', () => {
  it('writes every requested property as valid YAML and embeds an image', () => {
    const note = renderDescription(image, describeItem({ ...input, tags: 'home', category: 'Photo', color: '#3388cc', aliases: 'Holiday' }));
    expect(properties(note)).toEqual({ type: 'ItemDescription', source: '[[Assets/photo.JPG]]', name: input.name,
      extension: 'jpg', description: input.description, tags: ['home'], category: 'Photo', color: '#3388cc', aliases: ['Holiday'] });
    expect(note).toContain(`# ${input.name}\n\n${input.description}`);
    expect(note).toContain('![[Assets/photo.JPG]]');
  });
  it('uses exactly the first 80 Unicode code points without an ellipsis', () => {
    const description = '😀'.repeat(81);
    const note = renderDescription(image, describeItem({ ...input, description }));
    expect(properties(note).description).toBe('😀'.repeat(80));
    expect(note).toContain(description);
  });
  it('quotes YAML-like values and keeps multiline content from injecting properties', () => {
    const description = 'Text\nsource: attack\n---\n[body]';
    const note = renderDescription(image, describeItem({ ...input, name: 'null', description, category: 'true', aliases: 'A: B\n"Quoted"' }));
    expect(properties(note)).toMatchObject({ name: 'null', category: 'true', description, aliases: ['A: B', '"Quoted"'] });
    expect(properties(note).source).toBe('[[Assets/photo.JPG]]');
  });
  it.each(['png', 'JPG', 'svg', 'mp3', 'wav', 'mp4', 'webm', 'heic'])('embeds %s media', extension => {
    expect(renderDescription({ ...image, extension }, describeItem(input))).toContain('![[Assets/photo.JPG]]');
  });
  it.each(['pdf', 'zip', 'docx', 'md', 'arbitrary', ''])('links but does not embed %j', extension => {
    expect(renderDescription({ ...image, extension }, describeItem(input))).not.toContain('![[');
  });
  it('records a folder reference with a trailing slash and no embed', () => {
    const note = renderDescription(folder, describeItem(input));
    expect(properties(note)).toMatchObject({ extension: 'folder', source: '[[Projects/Home/]]' });
    expect(note).not.toContain('![[');
  });
  it('escapes reserved wikilink delimiters and title markup', () => {
    expect(sourceWikilink({ ...image, path: 'A/[x]#b^c|d%.png' })).toBe('[[A/%5Bx%5D%23b%5Ec%7Cd%25.png]]');
    expect(renderDescription(image, describeItem({ ...input, name: '<img> *title*' }))).toContain('# \\<img\\> \\*title\\*');
  });
  it('distinguishes folders, extensionless files and a literal .folder extension', () => {
    expect(extensionKey(folder)).toBe('folder');
    expect(extensionKey({ ...image, extension: 'folder' })).toBe('file:folder');
    expect(extensionKey({ ...image, extension: '' })).toBe('file:');
    expect(extensionKey(image)).toBe('file:jpg');
    expect(extensionLabel('folder')).toBe('Folders');
    expect(extensionLabel('file:')).toContain('without');
    expect(extensionLabel('file:jpg')).toBe('.jpg');
  });
});
