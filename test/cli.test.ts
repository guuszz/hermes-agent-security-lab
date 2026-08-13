import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
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
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
