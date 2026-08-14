import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { redactSecrets } from "../providers/redaction.js";
import type {
  PolicyRunRecord,
  PreparedRunManifest,
} from "../scenario/runner.js";
import { evaluateRun } from "./evaluator.js";
import { resolveRunDirectory } from "./run-path.js";
import { assertArtifactSchema } from "./validation.js";
import type {
  ArtifactDigest,
  EvidenceBundle,
  EvidenceFixture,
  EvidenceManifest,
} from "./types.js";

const OWASP_AGENTIC_MAPPING: Readonly<Record<string, readonly string[]>> = {
  "indirect-instruction": ["ASI01 Agent Goal Hijack"],
  "tool-misuse": ["ASI02 Tool Misuse & Exploitation"],
  "path-boundary": ["ASI02 Tool Misuse & Exploitation"],
};

function digest(content: Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

async function readArtifact(
  runDirectory: string,
  file: string,
  role: ArtifactDigest["role"],
): Promise<{ readonly parsed: unknown; readonly digest: ArtifactDigest }> {
  const content = await readFile(path.join(runDirectory, file));
  return {
    parsed: JSON.parse(content.toString("utf8")) as unknown,
    digest: { role, file, sha256: digest(content), bytes: content.byteLength },
  };
}

function redactValue<T>(value: T): T {
  return JSON.parse(redactSecrets(JSON.stringify(value))) as T;
}

export async function createEvidenceBundle(
  requestedRunDirectory: string,
): Promise<EvidenceBundle> {
  const runDirectory = await resolveRunDirectory(requestedRunDirectory);
  const manifestArtifact = await readArtifact(
    runDirectory,
    "manifest.json",
    "run-manifest",
  );
  const policyArtifact = await readArtifact(
    runDirectory,
    "policy-decisions.json",
    "policy-decisions",
  );
  const manifest = manifestArtifact.parsed as PreparedRunManifest;
  const policyRecord = policyArtifact.parsed as PolicyRunRecord;
  if (
    manifest.schemaVersion !== 1 ||
    policyRecord.schemaVersion !== 1 ||
    manifest.runId !== policyRecord.runId ||
    manifest.scenario.sourceSha256 !== policyRecord.scenarioSourceSha256
  )
    throw new Error("Run artifacts have inconsistent identity or source hash");

  const fixtures: EvidenceFixture[] = manifest.fixtures.map((fixture) => ({
    id: fixture.id,
    path: fixture.relativePath,
    sha256: fixture.observedSha256,
    bytes: fixture.bytes,
    integrity: fixture.integrity,
  }));
  const decisions = redactValue(policyRecord.decisions);
  const toolExecutions = redactValue(policyRecord.toolExecutions);
  const evaluation = evaluateRun({
    expectations: manifest.expectations,
    fixtures,
    decisions,
    toolExecutions,
  });
  const evidence: EvidenceManifest = {
    schemaVersion: 1,
    runId: manifest.runId,
    createdAt: manifest.createdAt,
    state: "evaluated",
    scenario: {
      id: manifest.scenario.id,
      sourceSha256: manifest.scenario.sourceSha256,
      riskCategory: manifest.scenario.riskCategory,
      owaspAgenticMapping:
        OWASP_AGENTIC_MAPPING[manifest.scenario.riskCategory] ?? [],
    },
    artifacts: [manifestArtifact.digest, policyArtifact.digest],
    fixtures,
    decisions,
    toolExecutions,
    usage: {
      ...policyRecord.usage,
      modelCalls: policyRecord.execution.modelCalls,
      providerInputTokens: 0,
      providerOutputTokens: 0,
      estimatedCostUsd: 0,
    },
    evaluation,
  };
  const serialized = `${JSON.stringify(evidence, null, 2)}\n`;
  await assertArtifactSchema("evidence", evidence);
  const evidenceSha256 = digest(Buffer.from(serialized, "utf8"));
  const evidencePath = path.join(runDirectory, "evidence.json");
  const evidenceSha256Path = path.join(runDirectory, "evidence.sha256");
  await writeFile(evidencePath, serialized, { encoding: "utf8", flag: "wx" });
  await writeFile(evidenceSha256Path, `${evidenceSha256}  evidence.json\n`, {
    encoding: "utf8",
    flag: "wx",
  });
  return {
    runDirectory,
    evidencePath,
    evidenceSha256Path,
    evidenceSha256,
    evidence,
  };
}
