# Publishing Describe: research and automation decisions

Research date: **2026-09-24**. Scope: the public `Luis85/describe` repository and its first stable Obsidian Community release. This report distinguishes official requirements, project-specific safeguards and remaining owner/reviewer actions. It does not assert that a release or listing has been published.

## 1. Current distribution model

Obsidian's current submission instructions direct new plugins to the **Community developer dashboard**, with an Obsidian account and linked GitHub ownership. The dashboard reads the root manifest at the default branch's HEAD. Installation additionally depends on a GitHub release with the corresponding assets; a repository manifest alone does not distribute executable code. [P1]

The May 12, 2026 announcement is an important change from older tutorials: the dashboard replaces the older initial-submission queue, and automated review scans **every version**, not only the initial listing. Authors can preview a scan for a branch, tag or commit. Future GitHub releases remain the update mechanism, with the dashboard needed to inspect review failures. [P2]

**Decision:** automate GitHub release engineering, but do not create an obsolete submission PR against the directory JSON. The workflow reads the public registry only to detect an ID assigned to another repository. That check does not reserve an ID, examine unpublished submissions, guarantee reviewer acceptance or submit anything.

The researched public instructions describe dashboard operations, not a supported CI submission/approval endpoint. No undocumented API, stored Obsidian password, session-cookie automation or automatic claim of reviewer approval is implemented. This is a deliberate boundary, not a missing GitHub release capability.

## 2. Requirements that become executable checks

The official submission contract requires a root README, LICENSE and manifest, public source access, supported stable `x.y.z` versions and matching-tag release attachments. `main.js` and `manifest.json` must be attached individually; CSS is optional for plugins in general but necessary for Describe's interface. The release title is not the lookup key. [P1, P3]

Describe's local validator checks the plugin identity, a stable unprefixed version, minimum app compatibility, author and short description, package/manifest/lockfile agreement, versions.json mapping, required documentation and the built manifest. The bundle must directly export the CommonJS plugin class and may require only the host module. Staging rejects unexpected files, empty assets and symlinked input assets.

The plugin-specific requirements also address concise descriptions, proper minimum versions, unused donation links and Node/Electron restrictions for mobile. Describe retains `isDesktopOnly: false`, uses public Vault APIs in production, keeps Node tooling outside the shipped bundle and omits unconfigured funding links. [P4]

The release validator's three-component version policy is intentionally stricter than generic semantic versioning: no `v`, prerelease/build suffix or leading zeroes. This avoids a Git tag that looks reasonable to other tooling but is not installable through the documented Obsidian lookup.

## 3. Compatibility, source and version preparation

The repository contains two different manifests at distribution time: the committed root manifest advertises the release; the release attachment belongs to the packaged plugin. Obsidian's release repository documents using versions.json when a newer plugin requires a newer app. Preserve older compatibility entries rather than replacing the file with only the newest version. [P3]

The app baseline and npm API declaration version are different concepts. This release preserves the requested Obsidian 1.13.7 minimum and existing declaration dependency. The source/test compiler remains TypeScript 7; release code is development tooling and never ships with the plugin.

**Prepare release** synchronizes package.json, package-lock.json's root version, manifest.json and versions.json, and derives a version-specific Markdown release note from the Unreleased changelog. It preserves dependency resolutions and already reviewed release notes. It opens a dedicated PR without merging, tagging or publishing. A local dry-run command provides the same preparation contract without remote access.

**Release** chooses an exact source SHA. The candidate must be merged into the default branch and match its advertised manifest. After a draft tag exists, doc-only follow-up commits may record acceptance without forcing a tag move; changes to build inputs invalidate that candidate. A new stable version is the recovery path for changed code, not replacing an existing tag.

## 4. Test before distribution, not only before merge

A tag-only release job that merely bundles source can bypass the native host evidence. The new workflow calls the same quality and native workflows used for pull requests, with the selected source SHA. The quality workflow covers three operating systems; native acceptance covers the minimum app, latest public app and desktop mobile emulation on Linux. Those are precisely named targets, not claims of actual Android/iOS or native Windows/macOS execution.

Release state-machine tests inject a fake GitHub API and exercise real packaging/orchestration code. They verify failed authorization, mismatched tags, changed source, conflicting assets, interrupted uploads, idempotent reruns and post-upload verification. They never create public test releases. Separate workflow-contract tests check permissions, pinned actions, required dependency jobs and the absence of package installation in the write-token distribution job.

A manual acceptance record remains essential for the known platform and accessibility gaps. The publish input requires an explicit attestation and an evidence URL bound to the reviewed package checksum. This records the maintainer's statement; software cannot establish that physical-device tests actually occurred merely because a checkbox was checked.

## 5. Draft-first, non-overwriting release state machine

GitHub recommends uploading all assets to a draft before publishing when immutable releases are enabled. Immutability locks the published assets/tag and generates a release attestation. It must be enabled in repository settings; the existence of release YAML or a checksum file does not activate it. [P5, P6]

Our chosen transitions are **check → draft → publish**. Check has no release-write job. Draft validates, creates a tag if absent, creates a draft and attaches verified assets. Publish requires that draft and exact approval text containing the version and package SHA-256, then verifies again before making the release public.

Partial uploads can resume when the bytes already uploaded match. Differing assets, mismatched tags and unexpected files cause a failure. The scripts do not use force-push, release-asset clobber or deletion to obtain a green run. Already published, matching releases can be verified again without modification. Downgrading the stable release is rejected.

