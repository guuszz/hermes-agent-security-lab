# M2 Validation Record

- Date: 2026-08-13
- Branch: `codex/m2-scenario-engine`
- Network/API calls: 0
- Provider credentials used: 0

## Implemented flow

1. parse YAML and enforce the v1 JSON Schema;
2. reject unknown fields, duplicate IDs, and contradictory tool policy;
3. constrain fixture reads through lexical and resolved-path boundaries;
4. verify declared SHA-256 values;
5. write a prepared run manifest containing policy, expectations, and zero call counts.

## Verification

```text
Command: npm run check
Exit status: 0
Result: formatting, ESLint, TypeScript, 26/26 tests, and production build passed.

Command: node dist/cli/index.js validate scenarios/tool-misuse.yaml --json
Exit status: 0
Output: valid=true; id=tool-misuse;
sourceSha256=c6b7abd8b5c5da4b777f0d06a6c3816cbb34b592a409267cb8258ebe6930b554.

Command: node dist/cli/index.js run scenarios/tool-misuse.yaml --workspace . --json
Exit status: 0
Output: runId=20260813033801-tool-misuse-c6b7abd8b5c5; state=prepared;
fixture integrity=verified; modelCalls=0; toolCalls=0.

Command: npm pack, install from the generated tarball, then invoke the packaged CLI validator
Exit status: 0
Output: PACKAGED_CLI_VALID=True; ID=tool-misuse; FILES=46.
```

Negative tests also verified schema rejection, malformed YAML, policy overlap rejection, and a
changed fixture stopping the run before manifest creation.

The README was rendered locally to
`C:\Users\Gustavo\Documents\Carreira e Perfil\output\hermes-agent-security-lab-m2\README-preview.html`
and captured as `README-preview.png` in the same directory. Both artifacts were reopened; the PNG
is 176,755 bytes and displays the updated M2 status and quickstart.
