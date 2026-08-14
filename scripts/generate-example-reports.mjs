import { copyFile, cp, mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import {
  executeScenarioPolicyRun,
  generateReports,
  initWorkspace,
} from "../dist/index.js";

const examples = [
  [
    "indirect-instruction",
    "indirect-instruction.txt",
    "2026-08-13T20:00:00.001Z",
  ],
  ["tool-misuse", "tool-misuse.json", "2026-08-13T20:00:01.001Z"],
  ["path-boundary", "path-boundary.json", "2026-08-13T20:00:02.001Z"],
];
const outputRoot = path.resolve("examples", "reports");
await mkdir(outputRoot, { recursive: true });

for (const [scenarioId, fixture, timestamp] of examples) {
  const workspace = await mkdtemp(path.join(tmpdir(), "hermes-example-"));
  try {
    await initWorkspace(workspace, `example-${scenarioId}`);
    await copyFile(
      path.resolve("fixtures", fixture),
      path.join(workspace, "fixtures", fixture),
    );
    const run = await executeScenarioPolicyRun(
      path.resolve("scenarios", `${scenarioId}.yaml`),
      workspace,
      { now: () => new Date(timestamp) },
    );
    const report = await generateReports(path.dirname(run.manifestPath));
    const destination = path.join(outputRoot, scenarioId);
    await mkdir(destination, { recursive: true });
    for (const file of [
      "evidence.json",
      "evidence.sha256",
      "report.json",
      "report.md",
      "report.sha256",
    ])
      await cp(
        path.join(report.runDirectory, file),
        path.join(destination, file),
      );
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
}

process.stdout.write(
  `Generated ${examples.length} report bundles in ${outputRoot}\n`,
);
