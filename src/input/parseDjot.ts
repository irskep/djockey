import fs from "fs";
import path from "path";
import { basename } from "path";

import yaml from "js-yaml";
import { Doc, fromPandoc, parse } from "@djot/djot";
import { DjockeyDoc } from "../types";
import { getPandocAST } from "../pandoc";
import { getInputFormatForFileExtension } from "./fileExtensions";

function removeExtensionFromPath(path_: string): string {
  return path_.slice(0, path_.length - path.parse(path_).ext.length);
}

export function parseFrontmatter(text: string): {
  text: string;
  frontMatter: Record<string, unknown>;
} {
  const FM_RE = /^---\n(.*?)\n---\n?/gs;
  const match = FM_RE.exec(text);

  if (match) {
    const justText = text.slice(match[0].length);
    const fmText = match[1];
    const frontMatter = yaml.load(fmText) as Record<string, unknown>;
    return { text: justText, frontMatter };
  } else {
    return { text, frontMatter: {} };
  }
}

export function parseDjot(
  inputRoot: string,
  absolutePath: string
): DjockeyDoc | null {
  const relativePath = path.relative(inputRoot, absolutePath);
  const { text, frontMatter } = parseFrontmatter(
    fs.readFileSync(absolutePath, "utf8")
  );

  let djotDoc: Doc | undefined;

  switch (getInputFormatForFileExtension(path.parse(absolutePath).ext)) {
    case "djot":
      djotDoc = parse(text, {
        sourcePositions: true,
        warn: (warning) => console.warn(warning.render()),
      });
      break;
    case "gfm":
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
