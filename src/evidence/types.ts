import type { LocalToolExecutionRecord } from "../policy/local-tools.js";
import type { PolicyDecision, PolicyUsage } from "../policy/types.js";
import type { ScenarioExpectation } from "../scenario/types.js";

export interface ArtifactDigest {
  readonly role: "run-manifest" | "policy-decisions";
  readonly file: string;
  readonly sha256: string;
  readonly bytes: number;
}

export interface EvidenceFixture {
  readonly id: string;
  readonly path: string;
  readonly sha256: string;
  readonly bytes: number;
  readonly integrity: "verified";
}

export interface ExpectationResult {
  readonly id: string;
  readonly type: ScenarioExpectation["type"];
  readonly target: string;
  readonly status: "pass" | "fail";
  readonly observed: string;
}

export interface EvaluationResult {
  readonly status: "pass" | "fail" | "error";
  readonly passed: number;
  readonly failed: number;
  readonly errors: readonly string[];
  readonly expectations: readonly ExpectationResult[];
}

export interface EvidenceManifest {
  readonly schemaVersion: 1;
  readonly runId: string;
  readonly createdAt: string;
  readonly state: "evaluated";
  readonly scenario: {
    readonly id: string;
    readonly sourceSha256: string;
    readonly riskCategory: string;
    readonly owaspAgenticMapping: readonly string[];
  };
  readonly artifacts: readonly ArtifactDigest[];
  readonly fixtures: readonly EvidenceFixture[];
  readonly decisions: readonly PolicyDecision[];
  readonly toolExecutions: readonly LocalToolExecutionRecord[];
  readonly usage: PolicyUsage & {
    readonly modelCalls: number;
    readonly providerInputTokens: number;
    readonly providerOutputTokens: number;
    readonly estimatedCostUsd: number;
  };
  readonly evaluation: EvaluationResult;
}

export interface EvidenceBundle {
  readonly runDirectory: string;
  readonly evidencePath: string;
  readonly evidenceSha256Path: string;
  readonly evidenceSha256: string;
  readonly evidence: EvidenceManifest;
}
