import assert from "node:assert/strict";
import test from "node:test";
import { BudgetExceededError, BudgetLedger } from "../src/providers/budget.js";
import type { OrcaRouterConfig } from "../src/providers/orcarouter-config.js";
import {
  OrcaRouterError,
  OrcaRouterProvider,
} from "../src/providers/orcarouter.js";

const config: OrcaRouterConfig = {
  apiKey: "fixture-key",
  baseUrl: "https://api.fixture.invalid/v1",
  model: "tencent/hy3",
  maxTokens: 100,
  temperature: 0.2,
  timeoutMs: 1000,
  maxAttempts: 3,
  retryAfterCapMs: 60_000,
};

const json = (
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });

void test("sends only the fixed model and returns telemetry", async () => {
  let requestBody: Record<string, unknown> = {};
  let authorization = "";
  const provider = new OrcaRouterProvider(config, new BudgetLedger(0.01), {
    fetchImpl: (async (_url: string | URL | Request, init?: RequestInit) => {
      if (typeof init?.body !== "string")
        throw new Error("Expected a JSON request body");
      requestBody = JSON.parse(init.body) as Record<string, unknown>;
      authorization = new Headers(init?.headers).get("authorization") ?? "";
      return json({
        id: "request-fixture",
        model: "tencent/hy3",
        choices: [{ message: { content: "fixture response" } }],
        usage: {
          prompt_tokens: 1000,
          completion_tokens: 100,
          total_tokens: 1100,
          prompt_tokens_details: { cached_tokens: 200 },
        },
      });
    }) as typeof fetch,
    now: (() => {
      const values = [100, 125];
      return () => values.shift() ?? 125;
    })(),
  });

  const result = await provider.generate(
    [{ role: "user", content: "fixture" }],
    {
      estimatedInputTokens: 1200,
    },
  );

  assert.equal(authorization, "Bearer fixture-key");
  assert.equal(requestBody.model, "tencent/hy3");
  assert.equal("models" in requestBody, false);
  assert.equal(result.content, "fixture response");
  assert.equal(result.latencyMs, 25);
  assert.deepEqual(result.usage, {
    inputTokens: 1000,
    outputTokens: 100,
    cachedInputTokens: 200,
    totalTokens: 1100,
  });
  assert.ok(Math.abs(result.estimatedCostUsd - 0.0002148) < Number.EPSILON);
});

void test("honors Retry-After and succeeds on a bounded retry", async () => {
  let calls = 0;
  const delays: number[] = [];
  const provider = new OrcaRouterProvider(config, new BudgetLedger(0.01), {
    fetchImpl: (async () => {
      calls += 1;
      if (calls === 1) {
        return json({ error: { message: "rate limited" } }, 429, {
          "retry-after": "2",
        });
      }
      return json({
        choices: [{ message: { content: "ok" } }],
        usage: { prompt_tokens: 10, completion_tokens: 2, total_tokens: 12 },
      });
    }) as typeof fetch,
    sleep: async (milliseconds) => {
      delays.push(milliseconds);
    },
  });

  const result = await provider.generate(
    [{ role: "user", content: "fixture" }],
    {
      estimatedInputTokens: 20,
    },
  );
  assert.equal(result.content, "ok");
  assert.equal(calls, 2);
  assert.deepEqual(delays, [2000]);
});

void test("redacts an upstream secret and does not retry a 400", async () => {
  let calls = 0;
  const provider = new OrcaRouterProvider(config, new BudgetLedger(0.01), {
    fetchImpl: (async () => {
      calls += 1;
      return json(
        {
          error: {
            message: `invalid ${"sk-orca-"}${"abcdefghijklmnopqrstuvwxyz"}`,
          },
        },
        400,
      );
    }) as typeof fetch,
  });

  await assert.rejects(
    provider.generate([{ role: "user", content: "fixture" }], {
      estimatedInputTokens: 20,
    }),
    (error: unknown) =>
      error instanceof OrcaRouterError &&
      error.status === 400 &&
      error.message === "invalid [REDACTED]",
  );
  assert.equal(calls, 1);
});

void test("blocks an over-budget request before fetch", async () => {
  let called = false;
  const provider = new OrcaRouterProvider(config, new BudgetLedger(0.000001), {
    fetchImpl: (async () => {
      called = true;
      return json({});
    }) as typeof fetch,
  });

  await assert.rejects(
    provider.generate([{ role: "user", content: "fixture" }], {
      estimatedInputTokens: 1000,
    }),
    BudgetExceededError,
  );
  assert.equal(called, false);
});

void test("rejects successful responses without usage and releases budget", async () => {
  let calls = 0;
  const ledger = new BudgetLedger(0.01);
  const provider = new OrcaRouterProvider(config, ledger, {
    fetchImpl: (async () => {
      calls += 1;
      return json({ choices: [{ message: { content: "unmetered" } }] });
    }) as typeof fetch,
  });

  await assert.rejects(
    provider.generate([{ role: "user", content: "fixture" }], {
      estimatedInputTokens: 20,
    }),
    (error: unknown) =>
      error instanceof OrcaRouterError && error.status === 200,
  );
  assert.equal(calls, 1);
  assert.equal(ledger.remainingUsd, ledger.limitUsd);
});
