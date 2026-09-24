import { Setting, type TextComponent } from 'obsidian';
import type { DescriptionInput } from '../domains/descriptions/model';
import { textField } from './fields';

export function addMetadataFields(parent: HTMLElement, draft: DescriptionInput): void {
  const details = parent.createEl('details', { cls: 'describe-metadata' });
  details.createEl('summary', { text: 'Tags, category, color and aliases' });
  textField(details, 'Tags', 'Separate with spaces or commas. Nested tags such as project/home work too.', '',
    value => { draft.tags = value; });
  textField(details, 'Category', 'An optional category for this item.', '', value => { draft.category = value; });
  let colorText: TextComponent | undefined;
  let updatePicker: ((value: string) => void) | undefined;
  const colorSetting = new Setting(details).setName('Color').setDesc('Optional hex color. Clear it to leave the item uncolored.')
    .addColorPicker(picker => {
      updatePicker = value => { picker.setValue(value); };
      picker.setValue('#3388cc').onChange(value => { draft.color = value; colorText?.setValue(value); });
    })
    .addText(text => {
      colorText = text;
      text.setPlaceholder('No color').onChange(value => {
        draft.color = value;
        if (/^#[\da-f]{6}$/iu.test(value.trim())) updatePicker?.(value.trim());
      });
      text.inputEl.setAttribute('aria-label', 'Color hex value');
      text.inputEl.dataset.describeField = 'color';
      text.inputEl.spellcheck = false;
    })
    .addButton(button => {
      button.setButtonText('Clear color').onClick(() => {
        draft.color = ''; colorText?.setValue(''); updatePicker?.('#3388cc');
      });
      button.buttonEl.type = 'button';
      button.buttonEl.setAttribute('aria-label', 'Clear color');
    });
  colorSetting.controlEl.querySelector('input[type="color"]')?.setAttribute('aria-label', 'Choose color');
  textField(details, 'Aliases', 'One alternative name per line. Commas are kept as part of an alias.', '',
    value => { draft.aliases = value; }, true);
}
