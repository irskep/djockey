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
  buildParser.add_argument("input");

  return p;
}

export async function main() {
  const args = makeArgumentParser().parse_args();

  switch (args.action) {
    case "build":
      doBuild(args.input);
      break;
    default:
      throw new Error("Invalid action");
  }
}

export async function doBuild(inputPath: string) {
  if (!fs.existsSync(inputPath)) {
    throw new Error("File does not exist: " + inputPath);
  }
  const config = fs.statSync(inputPath).isDirectory()
    ? resolveConfigFromDirectory(inputPath)
    : resolveConfigFromSingleFile(inputPath);
  if (config) {
    await executeConfig(config);
  } else {
    console.error("Couldn't find a config file in", inputPath);
  }
}

main();
