import { describeItem } from '../domains/descriptions/metadata';
import { renderDescription } from '../domains/descriptions/markdown';
import type { DescriptionInput, SourceItem } from '../domains/descriptions/model';
import { destinationFolder, joinPath, noteBasename, type StorageChoice } from '../domains/storage/paths';
import { SerialQueue } from './serial-queue';

export interface DescriptionVault {
  sourceExists(source: SourceItem): boolean;
  exists(path: string): boolean;
  ensureFolder(path: string): Promise<void>;
  create(path: string, content: string): Promise<void>;
}

export interface CreateRequest {
  source: () => SourceItem;
  description: DescriptionInput;
  storage: StorageChoice;
}

export class CreateDescription {
  private readonly queue = new SerialQueue();

  constructor(private readonly vault: DescriptionVault) {}

  execute(request: CreateRequest): Promise<string> {
    // Snapshot user input before queuing; the source is deliberately resolved at save time.
    const description = { ...request.description };
    const storage = { ...request.storage };
    return this.queue.run(async () => {
      const item = describeItem(description);
      const source = request.source();
      if (!this.vault.sourceExists(source)) throw new Error('The source no longer exists. Close this dialog and choose another item.');
      const folder = destinationFolder(source, storage);
      await this.vault.ensureFolder(folder);
      const basename = noteBasename(item.name);
      for (let number = 1; number <= 1000; number++) {
        const suffix = number === 1 ? '' : ` (${number})`;
        const path = joinPath(folder, `${basename}${suffix}.md`);
        if (this.vault.exists(path)) continue;
        // Recheck after asynchronous directory creation; never save an orphan silently.
        const current = request.source();
        if (!this.vault.sourceExists(current) || current.path !== source.path) {
          throw new Error('The source changed while saving. Review it and save again.');
        }
        try {
          await this.vault.create(path, renderDescription(source, item));
          return path;
        } catch (error) {
          // Another plugin may have won the path race. Only a real collision is retried.
          if (!this.vault.exists(path)) throw error;
        }
      }
      throw new Error('Too many notes have this name. Choose a different name.');
    });
  }
}
