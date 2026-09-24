# Testing Obsidian plugins: research and implementation decisions

Research date: **2026-09-24**. Product: **Describe**. Required app baseline: **Obsidian 1.13.7**. This report separates documented tool capabilities, engineering decisions for this repository, and evidence that still requires execution. A configured test is not a passed test; consult `../verification.md` and the checks on the reviewed commit.

## 1. Findings that change the test strategy

A single mocked `obsidian` module cannot establish host compatibility. It can check our orchestration and error handling, but a mistake shared by a mock and its test may pass unnoticed. The jsdom project explicitly excludes layout and navigation from its implemented browser platform; consequently, jsdom cannot validate actual modal dimensions, native settings rendering or mobile WebView behavior. [S1]

WebdriverIO documents a third-party Obsidian service that downloads app versions, isolates app state and vaults, supplies host helpers, and integrates with CI. It is purpose-built for the missing host layer, whereas the existing Vitest suite remains useful for fast, deterministic rules and failure injection. We therefore add the service rather than replace Vitest or interpret DOM mocks as end-to-end tests. [S2]

Obsidian's declarative settings API delegates rendering and related behavior to the host. It needs both definition/value-adapter tests and an actual app test that edits a rendered setting and observes persistence. Describe targets 1.13.7, so there is no reason to maintain a separate pre-1.13 imperative settings implementation. [S3]

**Decision:** use complementary layers, not one oversized suite. The fastest tests own detailed rules and controlled failure paths; native acceptance owns integration with the real app; device acceptance owns operating-system-specific behavior.

## 2. Available approaches and their fit

| Approach | What it establishes | Important limitation | Decision for Describe |
| --- | --- | --- | --- |
| Vitest, pure TypeScript | Metadata, paths, rendering, queues, persistence contracts and injected failures | Does not load Obsidian | Keep as the main regression layer |
| Vitest + jsdom + explicit host doubles | Modal DOM, focus, validation feedback and plugin orchestration | No genuine host settings renderer, layout engine or mobile runtime [S1] | Keep, clearly labeled mocked-host tests |
| WebdriverIO + Obsidian service | Actual app loading, commands, host UI, Vault writes and reloads [S2] | Additional toolchain and app downloads; not an official Obsidian SDK test runner | Add a separate native suite |
| Playwright Electron | Electron process/window automation [S4] | Officially experimental; Obsidian acquisition and vault bootstrapping need additional integration | Viable alternative, not a second parallel stack here |
| Obsidian CLI through the service | Command-oriented host checks and inspection [S5] | Does not exercise the complete visual interaction | Useful supporting tool; not required to prove this modal workflow |
| Desktop mobile emulation | Narrow-screen app layout and mobile-style UI [S6] | Still a desktop Electron process | Include as a separate, accurately named matrix entry |
| Android via Appium/service | Android app/device or emulator integration [S6] | Requires Android tooling and a maintained device configuration | Document as the next device-automation layer |
| iOS device acceptance | Actual iOS keyboard, WebView, filesystem and media behavior | The researched service does not support iOS [S6] | Retain a real-device manual checklist |

Running Node tests on Windows, Linux and macOS is not equivalent to running the Obsidian application on all three operating systems. Likewise, an Android emulator and an iPhone are different acceptance targets. Reports must name exactly which layer and environment ran.

## 3. The proposed test portfolio

### Fast rules and failure-path tests

Keep `domains/` and `application/` independent of Obsidian and DOM imports. Inject the Vault and settings persistence boundaries so tests can force a folder failure, concurrent filename collision, rejected setting write, deleted source or plugin shutdown without relying on timing accidents.

Assert business outcomes rather than merely counting internal calls. Examples are: an existing note retains its contents; a failed mapping update preserves the previous route; a second save has a distinct filename; a source is not modified; an invalid description produces no write. Parse generated frontmatter with an independent YAML implementation instead of constructing the expected value with the production serializer.

Boundary cases matter more than a large nominal test count: empty and extensionless inputs, uppercase extensions, folder routing, nested tags, Unicode, reserved filenames, CR/LF normalization, metadata limits, duplicates and invalid colors. Repeated normalization should be idempotent. A deterministic generated-input loop is sufficient for the present schema; a property-testing dependency is not required merely to increase the number of tools.

Vitest's mocking guidance calls for clearing or restoring mocks to prevent leakage between tests. The repository enables mock restoration and resets stubbed globals and environment values. Where a save is deliberately paused, tests hold and resolve a promise rather than waiting an arbitrary number of milliseconds. [S7]

