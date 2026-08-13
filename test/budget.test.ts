import assert from "node:assert/strict";
import test from "node:test";
import {
  BudgetExceededError,
  BudgetLedger,
  estimateUsageCostUsd,
} from "../src/providers/budget.js";

void test("calculates Hy3 usage including cached input", () => {
  const cost = estimateUsageCostUsd({
    inputTokens: 1_000_000,
    cachedInputTokens: 200_000,
    outputTokens: 100_000,
  });
  assert.equal(cost, 0.2148);
});

void test("budget ledger rejects a reservation before network use", () => {
  const ledger = new BudgetLedger(0.001);
  assert.throws(() => ledger.assertCanReserve(0.002), BudgetExceededError);
  assert.equal(ledger.spentUsd, 0);
});

void test("budget ledger records actual successful cost", () => {
  const ledger = new BudgetLedger(0.01);
  ledger.record(0.0025);
  assert.equal(ledger.spentUsd, 0.0025);
  assert.equal(ledger.remainingUsd, 0.0075);
});

void test("reservation prevents concurrent requests from oversubscribing", () => {
  const ledger = new BudgetLedger(0.01);
  const reservation = ledger.reserve(0.008);
  assert.throws(() => ledger.reserve(0.003), BudgetExceededError);
  reservation.commit(0.002);
  assert.equal(ledger.spentUsd, 0.002);
  assert.ok(Math.abs(ledger.remainingUsd - 0.008) < Number.EPSILON);
});

void test("released reservation restores available budget", () => {
  const ledger = new BudgetLedger(0.01);
  const reservation = ledger.reserve(0.008);
  reservation.release();
  assert.equal(ledger.remainingUsd, 0.01);
});
