import type { ItemDescription, SourceItem } from './model';

const MEDIA_EXTENSIONS = new Set([
  'avif', 'bmp', 'gif', 'heic', 'heif', 'jpeg', 'jpg', 'png', 'svg', 'tif', 'tiff', 'webp',
  'aac', 'aif', 'aiff', 'flac', 'm4a', 'mp3', 'oga', 'ogg', 'opus', 'wav', 'wma',
  '3gp', 'avi', 'm4v', 'mkv', 'mov', 'mp4', 'mpeg', 'mpg', 'ogv', 'webm', 'wmv',
]);

export function sourceWikilink(source: SourceItem): string {
  // Reserved wikilink delimiters must not turn a filename into a heading or alias.
  const target = source.path.replace(/[%[\]#^|\r\n]/gu, char =>
    `%${char.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')}`);
  return `[[${target}${source.kind === 'folder' ? '/' : ''}]]`;
}

export function renderDescription(source: SourceItem, item: ItemDescription): string {
  const sourceLink = sourceWikilink(source);
  const properties = {
    type: 'ItemDescription',
    source: sourceLink,
    name: item.name,
    extension: source.kind === 'folder' ? 'folder' : source.extension.toLowerCase(),
    description: Array.from(item.description).slice(0, 80).join(''),
    tags: item.tags,
    category: item.category,
    color: item.color,
    aliases: item.aliases,
  };
  // JSON scalars and arrays are valid YAML: quotes, colons and newlines stay data.
  const frontmatter = Object.entries(properties).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join('\n');
  const title = item.name.replace(/[\\`*_[\]<>]/gu, '\\$&');
  const embed = source.kind === 'file' && MEDIA_EXTENSIONS.has(source.extension.toLowerCase());
  return `---\n${frontmatter}\n---\n\n# ${title}\n\n${item.description}\n\n${embed ? '!' : ''}${sourceLink}\n`;
}
