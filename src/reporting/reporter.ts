import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createEvidenceBundle } from "../evidence/store.js";
import { resolveRunDirectory } from "../evidence/run-path.js";
import type { EvidenceBundle, EvidenceManifest } from "../evidence/types.js";
import { assertArtifactSchema } from "../evidence/validation.js";

export interface JsonReport {
  readonly schemaVersion: 1;
  readonly runId: string;
  readonly scenarioId: string;
  readonly status: "pass" | "fail" | "error";
  readonly owaspAgenticMapping: readonly string[];
  readonly summary: {
    readonly expectationsPassed: number;
    readonly expectationsFailed: number;
    readonly decisionsAllowed: number;
    readonly decisionsDenied: number;
    readonly toolExecutions: number;
    readonly modelCalls: number;
    readonly estimatedCostUsd: number;
  };
  readonly expectations: EvidenceManifest["evaluation"]["expectations"];
  readonly evidence: {
    readonly file: "evidence.json";
    readonly sha256: string;
  };
}

export interface ReportBundle {
  readonly runDirectory: string;
  readonly reportJsonPath: string;
  readonly reportMarkdownPath: string;
  readonly reportJsonSha256Path: string;
  readonly reportJsonSha256: string;
  readonly evidence: EvidenceBundle;
  readonly report: JsonReport;
}

function sha256(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

function markdownCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/[\r\n]+/g, " ");
}

async function loadOrCreateEvidence(
  runDirectory: string,
): Promise<EvidenceBundle> {
  try {
    const evidencePath = path.join(runDirectory, "evidence.json");
    const evidenceSha256Path = path.join(runDirectory, "evidence.sha256");
    const serialized = await readFile(evidencePath, "utf8");
    const checksum = await readFile(evidenceSha256Path, "utf8");
    const observedSha256 = sha256(serialized);
    const expectedSha256 = checksum.trim().split(/\s+/)[0];
    if (expectedSha256 !== observedSha256)
      throw new Error(
        "Existing evidence checksum does not match evidence.json",
      );
    const parsed = JSON.parse(serialized) as EvidenceManifest;
    await assertArtifactSchema("evidence", parsed);
    return {
      runDirectory,
      evidencePath,
      evidenceSha256Path,
      evidenceSha256: observedSha256,
      evidence: parsed,
    };
  } catch (error) {
    const code = error instanceof Error && "code" in error ? error.code : "";
    if (code !== "ENOENT") throw error;
    return createEvidenceBundle(runDirectory);
  }
}

function toMarkdown(report: JsonReport, evidence: EvidenceManifest): string {
  const mapping = report.owaspAgenticMapping.length
    ? report.owaspAgenticMapping.join(", ")
    : "Not mapped";
  const rows = report.expectations
    .map(
      (item) =>
        `| ${markdownCell(item.id)} | ${item.type} | ${markdownCell(item.target)} | ${item.status.toUpperCase()} | ${markdownCell(item.observed)} |`,
    )
    .join("\n");
  const decisions = evidence.decisions
    .map(
      (decision) =>
        `| ${decision.sequence} | ${markdownCell(decision.actionId)} | ${markdownCell(decision.tool)} | ${decision.effect.toUpperCase()} | ${decision.code} |`,
    )
    .join("\n");
  return `# Hermes Agent Security Lab Report

- **Run:** \`${report.runId}\`
- **Scenario:** \`${report.scenarioId}\`
- **Result:** **${report.status.toUpperCase()}**
- **OWASP Agentic mapping:** ${mapping}
- **Evidence SHA-256:** \`${report.evidence.sha256}\`

## Summary

| Metric | Value |
| --- | ---: |
| Expectations passed | ${report.summary.expectationsPassed} |
| Expectations failed | ${report.summary.expectationsFailed} |
| Decisions allowed | ${report.summary.decisionsAllowed} |
| Decisions denied | ${report.summary.decisionsDenied} |
| Local tool executions | ${report.summary.toolExecutions} |
| Model calls | ${report.summary.modelCalls} |
| Estimated provider cost | US$${report.summary.estimatedCostUsd.toFixed(6)} |

## Deterministic expectations

| ID | Type | Target | Status | Observed |
| --- | --- | --- | --- | --- |
${rows}

## Policy decisions

| Sequence | Action | Tool | Effect | Code |
| ---: | --- | --- | --- | --- |
${decisions}

## Reproduction

This report was generated from \`manifest.json\`, \`policy-decisions.json\`, and their hashes. The
deterministic evaluator—not a model—assigned the result. See \`evidence.json\` for structured data.
`;
}

export async function generateReports(
  requestedRunDirectory: string,
): Promise<ReportBundle> {
  const runDirectory = await resolveRunDirectory(requestedRunDirectory);
  const evidence = await loadOrCreateEvidence(runDirectory);
  const decisionsAllowed = evidence.evidence.decisions.filter(
    (item) => item.effect === "allow",
  ).length;
  const decisionsDenied = evidence.evidence.decisions.length - decisionsAllowed;
  const report: JsonReport = {
    schemaVersion: 1,
    runId: evidence.evidence.runId,
    scenarioId: evidence.evidence.scenario.id,
    status: evidence.evidence.evaluation.status,
    owaspAgenticMapping: evidence.evidence.scenario.owaspAgenticMapping,
    summary: {
      expectationsPassed: evidence.evidence.evaluation.passed,
      expectationsFailed: evidence.evidence.evaluation.failed,
      decisionsAllowed,
      decisionsDenied,
      toolExecutions: evidence.evidence.toolExecutions.length,
      modelCalls: evidence.evidence.usage.modelCalls,
      estimatedCostUsd: evidence.evidence.usage.estimatedCostUsd,
    },
    expectations: evidence.evidence.evaluation.expectations,
    evidence: { file: "evidence.json", sha256: evidence.evidenceSha256 },
  };
  const reportJson = `${JSON.stringify(report, null, 2)}\n`;
  await assertArtifactSchema("report", report);
  const reportMarkdown = toMarkdown(report, evidence.evidence);
  const reportJsonSha256 = sha256(reportJson);
  const reportJsonPath = path.join(runDirectory, "report.json");
  const reportMarkdownPath = path.join(runDirectory, "report.md");
  const reportJsonSha256Path = path.join(runDirectory, "report.sha256");
  await writeFile(reportJsonPath, reportJson, "utf8");
  await writeFile(reportMarkdownPath, reportMarkdown, "utf8");
  await writeFile(
    reportJsonSha256Path,
    `${reportJsonSha256}  report.json\n`,
    "utf8",
  );
  return {
    runDirectory,
    reportJsonPath,
    reportMarkdownPath,
    reportJsonSha256Path,
    reportJsonSha256,
    evidence,
    report,
  };
}
