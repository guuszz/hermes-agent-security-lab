# ADR-0003: Strict scenarios and prepared runs

- Status: accepted
- Date: 2026-08-13

## Context

Agent tests need versioned inputs and deterministic constraints before any provider or tool can be
called. YAML is convenient for authors but must not become an implicit permission surface.

## Decision

Use a versioned JSON Schema to validate YAML with `additionalProperties: false`, then apply semantic
checks for cross-field invariants. Bind fixture paths to the workspace fixture directory using both
lexical and resolved filesystem paths, and bind their content through SHA-256.

M2 `run` creates a `prepared` manifest only after these checks. The manifest explicitly records zero
model and tool calls. Execution and policy decisions remain separate M3 responsibilities.

## Consequences

- invalid or ambiguous declarations fail before run creation;
- fixture substitutions are visible and stop preparation;
- scenario and fixture hashes support later evidence provenance;
- authors must update a fixture hash whenever its bytes intentionally change;
- a prepared run is not presented as a passed security evaluation.
