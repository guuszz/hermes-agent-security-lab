# Changelog

All notable changes follow [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and Semantic
Versioning.

## [Unreleased]

### Added

- Independent TypeScript repository and strict quality toolchain.
- `hermes-lab init` local workspace bootstrap.
- Deny-by-default workspace manifest.
- Unit and CLI integration tests.
- CI without provider credentials or paid API calls.
- Initial architecture, threat model, reuse audit, and ADR.
- Dedicated OrcaRouter adapter fixed to `tencent/hy3` and the official HTTPS endpoint.
- Token, latency, resolved-model, request-ID, and estimated-cost telemetry.
- Atomic per-process budget reservations and Hy3 pricing calculator.
- Bounded retries with `Retry-After`, timeout propagation, and error redaction.
- Opt-in real smoke harness capped at US$0.001 with one attempt and 32 output tokens.
