# Describe

Create a structured Markdown description for any file or folder exposed by your Obsidian vault. Keep the original untouched while adding a meaningful name, full description, tags, category, color and aliases in a separate note.

**Requires Obsidian 1.13.7 or newer.** Uses native Obsidian controls, declarative settings and public Vault APIs. Designed for desktop and mobile. Automated host testing, real-device acceptance and Community-directory approval are distinct milestones; see [verification](docs/verification.md).

## Describe an item

1. Right-click a visible file or non-root folder and choose **Describe!**. On mobile, use its context menu or **Describe: Choose a file or folder** in the command palette. **Add description to current file** is also available.
2. Enter a name and full Markdown description. The name belongs to the new note; it does not rename the original.
3. Expand **Tags, category, color and aliases** to add optional metadata.
4. Choose the destination and select **Save description**. `Ctrl+Enter` / `Cmd+Enter` also saves.

The first description for a file type asks for its future default destination. This mapping is remembered only after a note is created. Canceling creates no note and changes no mapping. If another dialog configured the type meanwhile, the newer mapping is preserved and the saved note remains valid.

### Metadata

| Field | Input and storage |
| --- | --- |
| Name | Required single line; heading and basis of the new filename. Maximum 200 Unicode code points. |
| Description | Required Markdown. The complete text stays in the body; a character count explains the 80-character frontmatter summary. |
| Tags | Spaces or commas separate tags; a leading `#` is optional. Nested tags such as `project/home` are supported. Stored as a YAML list without `#`. |
| Category | Optional single line, maximum 120 Unicode code points. |
| Color | Optional six-digit hexadecimal text, synchronized with the picker; **Clear color** removes it. |
| Aliases | One alternative name per line. Commas remain part of an alias. Stored in the standard `aliases` property. |

Tags and aliases are deduplicated case-insensitively and limited to 100 each. Each alias is limited to 200 Unicode code points. Aliases apply to the **description note**, not to the source attachment or folder. Color is metadata; the plugin does not recolor the file explorer.

Invalid metadata opens the relevant section and focuses its field. Save failures preserve the draft. During saving, controls are disabled and progress is announced separately from errors. A successfully created note is not reported as a failed creation just because opening it or remembering a destination subsequently failed.

### Destinations

| Choice | File `Assets/photo.jpg` | Folder `Projects/Home` |
| --- | --- | --- |
| Configured folder | Saved `.jpg` destination | Saved folder destination |
| Same folder | `Assets/<name>.md` | `Projects/Home/<name>.md` |
| Descriptions subfolder | `Assets/descriptions/<name>.md` | `Projects/Home/descriptions/<name>.md` |

The local subfolder is freely configurable per note, including nested paths such as `Metadata/Descriptions`. Empty configured destinations mean the vault root; local subfolders cannot be empty. Missing destination folders are created automatically. Existing notes are not overwritten: collisions receive ` (2)`, ` (3)`, and later suffixes. Unsafe filename characters are replaced and long filenames shortened without shortening the name property.

Native settings expose the default folder, default location, local subfolder name, open-after-save choice, and a searchable list of known file types. Edit a route directly in settings or delete it to be asked again. Extensions are case-insensitive. Folders, extensionless files and files with a literal `.folder` extension have separate routing keys.

## Example generated note

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

The summary contains the first **80 Unicode code points**, with no added ellipsis. The full description preserves Markdown and normalizes line endings. It is limited to 100,000 UTF-16 code units and rejects null characters. Images, audio and video receive embed syntax; other types, including PDFs, receive plain wikilinks. Playback depends on the format, codec and host operating system.

Folders are recorded as `[[Projects/Home/]]` with `extension: "folder"`. This records a reference, not a promise of native folder navigation. Extensionless files have an empty extension. Reserved wikilink characters are escaped; unusual source filenames still require host-navigation acceptance testing.

## Build and install locally

Use **Node.js 24+ and npm 11+**:

```sh
git clone https://github.com/Luis85/describe.git
cd describe
# Until PR #1 is merged:
git switch feat/describe-plugin
npm ci
npm run check
npm run test-build
```

