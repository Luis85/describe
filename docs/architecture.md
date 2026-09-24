# Architecture and engineering decisions

## Boundaries

```text
src/
  domains/
    descriptions/     Source model, metadata, field errors, Markdown serialization
    storage/          Placement, eligibility, path/filename safety, settings schema
    text.ts           Small shared character policy
  application/        Create-description use case, settings transactions, queues
  infrastructure/     Public Obsidian Vault adapter
  presentation/       Modal, metadata fields, item picker, native declarative settings
  main.ts             Plugin lifecycle and dependency composition

tests/
  domain/ application/ infrastructure/ presentation/ integration/
  support/            Explicit test-only Obsidian and DOM doubles
  e2e/                WebdriverIO native acceptance, separate TypeScript project
    vault/            Synthetic fixtures copied per native test

scripts/              Build, install, native runner, release, quality executables
```

Domains/application have no host, DOM, filesystem or third-party imports. The application depends on a small DescriptionVault port; the adapter implements it. Presentation uses supplied callbacks. `main.ts` composes the dependencies. The architecture gate checks directions and forbids desktop-only runtime imports; the bundle check rejects non-host external dependencies.

## Writes, routing and shutdown

The create operation snapshots user input before joining a serialized queue. Source identity and eligibility are resolved at save time. Validation precedes directory creation. The adapter creates visible directories incrementally, tolerating only a real concurrent folder creation. The use case chooses a collision-free name, rechecks the source after asynchronous work and creates the note without replacing earlier notes.

Successful `Vault.create` is the commit point. Remembering a route and opening the note are optional follow-ups. Their failure produces warnings, not a retry invitation that could duplicate a committed note. Settings writes use a recovering queue and publish the cloned state only after successful persistence. A stale first-use dialog cannot replace a different route configured meanwhile; explicit settings-page edits remain supported.

The plugin tracks initialization/unload separately. A late `loadData` completion cannot reactivate a stopped plugin. The source resolver checks activity before queued work and after directory creation. An already-dispatched host write may finish, but queued notes and optional UI follow-ups do not continue after shutdown. Closing/disposal is idempotent and no asynchronous callback updates disposed modal DOM.

## Metadata and interaction

Frontmatter uses JSON-encoded scalars/lists as YAML values, avoiding implicit type changes or property injection. Generated heading and link delimiters are escaped; user-authored Markdown remains text. Media embedding is an extension-based syntax policy, not a decoding guarantee. Folder references are not a custom navigation feature.

Validation errors carry a domain field identity rather than a DOM reference. Presentation uses it to reveal optional fields, set invalid state and focus the input. Unique help IDs, required-state attributes, an alert region and a distinct saving status make feedback explicit. The color clear action is a real disabled-capable button. A character summary explains the 80-code-point property without truncating the body.

Eligibility is a domain policy reused by commands, picker, menu and adapter, including the actual `Vault.configDir`, not a hardcoded runtime configuration path. Optional color and aliases are properties of the description note; source files remain untouched.

## Toolchain and tests

TypeScript 7 is the mandatory compiler. TypeScript 6 supplies the JavaScript compiler API used by compatible tools. Root and native-test tsconfigs separate Vitest and Mocha/WebdriverIO types while typechecking all source and test files. Obsidian's API typings version is independent of the 1.13.7 minimum app version.

ESLint alone enforces 400 source / 450 test **code lines per file**, excluding blanks and comment-only lines. The policy regression invokes ESLint at the boundaries; it is not a second line counter. Undefined identifiers remain a TypeScript responsibility, following the typescript-eslint guidance for TypeScript namespaces.

Vitest handles detailed deterministic behavior and failures. Native tests load `dist/` in actual Obsidian and reset the full synthetic vault/settings state through fresh copies. They do not use the production code's test alias. The package's CommonJS shape and safe installation are independent gates. CI checks fast/package behavior on three desktop operating systems and real-host acceptance on Linux. Neither implies real iOS/Android execution.

Native-tool security overrides and the iframe-free Electron axe adapter are explained in [host-test findings](research/host-test-findings.md). They need both a clean dependency audit and executed native tests when updated. Automatic accessibility analysis is scoped to the plugin modal, not the host as a whole.

## Runtime and release

The shipped package contains `main.js`, `manifest.json` and `styles.css`. Only Obsidian is external; compiler/lint/test/native-automation dependencies never ship. CSS is scoped and theme-aware. The runtime has no network service, timers, indexes or source-content readers; the picker enumerates loaded items only on demand.

Keep future behavior in its owning layer, accompany bug fixes with regression tests and update the PRD/schema deliberately. Real host and device acceptance, a published GitHub release, and Community-directory approval are separate steps. See [testing](testing.md), [research](research/obsidian-plugin-testing.md) and [release guidance](releasing.md).
