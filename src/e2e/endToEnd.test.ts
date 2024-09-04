import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

import fastGlob from "fast-glob";
import { executeConfig } from "../engine/executeConfig.js";
import { resolveConfigFromDirectory } from "../config.js";
import { LogCollector } from "../utils/logUtils.js";

function rmrf(parentDir: string) {
  console.log("rm -rf", parentDir);
  // Make sure we're not deleting every file on your computer
  if (parentDir.indexOf(`${path.sep}e2e${path.sep}`) < 0) {
    throw Error("WHAT ARE YOU DOING?");
  }
  for (const path_ of fastGlob.globSync(`${parentDir}/**/*`, {
    ignore: ["**/.gitignore"],
  })) {
    fs.unlinkSync(path_);
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const inputRoot = path.join(__dirname, "docs");
const outputRoot = path.join(__dirname, "out");

beforeEach(() => {
  rmrf(outputRoot);
});
test("HTML rendering", async () => {
  const config = resolveConfigFromDirectory(inputRoot, true)!;
  const logCollector = new LogCollector("E2E", { silent: true });
  await executeConfig(config, ["html"], logCollector);
  expect(logCollector.hasWarningsOrErrors).toBeFalsy();
});
