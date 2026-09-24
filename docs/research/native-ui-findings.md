# UI defects and host differences found by real acceptance

Observed 2026-09-24 in [run 36022668895](https://github.com/Luis85/describe/actions/runs/36022668895), committed working tree `588d79ac776c8b8123a38fa761e5be5af43415ff`. Six of eight native workflows passed in Obsidian 1.13.7 on Linux desktop. The subsequent fix must pass its own workflow; the following diagnosis is not a claim that the rerun has completed.

## Save-button contrast

The scoped axe report measured white text on the host's default accent-filled Save button at 3.42:1, below the rule's 4.5:1 threshold for this text size. The plugin now uses Obsidian's normal readable text/surface pair for the primary action, retaining the accent as a border cue. Hover uses the matching host hover surface. The contrast rule stays enabled; no colors are hardcoded into the plugin and no unrelated host elements are restyled.

This is a product styling defect that domain/jsdom tests could not establish. The native regression checks the actual rendered modal. Theme/device combinations outside that execution still require the manual acceptance matrix.

## Settings can occupy a different host window

On desktop, opening Settings left the main app window without a settings navigation element; desktop mobile emulation had shown Settings in the current window. The native test now enumerates WebDriver window handles and selects the one containing Describe's real settings tab, rather than assuming the current window owns it. It returns to the main app window for the service's Vault/settings bridge and closes only the settings popout or sheet when finished.

The exact setting-row selector additionally excludes group containers and checks the expected starting value before editing. This tests the native renderer and actual persistence without calling a private settings-page API. Obsidian's [official changelog](https://obsidian.md/changelog/) documents Settings as a popout-window example, and [WebdriverIO window switching](https://webdriver.io/docs/api/browser/switchWindow/) is the corresponding automation mechanism.

## Dependency compatibility verified through execution

The same run successfully executed six native cases using Mocha 10.8.2 with a targeted serialize-javascript 7.1.1 override, after Mocha 12 had failed the adapter's private import. The complete dependency audit reported zero vulnerabilities. App and driver acquisition ran from a fresh CI environment with the browser-manager override. See [host-test findings](host-test-findings.md) for the compatibility rationale and limitations.
