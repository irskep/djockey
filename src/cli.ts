#!/usr/bin/env node

import fs from "fs";
import { ArgumentParser } from "argparse";
import { resolveConfigFromDirectory } from "./config.js";
import { executeConfig } from "./engine/executeConfig.js";
import { ALL_OUTPUT_FORMATS, DjockeyOutputFormat } from "./types.js";

export async function main() {
  const args = makeArgumentParser().parse_args();
  doBuild(args.input, args.local, args.output_format);
}

export function makeArgumentParser() {
  const p = new ArgumentParser();
  p.add_argument("--local", { default: false, action: "store_true" });
  p.add_argument("-f", "--output-format", {
    default: [],
    choices: ALL_OUTPUT_FORMATS,
    action: "append",
  });
  p.add_argument("input");

  return p;
}

export async function doBuild(
  inputPath: string,
  isLocal: boolean,
  outputFormats: DjockeyOutputFormat[]
) {
  if (!fs.existsSync(inputPath)) {
    throw new Error("File does not exist: " + inputPath);
  }
  const config = resolveConfigFromDirectory(inputPath, isLocal);
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
