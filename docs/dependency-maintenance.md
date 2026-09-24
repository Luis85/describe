# Dependency maintenance

Updated **2026-09-24** after the merged Vitest-native migration. Consult the exact candidate's CI checks for execution evidence; neither a version selection nor an earlier run proves the combined graph.

## Post-Vitest Dependabot batch

| Original proposal | Decision |
| --- | --- |
| PR #13: ESLint 9.39.1 → 10.11.0 | Adopt the exact Dependabot commit and generated lockfile, then verify the combined candidate. Keep the Obsidian preset and strict production/test policy. |
| PR #14: @types/node 22.18.6 → 26.6.2 | Replace with **24.13.6**, the stable Node-24 declaration version resolved from npm for this review. Node 24 remains the minimum development runtime; accepting Node-26-only declarations would misrepresent that baseline. |

The integration preserves PR #15: Vitest runs both the fast and actual-Obsidian suites; Mocha and the retired WDIO runner stack remain absent. No plugin source, CSS, schema, app minimum, version, tag or publication behavior changes in this batch. Original proposals may be closed as superseded after the combined candidate is verified, but that closure is not an individual merge or proof that the candidate has reached main.

### ESLint 10 compatibility

The official migration guide identifies changes in configuration lookup, removed legacy APIs, parser expectations and recommended rules. This repository already uses flat configuration and the ESLint API. Keep the Obsidian recommended preset rather than silently replacing its rule selection with a different preset during a dependency update. TypeScript-eslint declares ESLint 10 support; the JavaScript TypeScript-6 compatibility API remains separate from the mandatory native TypeScript-7 compiler.

The root CLI/API version is explicitly tested as ESLint 10. The upstream Obsidian plugin's scanner dependencies can still install a nested ESLint-9 compatibility copy. That does not mean our root lint task runs ESLint 9, nor does this update claim to remove every old transitive package. Do not force the whole graph to a single major with a broad override; retain upstream dependency constraints and the full security audit.

Actual ESLint boundary probes continue to enforce **400 source / 450 test code lines per file**, excluding blanks and comment-only lines. They also test that Node built-ins are forbidden in plugin source but permitted in Node test code. The new regression checks the effective source/native configuration after the major upgrade; rules and coverage floors are not weakened.

### Node declarations follow the supported baseline

Use **Node 24.15.0+ within 24.x or Node 26+, with npm 11+**. CI uses Node 24 through `.nvmrc`. Root `@types/node` intentionally follows major 24 even when a developer uses a newer supported runtime. The declaration package does not install Node or upgrade Obsidian's embedded runtime. Matching the major does not replace executing minimum-runtime tests or checking APIs introduced in later minor releases.

Five toolchain regressions verify the root typings major against `.nvmrc` and the first supported engine branch; exact declared/locked/installed ESLint and Node typings; actual root ESLint version; and effective LOC/mobile import rules. Existing tests still reject Mocha, its adapters and the removed serializer override anywhere in the locked graph.

Dependabot's only major-version hold is now **`@types/node` major updates**. Minor/patch changes within 24 remain eligible, and other dependencies' major proposals are not globally disabled. Raise this declaration major deliberately with the minimum runtime, `.nvmrc`, engine declarations, CI and acceptance tests. Review this policy when upgrading the baseline or assessing relevant advisories; it is not permission to lower the audit threshold or ignore security findings.

## Current test toolchain

Vitest 5 runs the fast Node/jsdom suite and the separate actual-Obsidian acceptance suite. WebdriverIO and `wdio-obsidian-service` remain the standalone automation layer with explicit session ownership. Mocha, its types/adapter, the WDIO CLI/local runner and runner-specific reporters are removed. Native tests use explicit browser/page objects, not runner globals.

PR #15 removed the Mocha 12 compatibility hold and `serialize-javascript` override. The independent `@puppeteer/browsers` override remains justified by its archive-extraction graph; re-evaluate it on relevant upstream updates. The new Node-typings policy must not resurrect the old Mocha ignore.

Regressions inspect the full lockfile and installed module resolution for retired packages, match Vitest and coverage-provider versions, and prohibit native imports of Mocha or the root Obsidian mock. A clean audit does not replace native execution.

## Historical initial batch

PR #10 consolidated #3–#8: artifact downloader 8.0.1; Obsidian service/reporter 3.2.1; Vitest/coverage 5.0.1; fallow 3.27.0; Obsidian ESLint 0.4.2; jsdom 30.1.0. Mocha 10 was temporarily retained when its proposed upgrade broke the adapter; PR #15 subsequently removed the adapter coupling altogether.

## Review and acceptance policy

Group routine minor/patch native-testing, development-tool and Action updates. Keep major migrations explicit except the deliberately paired Vitest runner/provider. Pin Actions to full commit SHAs. Do not auto-merge based only on author, compatibility badge or semantic version label.

Review manifests, lockfiles, install scripts and upstream API changes. Preserve `npm audit --audit-level=moderate` across the complete development graph. Package deprecation notices and known-vulnerability findings are separate signals. Remediate an advisory by patching or replacing the affected tool, not by lowering the severity gate.

Run `npm ci`, `npm run check`, `npm run test-build`, `node scripts/check-install.mjs`, `npm run release:package`, `node scripts/audit.mjs`, and `npm run test:e2e`. Native execution requires a graphical session; CI supplies a Linux virtual display. The report gate requires all eight product cases and both real-session cleanup cases, without skipped or failed results. The pinned standalone lifecycle integration must retain its real cleanup checks on dependency changes.

CI also transfers its actual release artifact through the distribution downloader, enforces digests and compares all five package files byte-for-byte without publishing. Linux/Windows/macOS tooling checks do not establish native app execution on all those systems; desktop mobile emulation is not an iOS/Android device test.

Record adopted and replaced proposals explicitly. A superseded bot PR is not individually merged. Keep a verified integration candidate separate from publication: no version bump is needed solely for pre-release development-tool maintenance, and source/package approval must still reject differing draft assets or moved tags.

Temporary lockfile resolution may generate package changes through npm with lifecycle scripts disabled. Any such branch-restricted write workflow must be removed before the review candidate is finalized. Permanent quality/native CI remains read-only.

## Primary references

- [ESLint 10 migration guide](https://eslint.org/docs/latest/use/migrate-to-10.0.0)
- [typescript-eslint supported dependency versions](https://typescript-eslint.io/users/dependency-versions/)
- [Pinned Obsidian ESLint package dependencies](https://github.com/obsidianmd/eslint-plugin/blob/0.4.2/package.json)
- [DefinitelyTyped versioning](https://github.com/DefinitelyTyped/DefinitelyTyped#how-do-definitely-typed-package-versions-relate-to-versions-of-the-corresponding-library)
- [Node-24 declarations](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/node/v24)
- [Dependabot options and update-type holds](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference)
- [Vitest-native integration and cleanup](testing-vitest-native.md)
