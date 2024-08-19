import fs from "fs";
import yaml from "js-yaml";

export type DjockeyConfig = {
  inputDir: string;
  htmlOutputDir: string;
  fileList?: string[];
  urlRoot?: string;
  outputFormats: {
    html: boolean;
  };
};

export function readConfig(path_: string): DjockeyConfig {
  const values = yaml.load(fs.readFileSync(path_, "utf8")) as DjockeyConfig;

  const defaults: DjockeyConfig = {
    inputDir: "docs",
    htmlOutputDir: "out/html",
    outputFormats: {
      html: true,
    },
  };
  return {
    ...defaults,
    ...values,
  };
}
