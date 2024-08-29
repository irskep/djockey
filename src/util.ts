import fs from "fs";
import path from "path";

import fastGlob from "fast-glob";
import { AstNode, Block, Doc, HasAttributes, HasText } from "@djot/djot";
import { applyFilter } from "./engine/djotFiltersPlus.js";
import { spawn } from "child_process";

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

export function copyFilesMatchingPattern(args: {
  base: string;
  dest: string;
  pattern: string;
  excludePaths: string[]; // Absolute paths!
  excludePatterns: string[];
}) {
  const { base, dest, pattern, excludePaths, excludePatterns } = args;

  const excludeSet = new Set(excludePaths);

  function copyPath(path_: string) {
    const relativePath = path.relative(base, path_);

    if (excludeSet.has(`${base}/${relativePath}`)) return;

    const newFullPath = `${dest}/${relativePath}`;

    ensureParentDirectoriesExist(newFullPath);

    console.log("Copying static file", relativePath, "to", newFullPath);
    fs.copyFileSync(path_, `${dest}/${relativePath}`);
  }

  for (const path_ of fastGlob.sync(`${base}/${pattern}`, {
    ignore: excludePatterns,
  })) {
    copyPath(path_);
  }
}

export function getHasClass(node: HasAttributes, cls: string): boolean {
  if (!node.attributes || !node.attributes["class"]) return false;
  const values = new Set(node.attributes["class"].split(" "));
  return values.has(cls);
}

export function addClass(node: HasAttributes, cls: string) {
  const classString = node.attributes?.class || "";
  node.attributes = { ...node.attributes, class: classString + " " + cls };
}

export function getAttribute(node: HasAttributes, k: string): string | null {
  if (!node.attributes || node.attributes[k] === undefined) return null;
  return node.attributes[k];
}

export function getAnyAttribute(
  node: HasAttributes,
  keys: string[]
): [string, string] | null {
  if (!node.attributes) return null;
  for (const k of keys) {
    if (node.attributes[k] !== undefined) return [k, node.attributes[k]];
  }
  return null;
}

export function makeStubDjotDoc(children: Block[]): Doc {
  return {
    tag: "doc",
    references: {},
    autoReferences: {},
    footnotes: {},
    children,
  };
}

export function djotASTToText(children: Block[]) {
  const result = new Array<string>();
  applyFilter(makeStubDjotDoc(children), () => ({
    "*": (node: HasText) => {
      if (!node.text) return;
      result.push(node.text);
    },
  }));
  return result.join("");
}

export function pushToListIfNotPresent<T>(
  dict: Record<string, T[]>,
  k: string,
  v: T,
  checkEquality: (a: T, b: T) => boolean
) {
  const array = dict[k] ?? [];
  dict[k] = array;
  if (array.findIndex((innerValue) => checkEquality(v, innerValue)) >= 0)
    return;
  array.push(v);
}

export function pushToList<T>(dict: Record<string, T[]>, k: string, v: T) {
  const array = dict[k] ?? [];
  dict[k] = array;
  array.push(v);
}

export function runCmd(
  cmd: string,
  args: string[],
  opts: { input?: string } = {}
): Promise<{ status: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args);
    const stdout = new Array<string>();
    const stderr = new Array<string>();
    proc.stdout.setEncoding("utf-8");
    proc.stderr.setEncoding("utf-8");

    if (opts.input) {
      proc.stdin.write(opts.input);
      proc.stdin.end();
    }

    proc.stdout.on("data", function (data) {
      stdout.push(data.toString());
    });
    proc.stderr.on("data", function (data) {
      stderr.push(data.toString());
    });
    proc.on("close", function (status) {
      resolve({ status, stdout: stdout.join(""), stderr: stderr.join("") });
    });
    proc.on("error", () => {
      reject();
    });
  });
}
