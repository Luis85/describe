import type { SourceItem } from '../descriptions/model';

export type StorageMode = 'configured' | 'same-folder' | 'subfolder';
export interface StorageChoice {
  mode: StorageMode;
  configuredFolder: string;
  subfolder: string;
}

export function folderPath(value: string, allowRoot = true): string {
  const raw = value.trim().replace(/\\/gu, '/');
  if (!raw || raw === '/') {
    if (!allowRoot) throw new Error('Choose a non-empty subfolder name.');
    return '';
  }
  if (raw.startsWith('/') || /^[a-z]:/iu.test(raw)) throw new Error('Use a vault-relative folder path.');
  const parts = raw.replace(/\/+$/gu, '').split('/');
  for (const part of parts) {
    if (!part || part.startsWith('.') || /[<>:"|?*\u0000-\u001f\u007f]/u.test(part)
      || /[. ]$/u.test(part) || part !== part.trim()
      || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/iu.test(part)) {
      throw new Error('Use visible folder names without reserved characters, . or .. segments.');
    }
  }
  return parts.join('/');
}

export function pathError(value: string, allowRoot = true): string | undefined {
  try { folderPath(value, allowRoot); return undefined; }
  catch (error) { return error instanceof Error ? error.message : 'Invalid folder path.'; }
}

export function joinPath(folder: string, name: string): string {
  return folder ? `${folder}/${name}` : name;
}

export function destinationFolder(source: SourceItem, choice: StorageChoice): string {
  if (choice.mode === 'configured') return folderPath(choice.configuredFolder);
  const base = source.kind === 'folder' ? source.path : source.path.split('/').slice(0, -1).join('/');
  if (choice.mode === 'same-folder') return base;
  if (choice.mode !== 'subfolder') throw new Error('Choose a valid storage option.');
  return joinPath(base, folderPath(choice.subfolder, false));
}

export function noteBasename(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|#^\[\]\u0000-\u001f\u007f]/gu, ' ')
    .replace(/\s+/gu, ' ').replace(/^[. ]+|[. ]+$/gu, '');
  // 60 Unicode code points leave room for a suffix within a 255-byte filename.
  const shortened = Array.from(cleaned).slice(0, 60).join('').replace(/[. ]+$/gu, '') || 'Description';
  return /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/iu.test(shortened) ? `_${shortened}` : shortened;
}
