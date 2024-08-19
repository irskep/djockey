import fs from "fs";
import path from "path";
import url from "url";

import fastGlob from "fast-glob";
import yaml from "js-yaml";

import { getIsPandocInstalled } from "./pandoc";

export type DjockeyConfig = {
  inputDir: string;
  htmlOutputDir: string;
  fileList?: string[];
  urlRoot?: string;
  inputFormats: {
    djot: boolean;
    gfm: boolean;
  };
  outputFormats: {
    html: boolean;
    gfm: boolean;
  };
};

export type DjockeyConfigResolved = DjockeyConfig & {
  rootPath: string;
  fileList: string[];
  urlRoot: string;
};

export function readConfig(path_: string): DjockeyConfig {
  const values = yaml.load(fs.readFileSync(path_, "utf8")) as DjockeyConfig;

  const isPandocInstalled = getIsPandocInstalled();

  const defaults: DjockeyConfig = {
    inputDir: "docs",
    htmlOutputDir: "out/html",
    inputFormats: {
      djot: true,
      gfm: isPandocInstalled,
    },
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

function absify(rootPath: string, path_: string): string {
  if (path.isAbsolute(path_)) return path_;
  return `${rootPath}/${path_}`;
}

export function resolveConfig(
  rootPath: string,
  config: DjockeyConfig
): DjockeyConfigResolved {
  const inputExtensions: string[] = [];
  if (config.inputFormats.djot) {
    inputExtensions.push("djot");
  }
  if (config.inputFormats.gfm) {
    inputExtensions.push("md");
  }
  const result = {
    ...config,
    rootPath,
    inputDir: absify(rootPath, config.inputDir),
    htmlOutputDir: absify(rootPath, config.htmlOutputDir),
    fileList:
      config.fileList ||
      fastGlob.sync(
        `${absify(rootPath, config.inputDir)}/**/*.(${inputExtensions.join(
          "|"
        )})`
      ),
  };

  const configURLRoot = config.urlRoot;
  const fileURLRoot = url.pathToFileURL(result.htmlOutputDir).toString();

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
    htmlOutputDir: parentDir,
    fileList: [absPath],
    inputFormats: {
      djot: true,
      gfm: false,
    },
    outputFormats: {
      gfm: false,
      html: true,
    },
  };

  return resolveConfig(parentDir, config);
}
