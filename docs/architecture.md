# Architecture and engineering decisions

## Runtime boundaries

```text
src/
  domains/
    descriptions/     Source model, metadata, field errors, Markdown serialization
    storage/          Placement, eligibility, path/filename safety, settings schema
    text.ts           Shared character policy
  application/        Create-description use case, settings transactions, queues
  infrastructure/     Public Obsidian Vault adapter
  presentation/       Modal, metadata fields, picker, native declarative settings
  main.ts             Lifecycle and dependency composition

tests/
  domain/ application/ infrastructure/ presentation/ integration/
  release/            Release/dependency/transport contracts
  native/             Fast tests of native-session ownership and result validation
  support/            Host/DOM doubles and a pure session-lifecycle owner
  e2e/                Actual Obsidian tests and a separate Node Vitest configuration
    vault/            Synthetic fixtures copied for every native case

scripts/              Build, install, test launchers, quality and release executables
```

Domains/application have no host, DOM, filesystem or third-party imports. A small DescriptionVault port separates the use case from the Obsidian adapter. Presentation uses supplied callbacks; main.ts composes dependencies. Architecture checks enforce direction and prohibit desktop-only runtime imports. The bundle check rejects non-host external dependencies.

## Persistence and lifecycle

The create operation snapshots input before entering a serialized queue. Validate source identity, metadata and placement before creating directories. The adapter incrementally creates visible directories and tolerates only real concurrent folder creation. The use case chooses a collision-free name and rechecks the source after asynchronous work.

Successful Vault.create is the commit point. Route persistence and opening the note are optional follow-ups; their failure becomes a warning rather than inviting a duplicate retry. Settings writes clone the current mapping and publish the new state only after persistence succeeds. Stale first-use dialogs cannot replace a different newer route; explicit settings edits can.

Delayed loadData completion cannot reactivate an unloaded plugin. The source resolver checks activity before queued writes and after directory creation. An already-dispatched host write may finish; queued writes and stale UI follow-ups must not continue. Modal disposal is idempotent. Eligibility uses the actual Vault.configDir across menus, picker, commands and adapter.

## Serialization and interaction

JSON-encoded scalars/lists are valid YAML and preserve property types without injection. Generated headings and link delimiters are escaped; user-authored Markdown stays text. Media syntax is extension-based, not a codec guarantee. Folder links record a reference without implementing custom navigation.

Domain validation errors identify fields, not DOM elements. Presentation reveals and focuses invalid inputs, uses uniquely associated help and required state, and separates error alerts from saving status. Color clearing is keyboard-operable. Name, aliases and color belong to the description note, not the original file.

## Unified test runner, separate environments

Vitest owns both fast and native tests. The root configuration uses Node/jsdom and an explicit Obsidian double. The independent native configuration runs in Node and drives the built plugin inside actual Obsidian through standalone WebdriverIO. It does not use Browser Mode, the host mock, Mocha, a WDIO framework adapter or WDIO runner globals.

The per-test native fixture owns a fresh browser session, synthetic copied vault and host profile. Explicit browser/page objects and Vitest polling replace runner globals/matchers. A pure SessionLifecycle abstraction owns partial startup, cancellation and idempotent teardown. The integration retains the pinned service worker to call afterSession() as well as browser.deleteSession(); the convenience startWdioSession helper does not own all that cleanup. Exported lifecycle hooks are marked hidden upstream, so their use is isolated, version-pinned and covered by actual cleanup tests rather than represented as a first-party Vitest adapter.

The native result gate requires the eight product scenarios plus two real-session failure/cleanup checks. Missing or skipped cases do not pass release acceptance. JSON/JUnit and per-case artifacts record the actual environment. Unit tests exercise deterministic failure paths; native regressions demonstrate service cleanup after a real body/readiness failure. Abrupt process termination and upstream failures before remote returns are not claimed as fully cancellable transactions.

## Engineering and distribution

TypeScript 7 checks source and both test projects. A separate TypeScript 6 JavaScript API alias serves compatible tools, not the compiler gate. Obsidian typings and the minimum app version are independently versioned.

ESLint alone enforces 400 source / 450 test code lines per file, excluding blanks and comment-only lines, including the native .mts configuration. Effective-policy probes use ESLint itself. Coverage includes all production TypeScript; it is not reported as release-script or fixture coverage.

Mocha and runner-specific dependencies, the compatibility hold and serializer override are removed. Keep independently justified security overrides under review and audit all development tools. The release workflow still requires quality and actual-host gates, exact source/artifact validation and explicit publication approval. No plugin source/schema/version changes are required for the runner migration.

Only main.js, manifest.json and styles.css ship. The runtime has no network service, background index or source-content reader. Compiler, lint and automation packages do not ship. Real-device acceptance and directory approval remain distinct from CI. See [testing](testing.md), [native integration](testing-vitest-native.md), [dependency maintenance](dependency-maintenance.md) and [release guidance](releasing.md).
