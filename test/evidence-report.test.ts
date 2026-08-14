import assert from "node:assert/strict";
import { copyFile, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { cleanupGeneratedArtifacts } from "../src/evidence/cleanup.js";
import { createEvidenceBundle } from "../src/evidence/store.js";
import { generateReports } from "../src/reporting/reporter.js";
import { initWorkspace } from "../src/core/workspace.js";
import { executeScenarioPolicyRun } from "../src/scenario/runner.js";

async function completedRun(): Promise<{
  readonly root: string;
  readonly runDirectory: string;
}> {
  const root = await mkdtemp(path.join(tmpdir(), "hermes-evidence-"));
  await initWorkspace(root, "evidence-test");
  await copyFile(
    "fixtures/tool-misuse.json",
    path.join(root, "fixtures", "tool-misuse.json"),
  );
  const run = await executeScenarioPolicyRun(
    "scenarios/tool-misuse.yaml",
    root,
    { now: () => new Date("2026-08-13T18:00:00.123Z") },
  );
  return { root, runDirectory: path.dirname(run.manifestPath) };
}

void test("creates hashed, path-minimized evidence and PASS reports", async () => {
  const { root, runDirectory } = await completedRun();
  try {
    const bundle = await generateReports(runDirectory);
    assert.equal(bundle.report.status, "pass");
    assert.equal(bundle.report.summary.expectationsPassed, 2);
    assert.equal(bundle.report.summary.modelCalls, 0);
    assert.equal(bundle.report.summary.estimatedCostUsd, 0);
    assert.match(bundle.evidence.evidenceSha256, /^[a-f0-9]{64}$/);

    const evidenceText = await readFile(bundle.evidence.evidencePath, "utf8");
    assert.doesNotMatch(evidenceText, /absolutePath|sourcePath/);
    assert.doesNotMatch(evidenceText, new RegExp(root.replace(/\\/g, "\\\\")));
    const markdown = await readFile(bundle.reportMarkdownPath, "utf8");
    assert.match(markdown, /Result:\*\* \*\*PASS\*\*/);
    assert.match(markdown, /deterministic evaluator—not a model/);

    const rerun = await generateReports(runDirectory);
    assert.equal(rerun.reportJsonSha256, bundle.reportJsonSha256);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("rejects mismatched run identities before evidence creation", async () => {
  const { root, runDirectory } = await completedRun();
  try {
    const policyPath = path.join(runDirectory, "policy-decisions.json");
    const policy = JSON.parse(await readFile(policyPath, "utf8")) as {
      runId: string;
    };
    policy.runId = "different-run";
    const { writeFile } = await import("node:fs/promises");
    await writeFile(policyPath, `${JSON.stringify(policy)}\n`, "utf8");
    await assert.rejects(
      createEvidenceBundle(runDirectory),
      /inconsistent identity or source hash/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("cleanup removes only generated output and is idempotent", async () => {
  const { root, runDirectory } = await completedRun();
  try {
    await generateReports(runDirectory);
    const first = await cleanupGeneratedArtifacts(runDirectory);
    assert.equal(first.removed.length, 5);
    const second = await cleanupGeneratedArtifacts(runDirectory);
    assert.equal(second.removed.length, 0);
    assert.equal(second.alreadyAbsent.length, 5);
    assert.match(
      await readFile(path.join(runDirectory, "manifest.json"), "utf8"),
      /runId/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("redacts secret-shaped tool errors before evidence persistence", async () => {
  const { root, runDirectory } = await completedRun();
  try {
    const policyPath = path.join(runDirectory, "policy-decisions.json");
    const policy = JSON.parse(await readFile(policyPath, "utf8")) as {
      toolExecutions: unknown[];
    };
    policy.toolExecutions.push({
      actionId: "synthetic-error",
      tool: "fixture.read",
      status: "failed",
      durationMs: 1,
      error: `upstream Bearer ${"abcdefghijklmnopqrstuvwxyz"}`,
    });
    const { writeFile } = await import("node:fs/promises");
    await writeFile(policyPath, `${JSON.stringify(policy)}\n`, "utf8");
    const evidence = await createEvidenceBundle(runDirectory);
    const text = await readFile(evidence.evidencePath, "utf8");
    assert.doesNotMatch(text, /abcdefghijklmnopqrstuvwxyz/);
    assert.match(text, /Bearer \[REDACTED\]/);
    assert.equal(evidence.evidence.evaluation.status, "error");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("cleanup rejects directories outside the run boundary", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "hermes-cleanup-boundary-"));
  try {
    await assert.rejects(
      cleanupGeneratedArtifacts(root),
      /Target must be a run inside \.hermes-lab\/runs/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
