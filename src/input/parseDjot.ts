import fs from "fs";
import path from "path";
import { basename } from "path";

import yaml from "js-yaml";
import { Doc, fromPandoc, parse } from "@djot/djot";
import { DjockeyDoc } from "../types.js";
import { getPandocAST } from "../pandoc.js";
import { getInputFormatForFileExtension } from "./fileExtensions.js";
import { LogCollector } from "../utils/logUtils.js";
import { fsext, fsname, fssplit, refjoin } from "../utils/pathUtils.js";

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
  fsPath: string,
  logCollector: LogCollector
): Promise<DjockeyDoc | null> {
  const { text, frontMatter } = parseFrontmatter(
    fs.readFileSync(fsPath, "utf8")
  );

  let djotDoc: Doc | undefined;

  switch (getInputFormatForFileExtension(fsext(fsPath))) {
    case "djot":
      djotDoc = parse(text, {
        sourcePositions: true,
        warn: (warning) => logCollector.warning(warning.render()),
      });
      break;
    case "gfm":
      const ast = getPandocAST(fsPath);
      djotDoc = fromPandoc(ast as any);
      break;
  }

  if (!djotDoc) {
    logCollector.error(`Couldn't figure out how to parse ${fsPath}`);
    return null;
  }

  return {
    docs: { content: djotDoc },
    title: path.parse(fsPath).name,
    titleAST: [{ tag: "str", text: fsname(fsPath) }],
    originalExtension: fsext(fsPath),
    fsPath,
    refPath: refjoin(
      fssplit(removeExtensionFromPath(path.relative(inputRoot, fsPath)))
    ),
    filename: basename(fsPath),
    frontMatter,
    data: {},
  };
}
