import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const WORKSPACE_VERSION = 1;
export const WORKSPACE_DIRECTORY = ".hermes-lab";

export interface WorkspaceManifest {
  readonly schemaVersion: number;
  readonly projectName: string;
  readonly defaultDeny: true;
  readonly directories: {
    readonly scenarios: "scenarios";
    readonly fixtures: "fixtures";
    readonly runs: ".hermes-lab/runs";
  };
}

export interface InitWorkspaceResult {
  readonly root: string;
  readonly manifestPath: string;
  readonly created: readonly string[];
  readonly manifest: WorkspaceManifest;
}

const PROJECT_NAME_PATTERN = /^[a-z0-9][a-z0-9-]{1,62}$/;

export function buildWorkspaceManifest(projectName: string): WorkspaceManifest {
  if (!PROJECT_NAME_PATTERN.test(projectName)) {
    throw new Error(
      "Project name must contain 2-63 lowercase letters, digits, or hyphens.",
    );
  }

  return {
    schemaVersion: WORKSPACE_VERSION,
    projectName,
    defaultDeny: true,
    directories: {
      scenarios: "scenarios",
      fixtures: "fixtures",
      runs: ".hermes-lab/runs",
    },
  };
}

export async function initWorkspace(
  requestedRoot: string,
  projectName: string,
): Promise<InitWorkspaceResult> {
  const root = path.resolve(requestedRoot);
  const manifest = buildWorkspaceManifest(projectName);
  const directories = [
    WORKSPACE_DIRECTORY,
    path.join(WORKSPACE_DIRECTORY, "runs"),
    "scenarios",
    "fixtures",
  ] as const;

  for (const directory of directories) {
    await mkdir(path.join(root, directory), { recursive: true });
  }

  const manifestPath = path.join(root, WORKSPACE_DIRECTORY, "workspace.json");
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
  }).catch(async (error: unknown) => {
    const code =
      error instanceof Error && "code" in error ? error.code : undefined;
    if (code !== "EEXIST") throw error;

    const existing = JSON.parse(
      await readFile(manifestPath, "utf8"),
    ) as unknown;
    if (JSON.stringify(existing) !== JSON.stringify(manifest)) {
      throw new Error(
        `Workspace already exists with different settings: ${manifestPath}`,
      );
    }
  });

  return {
    root,
    manifestPath,
    created: directories.map((directory) => path.join(root, directory)),
    manifest,
  };
}
