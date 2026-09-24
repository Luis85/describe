// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DescriptionModal, type DescriptionModalOptions } from '../../src/presentation/description-modal';
import { defaultSettings } from '../../src/domains/storage/settings';
import { image } from '../support/fixtures';
import { createApp } from '../support/app';
import { Modal, Notice } from '../support/obsidian-mock';

function control<T extends Element>(root: HTMLElement, selector: string): T {
  const result = root.querySelector<T>(selector);
  if (!result) throw new Error(`Missing control: ${selector}`);
  return result;
}
function enter(root: HTMLElement, name: string, value: string): void {
  const field = control<HTMLInputElement | HTMLTextAreaElement>(root, `[aria-label="${name}"]`);
  field.value = value; field.dispatchEvent(new Event('input', { bubbles: true }));
}
function submit(root: HTMLElement): void {
  control<HTMLFormElement>(root, 'form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}
function setup(settings = defaultSettings()) {
  const save = vi.fn<DescriptionModalOptions['save']>().mockResolvedValue({ path: 'Descriptions/Test.md', warnings: [] });
  const closed = vi.fn();
  const modal = new DescriptionModal(createApp().app, { source: () => image, settings, save, closed });
  modal.open();
  return { modal, save, closed, root: modal.contentEl };
}
afterEach(() => {
  for (const modal of Modal.instances) modal.close();
  Modal.instances.length = 0; Notice.messages.length = 0; document.body.replaceChildren();
});

describe('description modal', () => {
  it('asks about an unknown extension and cancels without saving', () => {
    const { modal, root, save, closed } = setup();
    expect(root.textContent).toContain('First description for .jpg');
    expect(root.textContent).toContain('Destination: Descriptions/photo.md');
    modal.close();
    expect(save).not.toHaveBeenCalled(); expect(closed).toHaveBeenCalled();
  });
  it('recognizes an explicit vault-root mapping as known', () => {
    const settings = defaultSettings(); settings.extensionPaths['file:jpg'] = '';
    const { root } = setup(settings);
    expect(root.textContent).not.toContain('First description');
    expect(root.textContent).toContain('Destination: photo.md');
  });
  it('submits metadata and the new extension destination', async () => {
    const { root, save, closed } = setup();
    enter(root, 'Description', 'Full description'); enter(root, 'Name', 'Test');
    enter(root, 'Tags', 'home #trip'); enter(root, 'Category', 'Photo');
    enter(root, 'Color hex value', '#3388cc'); enter(root, 'Aliases', 'Vacation\nHoliday');
    enter(root, 'Default folder for this file type', 'Photos');
    submit(root);
    await vi.waitFor(() => expect(closed).toHaveBeenCalled());
    expect(save).toHaveBeenCalledWith(expect.objectContaining({
      description: { name: 'Test', description: 'Full description', tags: 'home #trip', category: 'Photo', color: '#3388cc', aliases: 'Vacation\nHoliday' },
    }), 'Photos');
  });
  it('updates the local folder preview and clears color', async () => {
    const { root, save } = setup();
    enter(root, 'Description', 'Description'); enter(root, 'Color hex value', '#112233');
    control<HTMLButtonElement>(root, '[aria-label="Clear color"]').click();
    const select = control<HTMLSelectElement>(root, 'select');
    select.value = 'subfolder'; select.dispatchEvent(new Event('change'));
    enter(root, 'Descriptions subfolder', 'Metadata');
    expect(root.textContent).toContain('Assets/Metadata/photo.md');
    submit(root);
    await vi.waitFor(() => expect(save).toHaveBeenCalled());
    expect(save.mock.calls[0]?.[0].description.color).toBe('');
    expect(save.mock.calls[0]?.[0].storage.mode).toBe('subfolder');
  });
  it('keeps entered text after a save failure', async () => {
    const { root, save } = setup();
    save.mockRejectedValueOnce(new Error('Read only'));
    enter(root, 'Description', 'Do not lose this'); submit(root);
    await vi.waitFor(() => expect(root.textContent).toContain('Read only'));
    expect(control<HTMLTextAreaElement>(root, '[aria-label="Description"]').value).toBe('Do not lose this');
    expect(control<HTMLFieldSetElement>(root, 'fieldset').disabled).toBe(false);
  });
  it('shows validation errors without calling the save operation', async () => {
    const { root, save } = setup();
    submit(root);
    await vi.waitFor(() => expect(root.textContent).toContain('Enter a description'));
    expect(save).not.toHaveBeenCalled();
  });
  it('blocks a double submission and closing during an active save', async () => {
    const { root, save, modal, closed } = setup();
    let finish: ((value: { path: string; warnings: string[] }) => void) | undefined;
    save.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    enter(root, 'Description', 'Description'); submit(root); submit(root); modal.close();
    expect(save).toHaveBeenCalledOnce(); expect(closed).not.toHaveBeenCalled();
    finish?.({ path: 'Saved.md', warnings: ['Optional step failed'] });
    await vi.waitFor(() => expect(closed).toHaveBeenCalled());
    expect(Notice.messages).toContain('Optional step failed');
  });
  it('disposes a modal safely during plugin unloading', () => {
    const { modal, closed } = setup(); modal.dispose(); expect(closed).toHaveBeenCalled();
  });
});
