# M0 Validation Record

**Date:** 2026-08-12
**Runtime:** Node.js `v22.15.1`, npm `10.9.2`
**Branch:** `codex/m0-foundation`

No provider credential was configured and no paid API request was made.

## Quality pipeline

Commands:

```text
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm audit --audit-level=high
npm pack --dry-run
```

Literal result summary:

```text
All matched files use Prettier code style!
eslint .                                      exit 0
tsc --noEmit                                 exit 0
tests 5, pass 5, fail 0                      exit 0
tsc -p tsconfig.build.json                   exit 0
found 0 vulnerabilities                      exit 0
package size 6.0 kB, total files 12          exit 0
```

## Compiled local flow

Command:

```text
node dist/cli/index.js init <TEMP_PATH> --name m0-verification --json
```

Exit status: `0`

Literal generated manifest:

```json
{
  "schemaVersion": 1,
  "projectName": "m0-verification",
  "defaultDeny": true,
  "directories": {
    "scenarios": "scenarios",
    "fixtures": "fixtures",
    "runs": ".hermes-lab/runs"
  }
}
```

Verified directories:

```text
.hermes-lab/
.hermes-lab/runs/
scenarios/
fixtures/
```

## Expected behavior

- The first invocation creates the fixed workspace structure and manifest.
- Repeating the same invocation preserves matching settings.
- A conflicting project name fails instead of overwriting the manifest.
- Unsafe project names fail validation.

All four behaviors are covered by the five-test suite.

## README preview

The first preview detected that the CI badge would be broken before repository publication. The
badge was removed and is deferred until GitHub Actions has completed its first real run. The final
preview must contain zero broken images and zero failed requests.

Final preview result:

```text
images: 2
broken images: 0
request failures: 0
```

## Secrets, links, and assets

The workspace scanner checked 28 source/configuration/documentation files for OrcaRouter, OpenAI,
GitHub, and private-key patterns:

```text
SECRET_SCAN_FILES 28
SECRET_SCAN_HITS 0
```

The Markdown link validator checked 12 unique local and remote references:

```text
REFERENCES 12 FAILURES 0
```

`gitleaks` and `trufflehog` were not installed locally, so the recorded scan used explicit anchored
patterns and excluded `.git`, dependencies, build output, and coverage output.
