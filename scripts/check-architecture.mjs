import { readFile } from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';
import { filesIn } from './files.mjs';

const allowed = {
  domains: new Set(['domains']),
  application: new Set(['domains', 'application']),
  infrastructure: new Set(['domains', 'application', 'infrastructure']),
  presentation: new Set(['domains', 'application', 'presentation']),
};
for (const file of (await filesIn('src')).filter(file => file.endsWith('.ts'))) {
  const normalized = file.replace(/\\/gu, '/');
  const layer = normalized.split('/')[1];
  const tree = ts.createSourceFile(file, await readFile(file, 'utf8'), ts.ScriptTarget.Latest, true);
  function visit(node) {
    let specifier;
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      specifier = node.moduleSpecifier.text;
    }
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) {
      specifier = node.arguments[0].text;
    }
    if (specifier) {
      if (/^(node:|fs$|path$|electron$|child_process$)/u.test(specifier)) throw new Error(`Desktop-only import in ${file}: ${specifier}`);
      if (specifier.startsWith('.')) {
        const target = path.normalize(path.join(path.dirname(file), specifier)).replace(/\\/gu, '/').split('/')[1];
        if (allowed[layer] && !allowed[layer].has(target)) throw new Error(`Architecture violation: ${file} imports ${specifier}`);
      } else if ((layer === 'domains' || layer === 'application')) throw new Error(`Core must not depend on packages: ${file} -> ${specifier}`);
    }
    ts.forEachChild(node, visit);
  }
  visit(tree);
}
console.log('Architecture boundaries and mobile-safe runtime imports verified.');
