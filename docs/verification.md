# Implementation and polishing verification

Updated: 2026-09-24. Results below identify executed snapshots; the checks attached to the reviewed PR commit are the final authority. No merge, public release or Community-directory submission is implied.

## Current acceptance policy

ESLint alone enforces 400 source / 450 test code lines per file, excluding blanks and comment-only lines. The earlier physical-line policy is superseded. An independent line counter is no longer present. The TypeScript 7 gate checks both the Vitest and native-test projects. Coverage floors are 90% lines, 85% statements/functions and 80% branches.

## Executed fast-suite evidence

[Security/toolchain verification run 36021230200](https://github.com/Luis85/describe/actions/runs/36021230200) generated the updated lockfile commit `88feb9a6e1f07a2b6ea73bca1e56f8e848e0392e`, installed that graph and successfully ran the quality and dependency-audit gates. It verifies the committed working tree after lock generation, not merely the workflow's pre-generation parent SHA.

The expanded source/test suite previously executed in [run 36019711823](https://github.com/Luis85/describe/actions/runs/36019711823) and subsequent dependency verification with these observed results:

| Contract | Observed result |
| --- | --- |
| Vitest | 143 tests across 12 files passed. |
| V8 coverage | 98.24% lines, 95.78% statements, 91.53% branches, 94.06% functions. |
| TypeScript | 7.0.2; source, unit tests and native test project passed. |
| Obsidian ESLint / code-line policy | Passed in the updated toolchain verification, including actual rule-boundary fixtures. |
| Oxlint / fallow-rs / architecture | Passed. |
| Build and package contract | Passed; approximately 30.70 kB CommonJS main.js with only Obsidian external. |
| Complete dependency audit | Passed after the documented native-tool upgrades/overrides. See the run for its dated advisory output. |

Early intermediate runs correctly failed on a native `.mts` lint configuration gap and vulnerable native-tool dependencies. Those findings were not suppressed; the configuration and dependency graph were corrected. Exact measured coverage applies to the observed source snapshot, not a claim that future changes inherit the result.

## Native host execution and diagnostics

The initial [native run 36019711863](https://github.com/Luis85/describe/actions/runs/36019711863) actually launched Obsidian 1.13.7 with installer 1.13.7 on Linux in desktop mobile-emulation mode. Five of eight workflows passed. Three failures identified two ambiguous/invalid test selectors and Electron's unsupported window/new command used by axe. The captured settings page showed that native settings had rendered and the test had edited the wrong row; this was not evidence of a settings-persistence defect.

The suite now uses a correctly scoped cancel selector, an exact settings-row selector with an initial-value assertion, and axe's documented iframe-free Electron fallback. The detailed rationale and scope are in [host-test findings](research/host-test-findings.md). Consult the current Native Obsidian acceptance workflow for the post-correction matrix outcome; do not treat configured tests as passed.

Reports contain resolved app/installer versions, UI target, SHA, diagnostics, scoped accessibility findings and a successful-modal screenshot when the final accessibility test passes. Each native case uses a fresh copied synthetic vault with fresh settings.

## Installer and cross-platform evidence

The permanent quality matrix runs on Linux, Windows and macOS, including six disposable installer contracts and project-local test-build. The baseline implementation passed these in [run 36016626075](https://github.com/Luis85/describe/actions/runs/36016626075); the current candidate must also pass its attached checks. These runs verify tooling and filesystem safety, not that the actual Obsidian application ran on all three systems.

## Not yet established by this evidence

Actual Android and iOS device acceptance has not been performed. OS-level context-menu gestures, software keyboards, orientation, interruption, screen readers, zoom/theme combinations, all media codecs, and folder/unusual-character link navigation remain in the manual matrix. Scoped axe results are not full WCAG conformance and do not certify the rest of Obsidian.

No public release, directory submission or approval has been performed. The candidate is prepared for code review and remaining platform acceptance; publication is a separate maintainer action.
