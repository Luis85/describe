## Change and rationale

Describe the user-visible or engineering change and relevant requirements.

## Verification

Record executed checks and their exact commit. Distinguish unit/host-double tests, native Obsidian tests, desktop emulation and actual devices. Mark unexecuted checks not run.

- [ ] Source and all tests typecheck; ESLint owns the 400/450 code-line limits, excluding blank/comment-only lines.
- [ ] Regression tests cover the change; existing quality/native gates remain enabled.
- [ ] README, PRD, privacy and compatibility claims match the implementation.

## Release-sensitive changes

For a release, review version/lock/manifest/mapping/notes together. Link the package digest and completed acceptance record. Do not claim that this PR creates marketplace approval, configures environment reviewers or publishes a release.
