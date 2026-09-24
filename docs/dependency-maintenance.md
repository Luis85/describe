# Dependency maintenance

Updated 2026-09-24 for the Vitest-native migration. Consult the exact PR/commit checks for execution evidence; configuration is not a passing result.

## Current test toolchain

Vitest 5 runs the fast Node/jsdom suite and the separate actual-Obsidian acceptance suite. WebdriverIO and `wdio-obsidian-service` remain the automation layer, used in standalone mode with explicit session ownership. Mocha, its types/adapter, the WDIO CLI/local runner and runner-specific reporters are removed. Native tests do not import WDIO runner globals.

The Mocha 12 exclusion and `serialize-javascript` override are removed along with the affected runner. [Issue #9](https://github.com/Luis85/describe/issues/9) is resolved by this migration after verification and merge, not by forcing an incompatible adapter upgrade. The independent `@puppeteer/browsers` override remains justified by its archive-extraction dependency graph; re-evaluate it on relevant upstream updates.

Regressions inspect the entire lockfile and installed module resolution for retired packages, match the installed Vitest and coverage-provider versions, and prohibit reintroducing Mocha imports or the root host mock into native tests. A clean dependency audit does not replace actual native execution.

## Initial Dependabot batch: historical decisions

PR #10 consolidated #3–#8: artifact downloader 8.0.1; Obsidian service/reporter 3.2.1; Vitest/coverage 5.0.1; fallow 3.27.0; Obsidian ESLint 0.4.2; jsdom 30.1.0. Mocha 10.8.2 was temporarily retained because the proposed major version broke the WDIO adapter. The later Vitest-native migration removes that coupling and obsolete reports/holds while retaining the compatible service itself.

No installed-plugin dependencies, source schema or minimum Obsidian version change as part of test-runner maintenance. Development-only dependencies still require security review.

## Review policy

Group routine minor/patch native-testing, development-tool and GitHub Action updates. Keep major migrations explicit except the deliberately coupled Vitest runner and coverage provider. Pin external Actions to full commit SHAs. Do not auto-merge based only on the author, compatibility badge or semantic version label.

Review the manifest, lockfile, install scripts and upstream API changes. Verify the combined dependency graph through both quality and real-host acceptance. In particular, the standalone adapter uses exported but upstream-hidden lifecycle hooks to guarantee service cleanup; dependency updates must execute the native failure-cleanup regressions, not only compile them. The integration contract and limitations are in [Vitest-native acceptance](testing-vitest-native.md).

Keep the complete `npm audit --audit-level=moderate` gate enabled. There are no compatibility ignore conditions after removing Mocha. An advisory requires remediation or replacement of the affected tool, not a lower audit threshold. Package deprecation warnings and known-vulnerability reports are separate signals, and a clean audit cannot rule out undisclosed defects.

Record adopted and deferred changes when consolidating bot PRs. Closed superseded proposals are not individually merged PRs. Any remaining migration issue stays open until its replacement has been verified and integrated.

## Runtime and acceptance

Use Node 24.15.0+ within 24.x or Node 26+, with npm 11+. Node 25 is not advertised. CI uses Node 24 through `.nvmrc`; these tooling requirements do not change Obsidian's embedded runtime.

Run `npm ci`, `npm run check`, `npm run test-build`, `node scripts/check-install.mjs`, `npm run release:package`, `node scripts/audit.mjs`, and `npm run test:e2e`. The native command requires a graphical session; CI supplies a Linux virtual display. Minimum/latest app targets and desktop mobile emulation remain distinct from actual iOS/Android testing.

The native report gate requires all eight product cases and both real-session cleanup cases, with no skipped or failed assertions. CI also downloads its actual release artifact using the same SHA-pinned downloader as distribution, enforces digests and compares the five package files byte-for-byte without publication.

Do not change the plugin version just for development-tool maintenance before the initial unpublished release. Existing source/package approval constraints still apply to draft releases; do not move tags or overwrite differing published assets.

## References

- [Vitest fixtures](https://vitest.dev/guide/test-context)
- [Standalone Obsidian sessions](https://jesse-r-s-hines.github.io/wdio-obsidian-service/wdio-obsidian-service/startWdioSession.html)
- [Pinned service lifecycle](https://github.com/jesse-r-s-hines/wdio-obsidian-service/blob/3.2.1/packages/wdio-obsidian-service/src/service.ts)
- [Obsidian ESLint configuration](https://github.com/obsidianmd/eslint-plugin/blob/0.4.2/docs/configuration.md)
- [Vitest migration](https://vitest.dev/guide/migration/)
- [Dependabot options](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference)
