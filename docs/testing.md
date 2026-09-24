# Test strategy, execution and release acceptance

The rationale and primary sources are in [Obsidian plugin testing research](research/obsidian-plugin-testing.md). Concrete integration findings are in [host-test findings](research/host-test-findings.md). Results, not configuration, determine pass/fail; record the candidate SHA and CI run in [verification](verification.md).

## 1. Run the test layers

Use Node 24+ / npm 11+ and the committed lockfile:

```sh
npm ci
npm run check
npm run test-build
node scripts/check-install.mjs
node scripts/audit.mjs
npm run test:e2e
```

`check` does not automatically launch the graphical app. `test:e2e` is a distinct native suite and requires a graphical desktop session or the Linux virtual-display setup used by CI. Its initial run downloads app/driver components. The real plugin uses no such downloads at runtime.

| Layer | Owner | What it proves |
| --- | --- | --- |
| Domain and application | Vitest | Schema, normalization, paths, queues, collisions, storage policy, controlled failure paths. |
| Host-double and DOM | Vitest/jsdom | Adapter calls, plugin orchestration, field feedback, focus, busy state and lifecycle. Not host layout. |
| Native acceptance | WebdriverIO/Obsidian service | Built plugin loading, actual commands/menu/modal, Vault writes, native settings, reloads and scoped accessibility/layout. |
| Installer | Disposable Node fixtures | Correct assets, preservation of data/configuration and rejection of unsafe destinations. |
| Device/manual | Tester with actual app/device | Touch, software keyboards, codecs, accessibility and platform-specific behavior absent from desktop emulation. |

## 2. Mandatory automated gates

Both TypeScript projects use **TypeScript 7**. The root project covers `src/`, unit/host-double tests and build configuration; `tests/e2e/tsconfig.json` covers native tests and their ESM configuration. No test directory escapes typechecking simply because it runs under another runner.

**LOC belongs to ESLint only.** Use max-lines 400 for source and 450 for all `.ts`/`.mts` tests, with `skipBlankLines: true` and `skipComments: true`. Blank/comment-only lines do not count; a code line with an inline comment counts. `scripts/check-lint-policy.mjs` asks ESLint for its effective rules and exercises exactly-at-limit and over-limit fixtures with abundant comments/blanks. It does not count lines independently.

ESLint with the Obsidian recommended rules and Oxlint must report no lint warnings. TypeScript handles undefined identifiers/types because the JavaScript no-undef rule does not understand type namespaces. The test-only host exceptions do not apply to production code. Architecture checks reject forbidden dependencies; fallow-rs verifies explicit production/test/build entry points. Vite output and release-contract checks verify a direct CommonJS Plugin export with only `obsidian` external.

Coverage includes **all `src/**/*.ts`**. Floors are 90% lines, 85% statements, 85% functions and 80% branches. These floors guard regressions, not functional completeness. Mock restoration and stub cleanup prevent cross-test pollution. Reject promise chains deterministically; do not solve races with arbitrary sleeps or retries.

Audit the complete development dependency graph at moderate severity and above. Security compatibility overrides must be explained and revalidated against real native execution, not simply added until the audit appears clean.

## 3. Regression portfolio

| Concern | Representative assertions |
| --- | --- |
| Document format | Independent YAML parsing, fixed type, correct list/string metadata, exactly 80 code points, complete body, safe heading and embed policy. |
| Metadata boundaries | Empty/long/invalid values, nested/Unicode tags, duplicates, CR/CRLF/LF aliases, Unicode single-line limits, optional hex color. |
| Placement | Three modes for files/folders, root mappings, nested subfolders, reserved names, traversal rejection, blocked directories. |
| Preservation | Original item unchanged, existing description unchanged, deterministic collision suffix, settings rollback on failed persistence. |
| Concurrency | Concurrent creates, external path race, input snapshot, moved/deleted/replaced sources, stale route conflict, queue recovery. |
| Accessibility feedback | Required/help associations, metadata disclosure and focus, invalid-state clearing, separate saving status, keyboard-operable clear color, disabled controls. |
| Lifecycle | Active-file gating, modal/picker disposal, initialization completing after unload, queued writes after shutdown and suppressed follow-ups. |

Native scenarios use the actual app's YAML parser and Vault API as well as interacting with the UI. The menu test triggers the host's file-menu event and clicks the real menu; an OS-level right-click or mobile long-press is still manual acceptance. The settings test selects the exact rendered row and checks its initial value before editing to avoid confusing a group container with a row.

## 4. Native isolation, versions and diagnostics

Every test reloads a fresh copied synthetic vault. The service's ordinary resetVault helper does not reset plugin settings, so it is not sufficient for first-use routing tests. Never use a personal vault or `copy: false`. Tests run sequentially within each app session and use outcome-based waits and auto-retrying assertions.

