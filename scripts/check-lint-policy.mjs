import assert from 'node:assert/strict';
import { ESLint } from 'eslint';

// Test ESLint's actual effective policy; do not implement a second line counter.
const repositoryLinter = new ESLint();
const probes = [['src/main.ts', 400], ['tests/support/app.ts', 450], ['tests/e2e/vitest.config.mts', 450]];
for (const [filePath, max] of probes) {
  const config = await repositoryLinter.calculateConfigForFile(filePath);
  const rule = config.rules['max-lines'];
  assert.deepEqual(rule, [2, { max, skipBlankLines: true, skipComments: true }]);
  const linter = new ESLint({ overrideConfigFile: true, overrideConfig: { rules: { 'max-lines': rule } } });
  const comments = '\n\n// A comment-only line\n/* A block comment\n * continued\n */\n'.repeat(100);
  for (const [lines, fails] of [[max, false], [max + 1, true]]) {
    const code = comments + 'void 0; // Inline comment\n'.repeat(lines);
    const [result] = await linter.lintText(code, { filePath: 'policy-fixture.js' });
    assert.equal(result.messages.some(message => message.ruleId === 'max-lines'), fails);
    assert.equal(result.fatalErrorCount, 0);
  }
  console.log(`ESLint verified: ${filePath}: ${max} code lines; blanks and comment-only lines excluded.`);
}

const nodeImport = "import { readFile } from 'node:fs/promises';\nexport { readFile };\n";
for (const [filePath, blocked] of [['src/main.ts', true], ['tests/release/dependencies.test.ts', false]]) {
  const [result] = await repositoryLinter.lintText(nodeImport, { filePath });
  assert.equal(result.fatalErrorCount, 0);
  assert.equal(result.messages.some(message => message.ruleId === 'obsidianmd/no-nodejs-modules'), blocked);
}
console.log('Node built-ins remain forbidden in plugin source and permitted in Node test runners.');
