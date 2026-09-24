# Describe — Product requirements

Version: 1.0.0 implementation scope  
Owner: Luis Mendez  
Updated: 2026-09-24  
Delivery status: implemented on the feature branch; release acceptance requires the evidence in `docs/testing.md` and `docs/releasing.md`.

## 1. Problem and intended outcome

A vault contains attachments, folders and non-Markdown files whose filenames do not explain their purpose or context. Renaming the original may be undesirable, and most binary formats cannot carry Obsidian frontmatter. Users need a consistent, portable way to explain an item and classify it without modifying it.

Describe turns a selected vault item into a separate, structured description note. The note connects human-readable context with the original file or folder and remains useful without the plugin. The primary success criterion is a complete, understandable description created in one workflow, with predictable storage and no accidental source or note overwrite.

## 2. Users and jobs

The primary user is an Obsidian vault owner on desktop or mobile. When encountering a poorly named attachment or a project folder, they want to capture what it is, why it matters, and how it should be found later. A secondary user consumes the resulting Markdown through Obsidian Properties, search, links, or compatible third-party views.

The product has no login, server, AI dependency, subscription, telemetry or separate workspace. Source selection uses the existing vault, not an operating-system file picker.

## 3. Scope and explicit decisions

In scope: any host-exposed file extension, folders below the vault root, description creation, structured metadata, media embed syntax, three destination modes, persisted extension routing, native declarative settings, commands, desktop/mobile-compatible runtime, documentation and release tooling.

Out of scope for this release: editing existing descriptions through the modal, batch creation, live source synchronization, OCR or automatic descriptions, media transcoding, custom folder navigation, file-explorer coloring, metadata taxonomies, a separate database, an account or cloud service. Names and aliases belong to the description note; source contents and names are unchanged.

For a selected folder, a local destination means **inside the selected folder**, not its parent. The folder itself is represented by a trailing-slash wikilink. Native folder navigation is a host limitation, not a promised feature. The 400/450 LOC limits are interpreted as physical lines **per file**, including comments and blanks.

## 4. Main use case: describe a vault item

Preconditions: plugin enabled; Obsidian 1.13.7+; selected item is a non-root file or folder known to the Vault API; destination is writable.

1. The user invokes **Describe!** from the item context menu, or selects an item through the command palette.
2. A native modal displays the original vault-relative source path, a prefilled name and an empty description.
3. The user enters a name and full Markdown description, with optional tags, category, color and aliases.
4. For an unknown type, the modal asks which configured destination should be used for future descriptions of that type. It also allows the current note to use a different placement mode.
5. The user chooses the configured folder, a source-local folder, or a custom local subfolder. The destination preview updates before saving.
6. Saving validates metadata and destination, creates missing folders, chooses a non-conflicting filename and creates the note.
7. Only after note creation succeeds does the plugin remember a new type mapping and optionally open the note. Failure of either optional step is reported as a warning rather than a failed note creation.

Cancellation creates no note and changes no settings. Validation and I/O failures keep the entered draft visible. While a save is active, another submission is ignored and normal modal closing is blocked to avoid duplicate writes.

## 5. Functional requirements

| ID | Requirement and acceptance |
| --- | --- |
| FR-01 | The item context menu contains exactly one Describe! action for files and non-root folders. No extension allowlist restricts selection. |
| FR-02 | Commands provide the same workflow for the active file and an arbitrary vault item, so the capability is accessible without a desktop right-click. |
| FR-03 | A name and nonempty description are required. Validation occurs before any note or destination-folder write. |
| FR-04 | Source identity is checked at save time; deletion or replacement is rejected. A move during asynchronous creation is detected and reported. |
| FR-05 | Saved notes contain the schema in section 6 and the full description in the body. YAML-like user content cannot inject properties. |
| FR-06 | Image, audio and video extensions produce embed syntax. Other files and folders produce plain wikilinks. Unsupported codecs are not converted. |
| FR-07 | A first-use destination question is shown only when the selected type has no persisted mapping. Explicit vault-root mappings count as known. |
| FR-08 | The current save supports configured, same-folder and custom-subfolder destinations. For folders, the local base is the selected folder itself. |
| FR-09 | Known extension paths persist through plugin reloads and can be searched, edited or removed in settings. Extensions are case-insensitive. |
| FR-10 | Source items and existing notes are not overwritten. Collision suffixes are applied deterministically, with a bounded retry count. |
| FR-11 | Tags, category, color and aliases are optional. Empty metadata is serialized using stable string/list types. |
| FR-12 | Settings and note creation use public Obsidian APIs. Plugin runtime has no Node.js, Electron, external service or desktop-only dependency. |
| FR-13 | Saving feedback distinguishes committed note creation from optional follow-up failures, preventing duplicate-note retries. |
| FR-14 | The plugin has native declarative settings and no legacy imperative settings-tab implementation. |

