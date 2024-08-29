import { spawn } from "child_process";

export function runCmd(
  cmd: string,
  args: string[],
  opts: { input?: string } = {}
): Promise<{ status: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args);
    const stdout = new Array<string>();
    const stderr = new Array<string>();
    proc.stdout.setEncoding("utf-8");
    proc.stderr.setEncoding("utf-8");

    if (opts.input) {
      proc.stdin.write(opts.input);
      proc.stdin.end();
    }

    proc.stdout.on("data", function (data) {
      stdout.push(data.toString());
    });
    proc.stderr.on("data", function (data) {
      stderr.push(data.toString());
    });
    proc.on("close", function (status) {
      resolve({ status, stdout: stdout.join(""), stderr: stderr.join("") });
    });
    proc.on("error", () => {
      reject();
    });
  });
}
