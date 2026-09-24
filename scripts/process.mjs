import { spawnSync } from 'node:child_process';

export function run(command, args = [], capture = false) {
  const result = spawnSync(command, args, {
    stdio: capture ? 'pipe' : 'inherit', encoding: 'utf8', shell: process.platform === 'win32',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} failed (${result.status}): ${result.stderr ?? ''}`);
  return result.stdout ?? '';
}
