import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";

import fastGlob from "fast-glob";
import { LogCollector } from "./logUtils.js";

export function joinPath(items: string[]): string {
  return items.join(path.sep);
}

export function makePathBackToRoot(
  pathRelativeToInputDir: string,
  options: { sameDirectoryValue: string } = { sameDirectoryValue: "./" }
): string {
  let numSlashes = 0;
  for (const char of pathRelativeToInputDir) {
    if (char === "/") {
      numSlashes += 1;
    }
    if (char === "#") {
      break;
    }
  }

  if (numSlashes === 0) return options.sameDirectoryValue;

  const result = new Array<string>();
  for (let i = 0; i < numSlashes; i++) {
    result.push("..");
  }
  return result.join("/") + "/";
}

export function ensureParentDirectoriesExist(filePath: string) {
  if (fs.existsSync(path.resolve(path.join(filePath, "..")))) return;

  fs.mkdirSync(path.resolve(path.join(filePath, "..")), {
    recursive: true,
  });
}

export async function writeFile(
  path_: string,
  contents: string
): Promise<void> {
  ensureParentDirectoriesExist(path_);
  await fsPromises.writeFile(path_, contents, { encoding: "utf8" });
}

export async function copyFilesMatchingPattern(args: {
  base: string;
  dest: string;
  pattern: string;
  excludePaths: string[]; // Absolute paths!
  excludePatterns: string[];
  logCollector: LogCollector;
}) {
  const { base, dest, pattern, excludePaths, excludePatterns } = args;

  const excludeSet = new Set(excludePaths);

  const logMessage = `Copying static files from ${path.relative(
    ".",
    base
  )} to ${path.relative(".", dest)}`;
  args.logCollector.info(logMessage);

  function copyPath(path_: string) {
    const relativePath = path.relative(base, path_);

    if (excludeSet.has(`${base}/${relativePath}`)) return;

    const newFullPath = `${dest}/${relativePath}`;

    ensureParentDirectoriesExist(newFullPath);

    args.logCollector.info(
      `Copying static file ${relativePath} to ${newFullPath}`
    );
    fs.copyFileSync(path_, `${dest}/${relativePath}`);
  }

  const promises = fastGlob
    .sync(`${base}/${pattern}`, {
      ignore: excludePatterns,
    })
    .map(async (path_) => await copyPath(path_));

  await Promise.all(promises);
}
