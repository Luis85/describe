# Describe — release-management requirements

Owner: Luis Mendez. Updated: 2026-09-24. Related product requirements: [Describe](describe.md). Delivery artifacts: `scripts/`, `.github/workflows/`, [release runbook](../releasing.md), [publishing research](../research/obsidian-plugin-publishing.md).

## Objective

Allow the maintainer to prepare and execute a repeatable Obsidian-compatible release with traceable source and assets, while preventing accidental publication, tag replacement, configuration drift and false claims of platform or marketplace acceptance.

## Use cases

A maintainer prepares a stable version and reviews the generated PR. They run checks without creating a release, then stage a verified draft. After reviewing the exact package and completing manual acceptance, they explicitly authorize publication. Finally they complete the initial Community listing and inspect its review result.

| ID | Requirement / acceptance |
| --- | --- |
| REL-01 | Prepare release synchronizes package, lock root, manifest and compatibility mapping; preserves older mappings and dependencies; creates reviewed notes and a PR without merging or publishing. Local dry-run has no writes. |
| REL-02 | Manual Release runs from the default branch with a supported exact x.y.z version. Its default mode is check, which has no release-write job. |
| REL-03 | Release uses an exact merged source, an agreeing default-branch manifest and a non-conflicting public registry ID. The ID check does not reserve or submit a listing. |
| REL-04 | Both the complete cross-platform quality suite and native host suite pass before distribution. Source/test typechecks and ESLint-only 400/450 code-line policy remain mandatory. |
| REL-05 | Stage exactly three installable assets plus checksum/source metadata. Extra, missing, empty or modified package assets are rejected. Source/notes/version provenance is recorded without implying a signature. |
| REL-06 | Draft creation can resume missing uploads only when previous bytes match. No tag move, asset clobber, downgrade or published-release mutation is permitted. |
| REL-07 | Publication requires a reviewed draft, exact version/package approval, explicit manual-acceptance attestation and a specific HTTPS evidence URL. Record the workflow actor. |
| REL-08 | After publishing, verify the three individual public asset URLs anonymously and compare hashes. A failure after publication must not imply automatic rollback. |
| REL-09 | Use least privilege, pinned action SHAs, validated environment inputs, isolated runners and no dependency installation/rebuild in the write-token distribution job. |
| REL-10 | Document one-time repository protections and account ownership setup. An environment name is not proof of required-reviewer settings. |
| REL-11 | Keep initial Community submission, preview/review findings and platform tests honest and explicit. Do not automate undocumented dashboard endpoints or represent CI success as directory approval. |
| REL-12 | Provide negative tests for invalid versions, mismatches, tampering, interrupted operations, unmerged or changed source, missing approval and repeated execution. Tests must never publish real test releases. |

## Out of scope

Automatic merge, Obsidian account/credential management, arbitrary package publishing to npm, self-updating plugin code, undocumented review APIs, automatic acceptance of risks, and real-device testing inferred from emulation. Repository owner settings and initial marketplace approval remain outside source-code configuration.

## Completion evidence

Use successful checks for the exact release-readiness commit, deterministic filesystem/API-double tests and actual CI packaging. Record live release execution separately when authorized. The manual/device acceptance template starts unapproved and must never be populated with invented results.
