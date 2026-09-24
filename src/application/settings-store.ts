import { folderPath } from '../domains/storage/paths';
import { loadSettings, type DescribeSettings } from '../domains/storage/settings';
import { SerialQueue } from './serial-queue';

export class SettingsStore {
  value: DescribeSettings;
  private readonly queue = new SerialQueue();

  constructor(data: unknown, private readonly persist: (settings: DescribeSettings) => Promise<void>) {
    this.value = loadSettings(data);
  }

  change(edit: (next: DescribeSettings) => void): Promise<void> {
    return this.queue.run(async () => {
      const next = { ...this.value, extensionPaths: { ...this.value.extensionPaths } };
      edit(next);
      await this.persist(next);
      this.value = next;
    });
  }

  remember(key: string, path: string): Promise<void> {
    return this.change(next => {
      const destination = folderPath(path);
      // Another dialog or the settings page may have configured this type meanwhile.
      if (Object.hasOwn(next.extensionPaths, key) && next.extensionPaths[key] !== destination) {
        throw new Error('A newer destination for this file type was kept. Review it in settings.');
      }
      next.extensionPaths[key] = destination;
    });
  }

  forget(key: string): Promise<void> {
    return this.change(next => { delete next.extensionPaths[key]; });
  }
}
