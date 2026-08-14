# Hermes Agent Security Lab

[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933.svg)](https://nodejs.org/)

A local, reproducible laboratory for evaluating tool-using AI agents with declarative
scenarios, deny-by-default policies, traceable evidence, and deterministic outcomes.

> Status: v0.1.0 release candidate. The complete local MVP is implemented and provider use
> remains opt-in and capped.

![Terminal demo: validate, run, block and report a synthetic tool-misuse scenario](docs/assets/hermes-lab-demo.gif)

**Resumo em português:** laboratório local para testar agentes com ferramentas e acesso a arquivos.
Os cenários são sintéticos, a política nega por padrão e o resultado é decidido por evidências
determinísticas — não pelo modelo.

## Why this exists

AI agents can read files, call tools, retain context, and cross trust boundaries. Hermes Agent
Security Lab makes these behaviors testable through synthetic fixtures and explicit policies.
The model may explain an outcome, but deterministic evaluators decide whether a scenario passed.

## Implemented local flow

```mermaid
flowchart LR
    YAML["Scenario YAML"] --> VALIDATE["Strict JSON Schema + semantic checks"]
    VALIDATE --> HASH["Fixture path and SHA-256 verification"]
    HASH --> POLICY["Deny-by-default policy engine"]
    POLICY -->|allow| TOOL["Schema-validated fixture.read"]
    POLICY -->|deny| LOG["Recorded decision"]
    TOOL --> LOG
    LOG --> EVAL["Deterministic evaluator"]
    EVAL --> REPORT["Hashed JSON + Markdown reports"]
```

The target architecture is documented in [docs/architecture.md](docs/architecture.md).

## Quickstart

Requirements: Node.js 20 or newer.

```bash
npm ci
npm run demo
```

The demo creates an isolated temporary workspace, validates and runs the bundled tool-misuse
scenario, generates a deterministic report, prints the observed result, and removes the temporary
workspace. It performs no model or network call.

To inspect each CLI stage manually:

```bash
npm run build
node dist/cli/index.js init . --name hermes-agent-security-lab
node dist/cli/index.js validate scenarios/tool-misuse.yaml
node dist/cli/index.js run scenarios/tool-misuse.yaml --workspace .
node dist/cli/index.js report .hermes-lab/runs/<run-id>
```

Expected output:

```text
Valid scenario tool-misuse
SHA-256: ...
Evaluated local run ...-tool-misuse-...
Allowed: 0; denied: 1
Generated PASS report for tool-misuse
```

The generated workspace starts with `defaultDeny: true`. `validate` rejects unknown fields and
policy contradictions. `run` verifies fixture integrity, evaluates every declared action, executes
only allowlisted local tools, and records `policy-decisions.json` under `.hermes-lab/runs/`.
`report` verifies run identity, hashes its inputs, evaluates expectations, and writes `evidence.json`,
`report.json`, and `report.md`. Repeating `report` produces the same report for unchanged evidence.

Three versioned examples cover indirect instruction, tool misuse, and path traversal. See the
[scenario authoring contract](docs/scenario-authoring.md) for the complete field reference.
Reproducible report bundles for all three are under [examples/reports](examples/reports).

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
- deny-by-default policy with explicit-deny precedence;
- only the schema-validated `fixture.read` local tool is registered;
- simulated approval gates and bounded calls, tokens, paths, and time;
- secrets only through environment variables;
- deterministic pass/fail evaluation;
- bounded tools, paths, time, calls, and tokens in the MVP contract.

See [docs/threat-model.md](docs/threat-model.md) and [SECURITY.md](SECURITY.md).

## Roadmap

- **M0:** repository foundation, CLI bootstrap, tests, CI, ADR, and architecture.
- **M1:** dedicated OrcaRouter provider, budget controls, mock tests, and controlled smoke harness.
- **M2:** YAML scenario schema, loader, validator, and zero-execution runner. **Complete.**
- **M3:** deny-by-default policy engine and blocking tests. **Complete.**
- **M4:** evidence store, deterministic evaluator, JSON and Markdown reports. **Complete.**
- **M5:** demo assets, release candidate, and public launch material. **Complete.**

## Documentation

- [Architecture](docs/architecture.md)
- [Threat model](docs/threat-model.md)
- [Scenario authoring contract](docs/scenario-authoring.md)
- [M0 audit](docs/audits/m0-reuse-audit.md)
- [ADR-0001](docs/adr/0001-foundation-and-trust-boundaries.md)
- [ADR-0002](docs/adr/0002-orcarouter-provider-and-budget.md)
- [ADR-0003](docs/adr/0003-scenario-validation-and-prepared-runs.md)
- [ADR-0004](docs/adr/0004-policy-decisions-and-local-tool-boundary.md)
- [M1 validation](docs/validation/m1-validation.md)
- [M2 validation](docs/validation/m2-validation.md)
- [M3 validation](docs/validation/m3-validation.md)
- [Evidence and reports](docs/evidence-and-reports.md)
- [ADR-0005](docs/adr/0005-evidence-and-deterministic-evaluation.md)
- [M4 validation](docs/validation/m4-validation.md)
- [v0.1.0 release notes](docs/release-notes-v0.1.0.md)
- [Release checklist](docs/publishing/release-checklist.md)
- [LinkedIn launch copy](docs/publishing/linkedin-launch.md)
- [Contributing](CONTRIBUTING.md)

## Limitations

v0.1.0 evaluates the declared local expectations, but it does not yet orchestrate a live agent/model
conversation. Provider state is per process; the controlled provider smoke remains separate from
scenario reports. Included local flows make no external target requests.

## License

[MIT](LICENSE)
