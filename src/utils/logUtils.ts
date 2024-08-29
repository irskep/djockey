import { print } from "gluegun";

export const log = print;

type LogLine = {
  severity: "error" | "warning" | "info" | "debug";
  text: string;
};

function severityToLevel(severity: LogLine["severity"]): number {
  switch (severity) {
    case "error":
      return 0;
    case "warning":
      return 1;
    case "info":
      return 2;
    case "debug":
      return 3;
  }
}

export class LogCollector {
  public lines = new Array<LogLine>();

  public loader: ReturnType<typeof print.spin>;

  constructor(public label: string, shouldStart = true) {
    this.loader = print.spin(label);
    if (shouldStart) {
      this.loader.start();
    }
  }

  succeed(severity: LogLine["severity"]) {
    this.loader.succeed();
    this.dump(severity);
  }

  fail(severity: LogLine["severity"]) {
    this.loader.fail();
    this.dump(severity);
  }

  dump(severity: LogLine["severity"]) {
    for (const line of this.lines) {
      if (severityToLevel(line.severity) <= severityToLevel(severity)) {
        switch (line.severity) {
          case "error":
            print.error("    " + line.text);
            break;
          case "warning":
            print.warning("    " + line.text);
            break;
          case "info":
            print.info("    " + line.text);
            break;
          case "debug":
            print.debug("    " + line.text);
            break;
        }
      }
    }
    this.lines = [];
  }

  debug(text: string) {
    this.lines.push({ severity: "debug", text });
  }

  info(text: string) {
    this.lines.push({ severity: "info", text });
  }

  warning(text: string) {
    this.lines.push({ severity: "warning", text });
  }

  error(text: string) {
    this.lines.push({ severity: "error", text });
  }
}
