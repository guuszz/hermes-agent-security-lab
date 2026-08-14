import { realpath } from "node:fs/promises";
import path from "node:path";

export async function resolveRunDirectory(
  requestedRunDirectory: string,
): Promise<string> {
  const runDirectory = await realpath(path.resolve(requestedRunDirectory));
  const runsDirectory = path.dirname(runDirectory);
  if (
    path.basename(runsDirectory) !== "runs" ||
    path.basename(path.dirname(runsDirectory)) !== ".hermes-lab"
  )
    throw new Error("Target must be a run inside .hermes-lab/runs");
  return runDirectory;
}
