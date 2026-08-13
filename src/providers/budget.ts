import type { TokenUsage } from "./types.js";

export interface ModelPricing {
  readonly inputPerMillionUsd: number;
  readonly outputPerMillionUsd: number;
  readonly cacheReadPerMillionUsd: number;
}

// Snapshot from the public OrcaRouter Hy3 model page on 2026-08-13.
export const HY3_PRICING: ModelPricing = {
  inputPerMillionUsd: 0.18,
  outputPerMillionUsd: 0.59,
  cacheReadPerMillionUsd: 0.059,
};

export function estimateUsageCostUsd(
  usage: Pick<TokenUsage, "inputTokens" | "outputTokens" | "cachedInputTokens">,
  pricing: ModelPricing = HY3_PRICING,
): number {
  const uncachedInput = Math.max(
    0,
    usage.inputTokens - usage.cachedInputTokens,
  );
  return (
    (uncachedInput * pricing.inputPerMillionUsd +
      usage.cachedInputTokens * pricing.cacheReadPerMillionUsd +
      usage.outputTokens * pricing.outputPerMillionUsd) /
    1_000_000
  );
}

export class BudgetExceededError extends Error {
  constructor(
    readonly requestedUsd: number,
    readonly remainingUsd: number,
  ) {
    super(
      `Request budget ${requestedUsd.toFixed(6)} USD exceeds remaining budget ${remainingUsd.toFixed(6)} USD`,
    );
    this.name = "BudgetExceededError";
  }
}

export class BudgetLedger {
  #spentUsd = 0;
  #reservedUsd = 0;

  constructor(readonly limitUsd: number) {
    if (!Number.isFinite(limitUsd) || limitUsd <= 0) {
      throw new Error("Budget limit must be a positive number");
    }
  }

  get spentUsd(): number {
    return this.#spentUsd;
  }

  get remainingUsd(): number {
    return Math.max(0, this.limitUsd - this.#spentUsd - this.#reservedUsd);
  }

  assertCanReserve(requestedUsd: number): void {
    if (!Number.isFinite(requestedUsd) || requestedUsd < 0) {
      throw new Error("Requested budget must be a non-negative number");
    }
    if (requestedUsd > this.remainingUsd) {
      throw new BudgetExceededError(requestedUsd, this.remainingUsd);
    }
  }

  record(actualUsd: number): void {
    this.assertCanReserve(actualUsd);
    this.#spentUsd += actualUsd;
  }

  reserve(maximumUsd: number): BudgetReservation {
    this.assertCanReserve(maximumUsd);
    this.#reservedUsd += maximumUsd;
    let active = true;

    const release = (): void => {
      if (!active) return;
      this.#reservedUsd -= maximumUsd;
      active = false;
    };

    return {
      maximumUsd,
      commit: (actualUsd: number): void => {
        if (!active) throw new Error("Budget reservation is no longer active");
        if (
          !Number.isFinite(actualUsd) ||
          actualUsd < 0 ||
          actualUsd > maximumUsd
        ) {
          throw new Error("Actual cost must be within the reserved budget");
        }
        this.#reservedUsd -= maximumUsd;
        this.#spentUsd += actualUsd;
        active = false;
      },
      release,
    };
  }
}

export interface BudgetReservation {
  readonly maximumUsd: number;
  commit(actualUsd: number): void;
  release(): void;
}
