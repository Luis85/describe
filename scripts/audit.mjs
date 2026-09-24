import { run } from './process.mjs';

// Development dependencies are reviewed too; high or critical findings block CI.
// Moderate findings remain visible in the report and require maintainer triage.
run('npm', ['audit', '--audit-level=high']);
