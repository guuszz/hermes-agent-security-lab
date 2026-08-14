# M4 Validation Record

- Date: 2026-08-13
- Branch: `codex/m4-evidence-reports`
- Network/API calls from scenario execution: 0
- Provider credentials used: 0

## Implemented flow

1. reopen and hash the run manifest and policy record;
2. verify run identity and scenario source hash across artifacts;
3. minimize paths, redact values, and validate evidence against JSON Schema;
4. evaluate expectations deterministically as pass, fail, or error;
5. validate and write JSON/Markdown reports plus checksum sidecars;
6. remove only generated outputs through bounded, idempotent cleanup.

## Automated checks

```text
Command: npm run check
Exit status: 0
Result: formatting, ESLint, TypeScript, 42/42 tests, and production build passed.

Command: npm run examples
Exit status: 0
Result: three reproducible report bundles generated under examples/reports. Two consecutive
generations produced byte-identical 15/15 files.
```

Tests include expectation pass/fail/error, artifact identity mismatch, path minimization, output
schema validation, report reproducibility, CLI E2E, and repeated cleanup.

```text
Command: npm pack, install generated tarball, run and report packaged path-boundary scenario
Exit status: 0
Result: 109 package files; 52,211 bytes; status=pass; expectationsPassed=2; modelCalls=0.
```

## Literal compiled CLI results

```text
indirect-instruction
runId=20260814003045468-indirect-instruction-feeb05b611b9
status=pass; passed=2; failed=0
evidenceSha256=b2eea0dba49f89c91325fe2728e5f6d42ad35002a7f0075d619860950a051b38
reportSha256=70bd0daae9abf6062c6296762255594a05efd8626e481b5e1392651c7f01c65e

tool-misuse
runId=20260814003047889-tool-misuse-ffaa61896b28
status=pass; passed=2; failed=0
evidenceSha256=5aea3c0bcaf441e02cdba98b5ee00b7ee0a5c44344a9586d1e6bb9e65bc191bb
reportSha256=627f9d2ca4e470e9b2a0236bead5b314985c7410c55d7b70b4278843804d6ad2

path-boundary
runId=20260814003049641-path-boundary-048ed07f9927
status=pass; passed=2; failed=0
evidenceSha256=551a368158d6c84d39e31a2ee8c40f530be392f5f19b17cf0779cfe00f785c2d
reportSha256=b710da14bd7a08aeb9c1d026b5bbc6d89f3b51ea2dea4f32675ce5ec8331dd90
```

For each scenario, the compiled `run` and `report` commands exited 0. The literal evidence and report
bytes were reopened, hashed independently with SHA-256, and matched their sidecars.

## Cleanup verification

```text
First cleanup: removed=5
Second cleanup: removed=0; alreadyAbsent=5
Source manifest after both runs: exists=true
Exit status: 0 for both commands
```

## Local previews

The UTF-8 HTML files and PNG captures were generated, reopened, and visually inspected:

- `C:\Users\Gustavo\Documents\Carreira e Perfil\output\hermes-agent-security-lab-m4\README-preview.html`
- `C:\Users\Gustavo\Documents\Carreira e Perfil\output\hermes-agent-security-lab-m4\README-preview.png`
- `C:\Users\Gustavo\Documents\Carreira e Perfil\output\hermes-agent-security-lab-m4\report-preview.html`
- `C:\Users\Gustavo\Documents\Carreira e Perfil\output\hermes-agent-security-lab-m4\report-preview.png`

The final captures are 192,594 and 79,635 bytes. They show the M4 quickstart and a complete PASS
report without encoding defects.
