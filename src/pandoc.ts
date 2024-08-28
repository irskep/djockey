import { spawnSync } from "child_process";
import path from "path";
import { runCmd } from "./util.js";

export function getIsPandocInstalled(): boolean {
  const result = spawnSync("which", ["pandoc"]);
  return result.status === 0;
}

export function getPandocAST(path_: string): unknown {
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

export async function runPandocOnAST(
  ast: unknown,
  fmt: string
): Promise<string> {
  const result = await runCmd("pandoc", ["-f", "json", "-t", fmt], {
    input: JSON.stringify(ast),
  });
  const resultOutput = result.stdout.toString();
  return resultOutput;
}
