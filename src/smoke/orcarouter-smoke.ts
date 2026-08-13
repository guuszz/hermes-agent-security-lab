import process from "node:process";
import { BudgetLedger } from "../providers/budget.js";
import { loadOrcaRouterConfig } from "../providers/orcarouter-config.js";
import { OrcaRouterProvider } from "../providers/orcarouter.js";

const CONFIRMATION = "YES_SPEND_UP_TO_0.001_USD";

async function main(): Promise<number> {
  if (process.env.HERMES_PAID_SMOKE_CONFIRM !== CONFIRMATION) {
    process.stdout.write(
      `SKIPPED: set HERMES_PAID_SMOKE_CONFIRM=${CONFIRMATION} to allow one bounded request.\n`,
    );
    return 0;
  }
  if (!process.env.ORCAROUTER_API_KEY) {
    process.stdout.write("SKIPPED: ORCAROUTER_API_KEY is not configured.\n");
    return 0;
  }

  const baseConfig = loadOrcaRouterConfig(process.env);
  const config = { ...baseConfig, maxTokens: 32, maxAttempts: 1 };
  const budget = new BudgetLedger(0.001);
  const provider = new OrcaRouterProvider(config, budget);
  const result = await provider.generate(
    [
      {
        role: "user",
        content: "Reply with exactly: HERMES_M1_OK",
      },
    ],
    { estimatedInputTokens: 32 },
  );

  process.stdout.write(
    `${JSON.stringify(
      {
        expected: "HERMES_M1_OK",
        observed: result.content.trim(),
        exactMatch: result.content.trim() === "HERMES_M1_OK",
        requestedModel: result.requestedModel,
        resolvedModel: result.resolvedModel,
        usage: result.usage,
        latencyMs: result.latencyMs,
        estimatedCostUsd: result.estimatedCostUsd,
        budgetLimitUsd: budget.limitUsd,
        budgetSpentUsd: budget.spentUsd,
      },
      null,
      2,
    )}\n`,
  );
  return result.content.trim() === "HERMES_M1_OK" ? 0 : 1;
}

process.exitCode = await main();
