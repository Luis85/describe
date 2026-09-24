import { run } from './process.mjs';

const tasks = {
  typecheck() {
    const version = run('tsc', ['--version'], true).trim();
    if (!/^Version 7\./u.test(version)) throw new Error(`TypeScript 7 is required; found ${version}. Run npm ci.`);
    console.log(version);
    run('tsc', ['--noEmit', '-p', 'tsconfig.json']);
    run('tsc', ['--noEmit', '-p', 'tests/e2e/tsconfig.json']);
  },
  test() { run('vitest', ['run']); },
  coverage() { run('vitest', ['run', '--coverage']); },
  lint() { run('eslint', ['src', 'tests', '--max-warnings', '0']); },
  oxlint() { run('oxlint', ['src', 'tests', '--deny-warnings']); },
  fallow() { run('fallow', ['dead-code']); },
  async check() {
    const gates = [
      ['TypeScript 7 (source, unit and native tests)', tasks.typecheck], ['ESLint (including code-line limits)', tasks.lint], ['Oxlint', tasks.oxlint],
      ['ESLint policy regression', () => import('./check-lint-policy.mjs')],
      ['Architecture', () => import('./check-architecture.mjs')],
      ['Tests and coverage', tasks.coverage], ['Fallow', tasks.fallow],
      ['Build', () => import('./build.mjs')], ['Release contract', () => import('./check-release.mjs')],
    ];
    const failures = [];
    for (const [name, operation] of gates) {
      console.log(`\n--- ${name} ---`);
      try { await operation(); }
      catch (error) { failures.push(name); console.error(error instanceof Error ? error.message : error); }
    }
    if (failures.length) throw new Error(`Failed quality gates: ${failures.join(', ')}`);
  },
};
try {
  const task = tasks[process.argv[2]];
  if (!task) throw new Error(`Choose a task: ${Object.keys(tasks).join(', ')}`);
  await task();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
