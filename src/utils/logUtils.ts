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
  private lines = new Array<LogLine>();

  private loader: ReturnType<typeof print.spin>;

  constructor(public label: string, shouldStart = true) {
    this.loader = print.spin(label);
    if (shouldStart) {
      this.loader.start();
    }
  }

  public succeed(severity: LogLine["severity"]) {
    this.loader.succeed();
    this.dump(severity);
  }

  public fail(severity: LogLine["severity"]) {
    this.loader.fail();
    this.dump(severity);
  }

  public dump(severity: LogLine["severity"]) {
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

  public debug(text: string) {
    this.lines.push({ severity: "debug", text });
  }

  public info(text: string) {
    this.lines.push({ severity: "info", text });
  }

  public warning(text: string) {
    this.lines.push({ severity: "warning", text });
  }

  public error(text: string) {
    this.lines.push({ severity: "error", text });
  }
}
