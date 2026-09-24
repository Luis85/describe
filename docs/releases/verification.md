# Release-engineering verification

This record concerns release automation, not approval of a published plugin. Updated 2026-09-24.

## Initial execution

Source snapshot `0ae88d35519179ff0df219de2b824e5745b8cef6` introduced the release state machine, preparation and workflow contracts. Native Obsidian [run 36029272160](https://github.com/Luis85/describe/actions/runs/36029272160) completed successfully. The quality suite in [run 36029272154](https://github.com/Luis85/describe/actions/runs/36029272154) executed **183 passing tests across 16 files**; TypeScript 7, Oxlint, architecture, fallow, build/package contract and the audit passed in the inspected Linux job. ESLint correctly rejected seven issues in the new release-test assertions. The follow-up fixes those assertions rather than disabling rules. Final checks attached to the PR supersede these intermediate results.

Production source coverage remained 98.24% lines, 95.78% statements, 91.53% branches and 94.06% functions. These percentages cover `src/`, not the JavaScript release scripts. The release scripts are exercised directly by strict TypeScript Vitest tests against disposable filesystem fixtures and an injected fake GitHub API.

## Release-specific contracts

Tests exercise stable version parsing, manifest/package/lock/mapping identity, deterministic checksums, missing/extra/tampered assets, explicit publication approval, preservation of dependency resolutions and compatibility history, no-op/dry-run preparation, interrupted upload recovery, changed tag/source rejection, documentation-only follow-ups, differing remote assets, and read-only already-published verification. Workflow tests inspect read/write permission boundaries, prerequisite jobs, exact action pins, input handling and absence of npm installation in the privileged distribution job.

## Deliberately not executed

No real tag, draft release, published release, Community account mutation or marketplace submission was created merely to test this increment. GitHub release mutations are simulated in unit tests. The actual manual Release workflow, repository environment/reviewer configuration, immutable-release setting, public asset download after publication and Community review must be recorded when the maintainer deliberately executes the first release.

The installed plugin's real-device/manual acceptance remains in [the unapproved template](acceptance-template.md) and [test strategy](../testing.md). A checked workflow input is a maintainer attestation, not a substitute for evidence.
