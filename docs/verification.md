# Implementation and polishing verification

Updated: **2026-09-24**. This record distinguishes measured candidate results from configuration and remaining manual acceptance. The checks attached to the final PR head remain authoritative for subsequent changes. No merge, public release or Community-directory approval is implied.

## Verified polishing snapshot

Head: **`f91712d193504bd4535333124ff72455860678ee`**.  
Tested PR merge candidate: **`1220960d15f2a8773bb57bf0a17da3d79fce99ee`**, against unchanged main `89ac2e46e399b639f7aa7d326aa2be9d9731f6ac`.

- [Quality and package matrix, run 36023608841](https://github.com/Luis85/describe/actions/runs/36023608841): **all three jobs passed**.
- [Native Obsidian acceptance, run 36023608931](https://github.com/Luis85/describe/actions/runs/36023608931): **all three jobs passed**.

| Quality target | Typecheck/lint/tests/build | test-build | Six installer contracts | Full dependency audit |
| --- | --- | --- | --- | --- |
| Linux | Passed | Passed | Passed | Passed |
| Windows | Passed | Passed | Passed | Passed |
| macOS | Passed | Passed | Passed | Passed |

| Native target on Linux | Outcome |
| --- | --- |
| Obsidian 1.13.7 desktop | Eight workflows passed across two specs. |
| Latest public Obsidian desktop | Eight workflows passed. Resolved app and installer were both **1.13.7**; this is not an additional distinct app version. |
| Obsidian 1.13.7 desktop mobile emulation, 390 × 844 | Eight workflows passed. This is **not** an Android or iOS device test. |

Native cases verify menu registration/cancellation, arbitrary-extension metadata, image and custom-subfolder behavior, folder placement, invalid-input recovery, collision preservation, persisted routing after reload, actual native settings, and scoped accessibility/layout. Tests load the built package in fresh copied synthetic vaults. App and driver acquisition was exercised with the compatible patched dependency graph.

## Fast-suite measurements

Observed for the polished source and verified again by the quality matrix:

| Metric or gate | Result |
| --- | --- |
| Vitest | **143 tests passed across 12 files**. |
| V8 lines | **98.24%**. |
| V8 statements | **95.78%**. |
| V8 branches | **91.53%**. |
| V8 functions | **94.06%**. |
| TypeScript | **7.0.2**, covering source, unit tests and separate native-test project. |
| ESLint | Passed, including 400/450 code-line rules and actual boundary probes. |
| Oxlint / fallow-rs / architecture | Passed. |
| Build and package export contract | Passed; CommonJS plugin class, only Obsidian external. |
| npm audit, including development tools | **Zero reported vulnerabilities** at the verified date. |

Coverage floors are 90% lines, 85% statements, 85% functions and 80% branches, across all production TypeScript. Npm deprecation/install-script notices are distinct from audit findings; a clean audit does not guarantee absence of undisclosed defects.

## LOC policy

**ESLint is the sole enforcer:** 400 source / 450 test code lines per file, excluding blank and comment-only lines. Code with an inline comment still counts. The previous physical-line script and command have been removed. The policy regression asks ESLint for its effective configuration and executes ESLint at and beyond the boundary; it does not maintain a separate counter. The policy includes native `.mts` test configuration.

## Accessibility and visual evidence

The final scoped axe report contains **zero automated WCAG A/AA violations** in the tested Describe modal. It retains **one manual-review item**: contrast for the native destination dropdown could not be computed because its host background uses a gradient. This is neither a passed contrast assertion nor a confirmed violation; it remains manual acceptance.

The native test also verifies no horizontal modal overflow. The Electron driver requires axe's documented same-window fallback; the modal is asserted to contain no iframe, and no accessibility rules are disabled. These results do not certify all themes, all platforms, the entire host, or complete WCAG conformance.

The captured passing screenshot was visually reviewed. That review led to a final small layout adjustment placing the color controls below their description instead of crowding the label. The following PR checks rerun the same acceptance matrix for that adjustment; the earlier screenshot is not claimed as proof of the changed layout.

[Desktop diagnostic/screenshot/accessibility artifact](https://github.com/Luis85/describe/actions/runs/36023608931/artifacts/10819510088) records app 1.13.7, installer 1.13.7, Linux desktop and the tested merge SHA. Other matrix artifacts record their own UI targets.

## Defects found and corrected during execution

The native runs found ambiguous selectors, settings hosted in a desktop popout, Electron's unsupported window/new path, and a genuine 3.42:1 Save-button text contrast failure. The selectors/window handling were corrected, axe uses its documented scoped fallback, and the button now pairs normal host text and surface colors with an accent border. Detailed evidence is in [native UI findings](research/native-ui-findings.md).

A Mocha 12 experiment passed static checks and audit but failed WebdriverIO's private adapter import. It was replaced by compatible Mocha 10.8.2 with a targeted serialize-javascript 7.1.1 override. A browser-manager override removes the vulnerable older archive-extraction graph. Actual native execution and clean audit validate these explicit decisions; see [host-test findings](research/host-test-findings.md). Temporary dependency-lock-writing workflows have been removed.

## Remaining manual/device acceptance

**Not performed:** actual iOS and Android device testing; native Obsidian execution on Windows/macOS; OS-level right-click/long-press gestures; software keyboards/orientation/interruption; full screen-reader/zoom/theme coverage; all media codecs; folder/unusual-character link navigation. The Linux/Windows/macOS Node matrix is tooling evidence, not app execution on all three platforms.

The real-host menu test triggers the documented file-menu event and interacts with the actual rendered menu. It does not simulate an operating-system context-menu gesture. The release checklist in [testing](testing.md) remains required before claiming each device/platform validated.

No GitHub release or directory submission has been published. All notes remain ordinary Markdown, and publication remains a separate maintainer action.
