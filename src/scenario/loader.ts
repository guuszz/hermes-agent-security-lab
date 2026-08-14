import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  Ajv2020,
  type ErrorObject,
  type ValidateFunction,
} from "ajv/dist/2020.js";
import { parse as parseYaml } from "yaml";
import type { LoadedScenario, Scenario } from "./types.js";

export class ScenarioValidationError extends Error {
  constructor(readonly issues: readonly string[]) {
    super(
      `Scenario validation failed:\n${issues.map((issue) => `- ${issue}`).join("\n")}`,
    );
    this.name = "ScenarioValidationError";
  }
}

let validatorPromise: Promise<ValidateFunction<Scenario>> | undefined;

function formatIssue(issue: ErrorObject): string {
  const location = issue.instancePath || "/";
  return `${location} ${issue.message ?? "is invalid"}`;
}

function semanticIssues(scenario: Scenario): string[] {
  const issues: string[] = [];
  const fixtureIds = scenario.fixtures.map((fixture) => fixture.id);
  const expectationIds = scenario.expectations.map(
    (expectation) => expectation.id,
  );
  const actionIds = scenario.actions.map((action) => action.id);
  if (new Set(fixtureIds).size !== fixtureIds.length)
    issues.push("fixture IDs must be unique");
  if (new Set(expectationIds).size !== expectationIds.length)
    issues.push("expectation IDs must be unique");
  if (new Set(actionIds).size !== actionIds.length)
    issues.push("action IDs must be unique");

  const denied = new Set(scenario.policy.deniedTools);
  const overlap = scenario.policy.allowedTools.filter((tool) =>
    denied.has(tool),
  );
  if (overlap.length)
    issues.push(
      `tools cannot be both allowed and denied: ${overlap.join(", ")}`,
    );

  const allowed = new Set(scenario.policy.allowedTools);
  const invalidApprovalTools = scenario.policy.approval.requiredTools.filter(
    (tool) => !allowed.has(tool),
  );
  if (invalidApprovalTools.length)
    issues.push(
      `approval can only be required for allowed tools: ${invalidApprovalTools.join(", ")}`,
    );

  const uncoveredFixtures = scenario.fixtures
    .map((fixture) => fixture.path)
    .filter(
      (fixturePath) =>
        !scenario.policy.allowedPaths.some(
          (allowedPath) =>
            fixturePath === allowedPath ||
            fixturePath.startsWith(`${allowedPath.replace(/\/$/, "")}/`),
        ),
    );
  if (uncoveredFixtures.length)
    issues.push(
      `fixtures must be covered by allowedPaths: ${uncoveredFixtures.join(", ")}`,
    );
  return issues;
}

async function getValidator(): Promise<ValidateFunction<Scenario>> {
  validatorPromise ??= (async () => {
    const schemaPath = new URL(
      "../../schemas/scenario.schema.json",
      import.meta.url,
    );
    const schema = JSON.parse(await readFile(schemaPath, "utf8")) as object;
    const ajv = new Ajv2020({ allErrors: true, strict: true });
    return ajv.compile<Scenario>(schema);
  })();
  return validatorPromise;
}

export async function loadScenario(
  requestedPath: string,
): Promise<LoadedScenario> {
  const sourcePath = path.resolve(requestedPath);
  const source = await readFile(sourcePath, "utf8");
  let parsed: unknown;
  try {
    parsed = parseYaml(source);
  } catch (error) {
    throw new ScenarioValidationError([
      `YAML parse error: ${error instanceof Error ? error.message : String(error)}`,
    ]);
  }

  const validate = await getValidator();
  if (!validate(parsed)) {
    throw new ScenarioValidationError((validate.errors ?? []).map(formatIssue));
  }
  const issues = semanticIssues(parsed);
  if (issues.length) throw new ScenarioValidationError(issues);

  return {
    scenario: parsed,
    sourcePath,
    sourceSha256: createHash("sha256").update(source, "utf8").digest("hex"),
  };
}
