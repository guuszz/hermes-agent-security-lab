import type { ScenarioAction, ScenarioPolicy } from "../scenario/types.js";

export type PolicyDecisionCode =
  | "allowed"
  | "explicit-deny"
  | "tool-not-allowlisted"
  | "approval-required"
  | "approval-denied"
  | "path-required"
  | "path-invalid"
  | "path-outside-workspace"
  | "path-not-allowed"
  | "tool-call-limit"
  | "input-token-limit"
  | "output-token-limit"
  | "timeout-limit";

export interface PolicyUsage {
  readonly toolCalls: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly elapsedMs: number;
}

export interface PolicyDecision {
  readonly sequence: number;
  readonly actionId: string;
  readonly tool: string;
  readonly effect: "allow" | "deny";
  readonly code: PolicyDecisionCode;
  readonly reason: string;
  readonly requestedPath?: string;
  readonly usageBefore: PolicyUsage;
  readonly usageAfter: PolicyUsage;
}

export interface PolicyEngineOptions {
  readonly workspaceRoot: string;
  readonly policy: ScenarioPolicy;
  readonly pathScopedTools?: readonly string[];
  readonly now?: () => number;
}

export type PolicyAction = ScenarioAction;
