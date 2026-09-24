# Findings from executing the native acceptance suite

Date: 2026-09-24. This supplements [the testing research](obsidian-plugin-testing.md). Consult the reviewed commit's CI results for the final outcome.

## Distinguish product defects from test defects

The first real-host run used Obsidian 1.13.7 and its 1.13.7 Electron installer in desktop mobile-emulation mode. Five of eight workflows passed. Failure artifacts showed two selector problems, not corresponding product failures:

- A combined `.describe-modal button=Cancel` selector was invalid WebdriverIO text-selector syntax. The test now scopes to the modal and then finds `button=Cancel`.
- A broad `contains(@class, "setting-item")` XPath matched a settings group, so the test edited Default folder while waiting for Descriptions subfolder to change. Native settings rendered correctly and persisted the actual edited field. A complete row-class token and an initial-value assertion remove that ambiguity.

Keep failure screenshots, DOM snapshots and outcome assertions. Do not label every red browser test as an application defect, and do not remove assertions merely to obtain a green run.

## Axe in an Electron window

The Electron driver rejects `window/new`, which axe normally uses for a blank result-aggregation page. The documented `setLegacyMode()` fallback scans in place. No WCAG rules are disabled. Cross-origin frame testing is unavailable in this mode; the test explicitly checks that Describe's modal has no iframe first. The scan does not certify the rest of Obsidian or other plugins.

Primary source: [axe WebdriverIO README](https://github.com/dequelabs/axe-core-npm/blob/develop/packages/webdriverio/README.md#axebuildersetlegacymodelegacymode-boolean--true).

## A clean audit does not prove runtime compatibility

The initial native tooling graph exposed vulnerabilities through old WebdriverIO utilities, Mocha serialization and archive extraction. Development dependencies remain audited at moderate severity and above. WebdriverIO was updated to 9.32.0, and the browser manager was moved away from vulnerable extract-zip.

An attempted Mocha 12 upgrade passed TypeScript and dependency auditing but failed the actual native runner: WebdriverIO's adapter imports `mocha/lib/cli/run-helpers.js`, which that major version no longer supplies. The native execution artifact identified the exact missing import. Mocha 10.8.2 is therefore retained within the adapter's declared compatibility range, with a targeted serializer override instead of an incompatible framework override.

| Override | Reason | Required verification |
| --- | --- | --- |
| `serialize-javascript: 7.1.1` | Patch Mocha's serialization dependency without removing the adapter's expected Mocha API. | Clean audit plus actual test execution; not merely a version-number change. |
| `@puppeteer/browsers: 3.2.3` | Replace the browser manager graph that retained extract-zip. | Fresh browser/driver acquisition and native execution, not only cached runs. |

These are explicit compatibility decisions. Remove them once upstream dependency ranges include the patched versions and rerun the full matrix. Npm may still report package deprecation/install-script notices; those are distinct from audit findings. A dated audit result does not guarantee absence of undisclosed defects.

Primary sources: [WebdriverIO Mocha adapter manifest](https://github.com/webdriverio/webdriverio/blob/v9.32.0/packages/wdio-mocha-framework/package.json), [serializer release](https://github.com/yahoo/serialize-javascript/releases/tag/v7.1.1), [browser manager manifest](https://github.com/puppeteer/puppeteer/blob/main/packages/browsers/package.json), [browser-manager requirements](https://pptr.dev/browsers-api).

## Type-aware linting of native configuration

The Obsidian ESLint preset's TypeScript parser is reused explicitly for `.mts`. Undefined identifiers are checked by mandatory TypeScript 7 projects, not the JavaScript-only no-undef rule, which cannot resolve type namespaces. The same max-lines policy applies to `.ts` and `.mts` tests, with a boundary regression against the actual effective rule.

Primary source: [typescript-eslint FAQ on no-undef](https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors).
