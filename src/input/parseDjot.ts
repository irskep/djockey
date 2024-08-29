import fs from "fs";
import path from "path";
import { basename } from "path";

import yaml from "js-yaml";
import { Doc, fromPandoc, parse } from "@djot/djot";
import { DjockeyDoc } from "../types.js";
import { getPandocAST } from "../pandoc.js";
import { getInputFormatForFileExtension } from "./fileExtensions.js";
import { LogCollector } from "../utils/logUtils.js";

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

export async function parseDjot(
  inputRoot: string,
  absolutePath: string,
  logCollector: LogCollector
): Promise<DjockeyDoc | null> {
  const relativePath = path.relative(inputRoot, absolutePath);
  const { text, frontMatter } = parseFrontmatter(
    fs.readFileSync(absolutePath, "utf8")
  );

  let djotDoc: Doc | undefined;

  switch (getInputFormatForFileExtension(path.parse(absolutePath).ext)) {
    case "djot":
      djotDoc = parse(text, {
        sourcePositions: true,
        warn: (warning) => logCollector.warning(warning.render()),
      });
      break;
    case "gfm":
      const ast = getPandocAST(absolutePath);
      djotDoc = fromPandoc(ast as any);
      break;
  }

  if (!djotDoc) {
    logCollector.error(`Couldn't figure out how to parse ${absolutePath}`);
    return null;
  }

  return {
    docs: { content: djotDoc },
    title: path.parse(relativePath).name,
    titleAST: [{ tag: "str", text: path.parse(relativePath).name }],
    originalExtension: path.parse(relativePath).ext,
    absolutePath,
    relativePath: removeExtensionFromPath(relativePath),
    filename: basename(absolutePath),
    frontMatter,
    data: {},
  };
}
