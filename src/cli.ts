#!/usr/bin/env node

import { exit } from "process";
import fs from "fs";

import { ArgumentParser } from "argparse";
import { resolveConfigFromDirectory } from "./config.js";
import { executeConfig } from "./engine/executeConfig.js";
import { ALL_OUTPUT_FORMATS } from "./types.js";
import path from "path";
import { log } from "./utils/logUtils.js";

export async function main(): Promise<number> {
  const args = makeArgumentParser().parse_args();

  if (!fs.existsSync(args.input)) {
    log.error(`File does not exist: ${args.input}`);
    return 1;
  }

  const config = resolveConfigFromDirectory(args.input, args.local);
  if (!config) {
    log.error(`Couldn't find a config file in ${path.resolve(args.input)}`);
    return 2;
  }

  await executeConfig(
    config,
    args.output_format.length ? args.output_format : ["html"]
  );

  return 0;
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

exit(await main());
