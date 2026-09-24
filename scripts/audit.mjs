import { run } from './process.mjs';

// Audit development tooling as well as runtime dependencies; do not hide moderate findings.
run('npm', ['audit', '--audit-level=moderate']);
