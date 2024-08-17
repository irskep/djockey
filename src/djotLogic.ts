import fs from "fs";
import { basename } from "path";

import yaml from "js-yaml";
import { parse, applyFilter } from "@djot/djot";
import { DjockeyAstNode, DjockeyDoc } from "./types";
import { ALL_TAGS } from "./allTags";
import { Action } from "@djot/djot/types/filter";

const FRONT_MATTER_RE = /^---\n(.*?)\n---\n(.*)$/gm;

export function parseDjot(path: string): DjockeyDoc {
  let text = fs.readFileSync(path, "utf8");
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
    path,
    filename: basename(path),
    frontMatter,
  };
}
