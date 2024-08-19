import { Pandoc } from "@djot/djot/types/pandoc";
import { spawnSync } from "child_process";
import path from "path";

export function getIsPandocInstalled(): boolean {
  const result = spawnSync("which", ["pandoc"]);
  return result.status === 0;
}

export function getPandocAST(path_: string): Pandoc {
  const result = spawnSync(
    "pandoc",
    [path.resolve(path_), "-f", "gfm", "-t", "json"],
    {
      encoding: "utf-8",
    }
  );
  const resultOutput = result.stdout.toString();
  return JSON.parse(resultOutput);
}
