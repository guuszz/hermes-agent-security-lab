import { unlink } from "node:fs/promises";
import path from "node:path";
import { resolveRunDirectory } from "./run-path.js";

const GENERATED_FILES = [
  "evidence.json",
  "evidence.sha256",
  "report.json",
  "report.md",
  "report.sha256",
] as const;

export interface CleanupResult {
  readonly runDirectory: string;
  readonly removed: readonly string[];
  readonly alreadyAbsent: readonly string[];
}

export async function cleanupGeneratedArtifacts(
  requestedRunDirectory: string,
): Promise<CleanupResult> {
  const runDirectory = await resolveRunDirectory(requestedRunDirectory);

  const removed: string[] = [];
  const alreadyAbsent: string[] = [];
  for (const file of GENERATED_FILES) {
    const target = path.join(runDirectory, file);
    try {
      await unlink(target);
      removed.push(file);
    } catch (error) {
      const code = error instanceof Error && "code" in error ? error.code : "";
      if (code !== "ENOENT") throw error;
      alreadyAbsent.push(file);
    }
  }
  return { runDirectory, removed, alreadyAbsent };
}
