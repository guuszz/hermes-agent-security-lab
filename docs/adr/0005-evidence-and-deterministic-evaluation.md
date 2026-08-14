# ADR-0005: Hashed evidence and deterministic evaluation

- Status: accepted
- Date: 2026-08-13

## Context

Policy logs alone do not prove which inputs were evaluated, and model-authored conclusions are not
stable enough for security regression tests. Reports also must not expose developer-specific paths
or secret-shaped strings.

## Decision

Reopen and hash the preparation manifest and policy record. Verify their run identity and scenario
source hash, normalize fixture paths, redact values, validate evidence against JSON Schema, and
write a checksum sidecar.

Evaluate expectation types in code only. Represent tool failures as `error`, unmet expectations as
`fail`, and complete satisfaction as `pass`. Generate schema-validated JSON and Markdown reports
whose JSON bytes also receive a checksum sidecar.

## Consequences

- each conclusion links to literal hashed inputs;
- reports remain stable for unchanged evidence;
- workstation absolute paths do not enter evidence;
- checksums detect changes but do not provide cryptographic authorship;
- M5 may add signing without changing the evaluator contract.
