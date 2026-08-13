#!/usr/bin/env node

import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { initWorkspace } from "../core/workspace.js";
import { loadScenario } from "../scenario/loader.js";
import { prepareScenarioRun } from "../scenario/runner.js";

interface ParsedInitArguments {
  readonly root: string;
  readonly name: string;
  readonly json: boolean;
}

interface ParsedScenarioArguments {
  readonly scenarioPath: string;
  readonly workspace: string;
  readonly json: boolean;
}

const HELP = `Hermes Agent Security Lab

Usage:
  hermes-lab init [directory] --name <project-name> [--json]
  hermes-lab validate <scenario.yaml> [--json]
  hermes-lab run <scenario.yaml> [--workspace <directory>] [--json]
  hermes-lab --help

The M2 run command prepares and records a local run without invoking a model or tool.
The report command arrives with the evidence and reporting milestone.
`;

function parseInitArguments(args: readonly string[]): ParsedInitArguments {
  let root = ".";
  let name = "agent-security-lab";
  let json = false;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--json") {
      json = true;
    } else if (argument === "--name") {
      const value = args[index + 1];
      if (!value) throw new Error("--name requires a value");
      name = value;
      index += 1;
    } else if (argument?.startsWith("-")) {
      throw new Error(`Unknown option: ${argument}`);
    } else if (argument) {
      root = argument;
    }
  }

  return { root, name, json };
}

function parseScenarioArguments(
  args: readonly string[],
  allowWorkspace: boolean,
): ParsedScenarioArguments {
  let scenarioPath: string | undefined;
  let workspace = ".";
  let json = false;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--json") {
      json = true;
    } else if (argument === "--workspace" && allowWorkspace) {
      const value = args[index + 1];
      if (!value) throw new Error("--workspace requires a value");
      workspace = value;
      index += 1;
    } else if (argument?.startsWith("-")) {
      throw new Error(`Unknown option: ${argument}`);
    } else if (argument && !scenarioPath) {
      scenarioPath = argument;
    } else if (argument) {
      throw new Error(`Unexpected argument: ${argument}`);
    }
  }

  if (!scenarioPath) throw new Error("scenario path is required");
  return { scenarioPath, workspace, json };
}

function print(value: unknown, json: boolean, summary: string): void {
  process.stdout.write(json ? `${JSON.stringify(value, null, 2)}\n` : summary);
}

export async function main(args = process.argv.slice(2)): Promise<number> {
  const command = args[0];
  if (!command || command === "--help" || command === "-h") {
    process.stdout.write(HELP);
    return 0;
  }

  try {
    if (command === "init") {
      const options = parseInitArguments(args.slice(1));
      const result = await initWorkspace(options.root, options.name);
      print(
        result,
        options.json,
        `Initialized deny-by-default workspace at ${result.root}\nManifest: ${result.manifestPath}\n`,
      );
      return 0;
    }

    if (command === "validate") {
      const options = parseScenarioArguments(args.slice(1), false);
      const loaded = await loadScenario(options.scenarioPath);
      const result = {
        valid: true,
        id: loaded.scenario.id,
        sourcePath: loaded.sourcePath,
        sourceSha256: loaded.sourceSha256,
      };
      print(
        result,
        options.json,
        `Valid scenario ${result.id}\nSHA-256: ${result.sourceSha256}\n`,
      );
      return 0;
    }

    if (command === "run") {
      const options = parseScenarioArguments(args.slice(1), true);
      const result = await prepareScenarioRun(
        options.scenarioPath,
        options.workspace,
      );
      print(
        result,
        options.json,
        `Prepared local run ${result.manifest.runId}\nManifest: ${result.manifestPath}\nModel calls: 0; tool calls: 0\n`,
      );
      return 0;
    }

    process.stderr.write(`Unknown command: ${command}\n\n${HELP}`);
    return 2;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${command} failed: ${message}\n`);
    return 1;
  }
}

const invokedPath = process.argv[1];
if (
  invokedPath &&
  import.meta.url === pathToFileURL(path.resolve(invokedPath)).href
) {
  process.exitCode = await main();
}
