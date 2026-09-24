# Describe

Create a structured Markdown description for any file or folder exposed by your Obsidian vault. Keep the original untouched while adding a meaningful name, full description, tags, category, color and aliases in a separate note.

**Requires Obsidian 1.13.7 or newer.** Designed for desktop and mobile, using native Obsidian controls and public Vault APIs. Release preparation is tracked in [the release checklist](docs/releasing.md); implementation and automated tests are not a substitute for real-device smoke testing or directory approval.

## Describe an item

1. Right-click a file or folder in the file explorer and choose **Describe!**. On mobile, use the item's context menu, or run **Describe: Choose a file or folder** from the command palette. The **Add description to current file** command is also available.
2. Enter a name and a full Markdown description. The name belongs to the new description note; it does not rename the original.
3. Expand **Tags, category, color and aliases** to add optional metadata.
4. Choose the destination and select **Save description**. `Ctrl+Enter` / `Cmd+Enter` also saves.

The first time you describe a file type, the dialog asks for its default destination. This preference is remembered only after a note is successfully created. Canceling does not create a note or change the mapping.

### Metadata

| Field | Input and storage |
| --- | --- |
| Name | Required, one line; the note heading and basis of the new filename. |
| Description | Required Markdown; the complete text is preserved in the body. |
| Tags | Spaces or commas separate tags. A leading `#` is optional. Nested tags such as `project/home` are supported. Stored as a YAML list without `#`. |
| Category | Optional single text value. |
| Color | Optional six-digit hexadecimal value, with a picker and a clear action. Stored as text, not a theme override. |
| Aliases | One alternative name per line. Commas remain part of an alias. Stored in the standard `aliases` property of the description note. |

Repeated tags and aliases are deduplicated case-insensitively. Aliases apply to the **description note**, not to the source attachment or folder. Color is stored metadata; the plugin does not recolor the file explorer.

### Destination choices

| Choice | Selected file `Assets/photo.jpg` | Selected folder `Projects/Home` |
| --- | --- | --- |
| Configured folder | Uses the saved `.jpg` destination | Uses the saved folder destination |
| Same folder | `Assets/<name>.md` | `Projects/Home/<name>.md` |
| Descriptions subfolder | `Assets/descriptions/<name>.md` | `Projects/Home/descriptions/<name>.md` |

The subfolder name can be changed per note, including nested paths such as `Metadata/Descriptions`. The global default is configurable. An empty configured destination means the vault root. Newly required destination folders are created automatically.

Settings provide the suggested destination for new file types, default save mode, local subfolder name, open-after-save preference, and a searchable list of known file types. Remove a mapping to be asked about that type again. Folder mappings, extensionless files and a file extension literally named `.folder` are separate cases. Extensions are matched case-insensitively.

Existing notes are never intentionally overwritten. A name collision produces `Name (2).md`, `Name (3).md`, and so on. Unsafe filename characters are replaced, and long filenames are shortened while preserving the complete name property.

## Example note

For `Assets/kitchen.jpg`:

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

The frontmatter summary contains the first **80 Unicode code points**, without an added ellipsis; the body retains the complete description. Images, audio and video use embed syntax. Other types, including PDFs, use a normal wikilink. Actual playback depends on the format, codec and operating system supported by Obsidian.

Folders are recorded as `[[Projects/Home/]]` with `extension: "folder"`. This preserves a folder reference; it does not promise native folder-link navigation or folder embeddings. Files without an extension use an empty extension property. Filenames containing reserved wikilink characters are escaped; verify those uncommon names in the target host before relying on navigation.

## Installation and local development

Until a public release is available and approved in the Community directory, install a local build:

```sh
git clone https://github.com/Luis85/describe.git
cd describe
# Before PR #1 is merged:
git switch feat/describe-plugin
npm ci
npm run check
npm run test-build
```

Use **Node.js 24+ and npm 11+** for development. `test-build` builds and installs `main.js`, `manifest.json` and `styles.css` into this project's `.obsidian/plugins/describe/`. Open the project directory as a vault, allow community plugins, and enable **Describe**. The installer preserves `data.json` and other vault settings and refuses unsafe symlink destinations. It does not enable the plugin automatically.

For a different vault, copy the three files from `dist/` into that vault's plugin directory. Never copy `node_modules` or development tooling to a mobile device. Back up a real vault before testing a prerelease.

| Command | Purpose |
| --- | --- |
| `npm run check` | Run all type, lint, architecture, line-count, coverage, dead-code, build and release-contract gates. |
| `npm run typecheck` | TypeScript 7 checks both `src/` and `tests/`, plus Vite/Vitest configuration. |
| `npm run test` / `npm run test:coverage` | Deterministic Vitest tests, optionally with enforced coverage thresholds. |
| `npm run lint` / `npm run lint:oxlint` | Obsidian ESLint rules and Oxlint. |
| `npm run analyze` | fallow-rs dead-code analysis. |
| `npm run build` / `npm run dev` | Production bundle or watched bundle in `dist/`. |
| `npm run test-build` | Build and install into the repository-local vault. |

All executable repository scripts live in `scripts/`. Source files are limited to **400 physical lines per file**; test files to **450**. Blank lines and comments count. Vite bundles the runtime as CommonJS with only `obsidian` external.

TypeScript 7 is installed through `@typescript/native`. The `typescript` import is deliberately aliased to Microsoft's TypeScript 6 compatibility package for tools that still require the JavaScript compiler API. The typecheck gate verifies that the executable is actually TypeScript 7. See the [official migration explanation](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/).

The app requirement (`1.13.7`) is independent of the published API typings (`obsidian@1.13.1`). Settings use Obsidian's [native declarative settings API](https://docs.obsidian.md/plugins/guides/migrate-declarative-settings), not a custom imitation.

## Data, privacy and limitations

No account, analytics, network service or external data generator is used. The plugin writes only the requested description notes and its own settings, using Obsidian APIs. User-entered Markdown is saved as text; the plugin does not evaluate it. Other plugins or the host may subsequently render that Markdown.

The vault root, hidden files and configuration directories are not supported description targets. Arbitrary extensions are supported when Obsidian exposes the item through its Vault API; this does not bypass the host's visibility rules. The plugin creates notes, not a database, and does not maintain a live index or automatically synchronize metadata after later source moves. Re-running Describe creates another note rather than editing an earlier description. Notes remain ordinary Markdown after the plugin is disabled or removed.

## Project documentation

- [Product requirements](docs/prds/describe.md)
- [Architecture and engineering decisions](docs/architecture.md)
- [Test strategy and real-device acceptance checklist](docs/testing.md)
- [Release and Community-directory submission](docs/releasing.md)

Report defects in the repository with reproduction steps, your Obsidian version, platform and a sanitized example. Do not include private vault contents or credentials. Licensed under [MIT](LICENSE).
