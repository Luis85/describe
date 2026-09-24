# Testing and release acceptance

Current architecture: **Vitest for both fast and native acceptance tests**, with standalone WebdriverIO controlling real Obsidian in the native layer. [Vitest-native implementation](testing-vitest-native.md) documents the fixture, cleanup guarantees and pinned upstream integration. Earlier [testing research](research/obsidian-plugin-testing.md) and [host findings](research/host-test-findings.md) retain their historical context; the former Mocha runner and its compatibility hold are no longer active.

## Execution

Use the Node/npm versions declared in package.json and the committed lockfile:

```sh
npm ci
npm run check
npm run test-build
node scripts/check-install.mjs
node scripts/audit.mjs
npm run test:e2e
```

`check` runs the fast suite and package gates; it does not launch a graphical application. `test:e2e` builds `dist/` and launches real Obsidian under a separate Node-only Vitest configuration. Native execution requires a graphical session or the virtual-display setup in CI. Initial execution downloads app and driver components. The installed plugin does not perform these downloads.

| Layer | Runner / environment | Contract |
| --- | --- | --- |
| Domain and application | Vitest / Node | Metadata, YAML, paths, queues, routing, collisions and injected failures. |
| Host doubles and DOM | Vitest / jsdom | Host orchestration, modal fields, focus, error/busy feedback and lifecycle; not actual host layout. |
| Native acceptance | Vitest / Node + standalone WebdriverIO | Built plugin in actual Obsidian, commands/menu/modal, Vault writes, native settings/popouts, persistence and scoped accessibility/layout. |
| Native ownership | Unit tests plus two real-session failure cases | Partial startup, cancellation, idempotent teardown, copied-profile/vault cleanup and closed driver endpoint. |
| Installer/release | Vitest and disposable Node fixtures | Asset identity, preservation, safe destinations, approvals and fail-closed publication contracts. |
| Device/manual | Actual host/device and tester | Touch, software keyboard, codecs, platform interruption and full accessibility review. |

## Mandatory engineering gates

TypeScript **7** checks `src/`, fast tests and their configuration, then the separate `tests/e2e/tsconfig.json` project. Native test types no longer include Mocha or WDIO test-runner globals. JavaScript release scripts imported by TypeScript tests are not thereby claimed to have complete strict JavaScript checking.

**ESLint alone enforces LOC:** 400 source / 450 test code lines per file, excluding blank/comment-only lines. A code line with an inline comment still counts. Effective-policy probes invoke ESLint at the boundary, including `tests/e2e/vitest.config.mts`; there is no independent physical-line counter. Production Node-import restrictions remain enforced, with a separate real-rule probe for Node test exceptions.

Obsidian ESLint, Oxlint, architecture and fallow-rs gates remain mandatory. Unused structural test-double methods are verified through direct transport-contract tests rather than exempted from analysis. Coverage includes all production TypeScript, with minima 90% lines, 85% statements/functions and 80% branches. Percentages do not imply equivalent coverage of JavaScript release scripts or test infrastructure.

Audit the entire dependency graph at moderate severity and above. Tests ensure retired Mocha/runner packages are absent from the lockfile and installed graph, installed Vitest/coverage versions match, and no obsolete Dependabot hold or serializer override remains. Keep the separate browser-manager override under review.

## Native fixture, isolation and evidence

Each product scenario owns a fresh standalone session, copied synthetic vault and host profile. A typed fixture supplies explicit browser, Obsidian page and UI helper objects. It never imports the fast suite's `obsidian` alias. Files and cases run sequentially, with no retries. UI checks use bounded `expect.poll()` calls rather than fixed sleeps.

The retained eight scenarios verify context-menu registration/cancellation, arbitrary-extension metadata, image/custom-subfolder behavior, selected-folder placement, invalid-input recovery and collision preservation, native declarative settings including popout windows, scoped axe/layout, and routing persistence after plugin reload.

Two additional native scenarios deliberately reject the body or final initialization after acquiring a real session, then verify copied vault/profile removal and driver connection refusal. Pure lifecycle tests cover earlier startup failures, concurrent start/close and late acquisition on cancellation. The adapter calls the same package-root launcher/worker hooks as the standalone convenience helper but retains ownership to call `afterSession()` even after partial failure. The exports are marked hidden upstream; updates must retest this explicitly pinned seam. Abrupt OS termination and upstream driver failure before returning a session are outside the in-process ownership guarantee.

