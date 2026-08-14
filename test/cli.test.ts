import assert from "node:assert/strict";
import { copyFile, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { spawnSync } from "node:child_process";

void test("CLI completes the first local flow", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "hermes-cli-"));
  try {
    const cli = path.resolve("src/cli/index.ts");
    const result = spawnSync(
      process.execPath,
      ["--import", "tsx", cli, "init", root, "--name", "local-flow", "--json"],
      { encoding: "utf8" },
    );

    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(result.stdout) as {
      manifest: { defaultDeny: boolean };
    };
    const manifest = JSON.parse(
      await readFile(path.join(root, ".hermes-lab", "workspace.json"), "utf8"),
    ) as { projectName: string };
    assert.equal(output.manifest.defaultDeny, true);
    assert.equal(manifest.projectName, "local-flow");

    const validate = spawnSync(
      process.execPath,
      [
        "--import",
        "tsx",
        cli,
        "validate",
        "scenarios/tool-misuse.yaml",
        "--json",
      ],
      { encoding: "utf8" },
    );
    assert.equal(validate.status, 0, validate.stderr);
    assert.equal(
      (JSON.parse(validate.stdout) as { valid: boolean }).valid,
      true,
    );

    await copyFile(
      "fixtures/tool-misuse.json",
      path.join(root, "fixtures", "tool-misuse.json"),
    );
    const run = spawnSync(
      process.execPath,
      [
        "--import",
        "tsx",
        cli,
        "run",
        "scenarios/tool-misuse.yaml",
        "--workspace",
        root,
        "--json",
      ],
      { encoding: "utf8" },
    );
    assert.equal(run.status, 0, run.stderr);
    const prepared = JSON.parse(run.stdout) as {
      policyRecord: {
        state: string;
        execution: { modelCalls: number; deniedActions: number };
      };
    };
    assert.equal(prepared.policyRecord.state, "policy-evaluated");
    assert.equal(prepared.policyRecord.execution.modelCalls, 0);
    assert.equal(prepared.policyRecord.execution.deniedActions, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
