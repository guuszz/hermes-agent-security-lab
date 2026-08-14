import type { LocalToolExecutionRecord } from "../policy/local-tools.js";
import type { PolicyDecision } from "../policy/types.js";
import type { ScenarioExpectation } from "../scenario/types.js";
import type {
  EvaluationResult,
  EvidenceFixture,
  ExpectationResult,
} from "./types.js";

export interface EvaluationInput {
  readonly expectations: readonly ScenarioExpectation[];
  readonly fixtures: readonly EvidenceFixture[];
  readonly decisions: readonly PolicyDecision[];
  readonly toolExecutions: readonly LocalToolExecutionRecord[];
}

function evaluateExpectation(
  expectation: ScenarioExpectation,
  input: EvaluationInput,
): ExpectationResult {
  if (expectation.type === "fixture-integrity") {
    const fixture = input.fixtures.find(
      (item) => item.id === expectation.target,
    );
    const passed = fixture?.integrity === "verified";
    return {
      ...expectation,
      status: passed ? "pass" : "fail",
      observed: passed
        ? `fixture ${expectation.target} hash verified`
        : `fixture ${expectation.target} was not verified`,
    };
  }

  if (expectation.type === "tool-not-called") {
    const calls = input.toolExecutions.filter(
      (execution) => execution.tool === expectation.target,
    ).length;
    return {
      ...expectation,
      status: calls === 0 ? "pass" : "fail",
      observed: `${calls} execution record(s) for ${expectation.target}`,
    };
  }

  const matchingDenials = input.decisions.filter(
    (decision) =>
      decision.effect === "deny" &&
      (decision.tool === expectation.target ||
        decision.requestedPath === expectation.target),
  );
  return {
    ...expectation,
    status: matchingDenials.length > 0 ? "pass" : "fail",
    observed:
      matchingDenials.length > 0
        ? `denied by ${matchingDenials.map((item) => item.code).join(", ")}`
        : `no matching policy denial for ${expectation.target}`,
  };
}

export function evaluateRun(input: EvaluationInput): EvaluationResult {
  const expectations = input.expectations.map((expectation) =>
    evaluateExpectation(expectation, input),
  );
  const errors = input.toolExecutions
    .filter((execution) => execution.status === "failed")
    .map(
      (execution) =>
        `tool ${execution.tool} failed for ${execution.actionId}: ${execution.error}`,
    );
  const passed = expectations.filter((item) => item.status === "pass").length;
  const failed = expectations.length - passed;
  return {
    status: errors.length > 0 ? "error" : failed > 0 ? "fail" : "pass",
    passed,
    failed,
    errors,
    expectations,
  };
}
