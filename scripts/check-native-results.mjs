import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const required = [
  'registers one native menu action and cancels without side effects',
  'saves arbitrary-extension metadata using the real YAML parser',
  'creates a custom local folder and embeds an image without modifying it',
  'places folder descriptions inside the selected folder',
  'keeps a draft after invalid input and creates collision-safe notes',
  'renders and persists native declarative settings in the host settings window',
  'has no automated WCAG A/AA violations or horizontal modal overflow',
  'remembers first-use routing across a real plugin reload',
  'releases the app, driver and copied directories after a test body rejects',
  'releases an acquired real session when final initialization rejects',
];
const report = JSON.parse(await readFile('reports/native/vitest-results.json', 'utf8'));
const results = report.testResults.flatMap(file => file.assertionResults);
assert.equal(report.success, true, 'Native Vitest did not report success.');
assert.ok(results.every(test => test.status === 'passed'), 'Skipped, pending or failed native cases cannot satisfy release acceptance.');
for (const title of required) {
  assert.equal(results.filter(test => test.title === title).length, 1, `Required native case must run exactly once: ${title}`);
}
console.log(`Verified ${results.length} executed native Vitest cases, including all eight product and two cleanup scenarios.`);
