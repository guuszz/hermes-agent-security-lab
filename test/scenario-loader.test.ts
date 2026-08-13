import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  loadScenario,
  ScenarioValidationError,
} from "../src/scenario/loader.js";

void test("loads and hashes every bundled scenario", async () => {
  for (const name of ["indirect-instruction", "tool-misuse", "path-boundary"]) {
    const loaded = await loadScenario(path.join("scenarios", `${name}.yaml`));
    assert.equal(loaded.scenario.id, name);
    assert.match(loaded.sourceSha256, /^[a-f0-9]{64}$/);
  }
});

void test("rejects undeclared fields and conflicting tool rules", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "hermes-loader-"));
  try {
    const source = await readFile("scenarios/tool-misuse.yaml", "utf8");
    const unknownField = path.join(root, "unknown.yaml");
    await writeFile(unknownField, `${source}\nundeclared: true\n`, "utf8");
    await assert.rejects(loadScenario(unknownField), ScenarioValidationError);

    const overlap = path.join(root, "overlap.yaml");
    await writeFile(
      overlap,
      source.replace("    - shell.execute", "    - fixture.read"),
      "utf8",
    );
    await assert.rejects(
      loadScenario(overlap),
      /tools cannot be both allowed and denied: fixture.read/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("reports malformed YAML as a scenario validation error", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "hermes-yaml-"));
  try {
    const scenarioPath = path.join(root, "malformed.yaml");
    await writeFile(scenarioPath, "title: [unterminated", "utf8");
    await assert.rejects(loadScenario(scenarioPath), ScenarioValidationError);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("rejects traversal and fixtures outside the declared path policy", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "hermes-path-policy-"));
  try {
    const source = await readFile("scenarios/tool-misuse.yaml", "utf8");
    const traversal = path.join(root, "traversal.yaml");
    await writeFile(
      traversal,
      source.replace(
        "    - fixtures/tool-misuse.json",
        "    - fixtures/../outside.json",
      ),
      "utf8",
    );
    await assert.rejects(loadScenario(traversal), ScenarioValidationError);

    const uncovered = path.join(root, "uncovered.yaml");
    await writeFile(
      uncovered,
      source.replace(
        "    - fixtures/tool-misuse.json",
        "    - fixtures/another.json",
      ),
      "utf8",
    );
    await assert.rejects(
      loadScenario(uncovered),
      /fixtures must be covered by allowedPaths: fixtures\/tool-misuse.json/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
