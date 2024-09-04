import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

import fastGlob from "fast-glob";
import { executeConfig } from "./engine/executeConfig.js";
import { resolveConfigFromDirectory } from "./config.js";
import { LogCollector } from "./utils/logUtils.js";

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
const e2eDataRoot = path.resolve(
  path.join(dirname(__filename), "..", "examples", "e2e")
);
const inputRoot = path.join(e2eDataRoot);
const outputRoot = path.join(inputRoot, "out");

beforeEach(() => {
  rmrf(outputRoot);
});

test("HTML rendering", async () => {
  console.log("Tests are looking in", inputRoot);
  const config = resolveConfigFromDirectory(inputRoot, true)!;
  expect(config).toBeTruthy();
  const logCollector = new LogCollector("E2E", {
    silent: true,
    shouldStart: false,
  });
  await executeConfig(config, ["html"], logCollector);
  expect(logCollector.hasWarningsOrErrors).toBeFalsy();
});
