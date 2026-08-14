import { realpath, stat } from "node:fs/promises";
import path from "node:path";
import type {
  PolicyAction,
  PolicyDecision,
  PolicyDecisionCode,
  PolicyEngineOptions,
  PolicyUsage,
} from "./types.js";

function isSameOrInside(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== ".." &&
      !path.isAbsolute(relative))
  );
}

async function canonicalizePotentialPath(target: string): Promise<string> {
  const suffix: string[] = [];
  let cursor = target;
  for (;;) {
    try {
      const existing = await realpath(cursor);
      return path.join(existing, ...suffix.reverse());
    } catch (error) {
      const code = error instanceof Error && "code" in error ? error.code : "";
      if (code !== "ENOENT") throw error;
      const parent = path.dirname(cursor);
      if (parent === cursor) throw error;
      suffix.push(path.basename(cursor));
      cursor = parent;
    }
  }
}

async function allowedPathContains(
  allowedPath: string,
  target: string,
): Promise<boolean> {
  if (allowedPath === target) return true;
  try {
    return (
      (await stat(allowedPath)).isDirectory() &&
      isSameOrInside(allowedPath, target)
    );
  } catch {
    return false;
  }
}

export class PolicyEngine {
  readonly #workspaceRoot: string;
  readonly #policy: PolicyEngineOptions["policy"];
  readonly #pathScopedTools: ReadonlySet<string>;
  readonly #now: () => number;
  readonly #startedAt: number;
  #sequence = 0;
  #toolCalls = 0;
  #inputTokens = 0;
  #outputTokens = 0;

  constructor(options: PolicyEngineOptions) {
    this.#workspaceRoot = path.resolve(options.workspaceRoot);
    this.#policy = options.policy;
    this.#pathScopedTools = new Set(
      options.pathScopedTools ?? ["fixture.read"],
    );
    this.#now = options.now ?? (() => Date.now());
    this.#startedAt = this.#now();
  }

  usage(): PolicyUsage {
    return {
      toolCalls: this.#toolCalls,
      inputTokens: this.#inputTokens,
      outputTokens: this.#outputTokens,
      elapsedMs: Math.max(0, this.#now() - this.#startedAt),
    };
  }

  async evaluate(action: PolicyAction): Promise<PolicyDecision> {
    const usageBefore = this.usage();
    const denied = new Set(this.#policy.deniedTools);
    const allowed = new Set(this.#policy.allowedTools);
    const approvalRequired = new Set(this.#policy.approval.requiredTools);

    if (denied.has(action.tool))
      return this.#deny(
        action,
        "explicit-deny",
        "tool appears in the explicit deny list",
        usageBefore,
      );
    if (!allowed.has(action.tool))
      return this.#deny(
        action,
        "tool-not-allowlisted",
        "deny-by-default blocked an undeclared tool",
        usageBefore,
      );
    if (approvalRequired.has(action.tool) && action.approval === "denied")
      return this.#deny(
        action,
        "approval-denied",
        "simulated approval gate denied the action",
        usageBefore,
      );
    if (approvalRequired.has(action.tool) && action.approval !== "approved")
      return this.#deny(
        action,
        "approval-required",
        "simulated approval gate requires an approved decision",
        usageBefore,
      );

    const requestedPath = action.arguments.path;
    if (this.#pathScopedTools.has(action.tool)) {
      if (typeof requestedPath !== "string" || requestedPath.length === 0)
        return this.#deny(
          action,
          "path-required",
          "path-scoped tool requires a non-empty path",
          usageBefore,
        );
      const pathDecision = await this.#evaluatePath(requestedPath);
      if (pathDecision)
        return this.#deny(
          action,
          pathDecision.code,
          pathDecision.reason,
          usageBefore,
          requestedPath,
        );
    }

    const budgets = this.#policy.budgets;
    if (usageBefore.toolCalls + 1 > budgets.maxToolCalls)
      return this.#deny(
        action,
        "tool-call-limit",
        "tool call budget exhausted",
        usageBefore,
      );
    if (
      usageBefore.inputTokens + action.estimatedInputTokens >
      budgets.maxInputTokens
    )
      return this.#deny(
        action,
        "input-token-limit",
        "estimated input token budget exceeded",
        usageBefore,
      );
    if (
      usageBefore.outputTokens + action.requestedOutputTokens >
      budgets.maxOutputTokens
    )
      return this.#deny(
        action,
        "output-token-limit",
        "requested output token budget exceeded",
        usageBefore,
      );
    if (
      usageBefore.elapsedMs >= budgets.timeoutMs ||
      action.timeoutMs > budgets.timeoutMs - usageBefore.elapsedMs
    )
      return this.#deny(
        action,
        "timeout-limit",
        "action timeout exceeds the remaining run budget",
        usageBefore,
      );

    this.#toolCalls += 1;
    this.#inputTokens += action.estimatedInputTokens;
    this.#outputTokens += action.requestedOutputTokens;
    return this.#decision(
      action,
      "allow",
      "allowed",
      "all policy checks passed",
      usageBefore,
      typeof requestedPath === "string" ? requestedPath : undefined,
    );
  }

  async #evaluatePath(
    requestedPath: string,
  ): Promise<
    { readonly code: PolicyDecisionCode; readonly reason: string } | undefined
  > {
    if (path.isAbsolute(requestedPath) || requestedPath.includes("\0"))
      return { code: "path-invalid", reason: "absolute or NUL path rejected" };

    const canonicalWorkspace = await realpath(this.#workspaceRoot);
    const logicalTarget = path.resolve(this.#workspaceRoot, requestedPath);
    if (!isSameOrInside(this.#workspaceRoot, logicalTarget))
      return {
        code: "path-outside-workspace",
        reason: "path escapes the workspace boundary",
      };

    const canonicalTarget = await canonicalizePotentialPath(logicalTarget);
    if (!isSameOrInside(canonicalWorkspace, canonicalTarget))
      return {
        code: "path-outside-workspace",
        reason: "resolved path escapes the workspace boundary",
      };

    for (const allowedPath of this.#policy.allowedPaths) {
      const canonicalAllowed = await canonicalizePotentialPath(
        path.resolve(this.#workspaceRoot, allowedPath),
      );
      if (await allowedPathContains(canonicalAllowed, canonicalTarget)) return;
    }
    return {
      code: "path-not-allowed",
      reason: "path is outside the declared allowlist",
    };
  }

  #deny(
    action: PolicyAction,
    code: PolicyDecisionCode,
    reason: string,
    usageBefore: PolicyUsage,
    requestedPath?: string,
  ): PolicyDecision {
    return this.#decision(
      action,
      "deny",
      code,
      reason,
      usageBefore,
      requestedPath,
    );
  }

  #decision(
    action: PolicyAction,
    effect: "allow" | "deny",
    code: PolicyDecisionCode,
    reason: string,
    usageBefore: PolicyUsage,
    requestedPath?: string,
  ): PolicyDecision {
    this.#sequence += 1;
    return {
      sequence: this.#sequence,
      actionId: action.id,
      tool: action.tool,
      effect,
      code,
      reason,
      ...(requestedPath === undefined ? {} : { requestedPath }),
      usageBefore,
      usageAfter: this.usage(),
    };
  }
}
