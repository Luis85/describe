/** ASCII control characters are invalid in a one-line field or vault path. */
export function isControlCharacter(character: string): boolean {
  const code = character.charCodeAt(0);
  return code < 32 || code === 127;
}
