import {
  CommandLineAction,
  CommandLineFlagParameter,
  CommandLineParser,
  CommandLineStringListParameter,
  CommandLineStringParameter,
} from "@rushstack/ts-command-line";
import { parseDjot } from "./djotLogic";

export class DjotCommandLine extends CommandLineParser {
  public constructor() {
    super({
      toolFilename: "djockey",
      toolDescription:
        "Processes collections of djot documents into user-readable outputs like HTML",
    });

    this.addAction(new BuildAction());
  }
}

export class BuildAction extends CommandLineAction {
  private _input: CommandLineStringListParameter;

  public constructor() {
    super({
      actionName: "build",
      summary: "Convert a collection of docs into output",
      documentation: "",
    });

    this._input = this.defineStringListParameter({
      argumentName: "INPUT",
      parameterLongName: "--input",
      description: "Input file",
    });
  }

  protected async onExecute() {
    console.log(parseDjot(this._input.values[0]));
  }
}

new DjotCommandLine().executeAsync();
