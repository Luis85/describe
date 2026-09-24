# Findings from executing the native acceptance suite

Date: 2026-09-24. This supplements [the testing research](obsidian-plugin-testing.md). Consult the reviewed commit's CI results for the final outcome.

## Distinguish product defects from test defects

The first real-host run used Obsidian 1.13.7 and its 1.13.7 Electron installer in desktop mobile-emulation mode. Five of eight workflows passed. The failure artifacts showed two selector problems, not corresponding product failures:

- A combined `.describe-modal button=Cancel` selector was not valid for the WebdriverIO text-selector syntax. The test now scopes to the modal and then finds `button=Cancel`.
- A broad `contains(@class, "setting-item")` XPath matched a settings group, so the test edited Default folder while waiting for Descriptions subfolder to change. The actual settings page rendered correctly and persisted the edited default folder. Matching a complete row class token and asserting the initial subfolder value fixes that ambiguity.

These examples are why native failure screenshots, DOM snapshots and outcome assertions are kept. Do not label every red browser test as an application defect, and do not remove assertions merely to obtain a green run.

## Axe in an Electron window

The Electron WebDriver endpoint rejects `window/new`, which axe normally uses to open a blank result-aggregation page. The documented `setLegacyMode()` fallback performs the scoped analysis in place. No WCAG rules are disabled. Its limitation is lack of cross-origin frame testing; the suite explicitly asserts that the Describe modal contains no iframe before using it. This does not establish accessibility for the rest of Obsidian or other plugins.

Primary source: [axe WebdriverIO README](https://github.com/dequelabs/axe-core-npm/blob/develop/packages/webdriverio/README.md#axebuildersetlegacymodelegacymode-boolean--true).

## Development-tool security and compatibility

The initial native tooling graph exposed vulnerabilities through old WebdriverIO utilities, Mocha serialization and the archive extractor. Development-only dependencies are still audited; the gate is not weakened to ignore them. WebdriverIO is updated to 9.32.0. Two explicit overrides are maintained in package.json:

| Override | Reason | Required verification |
| --- | --- | --- |
| `mocha: $mocha` (12.0.2) | Prevent the adapter's older Mocha range from retaining vulnerable serialization tooling. | Typecheck and actual native test execution. |
| `@puppeteer/browsers: 3.2.3` | Replace the older browser manager's vulnerable extract-zip dependency. The 3.x manager no longer declares that dependency. | Fresh browser/driver acquisition and native execution, not only a cached run. |

These are compatibility decisions, not assertions that major versions are automatically interchangeable. Remove the overrides once the upstream adapter ranges include the required patched versions, then rerun the full matrix and audit. The source of truth for vulnerabilities is the observed audit result at a recorded commit/date, not this rationale.

Primary source package manifests: [WebdriverIO Mocha adapter](https://github.com/webdriverio/webdriverio/blob/v9.32.0/packages/wdio-mocha-framework/package.json), [browser manager](https://github.com/puppeteer/puppeteer/blob/main/packages/browsers/package.json). Official browser-manager system requirements: [Puppeteer browsers API](https://pptr.dev/browsers-api).

## Type-aware linting of native configuration

The Obsidian ESLint preset's TypeScript parser is reused explicitly for `.mts` native configuration. Undefined identifiers are checked by the mandatory TypeScript 7 projects, not the JavaScript-only no-undef rule, which cannot resolve TypeScript type namespaces. The same max-lines policy applies to `.ts` and `.mts` tests, and a boundary regression exercises the native configuration's effective policy too.

Primary source: [typescript-eslint FAQ on no-undef](https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors).
