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
    return this.change(next => { next.extensionPaths[key] = folderPath(path); });
  }

  forget(key: string): Promise<void> {
    return this.change(next => { delete next.extensionPaths[key]; });
  }
}
