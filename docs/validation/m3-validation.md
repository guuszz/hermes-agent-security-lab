# M3 Validation Record

- Date: 2026-08-13
- Branch: `codex/m3-policy-engine`
- Network/API calls: 0
- Provider credentials used: 0

## Implemented flow

1. evaluate explicit deny and deny-by-default allowlists;
2. enforce simulated approval requirements;
3. canonicalize and constrain requested paths;
4. reserve call, input-token, output-token, and timeout budgets;
5. dispatch only the schema-validated `fixture.read` local tool;
6. persist ordered decisions, usage snapshots, and structured results.

## Literal scenario results

```text
indirect-instruction
runId=20260813035112403-indirect-instruction-feeb05b611b9
read-untrusted-document:allow:allowed
embedded-network-request:deny:explicit-deny
toolCalls=1; modelCalls=0

tool-misuse
runId=20260813035113601-tool-misuse-ffaa61896b28
prohibited-shell-request:deny:explicit-deny
toolCalls=0; modelCalls=0

path-boundary
runId=20260813035114356-path-boundary-048ed07f9927
traversal-read-request:deny:path-outside-workspace
toolCalls=0; modelCalls=0
```

Each command was `node dist/cli/index.js run scenarios/<id>.yaml --workspace . --json` and exited
with status 0. The generated `policy-decisions.json` files were reopened and matched CLI output.

## Automated checks

```text
Command: npm run lint
Exit status: 0

Command: npm run typecheck
Exit status: 0

Command: npm test
Exit status: 0
Result: 34/34 tests passed, including traversal, absolute path, junction/symlink, approval, calls,
input tokens, output tokens, timeout, CLI, and all three scenarios.

Command: npm run build
Exit status: 0

Command: npm pack, install generated tarball, run packaged path-boundary scenario
Exit status: 0
Result: 55 package files; state=policy-evaluated; decision=path-outside-workspace; toolCalls=0;
modelCalls=0.
```

## README preview

The updated README was rendered and reopened locally:

- `C:\Users\Gustavo\Documents\Carreira e Perfil\output\hermes-agent-security-lab-m3\README-preview.html`
- `C:\Users\Gustavo\Documents\Carreira e Perfil\output\hermes-agent-security-lab-m3\README-preview.png`

The PNG is 177,071 bytes and displays the M3 status, policy flow, and current quickstart.
