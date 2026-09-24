# Describe

Create structured Markdown descriptions for files and folders without renaming or modifying the originals. Add a meaningful name, full description, tags, category, color and aliases, with predictable storage and a link back to the source.

**Requires Obsidian 1.13.7 or newer.** Designed for desktop and mobile using public Vault APIs and native declarative settings. See [verification](docs/verification.md) and [release acceptance](docs/releases/acceptance-template.md) for the distinction between automated tests and actual device acceptance. Community-directory approval and a published release are separate from repository implementation.

## Describe an item

Right-click a visible file or non-root folder and choose **Describe!**. On mobile, use the item context menu or run **Describe: Choose a file or folder** from the command palette. **Add description to current file** is also available.

Enter a name and full Markdown description, expand **Tags, category, color and aliases** for optional metadata, choose the destination and select **Save description**. `Ctrl+Enter` / `Cmd+Enter` also saves. The name belongs to the new note, not the original item.

| Metadata | Behavior |
| --- | --- |
| Name | Required single line, maximum 200 Unicode code points; heading and basis of the note filename. |
| Description | Required Markdown. The full text is preserved; frontmatter contains the first 80 Unicode code points without an ellipsis. |
| Tags | Spaces or commas separate tags. Leading `#` is optional; nested tags work. Stored as a YAML list without hashes. |
| Category | Optional single line, maximum 120 Unicode code points. |
| Color | Optional six-digit hex text, synchronized with the picker. **Clear color** removes it. |
| Aliases | One per line; commas are retained. Stored as the note's standard aliases list. |

Tags and aliases are deduplicated case-insensitively, with at most 100 each. Each alias is limited to 200 code points. Aliases and color apply to the description note; Describe does not rename attachments or recolor the file explorer. Description input normalizes line endings, rejects null characters and has a 100,000 UTF-16-code-unit safety limit.

Invalid optional metadata opens its section and focuses the affected field. Saving disables controls and announces progress. Failed writes preserve the draft. A note that was successfully created is not reported as a failed creation just because opening it or remembering a destination subsequently failed.

## Storage

| Choice | File `Assets/photo.jpg` | Folder `Projects/Home` |
| --- | --- | --- |
| Configured folder | Saved `.jpg` destination | Saved folder destination |
| Same folder | `Assets/<name>.md` | `Projects/Home/<name>.md` |
| Descriptions subfolder | `Assets/descriptions/<name>.md` | `Projects/Home/descriptions/<name>.md` |

The local subfolder is configurable per note, including nested paths such as `Metadata/Descriptions`. Blank configured destinations mean the vault root; local subfolders must be nonempty. Missing directories are created automatically. Existing descriptions are preserved using numbered suffixes. Unsafe filename characters are sanitized and long filenames shortened without shortening the name property.

For an unknown file type, the modal asks for its future default destination. The mapping is remembered only after successful creation; canceling changes nothing. If another dialog configured the type meanwhile, its newer route is preserved with a warning rather than silently overwritten.

Settings expose the default folder/location/subfolder, open-after-save preference and a searchable list of known types. Edit a route or remove it to be asked again. Extensions are case-insensitive. Folders, extensionless files and a literal `.folder` extension are distinct routing keys.

## Example note

```markdown
---
type: "ItemDescription"
source: "[[Assets/kitchen.jpg]]"
name: "Kitchen before renovation"
extension: "jpg"
description: "Original kitchen layout before the renovation."
tags: ["home", "renovation/kitchen"]
category: "Before photo"
color: "#3388cc"
aliases: ["Original kitchen", "Kitchen reference"]
---

# Kitchen before renovation

Original kitchen layout before the renovation.

![[Assets/kitchen.jpg]]
```

Images, audio and video receive embed syntax; other types, including PDFs, receive plain wikilinks. Playback depends on the codec and operating system. Folder references use a trailing slash and `extension: "folder"`; this records context but does not guarantee native folder navigation. Extensionless files have an empty extension. Unusual filenames with reserved link characters require host-navigation acceptance testing.

## Installation

After a release is published and the Community listing approved, install **Describe** through Obsidian's Community plugins settings. Until then, build locally or use an explicitly identified review package; repository availability alone does not mean a listing is live.

Use **Node.js 24.15.0+ within 24.x, or Node 26+, and npm 11+** for development. CI uses the current Node 24 release. Node 25 is not a supported development target; these requirements do not change Obsidian's embedded runtime.

```sh
git clone https://github.com/Luis85/describe.git
cd describe
npm ci
npm run check
npm run test-build
```

Open the project directory as a disposable Obsidian vault and enable Describe. `test-build` installs only main.js, manifest.json and styles.css into the project's `.obsidian/plugins/describe/`, preserves existing data.json and unrelated vault settings, rejects unsafe linked destinations and does not enable the plugin automatically.

Manual installation into another vault uses those same three assets from a verified release or `dist/`. Do not install test dependencies, coverage, fixtures, checksum metadata or screenshots as plugin runtime files. Back up important vaults before testing a new release.

