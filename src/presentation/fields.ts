import { Setting, type TextComponent, type TextAreaComponent } from 'obsidian';

let nextFieldId = 0;

export function textField(
  parent: HTMLElement, name: string, description: string, value: string,
  change: (value: string) => void, multiline = false,
): Setting {
  const setting = new Setting(parent).setName(name).setDesc(description);
  const id = `describe-help-${++nextFieldId}`;
  setting.descEl.id = id;
  const configure = (component: TextComponent | TextAreaComponent): void => {
    component.setValue(value).onChange(change);
    component.inputEl.setAttribute('aria-label', name);
    component.inputEl.setAttribute('aria-describedby', id);
    component.inputEl.dataset.describeField = name.toLowerCase();
    if (name === 'Name' || name === 'Description') {
      component.inputEl.required = true;
      component.inputEl.setAttribute('aria-required', 'true');
    }
    if (multiline) component.inputEl.setAttribute('rows', name === 'Description' ? '7' : '3');
  };
  if (multiline) setting.addTextArea(configure);
  else setting.addText(configure);
  setting.setClass(multiline ? 'describe-multiline' : 'describe-field');
  return setting;
}
