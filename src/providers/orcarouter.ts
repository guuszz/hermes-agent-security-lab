import { performance } from "node:perf_hooks";
import { Buffer } from "node:buffer";
import { estimateUsageCostUsd, HY3_PRICING } from "./budget.js";
import type { BudgetLedger } from "./budget.js";
import type { OrcaRouterConfig } from "./orcarouter-config.js";
import { boundedErrorMessage } from "./redaction.js";
import type {
  ChatMessage,
  GenerateOptions,
  ProviderResult,
  TextProvider,
  TokenUsage,
} from "./types.js";

interface OrcaRouterResponse {
  readonly id?: string;
  readonly model?: string;
  readonly choices?: readonly {
    readonly message?: { readonly content?: string };
  }[];
  readonly usage?: {
    readonly prompt_tokens?: number;
    readonly completion_tokens?: number;
    readonly total_tokens?: number;
    readonly prompt_tokens_details?: { readonly cached_tokens?: number };
  };
  readonly error?: { readonly message?: string };
}

export class OrcaRouterError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryAfterMs: number,
  ) {
    super(boundedErrorMessage(message));
    this.name = "OrcaRouterError";
  }
}

export interface OrcaRouterProviderDependencies {
  readonly fetchImpl?: typeof fetch;
  readonly sleep?: (
    milliseconds: number,
    signal?: AbortSignal,
  ) => Promise<void>;
  readonly now?: () => number;
}

function parseNonNegativeInteger(value: unknown): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : 0;
}

function parseUsage(body: OrcaRouterResponse): TokenUsage {
  if (
    typeof body.usage?.prompt_tokens !== "number" ||
    typeof body.usage.completion_tokens !== "number"
  ) {
    throw new OrcaRouterError(
      "Provider response omitted required token usage",
      200,
      0,
    );
  }
  const inputTokens = parseNonNegativeInteger(body.usage?.prompt_tokens);
  const outputTokens = parseNonNegativeInteger(body.usage?.completion_tokens);
  const cachedInputTokens = Math.min(
    inputTokens,
    parseNonNegativeInteger(body.usage?.prompt_tokens_details?.cached_tokens),
  );
  const reportedTotal = parseNonNegativeInteger(body.usage?.total_tokens);
  return {
    inputTokens,
    outputTokens,
    cachedInputTokens,
    totalTokens: reportedTotal || inputTokens + outputTokens,
  };
}

function parseRetryAfter(response: Response): number {
  const raw = response.headers.get("retry-after");
  if (!raw) return 0;
  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const timestamp = Date.parse(raw);
  return Number.isFinite(timestamp) ? Math.max(0, timestamp - Date.now()) : 0;
}

async function defaultSleep(
  milliseconds: number,
  signal?: AbortSignal,
): Promise<void> {
  if (milliseconds <= 0) return;
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, milliseconds);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(
          signal.reason instanceof Error
            ? signal.reason
            : new Error("Request aborted"),
        );
      },
      { once: true },
    );
  });
}

function requestSignal(timeoutMs: number, outer?: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs);
  return outer ? AbortSignal.any([outer, timeout]) : timeout;
}

function validateMessages(messages: readonly ChatMessage[]): void {
  if (!messages.length) throw new Error("At least one message is required");
  for (const message of messages) {
    if (!message.content.trim())
      throw new Error("Message content must not be empty");
  }
}

function conservativeInputTokenBound(messages: readonly ChatMessage[]): number {
  return messages.reduce(
    (total, message) => total + Buffer.byteLength(message.content, "utf8") + 32,
    16,
  );
}

export class OrcaRouterProvider implements TextProvider {
  readonly #fetch: typeof fetch;
  readonly #sleep: (
    milliseconds: number,
    signal?: AbortSignal,
  ) => Promise<void>;
  readonly #now: () => number;

  constructor(
    readonly config: OrcaRouterConfig,
    readonly budget: BudgetLedger,
    dependencies: OrcaRouterProviderDependencies = {},
  ) {
    this.#fetch = dependencies.fetchImpl ?? globalThis.fetch;
    this.#sleep = dependencies.sleep ?? defaultSleep;
    this.#now = dependencies.now ?? (() => performance.now());
  }

  async generate(
    messages: readonly ChatMessage[],
    options: GenerateOptions,
  ): Promise<ProviderResult> {
    validateMessages(messages);
    if (
      !Number.isSafeInteger(options.estimatedInputTokens) ||
      options.estimatedInputTokens < 1
    ) {
      throw new Error("estimatedInputTokens must be a positive safe integer");
    }

    const maximumCost = estimateUsageCostUsd({
      inputTokens: Math.max(
        options.estimatedInputTokens,
        conservativeInputTokenBound(messages),
      ),
      outputTokens: this.config.maxTokens,
      cachedInputTokens: 0,
    });
    const reservation = this.budget.reserve(maximumCost);

    const startedAt = this.#now();
    let lastError: OrcaRouterError | undefined;

    try {
      for (let attempt = 1; attempt <= this.config.maxAttempts; attempt += 1) {
        try {
          const response = await this.#fetch(
            `${this.config.baseUrl}/chat/completions`,
            {
              method: "POST",
              headers: {
                authorization: `Bearer ${this.config.apiKey}`,
                "content-type": "application/json",
              },
              body: JSON.stringify({
                model: this.config.model,
                messages,
                max_tokens: this.config.maxTokens,
                temperature: this.config.temperature,
                stream: false,
              }),
              signal: requestSignal(this.config.timeoutMs, options.signal),
            },
          );

          const body = (await response
            .json()
            .catch(() => ({}))) as OrcaRouterResponse;
          if (!response.ok) {
            const retryAfterMs = Math.min(
              parseRetryAfter(response),
              this.config.retryAfterCapMs,
            );
            throw new OrcaRouterError(
              body.error?.message ??
                `${response.status} ${response.statusText}`,
              response.status,
              retryAfterMs,
            );
          }

          const content = body.choices?.[0]?.message?.content;
          if (!content?.trim()) {
            throw new OrcaRouterError(
              "Provider returned an empty response",
              502,
              0,
            );
          }

          const usage = parseUsage(body);
          const estimatedCostUsd = estimateUsageCostUsd(usage, HY3_PRICING);
          reservation.commit(estimatedCostUsd);

          return {
            content,
            requestedModel: this.config.model,
            resolvedModel: body.model ?? this.config.model,
            usage,
            latencyMs: Math.max(0, this.#now() - startedAt),
            estimatedCostUsd,
            ...(body.id ? { requestId: body.id } : {}),
          };
        } catch (error) {
          if (options.signal?.aborted) throw options.signal.reason;
          lastError =
            error instanceof OrcaRouterError
              ? error
              : new OrcaRouterError(
                  error instanceof Error ? error.message : String(error),
                  error instanceof DOMException && error.name === "TimeoutError"
                    ? 504
                    : 0,
                  0,
                );

          const retryable = [0, 408, 429, 500, 502, 503, 504].includes(
            lastError.status,
          );
          if (!retryable || attempt === this.config.maxAttempts)
            throw lastError;

          const exponentialDelay = Math.min(1000 * 2 ** (attempt - 1), 60_000);
          await this.#sleep(
            Math.max(lastError.retryAfterMs, exponentialDelay),
            options.signal,
          );
        }
      }
      throw lastError ?? new OrcaRouterError("Request failed", 0, 0);
    } finally {
      reservation.release();
    }
  }
}
