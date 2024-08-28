import fs from "fs";
import path from "path";
import url from "url";

import fastGlob from "fast-glob";
import yaml from "js-yaml";

import { getIsPandocInstalled } from "./pandoc.js";
import {
  DjockeyConfig,
  DjockeyConfigResolved,
  DjockeyInputFormat,
} from "./types.js";
import { getExtensionForInputFormat } from "./input/fileExtensions.js";

export function getConfigDefaults(): DjockeyConfig {
  const isPandocInstalled = getIsPandocInstalled();
  return {
    inputDir: "docs",
    outputDir: {
      html: "out/html",
      gfm: "out/gfm",
    },
    inputFormats: {
      djot: true,
      gfm: isPandocInstalled,
    },
    numPasses: 1,
    siteName: "",

    plugins: [],

    html: {
      footerText: "",
      linkCSSToInputInsteadOfOutput: false,
    },
  };
}

export function populateConfig(values: Partial<DjockeyConfig>): DjockeyConfig {
  const defaults = getConfigDefaults();
  return {
    ...defaults,
    ...values,
    html: { ...defaults.html, ...(values.html || {}) },
    outputDir: { ...defaults.outputDir, ...(values.outputDir || {}) },
  };
}

export function readConfig(path_: string): DjockeyConfig {
  return populateConfig(
    yaml.load(fs.readFileSync(path_, "utf8")) as Partial<DjockeyConfig>
  );
}

function absify(rootPath: string, path_: string): string {
  if (path.isAbsolute(path_)) return path_;
  return `${rootPath}/${path_}`;
}

export function resolveConfig(
  rootPath: string,
  config: DjockeyConfig,
  useFileURLRoot: boolean
): DjockeyConfigResolved {
  let inputExtensions: string[] = [];
  for (const format of Object.keys(
    config.inputFormats
  ) as DjockeyInputFormat[]) {
    if (!config.inputFormats[format]) continue;
    inputExtensions = [
      ...inputExtensions,
      ...getExtensionForInputFormat(format),
    ];
  }
  const result = {
    ...config,
    rootPath,
    inputDir: absify(rootPath, config.inputDir),
    outputDir: {
      html: absify(rootPath, config.outputDir.html),
      gfm: absify(rootPath, config.outputDir.gfm),
    },
    fileList: fastGlob.sync(
      `${absify(rootPath, config.inputDir)}/**/*.(${inputExtensions.join("|")})`
    ),
  };

  const configURLRoot = config.urlRoot;
  const fileURLRoot = url.pathToFileURL(result.outputDir.html).toString();

  if (useFileURLRoot) {
    return { ...result, urlRoot: fileURLRoot };
  } else if (!configURLRoot) {
    console.error(
      `urlRoot is mandatory, though you can pass --local to use file URLs for local testing.`
    );
    throw Error();
  }
  return { ...result, urlRoot: configURLRoot };
}

export function resolveConfigFromDirectory(
  path_: string,
  isLocal: boolean
): DjockeyConfigResolved | null {
  const configPath = `${path_}/djockey.yaml`;
  if (fs.existsSync(configPath)) {
    return resolveConfig(path.resolve(path_), readConfig(configPath), isLocal);
  } else {
    return null;
  }
}
