import { createHash } from "node:crypto";
import { mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  WORKSPACE_DIRECTORY,
  type WorkspaceManifest,
} from "../core/workspace.js";
import { loadScenario } from "./loader.js";
import type { LoadedScenario, ScenarioExpectation } from "./types.js";

export interface VerifiedFixture {
  readonly id: string;
  readonly relativePath: string;
  readonly absolutePath: string;
  readonly expectedSha256: string;
  readonly observedSha256: string;
  readonly integrity: "verified";
  readonly bytes: number;
}

export interface PreparedRunManifest {
  readonly schemaVersion: 1;
  readonly runId: string;
  readonly state: "prepared";
  readonly createdAt: string;
  readonly scenario: {
    readonly id: string;
    readonly sourcePath: string;
    readonly sourceSha256: string;
    readonly riskCategory: string;
  };
  readonly policy: {
    readonly defaultDeny: true;
    readonly allowedTools: readonly string[];
    readonly deniedTools: readonly string[];
    readonly allowedPaths: readonly string[];
    readonly budgets: {
      readonly maxToolCalls: number;
      readonly maxInputTokens: number;
      readonly maxOutputTokens: number;
      readonly timeoutMs: number;
    };
  };
  readonly fixtures: readonly VerifiedFixture[];
  readonly expectations: readonly ScenarioExpectation[];
  readonly execution: { readonly modelCalls: 0; readonly toolCalls: 0 };
}

export interface PreparedRun {
  readonly manifestPath: string;
  readonly manifest: PreparedRunManifest;
}

export interface RunnerDependencies {
  readonly now?: () => Date;
}

function ensureInside(root: string, target: string): void {
  const relative = path.relative(root, target);
  if (
    !relative ||
    relative.startsWith(`..${path.sep}`) ||
    relative === ".." ||
    path.isAbsolute(relative)
  ) {
    throw new Error(`Path escapes workspace boundary: ${target}`);
  }
}

async function readWorkspaceManifest(root: string): Promise<WorkspaceManifest> {
  const manifestPath = path.join(root, WORKSPACE_DIRECTORY, "workspace.json");
  const parsed = JSON.parse(
    await readFile(manifestPath, "utf8"),
  ) as Partial<WorkspaceManifest>;
  if (parsed.schemaVersion !== 1 || parsed.defaultDeny !== true) {
    throw new Error(
      `Invalid deny-by-default workspace manifest: ${manifestPath}`,
    );
  }
  return parsed as WorkspaceManifest;
}

async function verifyFixtures(
  loaded: LoadedScenario,
  workspaceRoot: string,
): Promise<VerifiedFixture[]> {
  const fixturesRoot = await realpath(path.join(workspaceRoot, "fixtures"));
  const verified: VerifiedFixture[] = [];
  for (const fixture of loaded.scenario.fixtures) {
    const requestedPath = path.resolve(workspaceRoot, fixture.path);
    ensureInside(fixturesRoot, requestedPath);
    const absolutePath = await realpath(requestedPath);
    ensureInside(fixturesRoot, absolutePath);
    const content = await readFile(absolutePath);
    const observedSha256 = createHash("sha256").update(content).digest("hex");
    if (observedSha256 !== fixture.sha256) {
      throw new Error(
        `Fixture integrity mismatch for ${fixture.id}: expected ${fixture.sha256}, observed ${observedSha256}`,
      );
    }
    verified.push({
      id: fixture.id,
      relativePath: fixture.path,
      absolutePath,
      expectedSha256: fixture.sha256,
      observedSha256,
      integrity: "verified",
      bytes: content.byteLength,
    });
  }
  return verified;
}

function buildRunId(
  createdAt: Date,
  scenarioId: string,
  sourceSha256: string,
): string {
  const timestamp = createdAt
    .toISOString()
    .replace(/[-:.TZ]/g, "")
    .slice(0, 14);
  return `${timestamp}-${scenarioId}-${sourceSha256.slice(0, 12)}`;
}

export async function prepareScenarioRun(
  scenarioPath: string,
  requestedWorkspaceRoot: string,
  dependencies: RunnerDependencies = {},
): Promise<PreparedRun> {
  const workspaceRoot = path.resolve(requestedWorkspaceRoot);
  const workspace = await readWorkspaceManifest(workspaceRoot);
  const loaded = await loadScenario(scenarioPath);
  const fixtures = await verifyFixtures(loaded, workspaceRoot);
  const createdAt = (dependencies.now ?? (() => new Date()))();
  const runId = buildRunId(createdAt, loaded.scenario.id, loaded.sourceSha256);
  const runDirectory = path.join(
    workspaceRoot,
    WORKSPACE_DIRECTORY,
    "runs",
    runId,
  );
  await mkdir(runDirectory, { recursive: false });

  const manifest: PreparedRunManifest = {
    schemaVersion: 1,
    runId,
    state: "prepared",
    createdAt: createdAt.toISOString(),
    scenario: {
      id: loaded.scenario.id,
      sourcePath: loaded.sourcePath,
      sourceSha256: loaded.sourceSha256,
      riskCategory: loaded.scenario.riskCategory,
    },
    policy: {
      defaultDeny: workspace.defaultDeny,
      allowedTools: loaded.scenario.policy.allowedTools,
      deniedTools: loaded.scenario.policy.deniedTools,
      allowedPaths: loaded.scenario.policy.allowedPaths,
      budgets: loaded.scenario.policy.budgets,
    },
    fixtures,
    expectations: loaded.scenario.expectations,
    execution: { modelCalls: 0, toolCalls: 0 },
  };
  const manifestPath = path.join(runDirectory, "manifest.json");
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
  });
  return { manifestPath, manifest };
}
