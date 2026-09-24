// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DescriptionModal, type DescriptionModalOptions } from '../../src/presentation/description-modal';
import { defaultSettings } from '../../src/domains/storage/settings';
import { image } from '../support/fixtures';
import { createApp } from '../support/app';
import { Modal, Notice } from '../support/obsidian-mock';

function setup() {
  const save = vi.fn<DescriptionModalOptions['save']>().mockResolvedValue({ path: 'Saved.md', warnings: [] });
  const modal = new DescriptionModal(createApp().app, { source: () => image, settings: defaultSettings(), save, closed: vi.fn() });
  modal.open();
  const field = (label: string): HTMLInputElement | HTMLTextAreaElement => {
    const element = modal.contentEl.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[aria-label="${label}"]`);
    if (!element) throw new Error(`Missing ${label}`);
    return element;
  };
  const enter = (label: string, value: string): void => {
    const element = field(label); element.value = value; element.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const submit = (): void => { modal.contentEl.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true })); };
  return { modal, save, field, enter, submit };
}

afterEach(() => {
  for (const modal of Modal.instances) modal.close();
  Modal.instances.length = 0; Notice.messages.length = 0; document.body.replaceChildren();
});

describe('accessible modal feedback', () => {
  it('reveals invalid optional metadata and focuses its control', () => {
    const { modal, field, enter, submit, save } = setup();
    enter('Description', 'Keep this'); enter('Tags', '123'); submit();
    expect(modal.contentEl.querySelector('details')?.open).toBe(true);
    expect(field('Tags').getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(field('Tags'));
    expect(save).not.toHaveBeenCalled();
    enter('Tags', 'valid');
    expect(field('Tags').hasAttribute('aria-invalid')).toBe(false);
    expect(modal.contentEl.querySelector('[role="alert"]')?.textContent).toBe('');
  });
  it('associates unique help text and required state with fields in multiple modals', () => {
    const first = setup(); const second = setup();
    const id = first.field('Name').getAttribute('aria-describedby');
    expect(id).not.toBe(second.field('Name').getAttribute('aria-describedby'));
    expect(document.getElementById(id ?? '')?.textContent).toContain('Required');
    expect(first.field('Description').required).toBe(true);
  });
  it('announces saving as status, blocks all buttons, and restores after failure', async () => {
    const { modal, enter, submit, save } = setup();
    let reject: ((reason: Error) => void) | undefined;
    save.mockImplementationOnce(() => new Promise((_resolve, fail) => { reject = fail; }));
    enter('Description', 'A description'); submit();
    expect(modal.contentEl.getAttribute('aria-busy')).toBe('true');
    expect(modal.contentEl.querySelector('[role="status"]')?.textContent).toContain('Saving');
    expect(modal.contentEl.querySelector('[role="alert"]')?.textContent).toBe('');
    const clear = modal.contentEl.querySelector<HTMLButtonElement>('[aria-label="Clear color"]');
    expect(clear?.tagName).toBe('BUTTON');
    expect(clear?.matches(':disabled')).toBe(true);
    reject?.(new Error('Disk full'));
    await vi.waitFor(() => expect(modal.contentEl.getAttribute('aria-busy')).toBe('false'));
    expect(modal.contentEl.querySelector('button[type="submit"]')?.textContent).toBe('Save description');
    expect(document.activeElement).toBe(modal.contentEl.querySelector('[role="alert"]'));
  });
  it('updates the character summary without counting surrogate halves', () => {
    const { modal, enter } = setup();
    enter('Description', '😀'.repeat(81));
    expect(modal.contentEl.querySelector('.describe-summary')?.textContent).toContain('81 characters');
    expect(modal.contentEl.querySelector('.describe-summary')?.textContent).toContain('first 80');
  });
  it('synchronizes the color picker and hex field in both directions', () => {
    const { modal, field, enter } = setup();
    enter('Color hex value', '#112233');
    const picker = field('Choose color');
    expect(picker.value).toBe('#112233');
    picker.value = '#445566'; picker.dispatchEvent(new Event('input', { bubbles: true }));
    expect(field('Color hex value').value).toBe('#445566');
    modal.contentEl.querySelector<HTMLButtonElement>('[aria-label="Clear color"]')?.click();
    expect(field('Color hex value').value).toBe('');
  });
});
