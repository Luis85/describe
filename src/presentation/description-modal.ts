import { Modal, Notice, Setting, type App, type TextComponent } from 'obsidian';
import type { CreateRequest } from '../application/create-description';
import { describeItem } from '../domains/descriptions/metadata';
import { extensionKey, extensionLabel, type DescriptionInput, type SourceItem } from '../domains/descriptions/model';
import { destinationFolder, folderPath, joinPath, noteBasename, type StorageChoice } from '../domains/storage/paths';
import type { DescribeSettings } from '../domains/storage/settings';
import { textField } from './fields';

export interface DescriptionModalOptions {
  source: () => SourceItem;
  settings: DescribeSettings;
  save: (request: CreateRequest, rememberFolder: string | undefined) => Promise<{ path: string; warnings: string[] }>;
  closed: () => void;
}

export class DescriptionModal extends Modal {
  private readonly draft: DescriptionInput;
  private readonly storage: StorageChoice;
  private readonly unknown: boolean;
  private readonly sourceType: string;
  private busy = false;
  private disposed = false;
  private formFields?: HTMLFieldSetElement;
  private errorEl?: HTMLElement;
  private previewEl?: HTMLElement;
  private subfolderRow?: Setting;
  private configuredRow?: Setting;

  constructor(app: App, private readonly options: DescriptionModalOptions) {
    super(app);
    const source = options.source();
    const key = extensionKey(source);
    this.sourceType = key;
    this.unknown = !Object.hasOwn(options.settings.extensionPaths, key);
    this.draft = { name: source.name, description: '', tags: '', category: '', color: '', aliases: '' };
    this.storage = {
      mode: options.settings.defaultMode,
      configuredFolder: options.settings.extensionPaths[key] ?? options.settings.defaultFolder,
      subfolder: options.settings.subfolder,
    };
  }

  override onOpen(): void {
    this.setTitle('Describe!');
    this.contentEl.addClass('describe-modal');
    this.contentEl.createEl('p', { text: this.options.source().path, cls: 'describe-source' });
    const form = this.contentEl.createEl('form');
    form.addEventListener('submit', event => { event.preventDefault(); void this.submit(); });
    this.formFields = form.createEl('fieldset', { cls: 'describe-fields' });
    textField(this.formFields, 'Name', 'Names the description note, not the original item.', this.draft.name,
      value => { this.draft.name = value; this.updatePreview(); });
    textField(this.formFields, 'Description', 'Markdown is supported. The full text stays in the note.', '',
      value => { this.draft.description = value; }, true);
    this.addMetadata(this.formFields);
    this.addStorage(this.formFields);
    this.previewEl = this.formFields.createEl('p', { cls: 'describe-destination', attr: { 'aria-live': 'polite' } });
    this.errorEl = form.createEl('p', { cls: 'describe-error', attr: { role: 'alert' } });
    new Setting(this.formFields).setClass('describe-actions')
      .addButton(button => button.setButtonText('Cancel').onClick(() => this.close()))
      .addButton(button => {
        button.setButtonText('Save description').setCta();
        button.buttonEl.type = 'submit';
      });
    this.scope.register(['Mod'], 'Enter', () => { void this.submit(); return false; });
    this.updatePreview();
    form.querySelector<HTMLInputElement>('input')?.focus();
  }

