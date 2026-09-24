# Native Vitest migration: execution evidence

Date: **2026-09-24**. Migration PR: **#15**. This records a successfully executed implementation snapshot; later changes must pass their own checks. The PR's latest checks and verification comment determine the final candidate status.

## Verified snapshot

Branch head: `d8d9aa09cd565aaf66661a55d8c31ca3d7cd6d2d`.  
Executed PR merge candidate: `d7c8bda6f5446273232796763c1353b420c8d0fe`, against `ee8ea3396318f025e6edb1d35ac5b3beec83c62b`.

[Quality/package run 36039725111](https://github.com/Luis85/describe/actions/runs/36039725111): **all Linux, Windows and macOS jobs passed**, including source/native TypeScript, ESLint, Oxlint, effective LOC/import probes, architecture, fast tests, fallow, build/export contracts, local installation, six installer safety cases, release packaging, full audit and actual artifact round-trip verification.

[Native run 36039725117](https://github.com/Luis85/describe/actions/runs/36039725117): **all three native jobs passed** on Linux. Each ran the eight existing product scenarios plus two real-session cleanup regressions through Vitest 5.0.1, not the former WDIO/Mocha runner.

| Native target | Result |
| --- | --- |
| Obsidian 1.13.7 desktop | Ten tests passed. |
| Latest public Obsidian desktop | Ten tests passed; inspected environment resolved app/installer to **1.13.7 / 1.13.7**. |
| Obsidian 1.13.7 desktop mobile emulation | Ten tests passed; **not** an iOS/Android device test. |

Latest-public did not provide a second distinct application version in the inspected run. Native Windows/macOS execution is not implied by the three-platform Node tooling matrix.

## Artifact inspection

The [desktop artifact](https://github.com/Luis85/describe/actions/runs/36039725117/artifacts/10825941877) was downloaded and inspected independently of the job status. Its Vitest JSON reports **10 total, 10 passed, 0 failed, 0 pending**, with success true. It contains eight successful fixture-teardown records plus passing body-failure and readiness-failure cleanup evidence. The tests assert copied vault/profile removal and refusal of connections to the owned driver port; these observations do not claim proof of cleanup after abrupt OS termination.

The scoped axe report contains **zero violations** and **one incomplete manual-review item**: contrast for the host destination dropdown with a gradient background. It also contains 15 passing rule results. No accessibility rule was disabled. The retained same-window Electron fallback is restricted to the iframe-free modal. The positive screenshot was visually inspected; this runner migration does not change the plugin's UI.

## Dependency and failure-path evidence

The npm-generated graph removes Mocha, its types/adapter, the WDIO CLI/local runner and runner-specific reporters. Tests inspect the whole lockfile and installed resolution, not just direct package declarations. The full audit remains at moderate severity. The obsolete Mocha version-ignore and serializer override are removed; the independently justified browser-manager override remains.

The initial implementation correctly failed strict checks and native execution on an invalid fixture-options tuple and a vault-path method called on the wrong object. The corrected fixture uses the documented Vitest object syntax and the service's page API. Cleanup no longer throws from a finally block. Direct transport-fixture regressions verify the release test double's actual methods rather than suppressing structural-analysis findings.

Additional report-gate regression tests in the final PR reject missing, duplicate, skipped, pending and failed scenarios. Their later checks supersede this snapshot for that added code. No prior Mocha-based result is treated as evidence that Vitest passed.

## Remaining boundaries

The adapter uses package-root service lifecycle exports marked hidden upstream; it is a pinned project integration, not a first-party Vitest framework adapter. Updates require real native cleanup verification. In-flight upstream acquisition cannot always be forcibly interrupted before it yields a client; late acquired sessions are disposed by the owner. Driver failures occurring inside upstream remote() before returning a client and abrupt process termination have separate limitations.

Actual iOS/Android devices, native Windows/macOS application behavior, OS context-menu gestures, software keyboards, complete screen-reader/theme/zoom testing, codecs and unusual/folder links remain in the manual release checklist. No merge, tag, public release, directory submission or marketplace approval is performed by this migration.
