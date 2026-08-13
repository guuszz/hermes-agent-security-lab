# Hermes Agent Security Lab

[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933.svg)](https://nodejs.org/)

A local, reproducible laboratory for evaluating tool-using AI agents with declarative
scenarios, deny-by-default policies, traceable evidence, and deterministic outcomes.

> Status: M1 provider integration. The OrcaRouter/Hy3 adapter is implemented and verified with
> mocked transport. The real smoke test remains opt-in and budget-capped.

## Why this exists

AI agents can read files, call tools, retain context, and cross trust boundaries. Hermes Agent
Security Lab makes these behaviors testable through synthetic fixtures and explicit policies.
The model may explain an outcome, but deterministic evaluators decide whether a scenario passed.

## M0 architecture

```mermaid
flowchart LR
    CLI["hermes-lab init"] --> INIT["Workspace initializer"]
    INIT --> MANIFEST["Deny-by-default manifest"]
    MANIFEST --> SCENARIOS["scenarios/"]
    MANIFEST --> FIXTURES["fixtures/"]
    MANIFEST --> RUNS[".hermes-lab/runs/"]
```

The target architecture is documented in [docs/architecture.md](docs/architecture.md).

## Quickstart

Requirements: Node.js 20 or newer.

```bash
npm ci
npm run build
node dist/cli/index.js init ./demo-lab --name demo-lab
```

Expected output:

```text
Initialized deny-by-default workspace at .../demo-lab
Manifest: .../demo-lab/.hermes-lab/workspace.json
```

The generated manifest starts with `defaultDeny: true`. Repeating the same command is idempotent;
trying to reuse the directory with different settings is rejected.

## Quality checks

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm audit --audit-level=high
```

CI uses only local fixtures and mocks. It does not receive an API key and cannot spend API credit.

## OrcaRouter provider

M1 adds a dedicated OpenAI-compatible adapter with a fixed endpoint and `tencent/hy3` model. It
returns content, resolved model, token usage, latency, estimated cost, and request ID when present.

```ts
import {
  BudgetLedger,
  OrcaRouterProvider,
  loadOrcaRouterConfig,
} from "hermes-agent-security-lab";

const provider = new OrcaRouterProvider(
  loadOrcaRouterConfig(),
  new BudgetLedger(0.01),
);

const result = await provider.generate(
  [{ role: "user", content: "Return a short JSON object." }],
  { estimatedInputTokens: 32 },
);
```

The provider reserves the maximum estimated cost before network use, prevents concurrent budget
oversubscription, respects `Retry-After`, applies bounded retries, and redacts secret-shaped error
text. Successful responses without token usage are rejected rather than recorded as free.
Pricing constants are a 2026-08-13 snapshot of the
[Hy3 model page](https://www.orcarouter.ai/models/tencent/hy3) and must be reviewed when rates change.

### Controlled real smoke test

The smoke command defaults to `SKIPPED`. One request is permitted only when both a key and the exact
spend confirmation are present:

```bash
ORCAROUTER_API_KEY=... \
HERMES_PAID_SMOKE_CONFIRM=YES_SPEND_UP_TO_0.001_USD \
npm run smoke:orcarouter
```

It fixes output to 32 tokens, disables retries, and enforces a total budget of US$0.001. Keep the
key in a host-provided environment secret rather than a committed file.

## Security model

- local and synthetic fixtures by default;
- deny-by-default policy foundation;
- no arbitrary shell execution;
- secrets only through environment variables;
- deterministic pass/fail evaluation;
- bounded tools, paths, time, calls, and tokens in the MVP contract.

See [docs/threat-model.md](docs/threat-model.md) and [SECURITY.md](SECURITY.md).

## Roadmap

- **M0:** repository foundation, CLI bootstrap, tests, CI, ADR, and architecture.
- **M1:** dedicated OrcaRouter provider, budget controls, mock tests, and controlled smoke harness.
- **M2:** YAML scenario schema, loader, validator, and runner.
- **M3:** deny-by-default policy engine and blocking tests.
- **M4:** evidence store, deterministic evaluator, JSON and Markdown reports.
- **M5:** demo assets, release candidate, and public launch material.

## Documentation

- [Architecture](docs/architecture.md)
- [Threat model](docs/threat-model.md)
- [Scenario authoring contract](docs/scenario-authoring.md)
- [M0 audit](docs/audits/m0-reuse-audit.md)
- [ADR-0001](docs/adr/0001-foundation-and-trust-boundaries.md)
- [ADR-0002](docs/adr/0002-orcarouter-provider-and-budget.md)
- [M1 validation](docs/validation/m1-validation.md)
- [Contributing](CONTRIBUTING.md)

## Limitations

M1 can call only the configured Hy3 provider when explicitly invoked; the default tests and CI use
mocks. Scenario execution, tool dispatch, durable budgets, and security findings are not yet
implemented. No external target is contacted by the included flows.

## License

[MIT](LICENSE)
