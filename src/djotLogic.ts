import fs from "fs";
import path from "path";
import { basename } from "path";

import yaml from "js-yaml";
import { Doc, parse, renderHTML } from "@djot/djot";
import { DjockeyDoc } from "./types";

const FRONT_MATTER_RE = /^---\n(.*?)\n---\n(.*)$/gm;

export function parseDjot(inputRoot: string, absolutePath: string): DjockeyDoc {
  const relativePath = path.relative(inputRoot, absolutePath);
  let text = fs.readFileSync(absolutePath, "utf8");
  let frontMatter: Record<string, unknown> = {};

  const match = FRONT_MATTER_RE.exec(text);
  if (match) {
    text = match[2];
    frontMatter = yaml.load(match[1]) as Record<string, unknown>;
  }

  const djotDoc = parse(text, {
    sourcePositions: true,
    warn: (warning) => console.warn(warning.render()),
  });

  return {
    djotDoc,
    title: path.parse(relativePath).name,
    absolutePath,
    relativePath,
    filename: basename(absolutePath),
    frontMatter,
  };
}
