import assert from "node:assert/strict";
import test from "node:test";
import {
  boundedErrorMessage,
  redactSecrets,
} from "../src/providers/redaction.js";

void test("redacts provider keys, bearer values, and query tokens", () => {
  const input = `key ${"sk-orca-"}${"abcdefghijklmnopqrstuvwxyz"} Bearer abc.def.ghi https://x.test?a=1&token=secret-value`;
  const output = redactSecrets(input);
  assert.equal(output.includes("abcdefghijklmnopqrstuvwxyz"), false);
  assert.equal(output.includes("abc.def.ghi"), false);
  assert.equal(output.includes("secret-value"), false);
  assert.match(output, /\[REDACTED\]/);
});

void test("bounds and normalizes upstream error text", () => {
  const output = boundedErrorMessage(` failure\n${"x".repeat(500)}`, 40);
  assert.equal(output.length, 40);
  assert.equal(output.includes("\n"), false);
  assert.equal(output.endsWith("…"), true);
});
