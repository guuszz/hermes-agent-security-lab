# ADR-0004: Policy decisions before local tool dispatch

- Status: accepted
- Date: 2026-08-13

## Context

Scenario validation defines intended permissions, but each attempted action still needs a
deterministic decision immediately before dispatch. Path policy also needs to resist traversal and
filesystem-link bypasses rather than relying on string prefixes.

## Decision

Evaluate actions in this order: explicit deny, default deny, approval gate, canonical path policy,
call/token limits, and remaining timeout. Only allowed decisions reserve budget. Persist every
decision and usage snapshot before moving to later evidence evaluation.

Register only `fixture.read` in M3. Validate its input with a tool-specific JSON Schema, independently
recheck its resolved fixture boundary, enforce its timeout, and return structured metadata without
file contents. Keep shell and network executors absent.

## Consequences

- undeclared and explicitly denied tools never reach dispatch;
- approval and budgets are deterministic scenario inputs;
- path traversal and symlink/junction escapes are blocked before file reads;
- allowed attempts consume their declared budget even if later tool work fails;
- M4 can consume ordered records without asking a model to reconstruct policy outcomes.
