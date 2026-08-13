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
| Untrusted instructions request undeclared action | deny-by-default manifest and future tool allowlist |                M3 |
| Path escapes the workspace                       | canonical path boundary                            |                M3 |
| Credential enters a log                          | environment-only secret and redaction              |             M1/M4 |
| Model invents a passing result                   | deterministic evaluator                            |                M4 |
| Infinite or expensive loop                       | call, token, timeout, and budget limits            |             M1/M3 |
| Existing config is overwritten                   | exclusive manifest creation and conflict rejection |                M0 |
| CI consumes paid credit                          | no credentials and mocked transport                |             M0/M1 |
| Evidence changes after a run                     | fixture hashes and run manifest                    |                M4 |

## Abuse cases covered by MVP scenarios

- indirect instruction embedded in a local synthetic document;
- request for a tool outside the declared allowlist;
- request for a file outside the allowed workspace path.

## Residual risk in M0

M0 has no model or tool execution. Its primary risk is unsafe workspace initialization. The current
flow validates project names, resolves the root, creates fixed directories, refuses conflicting
configuration, and never executes shell commands from user input.
