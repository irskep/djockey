import fs from "fs";
import path from "path";
import { basename } from "path";

import yaml from "js-yaml";
import { fromPandoc, parse } from "@djot/djot";
import { DjockeyConfig, DjockeyDoc, PolyglotDoc } from "../types.js";
import { getPandocAST } from "../pandoc.js";
import { getInputFormatForFileExtension } from "./fileExtensions.js";
import { LogCollector } from "../utils/logUtils.js";
import { fsext, fsname, fssplit, refjoin } from "../utils/pathUtils.js";

import { mystParse } from "myst-parser";

function removeExtensionFromPath(path_: string): string {
  return path_.slice(0, path_.length - path.parse(path_).ext.length);
}

export function parseFrontmatter(text: string): {
  text: string;
  frontMatter: Record<string, unknown>;
} {
  const FM_RE = /^---\r?\n(.*?)\r?\n---\r?\n?/gs;
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

export async function parseFile(
  inputRoot: string,
  fsPath: string,
  config: DjockeyConfig,
  logCollector: LogCollector
): Promise<DjockeyDoc | null> {
  const { text, frontMatter } = parseFrontmatter(
    fs.readFileSync(fsPath, "utf8")
  );

  let polyglotDoc: PolyglotDoc | undefined;

  switch (getInputFormatForFileExtension(fsext(fsPath), config, frontMatter)) {
    case "djot":
      polyglotDoc = {
        kind: "djot",
        value: parse(text, {
          sourcePositions: true,
          warn: (warning) => logCollector.warning(warning.render()),
        }),
      };
      break;
    case "gfm":
      const ast = getPandocAST(fsPath);
      polyglotDoc = { kind: "djot", value: fromPandoc(ast as any) };
      break;
    case "myst":
      polyglotDoc = { kind: "mdast", value: mystParse(text) };
      console.log(yaml.dump(polyglotDoc.value));
      break;
  }

  if (!polyglotDoc) {
    logCollector.error(`Couldn't figure out how to parse ${fsPath}`);
    return null;
  }

  return {
    docs: { content: polyglotDoc },
    title: path.parse(fsPath).name,
    titleASTDjot: [{ tag: "str", text: fsname(fsPath) }],
    titleASTMyst: [{ type: "text", value: fsname(fsPath) }],
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
