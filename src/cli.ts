#!/usr/bin/env node

import fs from "fs";
import { ArgumentParser } from "argparse";
import {
  resolveConfigFromDirectory,
  resolveConfigFromSingleFile,
} from "./config.js";
import { executeConfig } from "./engine/executeConfig.js";
import { ALL_OUTPUT_FORMATS, DjockeyOutputFormat } from "./types.js";

export function makeArgumentParser() {
  const p = new ArgumentParser();
  const subparsers = p.add_subparsers({ required: true });
  const buildParser = subparsers.add_parser("build");
  buildParser.set_defaults({ action: "build" });
  buildParser.add_argument("--local", { default: false, action: "store_true" });
  buildParser.add_argument("-f", "--output-format", {
    default: [],
    choices: ALL_OUTPUT_FORMATS,
    action: "append",
  });
  buildParser.add_argument("input");

  return p;
}

export async function main() {
  const args = makeArgumentParser().parse_args();

  switch (args.action) {
    case "build":
      doBuild(args.input, args.local, args.output_format);
      break;
    default:
      throw new Error("Invalid action");
  }
}

export async function doBuild(
  inputPath: string,
  isLocal: boolean,
  outputFormats: DjockeyOutputFormat[]
) {
  if (!fs.existsSync(inputPath)) {
    throw new Error("File does not exist: " + inputPath);
  }
  const config = fs.statSync(inputPath).isDirectory()
    ? resolveConfigFromDirectory(inputPath, isLocal)
    : resolveConfigFromSingleFile(inputPath);
  if (config) {
    await executeConfig(
      config,
      outputFormats.length ? outputFormats : ["html"]
    );
  } else {
    console.error("Couldn't find a config file in", inputPath);
  }
}

main();
