# Native Obsidian acceptance with Vitest

Migration from the merged dependency-maintenance baseline, 2026-09-24. This document describes the implementation; the checks on the reviewed commit determine whether it has passed.

## Architecture

Vitest 5 owns collection, hooks, fixtures, assertions, timeouts and JSON/JUnit reporting for both test layers. `npm run check` runs the fast Node/jsdom tests; `npm run test:e2e` builds and runs a separate Node-only Vitest configuration controlling actual Obsidian through standalone WebdriverIO. Browser Mode and jsdom do not replace the installed host.

Each native case owns a new Obsidian session, copied synthetic vault and host profile. Tests receive explicit `browser`, `page` and `ui` objects from a typed fixture. There are no WDIO runner globals or global Obsidian page objects. The Node project never inherits the fast suite's `obsidian` module alias. Native files run sequentially with no retries; source and both test projects remain checked by TypeScript 7 and the same ESLint code-line limits.

## Why the session adapter explicitly owns service hooks

The pinned `wdio-obsidian-service@3.2.1` exposes `startWdioSession()`. Its implementation calls the exported launcher/worker hooks, but does not call `afterSession()` and does not expose a partially acquired browser when final initialization fails. Simply calling the convenience helper in beforeAll would leave gaps in cleanup.

Our small adapter uses the same preparation/connect/initialization sequence, retains the worker and client, and always disconnects before invoking `afterSession()`. These package-root lifecycle exports are marked internal/hidden by upstream, so this is an explicit version-pinned integration seam, not an officially provided Vitest framework adapter. Dependency updates must rerun the actual-host cleanup tests. We neither deep-import package internals nor patch upstream files.

A reusable, dependency-injected session owner tests partial preparation, rejected connection, rejected readiness, test failure, late acquisition after cancellation, repeated close and teardown failures. Primary and cleanup failures remain visible. The native suite additionally injects body and final-readiness failures into real sessions and verifies the copied vault/profile disappear and the driver's endpoint stops responding.

Cancellation requests closure through Vitest's AbortSignal. In-flight upstream acquisition cannot be forcibly aborted through this API; a late returned session is closed rather than handed to another test. Abrupt OS termination remains outside in-process cleanup guarantees. Upstream WebdriverIO owns any driver that fails before remote() returns a client. Do not claim these are database-like rollback guarantees.

## Preserved acceptance and diagnostics

The eight existing product scenarios remain: context menu/cancel, arbitrary-extension metadata, media/custom subfolder, selected-folder placement, invalid-input recovery and collision preservation, actual declarative settings including popout windows, scoped axe/layout checks, and routing after reload. All UI assertions use bounded Vitest polling or WebdriverIO element operations, not guessed sleeps.

The command validates the emitted JSON report: each of the eight product scenarios and both native cleanup tests must execute exactly once. Missing, skipped, pending and failed cases do not satisfy release acceptance. Native execution remains a required reusable release-workflow gate; no publication authorization is weakened.

`reports/native/` contains Vitest JSON and JUnit reports and case-specific environment records, screenshots, DOM snapshots and teardown evidence. Each record identifies requested/resolved app and installer versions, the runner, platform, UI mode and source SHA. Accessibility output retains incomplete/manual-review results as well as violations. The iframe-free Electron axe fallback is unchanged and does not certify the rest of Obsidian or full WCAG conformance.

## Dependencies and migration completion

Remove Mocha, its types, the WDIO Mocha adapter, CLI/local runner and runner-specific reporters. Remove the obsolete Mocha Dependabot exclusion and serializer override. Keep WebdriverIO, the Obsidian service and axe. A regression checks the entire generated lockfile and installed module resolution to prevent accidentally retaining the retired test stack.

Do not remove the browser-manager override merely because Mocha is gone: its archive-extraction rationale is independent. Audit the complete resulting graph, including development tools. Issue #9 is superseded by eliminating the adapter coupling, rather than forcing the unsupported Mocha major upgrade. Close it only once this migration is verified and merged.

## Commands and evidence limits

Use the supported Node/npm versions from package.json. `npm run check`, `npm run test-build`, `node scripts/check-install.mjs`, `node scripts/audit.mjs`, and `npm run test:e2e` retain their entry points. Native execution requires a graphical session; CI uses a Linux virtual display and preserves minimum/latest/mobile-emulation matrix targets. A desktop mobile-emulation result is not real iOS/Android acceptance. No plugin source, note schema, release version or public release is changed by this test migration.

## Primary references

- [Standalone Obsidian sessions](https://jesse-r-s-hines.github.io/wdio-obsidian-service/wdio-obsidian-service/startWdioSession.html)
- [Pinned standalone implementation](https://github.com/jesse-r-s-hines/wdio-obsidian-service/blob/3.2.1/packages/wdio-obsidian-service/src/standalone.ts)
- [Pinned service lifecycle and cleanup](https://github.com/jesse-r-s-hines/wdio-obsidian-service/blob/3.2.1/packages/wdio-obsidian-service/src/service.ts)
- [Vitest test context and fixtures](https://vitest.dev/guide/test-context)
- [Vitest hooks](https://vitest.dev/api/hooks.html)
- [WebdriverIO standalone mode](https://webdriver.io/docs/setuptypes/)
