import { readFile } from 'node:fs/promises';
import { filesIn } from './files.mjs';

for (const [directory, limit] of [['src', 400], ['tests', 450]]) {
  let largest = 0;
  for (const file of await filesIn(directory)) {
    const source = await readFile(file, 'utf8');
    const lines = source.replace(/\n$/u, '').split('\n').length;
    largest = Math.max(largest, lines);
    if (lines > limit) throw new Error(`${file}: ${lines} lines exceeds ${limit}. Split the file.`);
  }
  console.log(`${directory}: largest file ${largest}/${limit} physical lines (including comments and blanks).`);
}
