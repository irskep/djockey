import fs from "fs";
import path from "path";
import { basename } from "path";

import yaml from "js-yaml";
import { Doc, fromPandoc, parse } from "@djot/djot";
import { DjockeyDoc } from "../types";
import { getPandocAST } from "../pandoc";

const FRONT_MATTER_RE = /^---\n(.*?)\n---\n((.|[\s\S])*)$/g;

function removeExtensionFromPath(path_: string): string {
  return path_.slice(0, path_.length - path.parse(path_).ext.length);
}

export function parseDjot(
  inputRoot: string,
  absolutePath: string
): DjockeyDoc | null {
  const relativePath = path.relative(inputRoot, absolutePath);
  let text = fs.readFileSync(absolutePath, "utf8");
  let frontMatter: Record<string, unknown> = {};

  const match = FRONT_MATTER_RE.exec(text);
  if (match) {
    text = match[2];
    frontMatter = yaml.load(match[1]) as Record<string, unknown>;
  }

  let djotDoc: Doc | undefined;

  switch (path.parse(absolutePath).ext) {
    case ".djot":
      djotDoc = parse(text, {
        sourcePositions: true,
        warn: (warning) => console.warn(warning.render()),
      });
      break;
    case ".md":
      const ast = getPandocAST(absolutePath);
      djotDoc = fromPandoc(ast);
      break;
  }

  if (!djotDoc) {
    console.error("Couldn't figure out how to parse", absolutePath);
    return null;
  }

  return {
    docs: { content: djotDoc },
    title: path.parse(relativePath).name,
    originalExtension: path.parse(relativePath).ext,
    absolutePath,
    relativePath: removeExtensionFromPath(relativePath),
    filename: basename(absolutePath),
    frontMatter,
    data: {},
  };
}
