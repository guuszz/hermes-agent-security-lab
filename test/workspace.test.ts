import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  buildWorkspaceManifest,
  initWorkspace,
  WORKSPACE_VERSION,
} from "../src/core/workspace.js";

void test("builds a deny-by-default manifest", () => {
  const manifest = buildWorkspaceManifest("example-lab");
  assert.equal(manifest.schemaVersion, WORKSPACE_VERSION);
  assert.equal(manifest.defaultDeny, true);
  assert.equal(manifest.directories.runs, ".hermes-lab/runs");
});

void test("rejects unsafe project names", () => {
  assert.throws(() => buildWorkspaceManifest("../outside"), /Project name/);
  assert.throws(() => buildWorkspaceManifest("UPPERCASE"), /Project name/);
});

void test("initializes a workspace idempotently without overwriting settings", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "hermes-lab-"));
  try {
    const first = await initWorkspace(root, "example-lab");
    const second = await initWorkspace(root, "example-lab");
    const stored = JSON.parse(await readFile(first.manifestPath, "utf8")) as {
      defaultDeny: boolean;
    };

    assert.equal(stored.defaultDeny, true);
    assert.deepEqual(second.manifest, first.manifest);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

void test("preserves an existing workspace with different settings", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "hermes-lab-"));
  try {
    await initWorkspace(root, "first-lab");
    await assert.rejects(
      initWorkspace(root, "second-lab"),
      /different settings/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
