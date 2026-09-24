# Security

Describe is maintained in this repository. Release candidates are not a promise of marketplace approval or a security certification. Use the most recent reviewed stable release once available and keep backups of important vaults.

## Reporting a vulnerability

Use GitHub's **Report a vulnerability** option on the repository Security tab when private reporting is enabled. Include the affected version/commit, platform, impact and a minimal sanitized reproduction. Do not submit credentials, personal vaults or private attachments.

If private reporting is not yet enabled, open an issue requesting a private contact channel without publishing exploit details or sensitive data. The maintainer must arrange a private channel before you disclose those details. No response-time guarantee is implied.

## Runtime boundary

The installed plugin writes requested Markdown notes and its own settings through Obsidian APIs. It does not use an account, network service, telemetry, remote code or a self-updater. It does not intentionally modify source items. Development/release tools use npm, GitHub, advisory sources and Obsidian/driver downloads; these tools are not shipped in main.js.

## Release integrity

Release automation stages assets before explicit publication and rejects differing existing tags/assets. SHA256SUMS and release-metadata.json identify expected bytes and source; checksums are not signatures. Maintainers should enable immutable GitHub releases and required environment reviews separately. Report discrepancies instead of installing an asset with a mismatched checksum.

Dependency updates require normal code review, audit and native execution. Do not weaken the vulnerability gate or replace published assets silently to address an incident; issue a reviewed patch release and communicate affected versions.
