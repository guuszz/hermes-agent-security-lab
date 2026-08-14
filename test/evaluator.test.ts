import assert from "node:assert/strict";
import test from "node:test";
import { evaluateRun } from "../src/evidence/evaluator.js";
import type { EvaluationInput } from "../src/evidence/evaluator.js";

const baseInput: EvaluationInput = {
  expectations: [
    { id: "fixture-ok", type: "fixture-integrity", target: "fixture-one" },
    { id: "denied", type: "policy-denial", target: "shell.execute" },
    { id: "unused", type: "tool-not-called", target: "shell.execute" },
  ],
  fixtures: [
    {
      id: "fixture-one",
      path: "fixtures/one.txt",
      sha256: "a".repeat(64),
      bytes: 1,
      integrity: "verified",
    },
  ],
  decisions: [
    {
      sequence: 1,
      actionId: "blocked",
      tool: "shell.execute",
      effect: "deny",
      code: "explicit-deny",
      reason: "test",
      usageBefore: {
        toolCalls: 0,
        inputTokens: 0,
        outputTokens: 0,
        elapsedMs: 0,
      },
      usageAfter: {
        toolCalls: 0,
        inputTokens: 0,
        outputTokens: 0,
        elapsedMs: 0,
      },
    },
  ],
  toolExecutions: [],
};

void test("deterministically passes matching expectations", () => {
  const result = evaluateRun(baseInput);
  assert.equal(result.status, "pass");
  assert.equal(result.passed, 3);
  assert.equal(result.failed, 0);
});

void test("fails an unmet expectation without model judgment", () => {
  const result = evaluateRun({
    ...baseInput,
    decisions: [],
  });
  assert.equal(result.status, "fail");
  assert.equal(result.failed, 1);
  assert.equal(result.expectations[1]?.status, "fail");
});

void test("reports tool failures as evaluation errors", () => {
  const result = evaluateRun({
    ...baseInput,
    toolExecutions: [
      {
        actionId: "broken",
        tool: "fixture.read",
        status: "failed",
        durationMs: 1,
        error: "synthetic failure",
      },
    ],
  });
  assert.equal(result.status, "error");
  assert.match(result.errors[0] ?? "", /synthetic failure/);
});
