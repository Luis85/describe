# Changelog

## 1.0.0 — Unreleased

### Product

- Add Describe! for visible Vault-exposed files and non-root folders, with active-file and any-item commands.
- Create ItemDescription notes containing full Markdown, an 80-code-point summary, source links/media syntax, tags, category, hex color and aliases.
- Persist per-extension destinations with first-use configuration and configured/same-folder/custom local-subfolder placement.
- Use native declarative settings and public APIs without desktop-only runtime dependencies.

### Improvement and polishing pass

- Enforce 400 source / 450 test code-line limits exclusively through ESLint, excluding blanks and comment-only lines; remove the independent physical-line counter.
- Add actual ESLint boundary regressions, including native-test configuration.
- Add field-specific validation, automatic metadata disclosure/focus, required/help relationships, separate saving status and a character-summary explanation.
- Make color clearing keyboard accessible and disable-capable; synchronize picker/text input and normalize all common alias line endings.
- Prevent stale dialogs overwriting newer routes, delayed initialization after unload, queued saves after shutdown and disposed-modal updates.
- Apply hidden/configuration target eligibility consistently across entry points and the Vault adapter.
- Expand deterministic regression coverage and raise coverage floors.
- Add strict native Obsidian acceptance using built assets, copied vaults, minimum/latest app targets and accurately labeled desktop mobile emulation.
- Add scoped accessibility/layout checks, version records, screenshots and DOM diagnostics.
- Add primary-source testing research, executed-host findings and revised architecture, PRD, testing and release guidance.

### Unified test runner

- Run both fast tests and actual-Obsidian acceptance through Vitest, retaining standalone WebdriverIO for application interaction.
- Remove Mocha, its types and adapter, the WDIO CLI/local runner, runner reporters and the obsolete Mocha compatibility hold/serializer override.
- Preserve all eight native product scenarios and add real-session body/readiness failure-cleanup checks.
- Own session/profile/vault lifecycle explicitly, including partial startup, cancellation and idempotent teardown; add deterministic failure regressions.
- Add JSON/JUnit and per-case environment, screenshot, DOM, accessibility and cleanup evidence.
- Reject missing, duplicate, skipped or failed required acceptance cases through a tested report gate.
- Verify absence of the retired runner in the installed/locked graph without weakening audits, strict typechecking, lint or release approval.

Publication, directory approval and remaining actual-device/manual acceptance are separate release steps. This test-runner migration does not change the plugin runtime or note schema.
