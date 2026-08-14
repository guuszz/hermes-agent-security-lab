# Architecture

## Design goals

1. Reproduce every scenario from versioned input.
2. Deny undeclared capability use before execution.
3. Separate model suggestions from deterministic decisions.
4. Record enough evidence to explain and repeat a run.
5. Keep provider, policy, tools, evidence, and reports replaceable.

## Target components

```mermaid
flowchart LR
    YAML["Scenario YAML"] --> VALIDATOR["Schema validator"]
    VALIDATOR --> RUNNER["Scenario runner"]
    RUNNER --> POLICY["Policy engine"]
    POLICY --> AGENT["Hermes agent"]
    AGENT --> PROVIDER["OrcaRouter provider"]
    AGENT --> TOOLS["Local tool sandbox"]
    POLICY --> DECISIONS["Decision log"]
    PROVIDER --> EVIDENCE["Evidence store"]
    TOOLS --> EVIDENCE
    DECISIONS --> EVIDENCE
    EVIDENCE --> EVALUATOR["Deterministic evaluator"]
    EVALUATOR --> REPORTS["JSON and Markdown"]
```

## Workspace boundary

M0 implements only repository tooling and workspace initialization. The initializer creates
`scenarios`, `fixtures`, and `.hermes-lab/runs`, then writes an immutable configuration manifest.
Existing configuration is never silently overwritten.

## M1 provider boundary

`OrcaRouterProvider` implements the provider port without importing CLI or policy modules. Its
configuration fixes the destination to `https://api.orcarouter.ai/v1` and the model to
`tencent/hy3`, preventing fallback or credential forwarding to another host. A `BudgetLedger`
atomically reserves worst-case request cost before transport and commits reported usage only after
a valid response.

The adapter accepts injected `fetch`, sleep, and clock functions. Tests therefore cover transport,
retry, telemetry, redaction, and budget behavior without network access or provider credentials.

## M2 scenario boundary

The loader parses YAML as untrusted input, applies a strict JSON Schema with unknown fields
disabled, and then checks cross-field invariants such as unique identifiers and disjoint tool
allow/deny lists. It returns the canonical source path and a SHA-256 digest of the source bytes.

The runner accepts only an initialized deny-by-default workspace. Before creating a run, it resolves
each fixture lexically and through the filesystem, checks that it remains inside the fixture
directory, and verifies its declared SHA-256. A successful M2 run records a `state: prepared`
manifest with policy, budgets, expectations, and zero model/tool calls. Tool dispatch is deferred
to M3.

## M3 policy and tool boundary

`PolicyEngine` evaluates each declared action in a fixed order: explicit deny, default deny,
approval, path boundary, call/token budgets, and remaining timeout. Denied actions leave usage
counters unchanged. Allowed actions reserve their declared call and token budgets before dispatch.

Path checks reject absolute paths, traversal, paths outside the declared allowlist, and filesystem
links resolving outside the workspace. The local registry contains only `fixture.read`; its input is
validated by a tool-specific JSON Schema and its executor independently rechecks the fixture
boundary. Its structured result contains path, byte count, and SHA-256 rather than fixture content.

The runner persists `policy-decisions.json` beside the M2 preparation manifest. This M3 record
contains ordered decisions, usage snapshots, structured tool results, and literal zero model-call
counts. M4 will promote these records into the durable evidence model and evaluate expectations.

## Dependency direction

```text
cli -> core
runner -> scenario + policy + tools + provider
evidence <- runner + policy + tools + provider
reporting -> evidence + evaluator
```

Core domain modules must not depend on CLI rendering or a concrete provider.

## Runtime data

Runtime artifacts live under `.hermes-lab/` and are ignored by Git. Versioned scenarios and
synthetic fixtures remain outside that directory. M2 manifests hash scenario and fixture inputs;
M3 adds policy decisions and bounded local tool results. M4 will add evaluator output and reports.
