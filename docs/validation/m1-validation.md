# M1 Validation Record

**Date:** 2026-08-13
**Branch:** `codex/m1-orcarouter-provider`

## Implemented

- fixed OrcaRouter HTTPS endpoint and `tencent/hy3` model;
- OpenAI-compatible chat request;
- typed result with usage, latency, model, request ID, and estimated cost;
- mandatory usage metadata;
- atomic process-local budget reservation;
- bounded attempts, timeout, `Retry-After`, and exponential delay;
- bounded secret redaction;
- injected transport, sleep, and clock;
- opt-in real smoke harness.

## Mock validation

The test suite verifies success telemetry, fixed request model, absence of a fallback `models`
field, retry timing, non-retryable errors, secret redaction, pre-fetch budget denial, concurrent
reservation safety, missing-usage rejection, and reservation release.

Latest local quality result:

```text
Prettier: passed
ESLint: passed
TypeScript: passed
Tests: 20 passed, 0 failed
Build: passed
npm audit: 0 vulnerabilities
Package dry run: 30 files, 15.2 kB
Secret scan: 41 files, 0 hits
Markdown links/assets: 15 references, 0 failures
README preview: 2 images, 0 broken, 0 request failures
```

## Real smoke status

Command:

```text
npm run smoke:orcarouter
```

Literal result on 2026-08-13:

```text
SKIPPED: set HERMES_PAID_SMOKE_CONFIRM=YES_SPEND_UP_TO_0.001_USD to allow one bounded request.
```

The confirmation gate was then enabled without providing a key. Literal result:

```text
SKIPPED: ORCAROUTER_API_KEY is not configured.
```

No provider key was available in the process, no network request was sent, and no credit was spent.
The real smoke remains the sole incomplete M1 verification item.
