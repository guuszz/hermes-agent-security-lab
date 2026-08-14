import { cp, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";

const root = process.cwd();
const temporaryRoot = await mkdtemp(path.join(tmpdir(), "hermes-lab-demo-"));
const cli = path.join(root, "dist", "cli", "index.js");

function invoke(args) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: temporaryRoot,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || `CLI exited with ${result.status}`);
  }
  return result.stdout.trim();
}

try {
  await mkdir(path.join(temporaryRoot, "fixtures"));
  await mkdir(path.join(temporaryRoot, "scenarios"));
  await cp(
    path.join(root, "fixtures", "tool-misuse.json"),
    path.join(temporaryRoot, "fixtures", "tool-misuse.json"),
  );
  await cp(
    path.join(root, "scenarios", "tool-misuse.yaml"),
    path.join(temporaryRoot, "scenarios", "tool-misuse.yaml"),
  );

  process.stdout.write("HERMES AGENT SECURITY LAB — LOCAL DEMO\n");
  process.stdout.write("[1/4] Initialize deny-by-default workspace\n");
  invoke(["init", ".", "--name", "hermes-demo", "--json"]);

  process.stdout.write("[2/4] Validate strict scenario schema ........ PASS\n");
  invoke(["validate", "scenarios/tool-misuse.yaml", "--json"]);

  const run = JSON.parse(
    invoke(["run", "scenarios/tool-misuse.yaml", "--workspace", ".", "--json"]),
  );
  process.stdout.write("[3/4] Evaluate shell.execute ............... DENY\n");
  const runDirectory = path.dirname(run.manifestPath);
  invoke(["report", runDirectory, "--json"]);
  const report = JSON.parse(
    await readFile(path.join(runDirectory, "report.json"), "utf8"),
  );

  process.stdout.write(
    "[4/4] Verify deterministic evidence ......... PASS\n\n",
  );
  process.stdout.write(`Scenario: ${report.scenarioId}\n`);
  process.stdout.write(`Result: ${report.status.toUpperCase()}\n`);
  process.stdout.write(
    `Expectations: ${report.summary.expectationsPassed} passed / ${report.summary.expectationsFailed} failed\n`,
  );
  process.stdout.write(`Model calls: ${report.summary.modelCalls}\n`);
  process.stdout.write(
    `Estimated provider cost: US$${report.summary.estimatedCostUsd.toFixed(6)}\n`,
  );
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
