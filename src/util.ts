import fs from "fs";
import path from "path";

import fastGlob from "fast-glob";

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
  fs.mkdirSync(path.resolve(path.join(filePath, "..")), {
    recursive: true,
  });
}

export function copyFilesMatchingPattern(args: {
  base: string;
  dest: string;
  pattern: string;
  exclude: string[]; // Absolute paths!
}) {
  const { base, dest, pattern, exclude } = args;

  const excludeSet = new Set(exclude);

  for (const path_ of fastGlob.sync(`${base}/${pattern}`)) {
    const relativePath = path.relative(base, path_);
    const newFullPath = `${dest}/${relativePath}`;

    ensureParentDirectoriesExist(newFullPath);

    if (excludeSet.has(`${base}/${relativePath}`)) continue;
    console.log("Copying static file", relativePath, "to", newFullPath);
    fs.copyFileSync(path_, `${dest}/${relativePath}`);
  }
}
