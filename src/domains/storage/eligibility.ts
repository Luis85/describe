/** Keep hidden and host-configuration paths out of every entry point. */
export function isProtectedPath(path: string, configDir = ''): boolean {
  return path.split('/').some(segment => segment.startsWith('.'))
    || (configDir !== '' && (path === configDir || path.startsWith(`${configDir}/`)));
}

export function canDescribePath(path: string, configDir = ''): boolean {
  return path !== '' && path !== '/' && !isProtectedPath(path, configDir);
}
