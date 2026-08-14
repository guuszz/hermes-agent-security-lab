import { readFile } from "node:fs/promises";
import { Ajv2020, type ValidateFunction } from "ajv/dist/2020.js";

export type ArtifactSchema = "evidence" | "report";

const validators = new Map<ArtifactSchema, ValidateFunction>();

async function getValidator(
  schemaName: ArtifactSchema,
): Promise<ValidateFunction> {
  const existing = validators.get(schemaName);
  if (existing) return existing;
  const schemaPath = new URL(
    `../../schemas/${schemaName}.schema.json`,
    import.meta.url,
  );
  const schema = JSON.parse(await readFile(schemaPath, "utf8")) as object;
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  const validator = ajv.compile(schema);
  validators.set(schemaName, validator);
  return validator;
}

export async function assertArtifactSchema(
  schemaName: ArtifactSchema,
  value: unknown,
): Promise<void> {
  const validate = await getValidator(schemaName);
  if (!validate(value))
    throw new Error(
      `${schemaName} schema validation failed: ${validate.errors
        ?.map(
          (issue) =>
            `${issue.instancePath || "/"} ${issue.message ?? "is invalid"}`,
        )
        .join("; ")}`,
    );
}
