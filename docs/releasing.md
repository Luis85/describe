# Release and Community-directory submission

## Before preparing a public release

- Review and merge the implementation only after automated checks pass and the real-host acceptance matrix in `testing.md` has been completed or explicitly scoped with documented limitations.
- Check the README, PRD, license, manifest, compatibility mapping and changelog against the actual behavior. Ensure the default branch contains the release's source and manifest.
- Confirm the `describe` identifier is still available in the Community directory. This repository does not reserve that identifier or imply approval.

## Build and version

Use Node 24+ and npm 11+. Install the committed dependency graph with `npm ci`. Run `npm run check` and `npm run test-build`. Check that the installed plugin can load in the repository-local disposable vault.

For a version increment, run `npm version <x.y.z> --no-git-tag-version`. The version lifecycle script synchronizes `manifest.json` and `versions.json`; commit those files together with `package.json` and the updated lockfile. Review the resulting diff before pushing. An initial 1.0.0 release does not require an additional version increment unless its contents differ from an already published release.

The git tag must match `manifest.json` exactly, for example `1.0.0`, **not** `v1.0.0`. The release script refuses a mismatch. `scripts/release.mjs` creates only a draft release; publishing remains a deliberate maintainer action. Do not distribute development dependencies.

Required assets:

```text
main.js
manifest.json
styles.css
```

These are built in `dist/`. Keep the stable manifest in the repository root as well. Verify the release assets belong to the exact tagged commit. Existing local test-vault `data.json` is not a release asset.

## Submit to the directory

As checked on 2026-09-24, the official process uses [community.obsidian.md](https://community.obsidian.md): sign in with an Obsidian account, link the owning GitHub account and add the plugin. The directory reads the manifest from the default branch. A matching public GitHub release with the plugin assets must exist before users can install it. Correct review findings with an incremented version and a new release.

Follow the current [official submission instructions](https://docs.obsidian.md/plugins/releasing/submit-plugin), developer policies and submission requirements at submission time. Creating this PR, generating assets or publishing a GitHub release alone does not publish a listing or constitute directory approval.

## Release record

Record the version, commit SHA, CI evidence, real-host results, known codec/link/platform limitations, asset hashes and directory submission status. Do not claim native navigation for folder references, uniform codec support across devices or real-device testing without evidence. Keep an earlier published release available for users needing rollback.