The permanent native workflow runs on Linux:

| App target | UI target | Meaning |
| --- | --- | --- |
| 1.13.7 | Desktop | Required minimum app acceptance. |
| Latest public version | Desktop | Forward-compatibility signal; resolved version recorded. |
| 1.13.7 | Desktop mobile emulation at 390 × 844 | Narrow layout/mobile-style interaction, **not** an iOS or Android test. |

App and Electron installer versions are distinct. The environment artifact records the resolved versions, platform, UI mode and commit. Do not silently downgrade the required version when downloads fail. A `latest` run is reproducible only with its recorded resolved versions.

Failure artifacts include screenshots and DOM snapshots in `reports/native/`. The suite also writes scoped accessibility results and a successful-modal screenshot. Host failures may be product defects, selector mistakes, driver limitations or download/infrastructure failures; inspect evidence before classifying them. Disabled/skipped/unexecuted cases never count as passed.

### Electron accessibility adapter

The driver rejects WebDriver window/new, which axe normally uses for result aggregation. The documented `setLegacyMode()` fallback scans in place. Tests assert the modal has no iframe and keep WCAG 2 A/AA and 2.1 AA rules enabled. Cross-origin iframe analysis is not available in this mode and is not claimed. No component outside Describe is certified by this scan. Manual accessibility evaluation remains required.

## 5. Installer contracts

After a production build, `node scripts/check-install.mjs` copies the exact installer into disposable fixtures and substitutes only a no-op build step. It verifies six cases: fresh installation copies exactly three assets; reinstallation preserves data.json and unrelated vault settings; incomplete packages do not replace existing assets; obstructing files remain intact; linked directories cannot redirect writes; unsafe manifest identifiers are rejected. It never modifies a user's vault.

The normal CI matrix runs type/lint/unit/build/installer checks on Linux, Windows and macOS. That is cross-platform tooling evidence, not native Obsidian execution on all three systems.

## 6. Remaining manual and real-device checklist

Record date, tester, SHA, operating system, Obsidian app/installer version, theme and device. Use a disposable vault and sanitized fixtures. Before claiming each platform validated, execute its matrix rather than inferring it from a manifest or emulation flag.

| ID | Scenario | Expected result |
| --- | --- | --- |
| SM-01 | Install three release assets and enable/reload/disable. | No load errors, missing dependencies, stale dialogs or duplicate menu registrations. |
| SM-02 | Actual right-click/long-press on Markdown, custom extension, extensionless file and non-root folder. | Describe is reachable; originals remain unchanged. |
| SM-03 | Cancel then save an unknown type; reopen after a reload. | Cancellation leaves type unknown; successful mapping persists. |
| SM-04 | All placement modes, nested custom subfolder, blank configured root and selected folder. | Preview/saved destination agree; no unintended overwrite. |
| SM-05 | Unicode metadata, aliases with commas, long Markdown and color clearing. | Correct types, full body, 80-code-point summary, no unintended color value. |
| SM-06 | Settings search, filter/edit/delete known-type rows, global settings search and reload. | Correct native row changes and persistence. |
| SM-07 | Invalid metadata/path and read-only destination. | Clear error; draft retained; invalid optional field revealed and focused. |
| SM-08 | Move/delete/change source type during a modal or save. | Safe resolution or explicit recoverable error, never a silent orphan or wrong-type route. |
| SM-09 | Supported and unsupported image/audio/video codecs. | Correct syntax; actual playback limitations recorded per platform. |
| SM-10 | Folder references, spaces, Unicode and reserved characters in source filenames. | Verify navigation explicitly; document non-native folder behavior and unusual-name limitations. |
| SM-11 | Keyboard-only use, modifier+Enter, IME composition, zoom, light/dark themes and screen reader. | Usable focus, labels, help and status; no accidental IME submit; color is not the only signal. |
| SM-12 | iOS/Android software keyboard, touch, orientation, interrupted/backgrounded app. | Controls remain reachable and entry/recovery works without data loss. |
| SM-13 | Concurrent first-use dialogs and settings edit. | Newer route is preserved; a committed note is not duplicated by a misleading error. |
| SM-14 | Rebuild into a local vault with existing plugin data. | Only the three assets change; configuration and data remain intact. |

Android service/Appium automation is a documented future layer, not implemented here. The researched Obsidian service does not support iOS; actual iOS acceptance remains manual. No automated scan alone establishes complete WCAG conformance.

## 7. Release evidence

Record exact SHA, successful workflow runs, counts/coverage, audit date/result, app versions and native targets, installer results, manual/device outcomes, limitations and asset hashes. Distinguish **passed**, **failed**, **blocked** and **not run**. CI configuration, a generated artifact, and Community-directory approval are three different things. The current record is `verification.md`.
