# Release and Community-directory submission

## Candidate acceptance

Review the exact candidate's quality and native Obsidian workflows. `npm run check`, the installer contracts and the dependency audit must pass; native acceptance must load the built assets and verify the required app version. A passing latest-version run does not replace the minimum-version check. The remaining manual/device matrix is in [testing](testing.md).

Do not call desktop emulation an iOS/Android test, or the Linux/Windows/macOS Node matrix native app coverage on all three platforms. Record scoped accessibility and remaining human checks without claiming full WCAG conformance. Review [verification](verification.md) and any known codec, folder/unusual-character link and platform limitations.

Ensure the default branch contains the intended source, manifest, README, PRD, MIT license, changelog and compatibility mapping. Confirm that `describe` is available as a directory identifier at submission time; this repository does not reserve it or imply approval.

## Build and version

Use Node 24+ / npm 11+. Install with `npm ci`, run the gates, then `npm run test-build`. Open the project-local disposable vault to complete manual acceptance. The installer preserves data.json, does not enable the plugin and does not replace unrelated vault settings.

For a version increment, run `npm version <x.y.z> --no-git-tag-version`. The lifecycle script updates manifest.json and versions.json. Review and commit package.json, the lockfile, manifest and compatibility map together. The first unpublished 1.0.0 candidate need not increment unless that version already has a public release.

The git tag must exactly match the manifest version, for example `1.0.0`, without a `v` prefix. `scripts/release.mjs` validates the match and creates only a **draft** GitHub release. Publishing remains a deliberate maintainer action; creating or merging this implementation PR does not publish anything.

Required release assets from `dist/`:

```text
main.js
manifest.json
styles.css
```

Check that assets belong to the tagged commit and retain the root manifest. Never distribute node_modules, native test tools, fixture vaults, settings data, screenshots or coverage reports as plugin assets. Native-test dependency overrides affect development only, but updates still require a clean audit and repeated native acceptance.

## Submit to the directory

The official submission process checked on 2026-09-24 uses [community.obsidian.md](https://community.obsidian.md): sign in with an Obsidian account, link the owning GitHub account and add the plugin. The manifest is read from the default branch, and users need a matching public GitHub release containing the plugin assets.

Recheck the current [official submission instructions](https://docs.obsidian.md/plugins/releasing/submit-plugin), developer policies and review requirements when submitting. Address review findings through a reviewed version increment and new release. A GitHub release is not directory approval.

## Release record

Record version, SHA, quality/native workflow evidence, actual app/installer versions, manual/device results, known limitations, asset hashes and submission status. Keep the prior public release available for rollback. Record unexecuted checks as not run and blocked checks as blocked, not passed.
