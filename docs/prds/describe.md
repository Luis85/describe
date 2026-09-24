# Describe — Product requirements

Version: 1.0.0 release scope, including the testing and polishing increment.  
Owner: Luis Mendez. Updated: 2026-09-24.  
Execution evidence: `../verification.md`; research: `../research/obsidian-plugin-testing.md`.

## 1. Problem and outcome

Attachments, folders and non-Markdown files often need more explanation than their filenames provide. Renaming or modifying the original may be undesirable, and binary formats cannot carry Obsidian frontmatter. Vault owners need a consistent way to describe and classify an item without changing it.

Describe creates a separate, portable Markdown note that connects human-readable context and structured metadata with the source. Success means creating a useful description in one predictable workflow, preserving both the original and existing notes. The note must remain readable without the plugin.

## 2. Users, jobs and boundaries

Primary user: an Obsidian vault owner on desktop or mobile. Job: capture what an item is, why it matters and how to find it later. Secondary users consume the description using Markdown, Properties, links, search or compatible third-party views.

In scope: any host-exposed extension, visible non-root folders, note creation, optional metadata, media embed syntax, extension-based routing, three placement modes, native declarative settings, commands, public-API runtime, tests and release preparation.

Out of scope: editing earlier description notes through the modal, batch creation, live source synchronization, OCR/AI generation, transcoding, custom folder navigation, file-explorer coloring, taxonomy management, external databases, accounts, telemetry and cloud services. Names and aliases belong to the description note; source names and contents remain unchanged.

For a selected folder, local placement means **inside the selected folder**, not its parent. Folder references use a trailing-slash wikilink without promising native folder navigation. Mobile UI emulation is not a real-device acceptance result.

## 3. Main use case

Preconditions: enabled plugin, Obsidian 1.13.7+, a visible source exposed by the Vault API, and a writable destination.

1. Invoke **Describe!** from the item's context menu, the active-file command, or the any-item picker.
2. The native modal displays the source path, a prefilled name and an empty description.
3. Enter name and full Markdown description; optionally add tags, category, color and aliases.
4. For an unknown type, choose a configured folder for future descriptions. This is separate from placement of the current note.
5. Choose configured destination, same-folder placement, or a custom local subfolder. Review the destination preview.
6. Save validates metadata and placement, creates missing destination folders and creates a uniquely named note.
7. Only after note creation succeeds does the plugin remember a new route and optionally open the note. Failures of these optional steps are warnings, not failed creations.

Cancellation creates no note or route. Failed validation or I/O preserves the draft. Invalid optional metadata opens its section and focuses the field. Saving disables controls and announces progress. Duplicate submission is ignored. An already dispatched host write can complete during shutdown; queued writes must not start after shutdown, and post-unload follow-up UI must not appear.

## 4. Functional requirements

| ID | Requirement and acceptance |
| --- | --- |
| FR-01 | Exactly one Describe! item is registered for each supported context menu. Extension allowlists do not restrict selection. |
| FR-02 | Active-file and any-item commands provide the same workflow without requiring a desktop right-click. |
| FR-03 | Name and description are required. Invalid input cannot create a note or destination folder. |
| FR-04 | Validate source identity at save time; reject deleted/replaced sources and changed types. Detect source moves during asynchronous creation. |
| FR-05 | Generate the schema in section 5, an escaped heading, the complete description and a source reference. YAML-like input cannot inject properties. |
| FR-06 | Image/audio/video extensions use embed syntax; all other files and folders use a plain wikilink. No format conversion is implied. |
| FR-07 | Ask about a type only when its route is unknown. An explicitly mapped vault root is known. Canceling must not persist a mapping. |
| FR-08 | Support all three placement modes per save; custom subfolders can be nested and use the selected folder itself as the folder-local base. |
| FR-09 | Persist routes, normalize extension case, and provide searchable native settings for editing/removing mappings. |
| FR-10 | Preserve originals and existing notes. Use deterministic numbered suffixes with bounded collision retries. |
| FR-11 | Optional tags, category, color and aliases have stable list/string types, normalization and validation. |
| FR-12 | Runtime uses public Obsidian APIs and has no Node.js, Electron or external-service dependency. Hidden and configured host paths are excluded consistently. |
| FR-13 | Distinguish committed creation from optional follow-up failure. A stale modal must not silently overwrite a newer type route. |
| FR-14 | Use native declarative settings, not an imitation or a separate legacy renderer. |
| FR-15 | Associate fields with help text, reveal/focus invalid metadata, provide separate saving/error announcements and keyboard-operable actions. |
| FR-16 | Disabling the plugin closes owned dialogs, prevents delayed initialization and queued saves, and suppresses stale callbacks. |

## 5. Markdown and metadata contract

