import { spawnSync } from "child_process";

export function getIsPandocInstalled(): boolean {
  const result = spawnSync("which", ["pandoc"]);
  return result.status === 0;
}