### Mocked interaction tests

Testing Library's principles favor tests that resemble how software is used and inspect rendered DOM rather than component internals. We apply this principle without adding a framework-specific component test library: enter text, submit, observe errors, inspect saved arguments and assert focus. [S8]

The improved host double exposes the documented `Setting` name, description and control elements. This allows checking `aria-describedby` associations, visible labels and real button semantics. It remains a deliberately incomplete double, not a copied implementation of Obsidian.

New regression targets include revealing a collapsed metadata section when its field is invalid; placing focus on that field; clearing invalid state when input changes; distinguishing a saving status from an error alert; disabling all form actions during a pending save; and preserving a draft after a failed write.

### Native acceptance against built assets

The native suite loads **`dist/`**, not TypeScript source or the test mock. It creates descriptions through the real picker/modal, reads the resulting notes through the real Vault API, and parses frontmatter using the host's YAML parser. This provides a second independent check of the document contract.

The core scenarios are native menu registration, canceled first-use routing, arbitrary extensions, metadata round-trip, media embed syntax, folder-local placement, custom subfolders, collision handling, invalid-input recovery, persisted routing after plugin reload, and native declarative settings. The menu test triggers the documented host event and interacts with a real menu; it is not a claim that an operating-system right-click or mobile long-press was automated.

WebdriverIO recommends stable selectors and its auto-retrying assertions rather than fixed pauses. Our own inputs are addressed by accessible names, and waits observe the actual modal or saved file. Host-owned selectors are kept in a small test surface and may require maintenance when the host changes. [S9]

## 4. Isolation: the vault and settings must both reset

The service's `resetVault` updates ordinary vault files but deliberately does not reset plugin settings or the host configuration. That is insufficient for tests of an unknown extension: a route learned by an earlier test could make a later first-use test pass or fail for the wrong reason. [S5]

Each native test therefore reloads a **fresh temporary copy** of the synthetic acceptance vault. The browser command documentation warns that even read-only tests can modify host configuration when copying is disabled; shared in-place vaults are also unsafe for parallel tests. Describe does not use `copy: false`. [S10]

The fixtures contain only a small synthetic SVG, a custom-extension text file and a project folder. No personal vault, user credentials or paid prerelease account is required. Generated reports may contain entered test data, so only synthetic data belongs in these fixtures. Screenshots and DOM snapshots are diagnostics, not plugin release assets.

## 5. Version and platform policy

Keep the required application version separate from the Electron installer version. The service documents these as distinct choices; a current installer can host an earlier application build. A version labeled `latest` is useful for detecting forward-compatibility failures, but it is not permanently reproducible. [S6]

The chosen matrix is: required app version on desktop; latest public app on desktop; and required app version with desktop mobile emulation. The run records the resolved app version, installer version, operating system, UI mode and commit. A report must not replace those observed values with assumptions based on the manifest.

Do not silently downgrade the required version when its download fails, skip host cases and call the suite green, or imply that a package-types version equals an application version. Infrastructure or download failures are reported separately from executed test failures.

A real-device matrix remains necessary for software keyboards, touch/context menus, selection, filesystem permissions, interruption, media codecs and platform accessibility. Android automation can be added when a reproducible emulator/device environment is available. iOS remains explicit manual acceptance rather than an invented supported service target.

## 6. Accessibility and visual checks

The axe WebdriverIO integration can scope analysis to a specific component and select WCAG rule tags. Describe scopes automated analysis to its modal and stores the findings as an artifact. Native layout tests additionally check for horizontal overflow. [S11]

These are complementary to, not a replacement for, manual accessibility review. W3C notes that tools cannot determine accessibility on their own and that knowledgeable human evaluation is required. A clean automated report does not establish full WCAG conformance. [S12]

For this plugin, the manual checklist covers keyboard-only operation, modifier+Enter, input-method composition, visible focus, screen-reader labels and status messages, zoom, light/dark themes, mobile keyboard overlap and recovery from invalid hidden metadata. Color is optional metadata and is never the sole carrier of an error or status.

Pixel-perfect screenshots are not made mandatory for every state: host font rendering, operating systems and themes can make such snapshots noisy. Failure screenshots and semantic layout assertions provide value now; curated visual baselines can be added when the host/theme matrix is intentionally fixed.

## 7. Engineering gates and release safety

ESLint already implements the requested line policy. Configure `max-lines` as 400 in source and 450 in tests, with `skipBlankLines` and `skipComments` both true. Comment-only and whitespace-only lines are excluded; a code line with an inline comment still counts. The independent physical-line script has been removed. A policy regression invokes ESLint itself at each boundary instead of maintaining a second counter. [S13]