| Property | Type | Rule |
| --- | --- | --- |
| `type` | string | `ItemDescription`. |
| `source` | string | Quoted wikilink containing the full vault-relative source path; folder targets end in `/`. |
| `name` | string | Trimmed, single line, required; maximum 200 Unicode code points. |
| `extension` | string | Lowercase file extension, empty for extensionless files, `folder` for folders. |
| `description` | string | First 80 Unicode code points of the line-ending-normalized full description, without an ellipsis. |
| `tags` | string array | Optional leading hashes removed; spaces/commas separate input; valid nested tags; case-insensitive deduplication; maximum 100. |
| `category` | string | Optional trimmed single line, maximum 120 Unicode code points. |
| `color` | string | Empty or lowercase `#rrggbb`; picker and hex field synchronized. |
| `aliases` | string array | One alias per input line; CR, CRLF and LF supported; commas retained; case-insensitive deduplication; maximum 100, each 200 code points. |

The full description preserves Markdown and whitespace, normalizes line endings, rejects null characters, and has a 100,000 UTF-16-code-unit safety limit. Raw tag and alias inputs have 20,000 and 40,000 UTF-16-code-unit safety limits respectively. These input limits are distinct from the Unicode-aware summary and single-line field limits. Code-point truncation does not promise grapheme-cluster truncation.

Empty optional values remain empty strings or lists rather than changing schema types. JSON-encoded scalar/list values are used as valid YAML. The generated body is a level-one heading, full description and source link/embed. Filenames are portable, sanitized derivatives of the name, limited to 60 code points before collision suffixes. The full name property is not shortened to match the filename.

## 6. Storage and settings

Schema version 1 includes `defaultFolder`, `defaultMode`, `subfolder`, `openAfterSave`, `extensionPaths`. Defaults are `Descriptions`, `configured`, `descriptions`, true and an empty mapping. Keys are `file:<lowercase extension>`, `file:` for extensionless files, and `folder` for folders.

Configured paths are vault-relative; blank means vault root. A local subfolder is nonempty. Reject absolute paths, traversal, hidden/configuration directories, reserved platform names and unsafe characters. A file blocking a required directory must cause a clear error, never replacement.

Serialize settings writes, clone the current mapping, and publish the new in-memory state only after persistence succeeds. Invalid persisted settings recover to safe defaults. A failed mapping becomes unknown. A differing route configured after a dialog opened must be kept; the description already created remains saved, with a warning. Explicit settings-page changes can update a known route.

## 7. Interaction and platform quality

Use native Modal, Setting, picker and declarative settings components. Use theme variables, accessible names and help relationships, visible focus, responsive controls and touch-sized actions. Keep optional metadata in a disclosure. Show the source and destination before saving. Use one domain validation model, field-specific error identity and an alert region; saving belongs in a status region. Modifier+Enter must not submit during IME composition.

Desktop and mobile share the same schema and storage rules. Real-device acceptance must cover touch/context menus, software keyboards, text selection, color input, long paths, zoom, screen readers and codecs. Desktop emulation does not certify iOS/Android. Folder and unusual-character links require honest host-specific limitations.

## 8. Engineering and test acceptance

**ESLint alone enforces LOC:** at most 400 code lines per source file and 450 per test file. Exclude blank and comment-only lines through `skipBlankLines: true` and `skipComments: true`; code with an inline comment still counts. No independent physical-line counter is allowed. An ESLint policy regression checks the actual rule at the boundaries for source, unit tests and native configuration.

TypeScript 7 strictly checks source and every test, including the separate native-test project. The TypeScript 6 JavaScript-API compatibility package serves tools, not the compiler gate. Vite bundles a CommonJS Plugin class with only `obsidian` external. Runtime dependency boundaries are checked automatically. All executable repository scripts belong in `scripts/`.

Vitest verifies domain behavior, use cases, failure paths, native API adapters, mocked UI and lifecycle. Coverage includes all production TypeScript with floors of 90% lines, 85% statements, 85% functions and 80% branches. Obsidian ESLint, Oxlint and fallow-rs gates remain mandatory.

WebdriverIO tests the built package inside real Obsidian with fresh copied synthetic vaults. The version matrix covers the minimum app, latest public app and explicitly labeled desktop mobile emulation. Test native settings, metadata round-trip, routing, cancellation, reloads, collisions, accessibility and layout. Capture exact versions and failure diagnostics. Automated accessibility findings do not establish complete WCAG conformance.

Audit development tools too. `test-build` installs only three assets into the repository-local vault. Six isolated installer contracts check copying, preservation and unsafe destinations. Native host tests and filesystem installer tests are separate evidence categories.

## 9. Release acceptance, risks and traceability

Keep README, this PRD, MIT license, architecture, research, test strategy, version mapping, changelog and release guidance aligned. Review successful automated checks for the exact candidate and complete the remaining manual/device matrix. Matching-tag draft release automation is preparation, not permission to claim publication or directory approval.

Residual risks: host-specific folder/unusual-character links, platform codecs, mobile keyboards, permissions, in-flight writes, and third-party test-tool compatibility. Document observed failures rather than suppressing them. Unit tests cover FR-03/05/06/08/09/10/11; application/adapter tests cover FR-04/12/13; interaction/lifecycle tests cover FR-01/02/07/14/15/16; native tests and manual checks verify the actual host and platform contracts. See `../testing.md` for the executable test portfolio and release checklist.