Open the project directory as an Obsidian vault, allow community plugins and enable **Describe**. `test-build` installs only `main.js`, `manifest.json` and `styles.css` into this project's `.obsidian/plugins/describe/`. It preserves plugin `data.json` and unrelated vault settings, rejects unsafe linked destinations, and never enables the plugin automatically.

For another vault, copy those three files from `dist/` into that vault's plugin directory. Do not copy `node_modules` or test tooling to a mobile device. Use a disposable vault or back up important data before testing a prerelease.

## Development and testing

| Command | Purpose |
| --- | --- |
| `npm run check` | TypeScript, lint, actual ESLint policy regression, architecture, unit/host-double coverage, fallow-rs, build and release-package checks. |
| `npm run typecheck` | TypeScript 7 checks source, Vitest tests, and the separate native-test project. |
| `npm run lint` | Obsidian ESLint rules, including source/test code-line limits. |
| `npm run lint:oxlint` / `npm run analyze` | Oxlint correctness checks / fallow-rs dead-code analysis. |
| `npm run test` / `npm run test:coverage` | Fast deterministic Vitest tests with optional enforced coverage. |
| `npm run test:e2e` | Build, launch real Obsidian with WebdriverIO and run native acceptance in copied synthetic vaults. |
| `npm run build` / `npm run dev` | Production or watched bundle in `dist/`. |
| `npm run test-build` | Build and install into the project-local vault. |
| `node scripts/check-install.mjs` | Six disposable installer-safety contracts. |
| `node scripts/audit.mjs` | Dependency audit, including development tools. |

**ESLint is the sole LOC enforcer:** 400 code lines per source file and 450 per test file. Blank lines and comment-only lines are excluded; lines containing code plus an inline comment still count. There is no separate physical-line counter. All executable repository scripts live in `scripts/`.

Coverage includes all production TypeScript. Required minima are 90% lines, 85% statements, 85% functions and 80% branches. Fast tests on Linux/Windows/macOS do not imply that the app itself ran on all three systems.

Native CI exercises the required app version, the latest public app, and a narrow-screen **desktop mobile-emulation** mode on Linux. It records resolved app/installer versions and captures failure screenshots, DOM, and accessibility output under `reports/native/`. Local native testing requires a graphical desktop session; CI uses a virtual display. Initial native execution downloads Obsidian and driver components. The fixtures are synthetic, and each test uses a fresh copy including fresh settings. Emulation is not Android/iOS device testing.

TypeScript 7.0.2 is installed through `@typescript/native`; the `typescript` import separately aliases Microsoft's TypeScript 6 JavaScript-API package for compatible lint tooling. The mandatory compiler gate checks the actual executable version. The minimum app version (1.13.7) and published API typings (`obsidian@1.13.1`) are separate. Native-tool compatibility overrides and the Electron accessibility adapter are documented in [host-test findings](docs/research/host-test-findings.md).

## Privacy and limitations

The plugin runtime has no account, telemetry or network service. It writes the requested notes and its own settings using Obsidian APIs. Source files are not renamed or modified. Development tooling does use the network for dependencies, app downloads and advisory checks.

Hidden files, configuration paths and the vault root are excluded. Arbitrary extensions are supported only when the Vault API exposes the item. Describe creates a new note each time; this release does not edit earlier descriptions or maintain a live source index. User-entered Markdown is stored as text, not executed by the plugin. Notes remain ordinary Markdown after disabling or uninstalling Describe.

## Documentation

[PRD](docs/prds/describe.md) · [Architecture](docs/architecture.md) · [Testing and device acceptance](docs/testing.md) · [Testing research](docs/research/obsidian-plugin-testing.md) · [Executed-host findings](docs/research/host-test-findings.md) · [Verification](docs/verification.md) · [Release instructions](docs/releasing.md) · [Changelog](CHANGELOG.md)

Report defects with reproduction steps, the tested commit, Obsidian/platform versions and sanitized examples. Do not include private vault contents or credentials. Licensed under [MIT](LICENSE).
