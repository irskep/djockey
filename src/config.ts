import fs from "fs";
import path from "path";
import url from "url";

import fastGlob from "fast-glob";
import yaml from "js-yaml";

import { getIsPandocInstalled } from "./pandoc";
import {
  DjockeyConfig,
  DjockeyConfigResolved,
  DjockeyInputFormat,
} from "./types";
import { getExtensionForInputFormat } from "./input/fileExtensions";

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
    outputFormats: {
      html: true,
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
  config: DjockeyConfig
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
    fileList:
      config.fileList ||
      fastGlob.sync(
        `${absify(rootPath, config.inputDir)}/**/*.(${inputExtensions.join(
          "|"
        )})`
      ),
  };

  const configURLRoot = config.urlRoot;
  const fileURLRoot = url.pathToFileURL(result.outputDir.html).toString();

  if (!configURLRoot) {
    console.warn(
      `Set root URL to ${fileURLRoot}. This will only work on your computer; you'll need to set urlRoot before you deploy.`
    );
  }
  return { ...result, urlRoot: configURLRoot ?? fileURLRoot };
}

export function resolveConfigFromDirectory(
  path_: string
): DjockeyConfigResolved | null {
  const configPath = `${path_}/djockey.yaml`;
  if (fs.existsSync(configPath)) {
    return resolveConfig(path.resolve(path_), readConfig(configPath));
  } else {
    return null;
  }
}

export function resolveConfigFromSingleFile(
  path_: string
): DjockeyConfigResolved {
  const absPath = path.resolve(path_);
  const parentDir = path.resolve(`${path_}/..`);
  const config: DjockeyConfig = {
    inputDir: parentDir,
    outputDir: {
      html: parentDir,
      gfm: parentDir,
    },
    fileList: [absPath],
    inputFormats: {
      djot: true,
      gfm: getIsPandocInstalled(),
    },
    outputFormats: {
      gfm: false,
      html: true,
    },
    numPasses: 1,
    siteName: "",

    plugins: [],

    html: {
      footerText: "",
      linkCSSToInputInsteadOfOutput: false,
    },
  };

  return resolveConfig(parentDir, config);
}
