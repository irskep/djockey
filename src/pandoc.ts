import { spawnSync } from "child_process";
import path from "path";
import { runCmd } from "./utils/runCmd.js";

export function getIsPandocInstalled(): boolean {
  const result = spawnSync("which", ["pandoc"]);
  return result.status === 0;
}

export function getPandocAST(fsPath: string): unknown {
  const result = spawnSync(
    "pandoc",
    [path.resolve(fsPath), "-f", "gfm", "-t", "json"],
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
