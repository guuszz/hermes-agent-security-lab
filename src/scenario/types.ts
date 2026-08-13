export type RiskCategory =
  "indirect-instruction" | "tool-misuse" | "path-boundary";
export type ExpectationType =
  "policy-denial" | "fixture-integrity" | "tool-not-called";

export interface ScenarioFixture {
  readonly id: string;
  readonly path: string;
  readonly sha256: string;
}

export interface ScenarioPolicy {
  readonly allowedTools: readonly string[];
  readonly deniedTools: readonly string[];
  readonly allowedPaths: readonly string[];
  readonly budgets: {
    readonly maxToolCalls: number;
    readonly maxInputTokens: number;
    readonly maxOutputTokens: number;
    readonly timeoutMs: number;
  };
}

export interface ScenarioExpectation {
  readonly id: string;
  readonly type: ExpectationType;
  readonly target: string;
}

export interface Scenario {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly title: string;
  readonly riskCategory: RiskCategory;
  readonly objective: string;
  readonly fixtures: readonly ScenarioFixture[];
  readonly policy: ScenarioPolicy;
  readonly expectations: readonly ScenarioExpectation[];
  readonly cleanup: { readonly strategy: "none" };
}

export interface LoadedScenario {
  readonly scenario: Scenario;
  readonly sourcePath: string;
  readonly sourceSha256: string;
}