## 6. Document contract

| Property | Type | Rule |
| --- | --- | --- |
| `type` | string | Always `ItemDescription`. |
| `source` | string | Quoted source wikilink with the source's full vault-relative path. |
| `name` | string | Trimmed, one line, maximum 200 characters as validated by the input model. |
| `extension` | string | Lowercase file extension; empty for extensionless files; `folder` for folders. |
| `description` | string | First 80 Unicode code points of normalized full description; no appended ellipsis. |
| `tags` | string array | Leading hashes removed; comma/whitespace input separators; unique, valid nested tags; maximum 100. |
| `category` | string | Optional trimmed single line, maximum 120 characters. |
| `color` | string | Empty or lowercase `#rrggbb`. |
| `aliases` | string array | One alias per input line, deduplicated case-insensitively; commas retained; maximum 100 aliases, 200 characters each. |

The body contains an escaped level-one name heading, the complete Markdown description, and the source link or embed. Description input is limited to 100,000 characters, rejects null characters, and normalizes line endings. Newlines and punctuation in YAML values are serialized as data. Summary truncation counts code points rather than bytes or UTF-16 halves; it does not promise grapheme-cluster truncation.

Generated filenames are portable sanitized derivatives of the name, limited to 60 code points before collision suffixes. The name property is not shortened to match the filename. Description notes use `.md` regardless of source extension.

## 7. Storage and settings contract

Settings schema version 1 contains `defaultFolder`, `defaultMode`, `subfolder`, `openAfterSave` and `extensionPaths`. Initial defaults are `Descriptions`, `configured`, `descriptions`, `true`, and an empty mapping. Mapping keys are `file:<lowercase extension>`, `file:` for extensionless files, and `folder` for folders. This avoids conflating a folder with a file ending in `.folder`.

Configured destinations are vault-relative. Blank means vault root. A local subfolder must be nonempty and may contain nested visible segments. Reject absolute paths, traversal segments, hidden/configuration folders, platform-reserved names and unsafe characters. A file occupying a required folder path causes a clear failure rather than replacement.

Settings updates are serialized and committed in memory only after persistence succeeds. Invalid persisted values are discarded in favor of safe defaults; corrupt type mappings become unknown and are requested again.

## 8. Interaction and accessibility

Use native Obsidian Modal, Setting and fuzzy picker components, theme variables, explicit accessible field names, visible focus, responsive controls, and touch-sized actions. Optional metadata is grouped in a disclosure section. Save and cancel have distinct roles. The source and predicted destination are visible; errors are announced through an alert region. Keyboard users can save with the platform modifier plus Enter.

Desktop and mobile have the same note schema and storage rules. Real-device testing must cover narrow viewports, the on-screen keyboard, long paths, text selection, focus, color input and media availability. A mobile-compatible manifest alone is insufficient evidence of usability.

## 9. Quality and engineering acceptance

Both production and test TypeScript are checked by TypeScript 7 with strict options. Vite produces a CommonJS plugin entry point and externals only the host API. Vitest provides deterministic domain, application, mocked-host and UI contract tests. ESLint with the Obsidian plugin, Oxlint, fallow-rs, dependency direction checks and per-file line limits are required gates. Coverage minima are 80% lines/statements/functions and 70% branches across `src/`.

All executable scripts live in `scripts/`. `npm run test-build` builds and installs into the repository's `.obsidian/plugins/describe` without overwriting plugin data or unrelated vault settings. Published assets are only `main.js`, `manifest.json` and `styles.css`. Source code and the lockfile remain in the repository.

## 10. Release acceptance and risks

The repository must include an accurate README, MIT license, this PRD, test strategy, current manifest, version compatibility mapping and release instructions. Automated gates must pass for the reviewed commit. Desktop and mobile smoke-test evidence must be recorded before claiming production readiness. Community-directory submission and approval are separate from implementing or merging the plugin.

Primary residual risks are host-specific folder-link behavior, reserved characters in source links, codecs, mobile keyboard/layout differences, changed sources during a save, and destination permission failures. The acceptance checklist assigns observable checks rather than assuming mocks prove these host behaviors.

## 11. Traceability

Domain tests cover FR-03/05/06/08/09/10/11. Application tests cover FR-03/04/07/08/10/13. Adapter tests cover FR-04/08/12. Presentation and plugin contract tests cover FR-01/02/07/09/11/13/14. Build and architecture scripts cover engineering constraints. `docs/testing.md` defines the real-host checks and publication evidence that cannot be established by a mocked runtime.
