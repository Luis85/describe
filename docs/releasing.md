# Release and Obsidian Community publication runbook

Updated 2026-09-24. Technical rationale and current official references are in [publishing research](research/obsidian-plugin-publishing.md). This runbook describes actions a maintainer executes deliberately; adding the workflow does not publish a release or listing.

## 1. One-time setup

Review and merge the release-readiness PR into **main**. GitHub exposes workflow_dispatch controls only once the workflow exists on the default branch. Confirm the root manifest, README, MIT license and source are present. The initial version **1.0.0** and its [release notes](releases/1.0.0.md) are already prepared; do not increment solely to activate the workflow.

In repository Settings, review the following owner-controlled protections. Their configuration is **not** implied by committed files:

| Setting | Recommended configuration |
| --- | --- |
| Actions permissions | Keep default token access read-only. Permit Actions to create PRs when using Prepare release; the workflow grants only its required job permissions. |
| Branch/ruleset protection | Require reviewed PRs and the quality/native checks. Enable code-owner review for release-sensitive files as appropriate. A sole author cannot approve their own PR, so choose a policy the actual maintainer team can operate. |
| Environment `obsidian-release` | Restrict deployment branches/tags to the intended release sources and configure required reviewers. Do not enable prevent-self-review without an eligible second reviewer. A named environment without rules is not protected. |
| Releases | Enable immutable releases before publishing, so published tags/assets cannot be replaced. The draft-first workflow is compatible with this setting. |
| Security | Enable private vulnerability reporting and review Dependabot/secret-scanning options available to this repository. No approval or auto-merge of dependency updates is configured. |

No Obsidian password, npm publishing token or personal access token is needed. This plugin is distributed through GitHub assets, not npm. The GitHub token is short-lived and scoped by job.

## 2. Prepare later versions

For 1.0.0, proceed to the check stage after merging. For a subsequent version, add user-facing changes under `## Unreleased` in CHANGELOG.md, then run **Actions → Prepare release → Run workflow**, select main and enter the next version, such as `1.0.1`.

The workflow creates `release/1.0.1`, synchronizes package.json, the lockfile root version, manifest.json and versions.json, preserves existing compatibility mappings, derives `docs/releases/1.0.1.md`, and opens a PR. It never merges, tags or publishes. Review and edit the notes in that PR. Existing open release PRs are preserved, not overwritten. An orphan existing release branch requires inspection instead of a force-push.

Current GitHub behavior may show an **Approve workflows to run** banner on bot-created PRs. A user with write access must approve those runs. Do not interpret approval-required or skipped checks as successful tests. Review and merge the version PR only when ready to progress toward a release; avoid leaving an advertised new default-branch version without its matching public release for an extended period.

Local preparation is also available, after a clean checkout and dependency installation:

```sh
npm run release:prepare -- 1.0.1 --dry-run
npm run release:prepare -- 1.0.1
npm run check
git diff
```

Preparation preserves dependency resolutions and reviewed version notes. It does not commit, push or create a tag locally. Review/revert local changes with Git. The existing npm version hook remains available, but release:prepare also prepares the required notes.

## 3. Check without creating a release

Open **Actions → Release → Run workflow** on **main**. Enter `1.0.0` and mode **check**. Leave publication inputs empty/false.

The workflow validates the canonical public repository, version, default-branch manifest, merged source and registry ID. It selects an exact commit, runs cross-platform quality/package tests and the native Obsidian matrix, and creates checksum-bearing CI artifacts. **Check creates no tag or release.** It is the default mode.

Equivalent owner command:

```sh
gh workflow run release.yml --ref main -f version=1.0.0 -f mode=check
```

Local packaging, without a GitHub write, uses a clean committed checkout:

```sh
npm ci
npm run check
npm run release:package
```

The result is in `reports/release/package/`. Package metadata names the actual Git SHA, so do not use a dirty working tree as publication evidence. The workflow itself checks out the exact source and performs no source mutation.

## 4. Create and review the draft

Run **Release** again on main with the same version and mode **draft**. Both verification suites run for the selected commit. The environment approval applies if the owner configured reviewers. The workflow creates an exact unprefixed tag, creates a draft and uploads:

