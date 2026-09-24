import { describe, expect, it } from 'vitest';
import { describeItem } from '../../src/domains/descriptions/metadata';
import { DescriptionValidationError } from '../../src/domains/descriptions/validation-error';
import { canDescribePath, isProtectedPath } from '../../src/domains/storage/eligibility';
import { input } from '../support/fixtures';

describe('metadata boundary contracts', () => {
  it('counts Unicode code points consistently for single-line fields', () => {
    expect(describeItem({ ...input, name: '😀'.repeat(200) }).name).toBe('😀'.repeat(200));
    expect(() => describeItem({ ...input, name: '😀'.repeat(201) })).toThrow('200');
    expect(describeItem({ ...input, category: '😀'.repeat(120) }).category).toBe('😀'.repeat(120));
    expect(() => describeItem({ ...input, category: '😀'.repeat(121) })).toThrow('120');
  });
  it('normalizes CR, CRLF and LF aliases without splitting commas', () => {
    expect(describeItem({ ...input, aliases: 'First\rSecond\r\nThird\nMendez, Luis' }).aliases)
      .toEqual(['First', 'Second', 'Third', 'Mendez, Luis']);
  });
  it.each([
    ['tags', 'a'.repeat(20_001)], ['aliases', 'a'.repeat(40_001)],
    ['tags', Array.from({ length: 101 }, (_, index) => `tag${index}`).join(' ')],
    ['aliases', Array.from({ length: 101 }, (_, index) => `Alias ${index}`).join('\n')],
    ['description', 'A\u0000B'], ['color', 'red'], ['category', 'A\nB'],
  ] as const)('returns a field-specific error for %s', (field, value) => {
    try {
      describeItem({ ...input, [field]: value });
      throw new Error('Validation should reject this value.');
    } catch (error) {
      expect(error).toBeInstanceOf(DescriptionValidationError);
      expect(error).toMatchObject({ field });
    }
  });
  it('keeps generated tag and alias normalization idempotent', () => {
    for (let index = 0; index < 50; index++) {
      const first = describeItem({ ...input, tags: `#Tag${index} tag${index} nested/child`, aliases: `Alias ${index}\nALIAS ${index}` });
      const second = describeItem({ ...input, tags: first.tags.join(' '), aliases: first.aliases.join('\n') });
      expect(second).toEqual(first);
    }
  });
});

describe('target eligibility', () => {
  it.each(['', '/', '.hidden', 'Assets/.secret', 'Config', 'Config/plugins'])('rejects %s', path => {
    expect(canDescribePath(path, 'Config')).toBe(false);
  });
  it('does not confuse a configuration prefix with a sibling folder', () => {
    expect(canDescribePath('Configuration/photo.png', 'Config')).toBe(true);
    expect(isProtectedPath('Notes/Config', 'Config')).toBe(false);
    expect(canDescribePath('Assets/anything.custom', 'Config')).toBe(true);
    expect(isProtectedPath('', 'Config')).toBe(false);
  });
});
