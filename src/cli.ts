import fs from "fs";
import { processDirectory, processSingleFile } from "./docsetLogic";
import { ArgumentParser, SubParser } from "argparse";

export function makeArgumentParser() {
  const p = new ArgumentParser();
  const subparsers = p.add_subparsers({ required: true });
  const buildParser = subparsers.add_parser("build");
  buildParser.set_defaults({ action: "build" });
  buildParser.add_argument("input");

  return p;
}

export function main() {
  const args = makeArgumentParser().parse_args();

  switch (args.action) {
    case "build":
      doBuild(args.input);
      break;
    default:
      throw new Error("Invalid action");
  }
}

export function doBuild(inputPath: string) {
  if (!fs.existsSync(inputPath)) {
    throw new Error("File does not exist: " + inputPath);
  }
  if (fs.statSync(inputPath).isDirectory()) {
    console.log(`${inputPath} is a directory`);
    processDirectory(inputPath);
  } else {
    console.log(`${inputPath} is a file`);
    processSingleFile(inputPath);
  }
}

main();