Both test layers are strictly checked with TypeScript 7 using separate configurations to avoid mixing Mocha/WebdriverIO globals into the Vitest project. Coverage includes all production files, not merely imported ones. V8 coverage and thresholds are supported by Vitest; they serve as regression signals, not proof that every behavior or environment is correct. [S14]

The permanent quality workflow also runs Obsidian ESLint rules, Oxlint, fallow-rs, dependency-direction checks, bundle/export validation and isolated installer contracts. Development-only test tooling is audited as well as production dependencies; adding host automation must not silently weaken the vulnerability gate.

Installation tests cover preservation of `data.json`, unrelated vault settings, missing assets, obstructing files, symlink/junction redirection and an invalid plugin ID. Native tests and installer tests are different: one proves host behavior, the other proves that preparing a local plugin directory does not inadvertently replace user data.

## 8. Changes resulting from the review

The LOC change removes competing definitions of file size. UI changes add explicit required fields, help associations, field-specific errors, automatic disclosure/focus, a character-summary explanation, separate saving status, a keyboard-operable clear-color button and compact responsive actions.

Reliability changes reject hidden/configuration sources consistently, prevent initialization from reactivating an unloaded plugin, reject queued saves after shutdown, suppress post-disposal UI updates, and protect a newer extension route from a stale first-use dialog. An already-dispatched host file write may still complete; cancellation is not presented as a filesystem transaction or rollback guarantee.

The resulting regression suite targets these failures directly. The native suite adds the previously missing real-host evidence path. Pending or failed execution is still visible in CI; documentation never turns the existence of that path into a claim of successful acceptance.

## 9. Execution and maintenance

Run `npm ci` and `npm run check` for the fast and package gates. Run `npm run test-build` for the repository-local install, and `node scripts/check-install.mjs` for disposable installer contracts. Run `npm run test:e2e` from a graphical desktop session, or use the Linux virtual-display workflow. The native runner downloads app/testing components on first use.

Set `OBSIDIAN_VERSION` to the required version or `latest`; set `OBSIDIAN_UI=mobile-emulation` only when that emulation is the intended target. Inspect `reports/native/environment.json` and failure artifacts. Reproduce failures with the recorded versions before changing selectors or relaxing assertions. Do not add retries to conceal nondeterministic application behavior.

Before publication, review the exact commit's quality and host results, complete the remaining real-device checklist, verify the three release assets, and record unexecuted cases as **not run**. A green code suite, a green native suite and Community-directory approval are distinct milestones.

## Primary sources

- **S1 — jsdom, unimplemented platform features:** https://github.com/jsdom/jsdom#unimplemented-parts-of-the-web-platform
- **S2 — WebdriverIO, Obsidian Plugin Testing Service:** https://webdriver.io/docs/wdio-obsidian-service/
- **S3 — Obsidian, migrate to declarative settings:** https://docs.obsidian.md/plugins/guides/migrate-declarative-settings
- **S4 — Playwright Electron API:** https://playwright.dev/docs/api/class-electron
- **S5 — Obsidian service page helpers and reset semantics:** https://jesse-r-s-hines.github.io/wdio-obsidian-service/wdio-obsidian-service/ObsidianPage.html
- **S6 — Obsidian service setup, versions, mobile emulation and Android:** https://jesse-r-s-hines.github.io/wdio-obsidian-service/wdio-obsidian-service/README.html
- **S7 — Vitest mocking guide:** https://vitest.dev/guide/mocking.html
- **S8 — Testing Library guiding principles:** https://testing-library.com/docs/guiding-principles/
- **S9 — WebdriverIO best practices:** https://webdriver.io/docs/bestpractices/
- **S10 — Obsidian browser commands and copied-vault isolation:** https://jesse-r-s-hines.github.io/wdio-obsidian-service/wdio-obsidian-service/ObsidianBrowserCommands.html
- **S11 — axe WebdriverIO integration:** https://github.com/dequelabs/axe-core-npm/blob/develop/packages/webdriverio/README.md
- **S12 — W3C, selecting accessibility evaluation tools:** https://www.w3.org/WAI/test-evaluate/tools/selecting/
- **S13 — ESLint max-lines:** https://eslint.org/docs/latest/rules/max-lines
- **S14 — Vitest coverage:** https://vitest.dev/guide/coverage.html
- **S15 — Service author's sample plugin and CI:** https://github.com/jesse-r-s-hines/wdio-obsidian-service-sample-plugin
