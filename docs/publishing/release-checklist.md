# v0.1.0 publication checklist

## Verified locally

- [x] README describes observed v0.1.0 behavior and limitations.
- [x] Quickstart completes with no network or model call.
- [x] Three synthetic scenario/report bundles are versioned.
- [x] Formatter, lint, typecheck, unit/integration/E2E tests, and build pass.
- [x] Package installs and CLI runs in an isolated directory.
- [x] Dependency audit, secret scan, local links, assets, and SHA-256 sidecars pass.
- [x] Animated demo and alt text are present.
- [x] Changelog and release notes are ready.
- [x] CI has read-only contents permission and no provider secret.

## Actions requiring the repository host

- [x] Create the public GitHub repository with the expected URL.
- [x] Push the release-candidate branch.
- [x] Confirm GitHub Actions passes on the hosted runner.
- [x] Review the README animation on desktop and mobile.
- [x] Promote the CI-approved commit to the default `main` branch (the repository had no prior base for a meaningful pull request).
- [ ] Create signed/annotated `v0.1.0` tag from the verified commit.
- [ ] Publish the GitHub release using `docs/release-notes-v0.1.0.md`.
- [ ] Add repository topics: `agentic-ai`, `ai-security`, `red-team`, `owasp`, `typescript`.
- [ ] Publish the LinkedIn post only after the release URL resolves.
- [ ] Record GitHub release URL, CI run URL, and publication date.

## Final host-side commands

```bash
git push -u origin codex/m5-release-candidate
git tag -a v0.1.0 -m "Hermes Agent Security Lab v0.1.0"
git push origin v0.1.0
```

Run the tag commands only after the hosted CI result and release commit are confirmed.
