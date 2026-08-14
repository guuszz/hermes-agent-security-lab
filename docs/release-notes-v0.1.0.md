# Hermes Agent Security Lab v0.1.0

The first release delivers a local, reproducible laboratory for evaluating AI agents that use
tools and files. Scenarios are declarative, policy decisions are deny-by-default, and pass/fail
results come from deterministic evidence rather than model judgment.

## Highlights

- strict YAML scenarios validated by JSON Schema and semantic rules;
- three synthetic scenarios: indirect instruction, tool misuse, and path boundary;
- explicit tool allowlists, path boundaries, approval gates, and call/token/time budgets;
- schema-validated local fixture tool with structured results;
- hashed evidence and deterministic JSON/Markdown reports;
- dedicated bounded OrcaRouter adapter with mocked integration tests;
- an opt-in paid smoke harness capped at US$0.001;
- CI that receives no provider credentials and makes no paid API calls;
- isolated `npm run demo` flow with automatic cleanup.

## Verified release-candidate baseline

- 42 automated tests pass;
- all three versioned examples produce `PASS` with zero model calls;
- package installation and CLI execution pass from an isolated directory;
- high-severity dependency audit reports zero vulnerabilities;
- local links, assets, generated checksums, and secret scan pass.

The literal commands and outputs are preserved in
[the M5 validation record](validation/m5-validation.md).

## Known limitations

- scenario execution does not yet orchestrate a live agent/model conversation;
- provider budget state is held per process;
- the paid smoke test is separate from scenario reports;
- the MVP exposes one local tool, `fixture.read`;
- no dashboard, MCP integration, SARIF export, or historical comparison is included.

## Upgrade and rollback

This is the first public contract. Install from a release archive or checkout the `v0.1.0` tag.
Rollback is removal of the package or checkout of the previous commit; generated `.hermes-lab`
directories are local and ignored by Git.