The three installation assets plus SHA256SUMS and release-metadata.json form the release attachment set. Metadata identifies the repository, source SHA, minimum app, version, individual hashes and notes hash. It excludes timestamps so repeated packaging of the same bytes is stable. These hashes detect inconsistency; they are **not signed provenance**. Repository-enabled immutable releases provide a separate GitHub attestation layer, verifiable with GitHub's tooling. [P5, P7]

## 6. Least privilege and secure workflow inputs

GitHub recommends read-only token defaults, limited per-job permissions, full commit-SHA action pins and careful treatment of untrusted input. The workflows use these controls, and tests prevent accidental reintroduction of inline input interpolation in shell scripts. User fields enter scripts through environment variables and validated arguments. [P8]

Quality/native jobs have no repository-write permission. The distribution job uses a separate runner, downloads the quality artifact from the same run and does not perform npm installation, build lifecycle hooks or native app execution with its write token. The repository's scripts are the trusted release boundary and are included in CODEOWNERS. Review requirements themselves depend on repository branch/ruleset settings.

The `obsidian-release` environment adds a place for an owner-configured reviewer/branch gate. Merely referencing a new environment in YAML can create an unprotected environment; it is not evidence that required reviewers were configured. The runbook explicitly requires checking those settings and avoiding a reviewer configuration that deadlocks a sole maintainer. [P9]

No personal access token or Obsidian credential is required for the provided workflow. Repository policy must permit the preparation job to open PRs. Permission escalation is limited to preparation and actual distribution, not all CI jobs.

## 7. Avoid event-trigger assumptions

Current GitHub documentation says most events produced with GITHUB_TOKEN do not trigger another workflow. A newly published release must therefore not rely on a separate release-event workflow to perform its essential verification. The Release workflow verifies anonymous public asset URLs directly after publication. [P10]

There is a relevant current exception: PR opened/synchronize/reopened events produced with GITHUB_TOKEN create approval-required runs. The generated release PR can display **Approve workflows to run**. Document this rather than promising unattended CI or recommending a broadly scoped token unnecessarily. A GitHub App can be a future owner-approved alternative if unattended preparation CI is essential. [P10]

Manual workflow execution also requires the workflow to exist on the default branch. The release-readiness PR must be reviewed and merged before the owner can use the new Actions controls. Merely pushing it on a feature branch does not complete installation of the workflow. [P11]

## 8. Privacy, maintenance and publication readiness

Obsidian policy prohibits client telemetry and plugin self-install/update behavior and requires disclosure of network/account/payment and outside-vault access where used. Describe's runtime has none of those remote services or payments. The README separately describes development-time dependency downloads, host-test downloads, registry lookups and GitHub release operations so tooling is not confused with installed-plugin behavior. [P12]

Keep the MIT license, source, support instructions, clear usage examples and limitations current. A short release note describes user-visible changes and migration/compatibility concerns; verification statistics belong in evidence records rather than crowding every release description.

Dependabot configuration proposes npm and action updates weekly; it does not auto-merge them. This matters because the prior native-testing pass found a framework major version that was audit-clean but incompatible with the runner. A clean audit is necessary evidence, not proof of compatibility or absence of undisclosed vulnerabilities. [P8]

After publication, verify the Community scorecard and actual in-app installation in a clean vault. A public GitHub release and a successful anonymous asset check still do not establish that Obsidian accepted the version. If a published version is defective, prepare a reviewed patch release and preserve prior bytes/tags; do not silently replace what users may already have installed.

## 9. Automation boundary

| Activity | Implemented automation | Remaining owner action |
| --- | --- | --- |
| Version preparation | Synchronize four version files, preserve compatibility history, generate notes, open PR | Review release notes and merge approved changes |
| Local/release verification | Typecheck, ESLint LOC, Obsidian rules, Oxlint, fallow, tests, native matrix, audit, installer checks | Complete unautomated device/manual cases |
| Candidate packaging | Restrict assets, hash bytes, record source/version/notes, stage artifact | Inspect exact package and evidence |
| GitHub draft | Check merged source/default manifest/registry identity/tag and upload without overwriting | Review draft and retain checksum |
| GitHub publication | Explicitly authorized transition, read-back hashes, anonymous asset verification | Supply checksum-bound approval and honest attestation |
| Repository protection | Pinned workflow definitions, CODEOWNERS and documented settings | Configure environment rules, branch protection and immutable releases |
| Community listing | Documentation and preview-scan instructions | Account link, ownership, initial submission, reviewer feedback and listing publication |
| Maintenance | Proposed dependency/action update PRs; rerunnable verification | Triage advisories and new Community review findings |

## Primary references

All checked 2026-09-24. Recheck mutable policies at publication time.

- P1: [Obsidian: submit your plugin](https://docs.obsidian.md/plugins/releasing/submit-plugin).
- P2: [Obsidian: the future of plugins, May 12, 2026](https://obsidian.md/blog/future-of-plugins/).
- P3: [Official Obsidian releases repository and update process](https://github.com/obsidianmd/obsidian-releases).
- P4: [Obsidian: submission requirements](https://docs.obsidian.md/community-directory/submission-requirements-for-plugins).
- P5: [GitHub: immutable releases](https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases).
- P6: [GitHub: managing releases](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository).
- P7: [GitHub CLI: verify release assets](https://cli.github.com/manual/gh_release_verify-asset).
- P8: [GitHub: secure workflow use](https://docs.github.com/en/actions/reference/security/secure-use).
- P9: [GitHub: managing deployment environments](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments).
- P10: [GitHub: triggering workflows and token exceptions](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow).
- P11: [GitHub: manually running workflows](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow).
- P12: [Obsidian: developer policies](https://docs.obsidian.md/community-directory/developer-policies).
