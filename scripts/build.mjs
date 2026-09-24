import { copyFile } from 'node:fs/promises';
import { build } from 'vite';

const watch = process.argv.includes('--watch');
const copyAssets = async () => {
  await Promise.all(['manifest.json', 'styles.css'].map(file => copyFile(file, `dist/${file}`)));
};
await build({ build: { watch: watch ? {} : null }, plugins: [{ name: 'describe-assets', closeBundle: copyAssets }] });
if (!watch) console.log('Built dist/main.js, dist/manifest.json and dist/styles.css.');
