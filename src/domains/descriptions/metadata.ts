import { isControlCharacter } from '../text';
import type { DescriptionInput, ItemDescription } from './model';
import { DescriptionValidationError } from './validation-error';

function fail(field: keyof DescriptionInput, message: string): never {
  throw new DescriptionValidationError(field, message);
}

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  return values.map(value => value.trim()).filter(value => {
    const key = value.toLowerCase();
    if (!value || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function singleLine(value: string, field: keyof DescriptionInput, label: string, max: number): string {
  const result = value.trim();
  const characters = Array.from(result);
  if (characters.some(isControlCharacter) || characters.length > max) {
    fail(field, `${label} must be one line of at most ${max} characters.`);
  }
  return result;
}

export function describeItem(input: DescriptionInput): ItemDescription {
  const name = singleLine(input.name, 'name', 'Name', 200);
  if (!name) fail('name', 'Enter a name.');
  if (!input.description.trim()) fail('description', 'Enter a description.');
  if (input.description.length > 100_000) fail('description', 'Description is too long (100,000 characters maximum).');
  if (input.description.includes('\u0000')) fail('description', 'Remove null characters from the description.');
  if (input.tags.length > 20_000) fail('tags', 'Tag input is too long. Use at most 100 tags.');
  const tags = unique(input.tags.split(/[,\s]+/u).map(tag => tag.replace(/^#+/u, '')));
  for (const tag of tags) {
    const valid = /^[\p{L}\p{M}\p{N}_-]+(?:\/[\p{L}\p{M}\p{N}_-]+)*$/u.test(tag);
    if (!valid || !/[\p{L}\p{M}_-]/u.test(tag)) {
      fail('tags', `Invalid tag: ${tag}. Use letters, numbers, /, - or _; not numbers alone.`);
    }
  }
  if (tags.length > 100) fail('tags', 'Use at most 100 tags.');
  if (input.aliases.length > 40_000) fail('aliases', 'Alias input is too long. Use at most 100 aliases.');
  const aliases = unique(input.aliases.split(/\r\n?|\n/u));
  if (aliases.length > 100) fail('aliases', 'Use at most 100 aliases.');
  for (const alias of aliases) singleLine(alias, 'aliases', 'Each alias', 200);
  const color = input.color.trim().toLowerCase();
  if (color && !/^#[\da-f]{6}$/u.test(color)) fail('color', 'Color must be a six-digit hex value, such as #3388cc.');
  return {
    name, description: input.description.replace(/\r\n?/gu, '\n'), tags,
    category: singleLine(input.category, 'category', 'Category', 120), color, aliases,
  };
}
