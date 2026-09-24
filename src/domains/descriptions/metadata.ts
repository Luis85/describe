import type { DescriptionInput, ItemDescription } from './model';

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  return values.map(value => value.trim()).filter(value => {
    const key = value.toLowerCase();
    if (!value || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function singleLine(value: string, label: string, max: number): string {
  const result = value.trim();
  if (/[\r\n\u0000-\u001f\u007f]/u.test(result) || result.length > max) {
    throw new Error(`${label} must be one line of at most ${max} characters.`);
  }
  return result;
}

export function describeItem(input: DescriptionInput): ItemDescription {
  const name = singleLine(input.name, 'Name', 200);
  if (!name) throw new Error('Enter a name.');
  if (!input.description.trim()) throw new Error('Enter a description.');
  if (input.description.length > 100_000) throw new Error('Description is too long (100,000 characters maximum).');
  if (input.description.includes('\u0000')) throw new Error('Remove null characters from the description.');
  const tags = unique(input.tags.split(/[,\s]+/u).map(tag => tag.replace(/^#+/u, '')));
  for (const tag of tags) {
    const valid = /^[\p{L}\p{M}\p{N}_-]+(?:\/[\p{L}\p{M}\p{N}_-]+)*$/u.test(tag);
    if (!valid || !/[\p{L}\p{M}_-]/u.test(tag)) {
      throw new Error(`Invalid tag: ${tag}. Use letters, numbers, /, - or _; not numbers alone.`);
    }
  }
  if (tags.length > 100) throw new Error('Use at most 100 tags.');
  const aliases = unique(input.aliases.split(/\r?\n/u));
  if (aliases.length > 100) throw new Error('Use at most 100 aliases.');
  for (const alias of aliases) singleLine(alias, 'Each alias', 200);
  const color = input.color.trim().toLowerCase();
  if (color && !/^#[\da-f]{6}$/u.test(color)) throw new Error('Color must be a six-digit hex value, such as #3388cc.');
  return {
    name,
    description: input.description.replace(/\r\n?/gu, '\n'),
    tags,
    category: singleLine(input.category, 'Category', 120),
    color,
    aliases,
  };
}
