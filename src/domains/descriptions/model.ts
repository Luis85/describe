export interface SourceItem {
  readonly kind: 'file' | 'folder';
  readonly path: string;
  readonly name: string;
  readonly extension: string;
}

export interface DescriptionInput {
  name: string;
  description: string;
  tags: string;
  category: string;
  color: string;
  aliases: string;
}

export interface ItemDescription {
  readonly name: string;
  readonly description: string;
  readonly tags: readonly string[];
  readonly category: string;
  readonly color: string;
  readonly aliases: readonly string[];
}

export function extensionKey(source: SourceItem): string {
  return source.kind === 'folder' ? 'folder' : `file:${source.extension.toLowerCase()}`;
}

export function extensionLabel(key: string): string {
  if (key === 'folder') return 'Folders';
  return key === 'file:' ? 'Files without an extension' : `.${key.slice(5)}`;
}
