# Test strategy and release acceptance

## Automated verification

Run `npm ci`, then `npm run check`, then `npm run test-build` with Node 24+ and npm 11+. The check command runs each gate and reports every failing gate rather than silently skipping later analysis.

| Gate | Contract |
| --- | --- |
| TypeScript 7 | Verify the compiler's major version, then strictly check source, tests and TypeScript configuration files. |
| ESLint | Obsidian recommended rules plus 400/450 physical-line limits; zero warnings. |
| Oxlint | Correctness checks with warnings denied. |
| Architecture | Dependency directions and desktop-only import rejection. |
| Vitest | Deterministic behavior and mocked-host contracts; no private vault, internet or real Obsidian install required. |
| Coverage | Include all production TypeScript; minimum 80% lines, statements and functions, 70% branches. |
| fallow-rs | Dead-code analysis with explicit runtime, tests, build and configuration entries. |
| Vite | CommonJS bundle plus manifest and styles. |
| Release contract | Version consistency, app compatibility, mobile declaration, assets and actual CommonJS export shape; only the host module may be required. |
| Local install | Build and copy only plugin assets into the project-local vault; preserve user data and refuse unsafe targets. |

The test harness implements only the public methods needed by this plugin. It is not a full Obsidian emulator. Mocked menu, modal, source identity, native setting definitions and open-file tests verify integration contracts; they do not prove real-host rendering, media playback or mobile behavior. Do not report mocked-host tests as end-to-end desktop or device tests.

## Deterministic regression coverage

Domain tests exercise schema types, YAML round-trips, arbitrary extensions, Unicode truncation, malformed metadata, tag/alias normalization, media syntax, three placement modes, root destinations, safe filenames and corrupt settings. Application tests cover collision suffixes, simultaneous saves, source deletion/movement, I/O failures, queue recovery and settings rollback. Adapter tests cover public Vault operations, blocked paths and folder races. UI and plugin tests cover entry points, first-use questions, metadata submission, previews, validation, duplicate submission prevention and warnings after committed writes.

## Real-host smoke checklist

Record platform, operating system, Obsidian version, theme, test date, commit SHA and tester. Use a disposable vault with a backup. Run the full matrix on desktop and at least one iOS and one Android device before declaring all three validated.

| ID | Scenario | Expected result |
| --- | --- | --- |
| SM-01 | Install three release assets and enable the plugin. | Loads without console errors or missing dependencies. |
| SM-02 | Describe Markdown, a custom extension, an extensionless file and a folder. | Every target opens the modal and produces the specified note schema; original items remain unchanged. |
| SM-03 | First unknown extension: choose a destination, cancel, reopen, then save. | Cancellation leaves it unknown; successful creation persists the mapping. |
| SM-04 | Exercise configured, same-folder and nested custom-subfolder destinations for files and folders. | Preview and saved path agree; missing folders appear; selected-folder semantics match the README. |
| SM-05 | Enter Unicode tags, aliases with commas, a category, color and long Markdown. | Correct property types, 80-code-point summary and complete body. |
| SM-06 | Save twice with the same name. | Distinct note paths; source and earlier note content unchanged. |
| SM-07 | Edit settings, use global settings search, filter/delete a known-type row, then reload. | Native controls render, operate on the intended row and persist values. |
| SM-08 | Attempt invalid paths, invalid tags and color; simulate a read-only destination. | Clear error; no unintended write; draft text stays available for correction. |
| SM-09 | Rename or delete the source while the dialog is open. | Same-type moves resolve safely or show a recoverable error; deleted or replaced objects are rejected. |
| SM-10 | Open image/audio/video descriptions using supported and unsupported codecs. | Link/embed syntax is correct; unsupported playback is documented rather than represented as successful decoding. |
| SM-11 | Use a source containing spaces, Unicode and reserved link characters; inspect folder references. | Verify host navigation and record limitations, especially non-native folder links. |
| SM-12 | Use keyboard-only input, focus traversal, modifier+Enter, screen reader and narrow mobile viewport. | Fields and errors have understandable accessible names; controls and save action remain reachable with the keyboard visible. |
| SM-13 | Disable/reload the plugin while a modal is open or a save completes. | No stale interactions, duplicate writes or post-unload exceptions. |
| SM-14 | Rebuild with existing plugin `data.json` and vault settings. | Only main.js, manifest.json and styles.css are replaced. |

## Evidence and honest status

The PR and CI run linked to a commit are the source of truth for automated pass/fail status. Coverage output is evidence only after a real successful run. A build artifact is not a marketplace release. No desktop, iOS or Android smoke execution is implied by the presence of this checklist.

Release evidence should include the tested SHA, CI run, actual gate results, test count and coverage, the device matrix, remaining limitations and the release-asset checksums. Mark unexecuted cases **not run**, not passed. A failed or blocked gate keeps the release candidate unaccepted until corrected and rerun.
