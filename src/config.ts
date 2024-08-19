import fs from "fs";
import yaml from "js-yaml";
import { getIsPandocInstalled } from "./pandoc";

export type DjockeyConfig = {
  inputDir: string;
  htmlOutputDir: string;
  fileList?: string[];
  urlRoot?: string;
  outputFormats: {
    html: boolean;
    gfm: boolean;
  };
};

export function readConfig(path_: string): DjockeyConfig {
  const values = yaml.load(fs.readFileSync(path_, "utf8")) as DjockeyConfig;

  const isPandocInstalled = getIsPandocInstalled();

  const defaults: DjockeyConfig = {
    inputDir: "docs",
    htmlOutputDir: "out/html",
    outputFormats: {
      html: true,
      gfm: isPandocInstalled,
    },
  };
  return {
    ...defaults,
    ...values,
  };
}
