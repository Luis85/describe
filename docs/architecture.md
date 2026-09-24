# Architecture and engineering decisions

## Boundaries

```text
src/
  domains/
    descriptions/     Source identity, metadata rules and Markdown serialization
    storage/          Destination policy, filename safety and settings schema
  application/        Create-description use case, settings transactions and queues
  infrastructure/     Obsidian Vault adapter
  presentation/       Native modal, item picker and declarative settings
  main.ts             Plugin lifecycle and dependency composition

tests/
  domain/
  application/
  infrastructure/
  presentation/
  integration/
  support/            Explicit, test-only Obsidian and DOM adapters

scripts/              Build, install, release and quality gate executables
```

Domain and application code have no Obsidian, DOM, filesystem or third-party package imports. The application depends on a small DescriptionVault port; the Obsidian adapter implements it. Presentation calls application services through supplied callbacks. `main.ts` is the composition root. `check-architecture.mjs` verifies these dependency directions and rejects desktop-only runtime imports; the compiled-bundle release check additionally rejects non-host runtime dependencies.

## Create is the commit point

A request snapshots the user's metadata and placement choices before entering a serialized write queue. Source identity is resolved at save time rather than trusting an old path. Validation precedes destination creation. Folder creation is incremental and tolerates only an actual concurrent folder creation. The service chooses a free filename, then rechecks source existence and location before creating the note.

A successful `Vault.create` is the note's commit point. Persisting a new extension mapping and opening the note are optional follow-up steps. Their failure must not report note creation as failed: doing so would encourage a duplicate retry. The modal therefore receives the committed path plus warnings.

Queues recover after rejected operations. Settings changes clone the current mapping and publish their in-memory value only after `saveData` succeeds. This avoids lost updates between different extension mappings and preserves the previous state on persistence failure.

## Serialization

Frontmatter uses JSON-encoded scalars and arrays, which are valid YAML values. Quoting prevents names such as `null`, hex colors and strings containing colons or newlines from changing types or injecting properties. No runtime YAML dependency is required; tests parse generated frontmatter with an independent YAML library.

The body intentionally preserves user-authored Markdown. Only the generated title and wikilink target receive delimiter escaping. The runtime does not parse or execute user text. Media embedding is a syntax decision based on extensions, not a guarantee of host codec support. Folder references are recorded but not made into a custom navigation mechanism.

## TypeScript 7 and API versioning

The native TypeScript 7 executable is the mandatory typecheck gate. The JavaScript compiler API used by ESLint and the architecture checker is supplied by the TypeScript 6 compatibility alias. These have different roles; a successful compatibility-library import does not count as TypeScript 7 verification.

The plugin's minimum app version is 1.13.7. The npm `obsidian` package supplies API declarations and is versioned independently; the pinned available typings are 1.13.1. Native settings are described through `getSettingDefinitions`, with explicit value adapters for the transactional store and per-extension keys.

Primary references, checked 2026-09-24: [TypeScript 7 side-by-side tooling](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/) and [Obsidian declarative settings](https://docs.obsidian.md/plugins/guides/migrate-declarative-settings).

## Runtime and distribution

Vite bundles TypeScript to a single CommonJS entry whose direct export is the Plugin subclass. Only `obsidian` is external. Node.js utilities are confined to development scripts; neither the native compiler nor lint/test tools ship with the plugin. CSS is scoped and uses host theme variables. `isDesktopOnly: false` declares intended mobile compatibility, which still needs device testing.

No caches, background indexing, file watchers, timers or network calls are needed. The fuzzy picker enumerates the loaded vault when invoked. No contents of source files are read to build the description; media links are generated from the selected item's identity.

## Maintenance rules

Keep individual source files at or below 400 physical lines and test files at or below 450. Add regression tests for bugs in the layer owning the behavior and integration tests when host orchestration is involved. Do not cast host objects in production code; narrow with public classes. Avoid changing the note schema silently. Any future schema migration needs an explicit versioning decision, while existing notes must remain readable without the plugin.
