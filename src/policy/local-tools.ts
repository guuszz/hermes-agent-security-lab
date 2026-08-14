import { createHash } from "node:crypto";
import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { Ajv2020, type ValidateFunction } from "ajv/dist/2020.js";
import type { ScenarioAction } from "../scenario/types.js";

export interface StructuredToolResult {
  readonly kind: "fixture-metadata";
  readonly path: string;
  readonly bytes: number;
  readonly sha256: string;
}

export interface ToolExecutionRecord {
  readonly actionId: string;
  readonly tool: "fixture.read";
  readonly status: "succeeded";
  readonly durationMs: number;
  readonly result: StructuredToolResult;
}

export interface ToolExecutionFailureRecord {
  readonly actionId: string;
  readonly tool: string;
  readonly status: "failed";
  readonly durationMs: number;
  readonly error: string;
}

export type LocalToolExecutionRecord =
  ToolExecutionRecord | ToolExecutionFailureRecord;

const ajv = new Ajv2020({ allErrors: true, strict: true });
const validateFixtureRead = ajv.compile<{ path: string }>({
  type: "object",
  additionalProperties: false,
  required: ["path"],
  properties: { path: { type: "string", minLength: 1, maxLength: 500 } },
}) as ValidateFunction<{ path: string }>;

function ensureInside(root: string, target: string): void {
  const relative = path.relative(root, target);
  if (
    relative === "" ||
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  )
    throw new Error("fixture.read path is outside the fixture boundary");
}

async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(
      () => reject(new Error(`tool timed out after ${timeoutMs}ms`)),
      timeoutMs,
    );
  });
  try {
    return await Promise.race([operation, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function executeLocalTool(
  action: ScenarioAction,
  workspaceRoot: string,
  now: () => number = () => Date.now(),
): Promise<ToolExecutionRecord> {
  if (action.tool !== "fixture.read")
    throw new Error(`No local executor registered for tool: ${action.tool}`);
  if (!validateFixtureRead(action.arguments))
    throw new Error(
      `Invalid fixture.read arguments: ${ajv.errorsText(validateFixtureRead.errors)}`,
    );
  const arguments_ = action.arguments as { readonly path: string };

  const startedAt = now();
  const result = await withTimeout(
    (async (): Promise<StructuredToolResult> => {
      const fixtureRoot = await realpath(path.join(workspaceRoot, "fixtures"));
      const target = await realpath(
        path.resolve(workspaceRoot, arguments_.path),
      );
      ensureInside(fixtureRoot, target);
      const content = await readFile(target);
      return {
        kind: "fixture-metadata",
        path: arguments_.path,
        bytes: content.byteLength,
        sha256: createHash("sha256").update(content).digest("hex"),
      };
    })(),
    action.timeoutMs,
  );
  return {
    actionId: action.id,
    tool: "fixture.read",
    status: "succeeded",
    durationMs: Math.max(0, now() - startedAt),
    result,
  };
}
