import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { PolicyEngine } from "../src/policy/engine.js";
import { executeLocalTool } from "../src/policy/local-tools.js";
import type { ScenarioAction, ScenarioPolicy } from "../src/scenario/types.js";

const basePolicy: ScenarioPolicy = {
  allowedTools: ["fixture.read"],
  deniedTools: ["shell.execute"],
  allowedPaths: ["fixtures/allowed.txt"],
  approval: { requiredTools: ["fixture.read"] },
  budgets: {
    maxToolCalls: 1,
    maxInputTokens: 100,
    maxOutputTokens: 50,
    timeoutMs: 1000,
  },
};

function action(overrides: Partial<ScenarioAction> = {}): ScenarioAction {
  return {
    id: "read-allowed",
    tool: "fixture.read",
    arguments: { path: "fixtures/allowed.txt" },
    estimatedInputTokens: 10,
    requestedOutputTokens: 5,
    timeoutMs: 100,
    approval: "approved",
    ...overrides,
  };
}

async function workspace(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "hermes-policy-"));
  await mkdir(path.join(root, "fixtures"));
  await writeFile(path.join(root, "fixtures", "allowed.txt"), "allowed\n");
  await writeFile(path.join(root, "fixtures", "other.txt"), "other\n");
  return root;
}

void test("explicit deny wins and deny-by-default blocks unknown tools", async () => {
  const root = await workspace();
  try {
    const engine = new PolicyEngine({
      workspaceRoot: root,
      policy: basePolicy,
    });
    const explicit = await engine.evaluate(
      action({ tool: "shell.execute", approval: "approved" }),
    );
    const unknown = await engine.evaluate(action({ tool: "network.connect" }));
    assert.equal(explicit.code, "explicit-deny");
    assert.equal(unknown.code, "tool-not-allowlisted");
    assert.equal(engine.usage().toolCalls, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("simulated approval gate distinguishes missing and denied", async () => {
  const root = await workspace();
  try {
    const engine = new PolicyEngine({
      workspaceRoot: root,
      policy: basePolicy,
    });
    assert.equal(
      (await engine.evaluate(action({ approval: "missing" }))).code,
      "approval-required",
    );
    assert.equal(
      (await engine.evaluate(action({ approval: "denied" }))).code,
      "approval-denied",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("allows a bounded path once and records structured tool output", async () => {
  const root = await workspace();
  try {
    const engine = new PolicyEngine({
      workspaceRoot: root,
      policy: basePolicy,
    });
    const request = action();
    const allowed = await engine.evaluate(request);
    assert.equal(allowed.effect, "allow");
    assert.deepEqual(allowed.usageAfter, {
      toolCalls: 1,
      inputTokens: 10,
      outputTokens: 5,
      elapsedMs: allowed.usageAfter.elapsedMs,
    });
    const execution = await executeLocalTool(request, root);
    assert.equal(execution.status, "succeeded");
    assert.equal(execution.result.kind, "fixture-metadata");
    assert.equal(execution.result.bytes, 8);
    assert.match(execution.result.sha256, /^[a-f0-9]{64}$/);

    await assert.rejects(
      executeLocalTool(
        action({ arguments: { path: "fixtures/allowed.txt", extra: true } }),
        root,
      ),
      /Invalid fixture.read arguments/,
    );

    const exhausted = await engine.evaluate(action({ id: "second-read" }));
    assert.equal(exhausted.code, "tool-call-limit");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("blocks traversal, absolute paths, missing paths, and non-allowlisted paths", async () => {
  const root = await workspace();
  try {
    for (const [request, code] of [
      [
        action({ arguments: { path: "../outside.txt" } }),
        "path-outside-workspace",
      ],
      [
        action({
          arguments: { path: path.resolve(root, "fixtures/allowed.txt") },
        }),
        "path-invalid",
      ],
      [action({ arguments: {} }), "path-required"],
      [
        action({ arguments: { path: "fixtures/other.txt" } }),
        "path-not-allowed",
      ],
    ] as const) {
      const engine = new PolicyEngine({
        workspaceRoot: root,
        policy: basePolicy,
      });
      assert.equal((await engine.evaluate(request)).code, code);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("resolved symlink cannot bypass an allowed directory", async (context) => {
  const root = await workspace();
  const outside = await mkdtemp(path.join(tmpdir(), "hermes-outside-"));
  try {
    await writeFile(path.join(outside, "secret.txt"), "synthetic\n");
    try {
      await symlink(outside, path.join(root, "fixtures", "link"), "junction");
    } catch (error) {
      const code = error instanceof Error && "code" in error ? error.code : "";
      if (code === "EPERM") {
        context.skip("junction creation is unavailable on this host");
        return;
      }
      throw error;
    }
    const policy: ScenarioPolicy = {
      ...basePolicy,
      allowedPaths: ["fixtures"],
    };
    const engine = new PolicyEngine({ workspaceRoot: root, policy });
    const decision = await engine.evaluate(
      action({ arguments: { path: "fixtures/link/secret.txt" } }),
    );
    assert.equal(decision.code, "path-outside-workspace");
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});

void test("enforces input, output, and remaining timeout budgets", async () => {
  const root = await workspace();
  try {
    const cases = [
      [action({ estimatedInputTokens: 101 }), "input-token-limit"],
      [action({ requestedOutputTokens: 51 }), "output-token-limit"],
      [action({ timeoutMs: 1001 }), "timeout-limit"],
    ] as const;
    for (const [request, code] of cases) {
      const engine = new PolicyEngine({
        workspaceRoot: root,
        policy: basePolicy,
      });
      assert.equal((await engine.evaluate(request)).code, code);
    }

    let now = 0;
    const elapsedEngine = new PolicyEngine({
      workspaceRoot: root,
      policy: basePolicy,
      now: () => now,
    });
    now = 950;
    assert.equal(
      (await elapsedEngine.evaluate(action({ timeoutMs: 100 }))).code,
      "timeout-limit",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
