import { folderPath, type StorageMode } from './paths';

export interface DescribeSettings {
  schemaVersion: 1;
  defaultFolder: string;
  defaultMode: StorageMode;
  subfolder: string;
  openAfterSave: boolean;
  extensionPaths: Record<string, string>;
}

export function defaultSettings(): DescribeSettings {
  return {
    schemaVersion: 1, defaultFolder: 'Descriptions', defaultMode: 'configured',
    subfolder: 'descriptions', openAfterSave: true, extensionPaths: {},
  };
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function loadSettings(value: unknown): DescribeSettings {
  const result = defaultSettings();
  if (!record(value)) return result;
  for (const key of ['defaultFolder', 'subfolder'] as const) {
    const candidate = value[key];
    if (typeof candidate !== 'string') continue;
    try { result[key] = folderPath(candidate, key === 'defaultFolder'); }
    catch { /* Ignore corrupt persisted paths; never write outside the vault. */ }
  }
  if (value.defaultMode === 'configured' || value.defaultMode === 'same-folder' || value.defaultMode === 'subfolder') {
    result.defaultMode = value.defaultMode;
  }
  if (typeof value.openAfterSave === 'boolean') result.openAfterSave = value.openAfterSave;
  if (record(value.extensionPaths)) {
    for (const [key, path] of Object.entries(value.extensionPaths)) {
      if ((key !== 'folder' && !key.startsWith('file:')) || typeof path !== 'string') continue;
      try { result.extensionPaths[key.toLowerCase()] = folderPath(path); }
      catch { /* A bad mapping becomes unknown and is requested again. */ }
    }
  }
  return result;
}