The command validates Vitest's JSON report: all ten required scenario names must appear exactly once and every listed result must pass. Missing, duplicate, skipped, pending or failed cases cannot satisfy native release acceptance. Report-gate regression tests exercise the actual script using disposable JSON fixtures. Startup/test/teardown failures remain failures, not silent skips.

Artifacts under `reports/native/` include Vitest JSON/JUnit results and `cases/<test-id-name>/` environment records, screenshots, DOM, accessibility reports and cleanup evidence. Every environment record names the requested/resolved app, installer, OS, UI mode and source SHA. Distinguish product failures, test-fixture failures and download/driver failures using this evidence. A configured test or saved screenshot alone is not a passing result.

## Version and platform matrix

Fast quality/package/installer checks run on Linux, Windows and macOS. Native application checks run on Linux for the minimum required app, latest public app, and the minimum app in 390 × 844 desktop mobile emulation. The app and installer versions are recorded separately; latest can resolve to the same version as the minimum. Never claim this as two distinct versions without the records.

The menu scenario triggers Obsidian's documented `file-menu` event and interacts with a real menu; OS-level right-click/long-press remains manual. Desktop mobile emulation does not establish actual iOS/Android execution. No iOS/Android platform is added by changing the runner.

## Accessibility and installation

Axe remains scoped to the plugin modal with WCAG A/AA rules enabled. Electron lacks the normal window/new aggregation path, so the documented same-window fallback is used after asserting no iframe is present. Incomplete/manual-review findings are preserved, not counted as passes. Automatic checks and horizontal-overflow assertions do not establish complete WCAG conformance or certify other plugins/themes.

The six installer contracts copy the exact installer into disposable fixtures and verify fresh assets, preservation of data.json and vault settings, incomplete packages, obstructing files, linked directories and unsafe identifiers. The artifact-transfer smoke check uses the release downloader and compares all five release-package files byte-for-byte. Neither creates a public release.

## Manual and device acceptance

Use [the release acceptance template](releases/acceptance-template.md) and record date, tester, exact SHA, Obsidian app/installer, OS/device and theme. Do not infer device acceptance from the manifest or CI platform name.

| ID | Scenario | Required observation |
| --- | --- | --- |
| SM-01 | Install, enable, reload and disable the three release assets. | No load errors, duplicate menus or stale dialogs. |
| SM-02 | Actual right-click/long-press on Markdown, custom extension, extensionless file and folder. | Describe is reachable and originals remain intact. |
| SM-03 | Cancel/save an unknown type, then reload. | Only successful creation learns the route. |
| SM-04 | Three destination modes, vault root, nested subfolder and selected-folder placement. | Preview and saved path agree without replacing existing content. |
| SM-05 | Unicode/long metadata, aliases containing commas and clearing color. | Stable YAML types, complete body and correct summary. |
| SM-06 | Settings search/filter/edit/delete, including native popouts. | Correct row changes and persistence. |
| SM-07 | Invalid metadata/path and read-only destinations. | Recoverable error, preserved draft, invalid field revealed and focused. |
| SM-08 | Source move/delete/type change during editing or saving. | Safe resolution or explicit failure, not silent wrong routing. |
| SM-09 | Supported/unsupported image, sound and video codecs. | Actual per-platform playback limits recorded. |
| SM-10 | Folder links and reserved/Unicode filename characters. | Navigation tested explicitly; folder links are not promised native navigation. |
| SM-11 | Keyboard, IME, screen reader, zoom, light/dark themes. | Visible focus, accurate help/status, no accidental composition submit. |
| SM-12 | Real iOS/Android keyboard, touch, orientation, interruption/backgrounding. | Actions stay reachable and entry/recovery works. |
| SM-13 | Concurrent first-use dialogs and settings edits. | Newer route preserved; committed notes not duplicated by misleading retry. |
| SM-14 | Local reinstall with existing plugin data. | Only main.js, manifest.json and styles.css replaced. |

Before release, record exact candidate checks, native results, audit, manual/device status and asset hashes. Report unexecuted checks as **not run** and infrastructure failures as **blocked**. Publication and Community-directory approval remain separate maintainer/reviewer actions.
