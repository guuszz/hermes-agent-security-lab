export const ORCAROUTER_HY3_MODEL = "tencent/hy3";
export const ORCAROUTER_DEFAULT_BASE_URL = "https://api.orcarouter.ai/v1";

export interface OrcaRouterConfig {
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly model: typeof ORCAROUTER_HY3_MODEL;
  readonly maxTokens: number;
  readonly temperature: number;
  readonly timeoutMs: number;
  readonly maxAttempts: number;
  readonly retryAfterCapMs: number;
}

function integer(
  environment: NodeJS.ProcessEnv,
  name: string,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const value = Number.parseInt(environment[name] ?? String(fallback), 10);
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(
      `${name} must be an integer between ${minimum} and ${maximum}`,
    );
  }
  return value;
}

function decimal(
  environment: NodeJS.ProcessEnv,
  name: string,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const value = Number.parseFloat(environment[name] ?? String(fallback));
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(
      `${name} must be a number between ${minimum} and ${maximum}`,
    );
  }
  return value;
}

export function loadOrcaRouterConfig(
  environment: NodeJS.ProcessEnv = process.env,
): OrcaRouterConfig {
  const apiKey = environment.ORCAROUTER_API_KEY?.trim() ?? "";
  if (!apiKey) throw new Error("ORCAROUTER_API_KEY is required");

  const model = environment.ORCAROUTER_MODEL ?? ORCAROUTER_HY3_MODEL;
  if (model !== ORCAROUTER_HY3_MODEL) {
    throw new Error(
      `ORCAROUTER_MODEL must remain fixed to ${ORCAROUTER_HY3_MODEL} during M1`,
    );
  }

  const baseUrl = (
    environment.ORCAROUTER_BASE_URL ?? ORCAROUTER_DEFAULT_BASE_URL
  ).replace(/\/+$/, "");
  const parsedUrl = new URL(baseUrl);
  if (parsedUrl.protocol !== "https:")
    throw new Error("ORCAROUTER_BASE_URL must use HTTPS");
  if (baseUrl !== ORCAROUTER_DEFAULT_BASE_URL) {
    throw new Error(
      `ORCAROUTER_BASE_URL must remain fixed to ${ORCAROUTER_DEFAULT_BASE_URL}`,
    );
  }

  return {
    apiKey,
    baseUrl,
    model,
    maxTokens: integer(environment, "ORCAROUTER_MAX_TOKENS", 1600, 1, 4000),
    temperature: decimal(environment, "ORCAROUTER_TEMPERATURE", 0.2, 0, 1),
    timeoutMs: integer(
      environment,
      "ORCAROUTER_TIMEOUT_MS",
      60_000,
      1_000,
      120_000,
    ),
    maxAttempts: integer(environment, "ORCAROUTER_MAX_ATTEMPTS", 3, 1, 3),
    retryAfterCapMs: integer(
      environment,
      "ORCAROUTER_RETRY_AFTER_CAP_MS",
      60_000,
      0,
      60_000,
    ),
  };
}
