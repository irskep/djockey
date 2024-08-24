#!/usr/bin/env node

import fs from "fs";
import { ArgumentParser } from "argparse";
import {
  resolveConfigFromDirectory,
  resolveConfigFromSingleFile,
} from "./config";
import { executeConfig } from "./engine/executeConfig";

export function makeArgumentParser() {
  const p = new ArgumentParser();
  const subparsers = p.add_subparsers({ required: true });
  const buildParser = subparsers.add_parser("build");
  buildParser.set_defaults({ action: "build" });
  buildParser.add_argument("--local", { default: false, action: "store_true" });
  buildParser.add_argument("input");

  return p;
}

export async function main() {
  const args = makeArgumentParser().parse_args();

  switch (args.action) {
    case "build":
      doBuild(args.input, args.local);
      break;
    default:
      throw new Error("Invalid action");
  }
}

export async function doBuild(inputPath: string, isLocal: boolean) {
  if (!fs.existsSync(inputPath)) {
    throw new Error("File does not exist: " + inputPath);
  }
  const config = fs.statSync(inputPath).isDirectory()
    ? resolveConfigFromDirectory(inputPath, isLocal)
    : resolveConfigFromSingleFile(inputPath);
  if (config) {
    await executeConfig(config);
  } else {
    console.error("Couldn't find a config file in", inputPath);
  }
}

main();