  private addMetadata(parent: HTMLElement): void {
    const details = parent.createEl('details', { cls: 'describe-metadata' });
    details.createEl('summary', { text: 'Tags, category, color and aliases' });
    textField(details, 'Tags', 'Separate with spaces or commas. Nested tags such as project/home work too.', '',
      value => { this.draft.tags = value; });
    textField(details, 'Category', 'An optional category for this item.', '', value => { this.draft.category = value; });
    let colorText: TextComponent | undefined;
    let updatePicker: ((value: string) => void) | undefined;
    new Setting(details).setName('Color').setDesc('Optional hex color. Clear it to leave the item uncolored.')
      .addColorPicker(picker => {
        updatePicker = value => { picker.setValue(value); };
        picker.setValue('#3388cc').onChange(value => {
          this.draft.color = value; colorText?.setValue(value);
        });
      })
      .addText(text => {
        colorText = text;
        text.setPlaceholder('Hex color').onChange(value => {
          this.draft.color = value;
          if (/^#[\da-f]{6}$/iu.test(value.trim())) updatePicker?.(value.trim());
        });
        text.inputEl.setAttribute('aria-label', 'Color hex value');
      })
      .addExtraButton(button => button.setIcon('x').setTooltip('Clear color').onClick(() => {
        this.draft.color = ''; colorText?.setValue('');
      }));
    textField(details, 'Aliases', 'One alternative name per line. Commas are kept as part of an alias.', '',
      value => { this.draft.aliases = value; }, true);
  }

  private addStorage(parent: HTMLElement): void {
    const source = this.options.source();
    new Setting(parent).setName('Storage').setHeading();
    if (this.unknown) {
      parent.createEl('p', {
        text: `First description for ${extensionLabel(extensionKey(source))}. Choose a default folder for future descriptions. Nothing is remembered until a note is saved.`,
        cls: 'describe-first-use',
      });
      textField(parent, 'Default folder for this file type', 'Vault-relative path. Leave empty for the vault root.',
        this.storage.configuredFolder, value => { this.storage.configuredFolder = value; this.updatePreview(); });
    }
    new Setting(parent).setName('Save this description in').addDropdown(dropdown => {
      dropdown.addOptions({
        configured: 'Configured folder',
        'same-folder': source.kind === 'folder' ? 'Inside the selected folder' : 'Same folder as the file',
        subfolder: 'A descriptions subfolder',
      }).setValue(this.storage.mode).onChange(value => {
        if (value === 'configured' || value === 'same-folder' || value === 'subfolder') this.storage.mode = value;
        this.updatePreview();
      });
      dropdown.selectEl.setAttribute('aria-label', 'Save this description in');
    });
    this.configuredRow = new Setting(parent).setName('Configured destination')
      .setDesc(this.storage.configuredFolder || 'Vault root');
    this.subfolderRow = textField(parent, 'Descriptions subfolder', 'Relative to the file’s folder, or inside the selected folder.',
      this.storage.subfolder, value => { this.storage.subfolder = value; this.updatePreview(); });
  }

  private updatePreview(): void {
    this.subfolderRow?.settingEl.toggleClass('describe-hidden', this.storage.mode !== 'subfolder');
    this.configuredRow?.settingEl.toggleClass('describe-hidden', this.storage.mode !== 'configured' || this.unknown);
    try {
      const path = joinPath(destinationFolder(this.options.source(), this.storage), `${noteBasename(this.draft.name)}.md`);
      this.previewEl?.setText(`Destination: ${path}. A number is added if that note already exists.`);
    } catch (error) {
      this.previewEl?.setText(error instanceof Error ? error.message : 'Choose a valid destination.');
    }
  }

  private async submit(): Promise<void> {
    if (this.busy || this.disposed) return;
    try {
      describeItem(this.draft);
      if (extensionKey(this.options.source()) !== this.sourceType) {
        throw new Error('The source file type changed. Copy your draft, then reopen this dialog to choose its destination.');
      }
      if (this.unknown) folderPath(this.storage.configuredFolder);
      destinationFolder(this.options.source(), this.storage);
      this.busy = true;
      if (this.formFields) this.formFields.disabled = true;
      this.errorEl?.setText('Saving…');
      const result = await this.options.save({
        source: this.options.source, description: this.draft, storage: this.storage,
      }, this.unknown ? this.storage.configuredFolder : undefined);
      if (!this.disposed) {
        new Notice(`Description saved: ${result.path}`);
        for (const warning of result.warnings) new Notice(warning, 10_000);
      }
      this.busy = false;
      this.close();
    } catch (error) {
      this.busy = false;
      if (this.formFields) this.formFields.disabled = false;
      this.errorEl?.setText(error instanceof Error ? error.message : 'Could not save. Your text is still here; please try again.');
    }
  }

  override close(): void {
    if (!this.busy && !this.disposed) super.close();
  }

  dispose(): void {
    this.busy = false;
    this.close();
  }

  override onClose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.contentEl.empty();
    this.options.closed();
  }
}
