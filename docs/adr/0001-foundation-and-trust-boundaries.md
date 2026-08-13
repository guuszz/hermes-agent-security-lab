# ADR-0001: TypeScript foundation and explicit trust boundaries

- **Status:** Accepted
- **Date:** 2026-08-12

## Context

The existing Hermes prototype proves OpenAI-compatible transport and fallback behavior but couples
several providers in one class and does not retain usage metadata. Related projects demonstrate
useful deterministic validation, evidence, and reporting patterns in Python. The new laboratory
needs safe tool schemas and provider integration while remaining approachable to the existing
Hermes codebase.

## Decision

Use Node.js 20+ with strict TypeScript and ESM. Build the project as an independent repository.
Keep CLI, scenarios, policy, providers, tools, evidence, evaluation, and reporting as explicit
components. Start with one local `init` flow and no provider call. Treat model output as untrusted;
only deterministic code can authorize tools or declare scenario success.

Use MIT licensing, Conventional Commits, local synthetic fixtures, credential-free CI, and
environment-only provider secrets.

## Consequences

- Existing prototype code is audited but not copied wholesale.
- M1 must implement a dedicated OrcaRouter adapter.
- Cross-language reuse from Python projects occurs through formats and concepts, not imports.
- More interfaces are required, but trust boundaries remain testable and replaceable.
- The initial release delivers less surface area in exchange for verifiable behavior.