## Development and quality

| Command | Purpose |
| --- | --- |
| `npm run check` | Typecheck source and both test projects; run lints, ESLint policy probes, architecture, Vitest coverage, fallow, build and package checks. |
| `npm run test` / `npm run test:coverage` | Deterministic unit, host-double, dependency-compatibility and release-engineering tests. |
| `npm run test:e2e` | Build and test inside real Obsidian using fresh copied synthetic vaults. |
| `npm run lint` / `npm run lint:oxlint` | Obsidian ESLint rules / Oxlint correctness. |
| `npm run analyze` | fallow-rs dead-code analysis. |
| `npm run build` / `npm run dev` | Production / watched Vite bundle. |
| `npm run test-build` | Build and install into the local project vault. |
| `node scripts/check-install.mjs` | Six isolated installer-safety contracts. |
| `node scripts/audit.mjs` | Audit development dependencies as well as runtime dependencies. |

**ESLint alone enforces LOC:** 400 source / 450 test code lines per file, excluding blank and comment-only lines. Lines containing code and an inline comment still count. All executable scripts live in `scripts/`. Strict TypeScript 7 checks cover source and all tests, including native tests. Release-script imports are enabled for typechecked TypeScript tests; this does not claim strict checking of all JavaScript scripts.

The native compiler is installed through `@typescript/native`; the separate `typescript` import aliases Microsoft's TypeScript 6 JavaScript-API compatibility package for tooling. API typings are pinned independently from the required app version. Coverage floors are 90% lines, 85% statements/functions and 80% branches across production source.

[Dependency maintenance](docs/dependency-maintenance.md) records reviewed upgrades, the tracked Mocha 12 compatibility hold and the policy for grouped routine updates versus major migrations. The full dependency audit stays enabled. CI also exercises the same full-SHA-pinned artifact downloader used by release, enforces digest checks and verifies the downloaded package byte-for-byte without publishing anything.

Native local tests need a graphical session; Linux CI uses a virtual display. Initial execution downloads app/driver components. The native matrix covers minimum/latest app targets and desktop mobile emulation. The Linux/Windows/macOS Node matrix does not establish native app execution on all three systems, and desktop emulation is not actual iOS/Android testing. Exact versions and failure diagnostics are retained in CI artifacts.

## Release automation

The [release runbook](docs/releasing.md) covers one-time owner settings, version preparation, checks, drafts, explicit publication, Community submission and recovery. The [publishing research](docs/research/obsidian-plugin-publishing.md) explains current official requirements and automation boundaries.

**Actions → Prepare release** opens a version/notes PR. **Actions → Release** supports **check** (default, no release writes), **draft** and **publish**. Publication requires a reviewed draft, exact package-checksum confirmation, manual-acceptance attestation and an evidence URL. Both regular quality and native suites run before distribution. Existing tags and differing assets are never force-replaced.

```sh
npm run release:prepare -- 1.0.1 --dry-run
npm run release:prepare -- 1.0.1
npm run check
npm run release:package
```

Packaging generates the three installable assets plus SHA256SUMS and release-metadata.json under `reports/release/package/`. Only the workflow's explicitly authorized publish mode makes a GitHub release public. Initial Community ownership/submission and reviewer approval remain separate. Required environment reviewers, branch protection and immutable releases require owner configuration; YAML files do not prove those controls are active.

## Privacy, support and limitations

The installed plugin has no account, payment requirement, network service, advertisements or telemetry. It writes requested notes and its own settings through Obsidian APIs and does not intentionally modify source items. It does not install/update itself or load remote executable code. User-authored Markdown is stored as text, not executed by the plugin.

Development/release tooling uses the network for npm dependencies, advisory checks, synthetic host-test app/driver downloads, the official registry identity check and GitHub release operations. Those tools are not part of the installed plugin. No personal vault is used for automated tests.

Hidden/configuration items and the vault root are excluded. Arbitrary extensions are supported only when exposed by the Vault API. Each invocation creates a new note; this version does not edit older descriptions or synchronize them after source moves. Notes remain ordinary Markdown after removal.

Report defects with sanitized reproduction steps, version/commit, platform and expected behavior. Follow [SECURITY.md](SECURITY.md) for sensitive reports. Licensed under [MIT](LICENSE).

## Documentation

[Product PRD](docs/prds/describe.md) · [Release PRD](docs/prds/release-management.md) · [Architecture](docs/architecture.md) · [Test strategy](docs/testing.md) · [Dependency maintenance](docs/dependency-maintenance.md) · [Testing research](docs/research/obsidian-plugin-testing.md) · [Host findings](docs/research/host-test-findings.md) · [Verification](docs/verification.md) · [Publishing research](docs/research/obsidian-plugin-publishing.md) · [Release runbook](docs/releasing.md) · [Manual acceptance](docs/releases/acceptance-template.md) · [Changelog](CHANGELOG.md)
