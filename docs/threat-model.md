# Threat Model

## Assets

- provider credentials;
- fixture contents;
- scenario policy;
- tool arguments and results;
- evidence integrity;
- developer workstation files;
- API budget.

## Trust boundaries

1. scenario file to schema validator;
2. model output to tool dispatcher;
3. tool arguments to local filesystem;
4. local application to provider API;
5. runtime events to evidence store;
6. evidence store to report generator.

## Initial threats and controls

| Threat                                           | Initial control                                    | Planned milestone |
| ------------------------------------------------ | -------------------------------------------------- | ----------------: |
| Untrusted instructions request undeclared action | explicit deny and default-deny tool allowlist      |    M3 implemented |
| Path escapes the fixture workspace               | lexical, real-path, symlink, and tool recheck      |    M3 implemented |
| Credential enters a log                          | environment-only secret and bounded redaction      |    M1 implemented |
| Model invents a passing result                   | deterministic evaluator                            |                M4 |
| Infinite or expensive action sequence            | calls, tokens, remaining timeout, provider budget  | M1/M3 implemented |
| Sensitive tool runs without approval             | per-tool simulated approval gate                   |    M3 implemented |
| Existing config is overwritten                   | exclusive manifest creation and conflict rejection |                M0 |
| CI consumes paid credit                          | no credentials and mocked transport                |             M0/M1 |
| Scenario or fixture changes before a run         | source and fixture SHA-256 in prepared manifest    |    M2 implemented |
| Credential forwarded to a substituted endpoint   | fixed official HTTPS endpoint                      |    M1 implemented |
| Concurrent requests oversubscribe budget         | atomic worst-case reservation before fetch         |    M1 implemented |
| Missing usage is treated as free                 | reject successful unmetered responses              |    M1 implemented |

## Abuse cases covered by MVP scenarios

- indirect instruction embedded in a local synthetic document;
- request for a tool outside the declared allowlist;
- request for a file outside the allowed workspace path.

## Residual risk in M0

M0 has no model or tool execution. Its primary risk is unsafe workspace initialization. The current
flow validates project names, resolves the root, creates fixed directories, refuses conflicting
configuration, and never executes shell commands from user input.

M1 introduces an external provider boundary. The real smoke harness requires an exact opt-in,
allows one attempt, caps output at 32 tokens, and enforces US$0.001. CI has no provider secret and
uses an injected mock transport.

M2 treats YAML and fixture declarations as untrusted. Strict validation rejects additional fields,
path traversal segments, malformed hashes, and contradictory tool rules. The runner resolves
filesystem links before enforcing the fixture boundary and stops before creating a run when a hash
differs.

M3 treats every declared action as denied until it passes the complete policy sequence. Tests cover
explicit-deny precedence, undeclared tools, missing/denied approval, traversal, absolute paths,
filesystem links, non-allowlisted paths, and call/token/timeout exhaustion. Allowed local reads are
schema-validated and return metadata only. Expectations remain unevaluated until M4.
