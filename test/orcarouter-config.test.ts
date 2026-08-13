import assert from "node:assert/strict";
import test from "node:test";
import {
  ORCAROUTER_HY3_MODEL,
  loadOrcaRouterConfig,
} from "../src/providers/orcarouter-config.js";

void test("loads bounded Hy3 configuration", () => {
  const config = loadOrcaRouterConfig({ ORCAROUTER_API_KEY: "fixture-key" });
  assert.equal(config.model, ORCAROUTER_HY3_MODEL);
  assert.equal(config.maxTokens, 1600);
  assert.equal(config.maxAttempts, 3);
});

void test("requires a key and rejects model drift", () => {
  assert.throws(() => loadOrcaRouterConfig({}), /ORCAROUTER_API_KEY/);
  assert.throws(
    () =>
      loadOrcaRouterConfig({
        ORCAROUTER_API_KEY: "fixture-key",
        ORCAROUTER_MODEL: "orcarouter/auto",
      }),
    /must remain fixed/,
  );
});

void test("rejects insecure base URLs and excessive output", () => {
  assert.throws(
    () =>
      loadOrcaRouterConfig({
        ORCAROUTER_API_KEY: "fixture-key",
        ORCAROUTER_BASE_URL: "https://proxy.example/v1",
      }),
    /must remain fixed/,
  );
  assert.throws(
    () =>
      loadOrcaRouterConfig({
        ORCAROUTER_API_KEY: "fixture-key",
        ORCAROUTER_BASE_URL: "http://localhost/v1",
      }),
    /HTTPS/,
  );
  assert.throws(
    () =>
      loadOrcaRouterConfig({
        ORCAROUTER_API_KEY: "fixture-key",
        ORCAROUTER_MAX_TOKENS: "4001",
      }),
    /between 1 and 4000/,
  );
});
