import { Modal, Notice, Setting, type App, type ButtonComponent } from 'obsidian';
import type { CreateRequest } from '../application/create-description';
import { describeItem } from '../domains/descriptions/metadata';
import { DescriptionValidationError } from '../domains/descriptions/validation-error';
import { extensionKey, extensionLabel, type DescriptionInput, type SourceItem } from '../domains/descriptions/model';
import { destinationFolder, folderPath, joinPath, noteBasename, type StorageChoice } from '../domains/storage/paths';
import type { DescribeSettings } from '../domains/storage/settings';
import { textField } from './fields';
import { addMetadataFields } from './metadata-fields';

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
  private statusEl?: HTMLElement;
  private sourceEl?: HTMLElement;
  private previewEl?: HTMLElement;
  private summaryEl?: HTMLElement;
  private saveButton?: ButtonComponent;
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
    this.sourceEl = this.contentEl.createEl('p', { text: this.options.source().path, cls: 'describe-source' });
    const form = this.contentEl.createEl('form');
    form.noValidate = true; // One domain validator and one accessible error presentation.
    form.addEventListener('submit', event => { event.preventDefault(); void this.submit(); });
    form.addEventListener('input', () => {
      this.errorEl?.setText('');
      form.querySelectorAll('[aria-invalid="true"]').forEach(element => element.removeAttribute('aria-invalid'));
    });
    this.formFields = form.createEl('fieldset', { cls: 'describe-fields', attr: { 'aria-label': 'Description details' } });
    textField(this.formFields, 'Name', 'Required. Names the new description note, not the original item.', this.draft.name,
      value => { this.draft.name = value; this.updatePreview(); });
    textField(this.formFields, 'Description', 'Required. Markdown is supported; the full text stays in the note.', '',
      value => { this.draft.description = value; this.updateSummary(); }, true);
    this.summaryEl = this.formFields.createEl('p', { cls: 'describe-summary' });
    addMetadataFields(this.formFields, this.draft);
    this.addStorage(this.formFields);
    this.previewEl = this.formFields.createEl('p', { cls: 'describe-destination', attr: { 'aria-live': 'polite', 'aria-atomic': 'true' } });
    this.errorEl = form.createEl('p', { cls: 'describe-error', attr: { role: 'alert', tabindex: '-1' } });
    this.statusEl = form.createEl('p', { cls: 'describe-status', attr: { role: 'status' } });
    new Setting(this.formFields).setClass('describe-actions')
      .addButton(button => {
        button.setButtonText('Cancel').onClick(() => this.close());
        button.buttonEl.type = 'button';
      })
      .addButton(button => {
        this.saveButton = button;
        button.setButtonText('Save description').setCta();
        button.buttonEl.type = 'submit';
      });
    this.scope.register(['Mod'], 'Enter', event => {
      if (event.isComposing) return true;
      void this.submit(); return false;
    });
    this.updatePreview();
    this.updateSummary();
    form.querySelector<HTMLInputElement>('input')?.focus();
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
    this.configuredRow = new Setting(parent).setName('Configured destination').setDesc(this.storage.configuredFolder || 'Vault root');
    this.subfolderRow = textField(parent, 'Descriptions subfolder', 'Relative to the file’s folder, or inside the selected folder.',
      this.storage.subfolder, value => { this.storage.subfolder = value; this.updatePreview(); });
  }

  private updateSummary(): void {
    const count = Array.from(this.draft.description.replace(/\r\n?/gu, '\n')).length;
    this.summaryEl?.setText(`${count} characters. The summary uses the first ${Math.min(count, 80)}; the full description is preserved.`);
  }

  private updatePreview(): void {
    this.subfolderRow?.settingEl.toggleClass('describe-hidden', this.storage.mode !== 'subfolder');
    this.configuredRow?.settingEl.toggleClass('describe-hidden', this.storage.mode !== 'configured' || this.unknown);
    try {
      const source = this.options.source();
      this.sourceEl?.setText(source.path);
      const path = joinPath(destinationFolder(source, this.storage), `${noteBasename(this.draft.name)}.md`);
      this.previewEl?.setText(`Destination: ${path}. A number is added if that note already exists.`);
    } catch (error) {
      this.previewEl?.setText(error instanceof Error ? error.message : 'Choose a valid destination.');
    }
  }

  private setBusy(busy: boolean): void {
    this.busy = busy;
    if (this.formFields) this.formFields.disabled = busy;
    this.contentEl.setAttribute('aria-busy', String(busy));
    this.statusEl?.setText(busy ? 'Saving description…' : '');
    this.saveButton?.setButtonText(busy ? 'Saving…' : 'Save description');
  }

  private reportError(error: unknown): void {
    this.errorEl?.setText(error instanceof Error ? error.message : 'Could not save. Your text is still here; please try again.');
    if (error instanceof DescriptionValidationError) {
      const field = this.contentEl.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[data-describe-field="${error.field}"]`);
      const details = field?.closest('details');
      if (details) details.open = true;
      field?.setAttribute('aria-invalid', 'true');
      field?.focus();
    } else this.errorEl?.focus();
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
      this.errorEl?.setText('');
      this.setBusy(true);
      const result = await this.options.save({
        source: this.options.source, description: this.draft, storage: this.storage,
      }, this.unknown ? this.storage.configuredFolder : undefined);
      if (this.disposed) return;
      new Notice(`Description saved: ${result.path}`);
      for (const warning of result.warnings) new Notice(warning, 10_000);
      this.setBusy(false);
      this.close();
    } catch (error) {
      if (this.disposed) return;
      this.setBusy(false);
      this.reportError(error);
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
