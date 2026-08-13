# M0 Reuse Audit

## Sources reviewed

- `hermes-ai-gateway`
- `scopeguard`
- `api-attack-surface`
- `security-pr-reviewer`
- `redreport`
- `redteam-lab`

## Reuse decisions

| Source               | Useful pattern                                                                      | Decision                                                 |
| -------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Hermes gateway       | injected `fetch`, typed provider errors, timeout composition, `Retry-After` parsing | reimplement as a dedicated OrcaRouter adapter in M1      |
| Hermes gateway       | round-robin keys and broad provider fallback                                        | omit; one voucher-bound provider key/model initially     |
| Hermes gateway       | OpenRouter-specific `models`, `x-title`, and referer fields                         | omit from OrcaRouter contract                            |
| ScopeGuard           | explicit scope normalization and default rejection                                  | adopt as policy design guidance, not copied code         |
| API Attack Surface   | deterministic rules before narrative output                                         | adopt for evaluator design                               |
| Security PR Reviewer | TypeScript tests and credential-free CI                                             | adopt tooling pattern with current stable GitHub actions |
| RedReport            | validated structured input before rendering                                         | adopt for reports in M4                                  |
| Red Team Lab         | scenario journal, hashes, cleanup, signed evidence direction                        | adopt concepts; implement TypeScript-native interfaces   |

## Risks found in the prototype

1. Provider names and environment variables are coupled to OpenRouter.
2. Fallbacks can move a request to a model outside a promotional-credit boundary.
3. Provider results return only text and discard usage/cost metadata needed by this project.
4. Retry behavior rotates keys but is not a bounded exponential retry for one OrcaRouter key.
5. Error messages may contain upstream text and need redaction before persistence.
6. The prototype mixes provider orchestration, transport, parsing, and policy-free generation.
7. The source contains visible encoding corruption in Portuguese messages.
8. The prototype has tests but no standalone repository history or CI.

## M0 conclusion

No source file is copied. The new repository preserves the proven dependency-injection and
deterministic-testing ideas while establishing independent names, boundaries, types, and security
contracts.
