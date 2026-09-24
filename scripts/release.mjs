import { readFile } from 'node:fs/promises';
import { run } from './process.mjs';
import './check-release.mjs';
const { version } = JSON.parse(await readFile('manifest.json', 'utf8'));
if (process.env.GITHUB_REF_NAME !== version) throw new Error('The tag must exactly match the manifest version, without a v prefix.');
run('gh', ['release', 'create', version, 'dist/main.js', 'dist/manifest.json', 'dist/styles.css',
  '--verify-tag', '--draft', '--title', `Describe ${version}`, '--generate-notes']);
