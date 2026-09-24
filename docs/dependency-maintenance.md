# Dependency maintenance

Review date: 2026-09-24. This is the decision record for resolving the initial six Dependabot PRs. Consult the maintenance PR and its exact-commit CI results for execution status; selecting an update is not the same as passing acceptance.

## Reviewed batch

| Original PR | Proposed update | Decision |
| --- | --- | --- |
| #3 | actions/download-artifact 7.0.0 → 8.0.1 | Take the full-SHA-pinned action and explicitly fail digest mismatches. Exercise an actual same-run upload/download round trip in CI. |
| #4 | Native testing group | Take @wdio/spec-reporter 9.32.0 and wdio-obsidian-service/reporter 3.2.1. Retain Mocha 10.8.2 instead of the incompatible proposed 12.0.2. |
| #5 | Vitest and coverage-v8 4.1.11 → 5.0.1 | Upgrade the coupled runner/provider together and rerun type, behavior, coverage and release tests. |
| #6 | fallow 3.5.0 → 3.27.0 | Adopt the analyzer update; investigate findings rather than weakening the dead-code gate. |
| #7 | eslint-plugin-obsidianmd 0.3.0 → 0.4.2 | Migrate to obsidianmd/no-nodejs-modules. Keep that rule enabled for runtime source and exempt only Node test code. |
| #8 | jsdom 26.1.0 → 30.1.0 | Upgrade the DOM harness and align declared Node support with its engine requirements. |

No installed-plugin dependencies are introduced. TypeScript 7, the Obsidian 1.13.7 minimum, native declarative settings, metadata and release approval controls are unchanged. Test tooling must still be audited: development-only is not a security exemption.

## Mocha compatibility hold

The WebdriverIO 9.32.0 Mocha adapter imports `mocha/lib/cli/run-helpers.js`. Mocha 12 removed that expected path and previously failed an actual native run, despite successful static checking. Keep Mocha 10.8.2 and the targeted serialize-javascript override until the adapter supports the replacement. The runtime test imports and adapter must resolve the same Mocha module, not two disconnected runners.

[Issue #9](https://github.com/Luis85/describe/issues/9) records the migration criteria. Dependabot ignores only the known incompatible 12.x range, not every Mocha release or all major dependency updates. Version ignores can also constrain automated remediation suggestions. Review any advisory affecting the held chain immediately; the complete `npm audit --audit-level=moderate` gate stays enabled. Resolve a security issue by patching or replacing the affected tool, never by weakening the audit threshold.

Revisit this hold on every WebdriverIO adapter update and before a public release. Remove the narrow exclusion and compatibility regression when the supported replacement is proven through real Obsidian acceptance. Existing overrides are documented in [host-test findings](research/host-test-findings.md); retain them only while justified.

## Keep future PRs reviewable

Minor and patch native-testing updates are grouped together. Other minor/patch development-tool updates are grouped separately. Major migrations remain individual except Vitest and its matching coverage provider, which intentionally move together. Compatible GitHub Actions updates share a group; action major changes remain explicit reviews. All external action references remain full commit-SHA pins.

Do not automatically merge a PR based on its author, compatibility badge or version label. Check the diff and lifecycle/dependency changes, run the exact combined graph and require both quality and native acceptance. A passing unit suite cannot validate an Electron adapter or an artifact downloader used only by release jobs.

A consolidated PR may supersede bot PRs after its reviewed changes have merged. Record which original proposals were adopted and which were held. Do not label a closed superseded PR as individually merged. Keep the compatibility issue visible instead of repeatedly opening a known-broken update.

## Development runtime

Use Node **24.15.0 or later within 24.x**, or Node **26+**, with npm 11+. CI uses the current Node 24 release through `.nvmrc`. jsdom 30.1.0 declares `^22.22.2 || ^24.15.0 || >=26.0.0`; this project deliberately retains Node 24 as its baseline instead of adding Node 22 support. Node 25 is not advertised as supported. These requirements affect development tools, not Obsidian's embedded runtime.

## Acceptance for dependency updates

Run `npm ci`, `npm run check`, `npm run test-build`, the installer contracts, `npm run release:package`, and the full audit. Run native Obsidian acceptance for minimum-version desktop, latest-public desktop and explicitly labeled desktop mobile emulation. The native framework and DOM harness are separate layers; real devices are not claimed by emulation.

The dependency regression checks the resolved Mocha implementation, the adapter's expected entry point, matching installed Vitest/coverage versions, the narrow compatibility hold and digest-enforcing action pins. CI uploads then downloads its actual release artifact using the same action as distribution, validates package metadata and compares all five package files byte-for-byte. This checks the downloader without creating a tag or publishing a release.

Do not change plugin version just for development-tool maintenance before the initial unpublished release. Any existing draft's source/package constraints still apply: release automation must reject mismatched assets rather than moving tags or overwriting published bytes.

## Primary references

- [WebdriverIO 9.32.0 adapter source](https://github.com/webdriverio/webdriverio/blob/v9.32.0/packages/wdio-mocha-framework/src/index.ts)
- [Obsidian ESLint 0.4.2 configuration](https://github.com/obsidianmd/eslint-plugin/blob/0.4.2/docs/configuration.md)
- [Vitest 5 migration guide](https://vitest.dev/guide/migration/)
- [jsdom 30.1.0 package and engines](https://github.com/jsdom/jsdom/blob/556b11fc3cc4676a22e34fa45dfa09cbd95adfb1/package.json)
- [Artifact downloader 8.0.1](https://github.com/actions/download-artifact/releases/tag/v8.0.1)
- [Dependabot options and grouping](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference)
