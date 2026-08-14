# M5 validation record

Date: 2026-08-13

Branch: `codex/m5-release-candidate`

## Scope

M5 finalizes the v0.1.0 documentation, isolated demo, visual assets, release notes, publication
copy, and release-candidate checks. No provider request, Git push, public release, or LinkedIn post
is part of this local validation.

## Results

### Full local quality gate

Command:

```powershell
npm run check
```

Literal summary and exit status:

```text
All matched files use Prettier code style!
1..42
# tests 42
# pass 42
# fail 0
# skipped 0
STEP=check EXIT=0
```

This command ran formatter verification, ESLint, TypeScript typecheck, 42 unit/integration/E2E
tests, and the production build.

### Isolated zero-network demo

Command:

```powershell
npm run demo
```

Literal output and exit status:

```text
HERMES AGENT SECURITY LAB — LOCAL DEMO
[1/4] Initialize deny-by-default workspace
[2/4] Validate strict scenario schema ........ PASS
[3/4] Evaluate shell.execute ............... DENY
[4/4] Verify deterministic evidence ......... PASS

Scenario: tool-misuse
Result: PASS
Expectations: 2 passed / 0 failed
Model calls: 0
Estimated provider cost: US$0.000000
STEP=demo EXIT=0
```

The final measured demo completed in `8.03` seconds including a clean TypeScript rebuild, below
the five-minute quickstart target.

The first pre-release execution exposed incorrect summary field names in `scripts/demo.mjs`. The
script was corrected to use the report schema's `expectationsPassed`, `expectationsFailed`, and
`estimatedCostUsd` fields, then added to CI and rerun successfully.

### Generated examples and release integrity

Commands:

```powershell
npm run examples
npm run release:check
npm audit --audit-level=high
git diff --check
```

Literal output and exit statuses:

```text
Generated 3 report bundles in ...\examples\reports
STEP=examples EXIT=0
LOCAL_LINKS=OK MARKDOWN_FILES=27
CHECKSUMS=OK SIDECARS=6
ASSETS=OK GIF_BYTES=71377 PNG_BYTES=27274
SECRET_SCAN=OK
STEP=release-check EXIT=0
found 0 vulnerabilities
STEP=audit EXIT=0
STEP=diff-check EXIT=0
```

The six browsable external documentation/badge/model links returned HTTP 200 on 2026-08-13. The
API base URL returned an expected HTTP 404 without credentials or request payload; no API request
to a model endpoint was made.

### Installed-package smoke

An archive was created with `npm pack --json`, installed using `--ignore-scripts` in a newly
allocated directory outside the repository, and exercised through `init`, `validate`, `run`, and
`report`.

```text
PACKAGE=hermes-agent-security-lab-0.1.0.tgz FILES=120 SIZE=157050
INSTALL_EXIT=0 VALIDATE_EXIT=0 RUN_EXIT=0 REPORT_EXIT=0
STATUS=pass PASSED=2 FAILED=0 MODEL_CALLS=0 COST_USD=0
```

Smoke directory:

```text
C:\Users\Gustavo\Documents\Carreira e Perfil\output\hermes-agent-security-lab-m5\package-smoke-20260814011315298
```

### Visual artifacts

Repository assets:

```text
docs/assets/hermes-lab-demo.gif
bytes=71377
sha256=255cb13639ce87bb10718630ff55ef87023c0419faf2890da9376e16551038e3

docs/assets/hermes-lab-social-card.png
bytes=27274
sha256=2625758d94071f9f770ea42a4cd6b187a790720817ad70e4048bdc71efb69258
```

Both files were reopened as images. The GIF uses six terminal-style frames; the PNG is a
1120×630 social card. Local rendered previews were reopened and visually inspected:

```text
C:\Users\Gustavo\Documents\Carreira e Perfil\output\hermes-agent-security-lab-m5\README-preview.html
C:\Users\Gustavo\Documents\Carreira e Perfil\output\hermes-agent-security-lab-m5\README-preview.png (342084 bytes)
C:\Users\Gustavo\Documents\Carreira e Perfil\output\hermes-agent-security-lab-m5\LinkedIn-preview.html
C:\Users\Gustavo\Documents\Carreira e Perfil\output\hermes-agent-security-lab-m5\LinkedIn-preview.png (145683 bytes)
```

## Release boundary

The local release candidate includes documentation, the runnable demo, release notes, publication
copy, and host-side checklist. Public repository creation, push, hosted CI, the final `v0.1.0` tag,
GitHub release, and LinkedIn publication remain explicit host-side actions.
