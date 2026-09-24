import { vi } from 'vitest';
import type { App, Command, PluginManifest, SettingDefinitionItem } from 'obsidian';

export class TAbstractFile {
  name: string;
  constructor(public path: string) { this.name = path.split('/').at(-1) ?? ''; }
}
export class TFile extends TAbstractFile {
  extension: string;
  basename: string;
  constructor(path: string) {
    super(path);
    const dot = this.name.lastIndexOf('.');
    this.extension = dot > 0 ? this.name.slice(dot + 1) : '';
    this.basename = dot > 0 ? this.name.slice(0, dot) : this.name;
  }
}
export class TFolder extends TAbstractFile { isRoot(): boolean { return this.path === '/'; } }

export class Notice {
  static messages: string[] = [];
  constructor(message: string) { Notice.messages.push(message); }
}

export class Modal {
  static instances: Modal[] = [];
  contentEl: HTMLElement;
  scope = { register: vi.fn() };
  constructor(public app: App) {
    this.contentEl = document.createElement('div');
    Modal.instances.push(this);
  }
  setTitle(title: string): void { this.contentEl.setAttribute('aria-label', title); }
  onOpen(): void {}
  onClose(): void {}
  open(): void { document.body.append(this.contentEl); this.onOpen(); }
  close(): void { this.onClose(); this.contentEl.remove(); }
}

export class FuzzySuggestModal<T> extends Modal {
  setPlaceholder(_placeholder: string): this { return this; }
  getItems(): T[] { return []; }
  getItemText(_item: T): string { return ''; }
  onChooseItem(_item: T): void {}
}

class TextBase<T extends HTMLInputElement | HTMLTextAreaElement> {
  constructor(public inputEl: T) {}
  setValue(value: string): this { this.inputEl.value = value; return this; }
  setPlaceholder(value: string): this { this.inputEl.placeholder = value; return this; }
  onChange(callback: (value: string) => void): this {
    this.inputEl.addEventListener('input', () => callback(this.inputEl.value)); return this;
  }
}
export class TextComponent extends TextBase<HTMLInputElement> {
  constructor(parent: HTMLElement) { super(parent.createEl('input')); }
}
export class TextAreaComponent extends TextBase<HTMLTextAreaElement> {
  constructor(parent: HTMLElement) { super(parent.createEl('textarea')); }
}
class ColorComponent extends TextComponent {
  constructor(parent: HTMLElement) { super(parent); this.inputEl.type = 'color'; }
}
export class ButtonComponent {
  buttonEl: HTMLButtonElement;
  constructor(parent: HTMLElement) { this.buttonEl = parent.createEl('button'); this.buttonEl.type = 'button'; }
  setButtonText(value: string): this { this.buttonEl.textContent = value; return this; }
  setCta(): this { return this; }
  setIcon(value: string): this { this.buttonEl.dataset.icon = value; return this; }
  setTooltip(value: string): this { this.buttonEl.setAttribute('aria-label', value); return this; }
  onClick(callback: () => void): this { this.buttonEl.addEventListener('click', callback); return this; }
}
class DropdownComponent {
  selectEl: HTMLSelectElement;
  constructor(parent: HTMLElement) { this.selectEl = parent.createEl('select'); }
  addOptions(options: Record<string, string>): this {
    for (const [value, label] of Object.entries(options)) {
      const option = this.selectEl.createEl('option', { text: label }); option.value = value;
    }
    return this;
  }
  setValue(value: string): this { this.selectEl.value = value; return this; }
  onChange(callback: (value: string) => void): this {
    this.selectEl.addEventListener('change', () => callback(this.selectEl.value)); return this;
  }
}
export class Setting {
  settingEl: HTMLElement;
  controlEl: HTMLElement;
  nameEl: HTMLElement;
  descEl: HTMLElement;
  constructor(parent: HTMLElement) {
    this.settingEl = parent.createEl('div', { cls: 'setting-item' });
    const info = this.settingEl.createEl('div', { cls: 'setting-item-info' });
    this.nameEl = info.createEl('div', { cls: 'setting-item-name' });
    this.descEl = info.createEl('div', { cls: 'setting-item-description' });
    this.controlEl = this.settingEl.createEl('div', { cls: 'setting-item-control' });
  }
  setName(value: string): this { this.nameEl.setText(value); this.settingEl.setAttribute('data-name', value); return this; }
  setDesc(value: string): this { this.descEl.setText(value); this.settingEl.setAttribute('data-description', value); return this; }
  setHeading(): this { return this; }
  setClass(value: string): this { this.settingEl.addClass(value); return this; }
  addText(callback: (component: TextComponent) => void): this { callback(new TextComponent(this.controlEl)); return this; }
  addTextArea(callback: (component: TextAreaComponent) => void): this { callback(new TextAreaComponent(this.controlEl)); return this; }
  addButton(callback: (component: ButtonComponent) => void): this { callback(new ButtonComponent(this.controlEl)); return this; }
  addColorPicker(callback: (component: ColorComponent) => void): this { callback(new ColorComponent(this.controlEl)); return this; }
  addDropdown(callback: (component: DropdownComponent) => void): this { callback(new DropdownComponent(this.controlEl)); return this; }
}

export class Plugin {
  data: unknown = null;
  commands: Command[] = [];
  settingsTabs: PluginSettingTab[] = [];
  constructor(public app: App, public manifest: PluginManifest) {}
  loadData(): Promise<unknown> { return Promise.resolve(this.data); }
  saveData(data: unknown): Promise<void> { this.data = data; return Promise.resolve(); }
  addCommand(command: Command): void { this.commands.push(command); }
  addSettingTab(tab: PluginSettingTab): void { this.settingsTabs.push(tab); }
  registerEvent(_event: unknown): void {}
  onload(): void | Promise<void> {}
  onunload(): void {}
}
export class PluginSettingTab {
  constructor(public app: App, public plugin: Plugin) {}
  update(): void { this.getSettingDefinitions(); }
  getSettingDefinitions(): SettingDefinitionItem[] { return []; }
  getControlValue(_key: string): unknown { return undefined; }
  setControlValue(_key: string, _value: unknown): void | Promise<void> {}
}