```text
main.js
manifest.json
styles.css
SHA256SUMS
release-metadata.json
```

Only the first three belong in `.obsidian/plugins/describe/`. SHA256SUMS and metadata are verification assets. No ZIP is substituted for the individual assets that Obsidian downloads.

Copy the package SHA-256 from the job summary or metadata. A matching existing draft can resume missing uploads; mismatched tag targets or changed asset bytes are rejected, not replaced. Once tagged, changed build inputs require a new version. Documentation-only acceptance follow-ups can be merged without moving the candidate tag.

Install the exact three draft assets in disposable vaults. Complete [the manual acceptance record](releases/acceptance-template.md), including device/platform tests not established by Linux native CI. Record the source SHA, package digest, tester, date, limitations and evidence. The original dropdown-gradient contrast item requires human checking. Do not mark desktop mobile emulation as Android/iOS testing.

Use the Community dashboard's preview scan for the branch/tag/commit and address any findings before initial publication where possible. A clean local linter or audit is not the Community review result.

## 5. Publish the reviewed GitHub release

Run **Release** on main with the same version and mode **publish**. Supply all three publication inputs:

| Input | Required value |
| --- | --- |
| `approval` | Exactly `publish 1.0.0 <payload-sha256>` using the 64-character digest of the reviewed draft. |
| `manual_checks` | True only after completing the documented manual/device/policy checklist for those exact bytes. |
| `evidence` | A specific HTTPS URL to the completed acceptance record, such as a reviewed PR comment or committed record. Do not include credentials or private vault data. |

The workflow requires the existing draft/tag, reruns automated gates, compares staged/remote bytes, rechecks default-branch/source identity, records the maintainer's attestation and publishes. The write-token job does not install dependencies or rebuild. It then fetches the three asset URLs **without authentication** and checks their hashes.

The attestation field is an accountable maintainer declaration, not automatic proof that a device test occurred. Checksum metadata is not a signed provenance attestation. Enabling immutable releases adds GitHub's separate release-attestation protection.

A tag pushed manually can initiate **draft mode only**. It cannot bypass the explicit publication inputs. Tokens created by Actions need not trigger downstream tag/release workflows; essential checks are therefore performed in this workflow, not delegated to a release-published event.

## 6. Submit the initial Community listing

Use [the official submission guide](https://docs.obsidian.md/plugins/releasing/submit-plugin), not an old directory-JSON PR tutorial. Sign in to [Obsidian Community](https://community.obsidian.md), link the owning GitHub account and add `Luis85/describe`. Confirm the unique ID, short description, free pricing classification and accurate runtime disclosures.

The dashboard reads main's root manifest. The matching public GitHub release must already expose the three installation assets. Resolve automated review errors, complete the dashboard publication action and verify installation from Community plugins in a clean vault. Account setup, ownership linking, preview scans and reviewer acceptance are not silently automated by this repository.

For later versions, use the version-PR and Release workflows. New releases are reviewed automatically; inspect the dashboard for failures. A green GitHub workflow alone does not mean a version is searchable or accepted by Obsidian.

## 7. Recovery and maintenance

If checks fail before publication, no publish transition is authorized. Fix the cause, prepare a new version when tagged build inputs differ, and rerun. A missing upload can resume only if the existing bytes match. Do not force-move tags or clobber assets.

If the post-publication anonymous check fails, the release may already be public. Inspect the result and public URLs; do not assume rollback occurred. Rerun the same operation for a read-only matching-release verification or use `npm run release:verify` with the original staged package. Investigate persistent network/CDN failures. A code defect requires a new patch release, not deleting evidence.

For a prepared branch pushed before PR creation failed, inspect the branch and open its PR manually rather than deleting or overwriting it. For security reports, follow SECURITY.md. Review weekly dependency/action update PRs and keep the exact-version native tests, source/test typechecks and ESLint-owned LOC limits intact.

## Evidence boundaries

Repository tests exercise release orchestration using a fake API and actual filesystem packages; CI also executes real builds and native Obsidian checks. No live publish transaction or Community submission is performed simply to test automation. Record the actual first execution, account configuration and manual acceptance when the maintainer runs them.
