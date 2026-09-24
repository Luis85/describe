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
- Add strict, isolated native Obsidian acceptance using WebdriverIO, built assets, fresh copied vaults, minimum/latest app targets and accurately labeled desktop mobile emulation.
- Add scoped accessibility/layout checks, actual version records, failure screenshots and DOM diagnostics.
- Update native development dependencies and document compatibility overrides rather than suppress vulnerability findings.
- Add comprehensive primary-source testing research, executed-host findings and revised architecture, PRD, testing and release guidance.

Publication, directory approval and remaining actual-device/manual acceptance are separate release steps.
