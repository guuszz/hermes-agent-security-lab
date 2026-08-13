# ADR-0002: Fixed OrcaRouter provider with atomic request budgets

- **Status:** Accepted
- **Date:** 2026-08-13

## Context

The promotional credit applies to `tencent/hy3`. Generic routing, alternate endpoints, and model
fallbacks could silently use wallet funds or forward a credential elsewhere. Agent runs also need
token, latency, model, and cost evidence that the original Hermes prototype discarded.

## Decision

Implement a dedicated `OrcaRouterProvider` behind the `TextProvider` port. Configuration fixes the
official HTTPS base URL and Hy3 model. Before transport, reserve the worst-case estimated request
cost in a process-local ledger. Commit actual cost from mandatory response usage; release the
reservation on failure. Bound output, attempts, timeout, and `Retry-After`. Redact and truncate
upstream errors before exposing them.

Use the greater of the caller estimate and a conservative UTF-8 byte-based input bound when
reserving cost, so an optimistic caller estimate cannot trivially under-reserve ordinary prompts.

Provide one opt-in smoke command capped at US$0.001, one attempt, and 32 output tokens. Keep all CI
coverage on injected mock transport.

## Consequences

- Promotional-credit drift and endpoint substitution are rejected during configuration.
- Concurrent calls cannot independently claim the same process-local budget.
- Callers must estimate input tokens conservatively.
- The ledger is not durable across processes; run-level persistence belongs to M4.
- Provider pricing is an estimate and must be reviewed if published pricing changes.
- Real connectivity verification requires a host-provided environment secret.
