import fs from "fs";
import path from "path";

import fastGlob from "fast-glob";
import { AstNode, Block, Doc, HasAttributes, HasText } from "@djot/djot";
import { applyFilter } from "./engine/djotFiltersPlus.js";

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

export function findGitRoot(start: string): string | null {
  const parts = start.split(path.sep);
  if (parts[parts.length - 1] === "") parts.pop();

  for (let i = parts.length; i > 0; i--) {
    const parentPath = parts.slice(0, i).join(path.sep);
    const gitPath = `${parentPath}${path.sep}.git`;
    if (fs.existsSync(gitPath) && fs.lstatSync(gitPath).isDirectory()) {
      return parentPath;
    }
  }
  return null;
}
