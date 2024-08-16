import fs from "fs";
import { parse, type Doc } from "@djot/djot";

export function parseDjot(path: string): Doc {
  console.log(parse);
  console.log(path);
  return parse(fs.readFileSync(path, "utf8"), {
    sourcePositions: true,
    warn: (warning) => console.warn(warning.render()),
  });
}
