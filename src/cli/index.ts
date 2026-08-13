#!/usr/bin/env node

import process from "node:process";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { initWorkspace } from "../core/workspace.js";

interface ParsedInitArguments {
  readonly root: string;
  readonly name: string;
  readonly json: boolean;
}

const HELP = `Hermes Agent Security Lab

Usage:
  hermes-lab init [directory] --name <project-name> [--json]
  hermes-lab --help

Commands planned for later milestones: validate, run, report.
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

export async function main(args = process.argv.slice(2)): Promise<number> {
  const command = args[0];
  if (!command || command === "--help" || command === "-h") {
    process.stdout.write(HELP);
    return 0;
  }

  if (command !== "init") {
    process.stderr.write(`Unknown command: ${command}\n\n${HELP}`);
    return 2;
  }

  try {
    const options = parseInitArguments(args.slice(1));
    const result = await initWorkspace(options.root, options.name);
    if (options.json) {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    } else {
      process.stdout.write(
        `Initialized deny-by-default workspace at ${result.root}\n`,
      );
      process.stdout.write(`Manifest: ${result.manifestPath}\n`);
    }
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Initialization failed: ${message}\n`);
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
