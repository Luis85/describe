import { Setting, type TextComponent, type TextAreaComponent } from 'obsidian';

export function textField(
  parent: HTMLElement, name: string, description: string, value: string,
  change: (value: string) => void, multiline = false,
): Setting {
  const setting = new Setting(parent).setName(name).setDesc(description);
  const configure = (component: TextComponent | TextAreaComponent): void => {
    component.setValue(value).onChange(change);
    component.inputEl.setAttribute('aria-label', name);
    if (multiline) component.inputEl.setAttribute('rows', name === 'Description' ? '7' : '3');
  };
  if (multiline) setting.addTextArea(configure);
  else setting.addText(configure);
  setting.setClass(multiline ? 'describe-multiline' : 'describe-field');
  return setting;
}
