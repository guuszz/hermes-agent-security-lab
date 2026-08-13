import assert from "node:assert/strict";
import { copyFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { initWorkspace } from "../src/core/workspace.js";
import { prepareScenarioRun } from "../src/scenario/runner.js";

async function createTestWorkspace(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "hermes-runner-"));
  await initWorkspace(root, "runner-test");
  await copyFile(
    "fixtures/tool-misuse.json",
    path.join(root, "fixtures", "tool-misuse.json"),
  );
  return root;
}

void test("prepares a traceable zero-execution run manifest", async () => {
  const root = await createTestWorkspace();
  try {
    const result = await prepareScenarioRun(
      "scenarios/tool-misuse.yaml",
      root,
      {
        now: () => new Date("2026-08-13T12:34:56.000Z"),
      },
    );
    assert.equal(result.manifest.state, "prepared");
    assert.equal(result.manifest.policy.defaultDeny, true);
    assert.deepEqual(result.manifest.execution, {
      modelCalls: 0,
      toolCalls: 0,
    });
    assert.equal(result.manifest.fixtures[0]?.integrity, "verified");

    const persisted = JSON.parse(
      await readFile(result.manifestPath, "utf8"),
    ) as { runId: string };
    assert.equal(persisted.runId, result.manifest.runId);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("stops before run creation when fixture integrity changes", async () => {
  const root = await createTestWorkspace();
  try {
    await writeFile(
      path.join(root, "fixtures", "tool-misuse.json"),
      "tampered",
      "utf8",
    );
    await assert.rejects(
      prepareScenarioRun("scenarios/tool-misuse.yaml", root),
      /Fixture integrity mismatch for prohibited-tool-request/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
