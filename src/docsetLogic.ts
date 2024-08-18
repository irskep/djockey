import fs from "fs";
import fastGlob from "fast-glob";
import path from "path";
import { readConfig, type DjockeyConfig } from "./config";

export function processDirectory(path_: string) {
  const configPath = `${path_}/djockey.yaml`;
  if (fs.existsSync(configPath)) {
    processUsingConfig(path_, readConfig(configPath));
  } else {
    console.error("No config found in " + path_);
  }
}

export function processSingleFile(path_: string) {
  const absPath = path.resolve(path_);
  const parentDir = path.resolve(`${path_}/..`);
  const config: DjockeyConfig = {
    inputDir: parentDir,
    htmlOutputDir: parentDir,
    fileList: [absPath],
  };

  processUsingConfig(parentDir, config);
}

function absify(rootPath: string, path_: string): string {
  if (path.isAbsolute(path_)) return path_;
  return `${rootPath}/${path_}`;
}

export function resolveConfigPaths(
  rootPath: string,
  config: DjockeyConfig
): DjockeyConfig {
  return {
    ...config,
    inputDir: absify(rootPath, config.inputDir),
    htmlOutputDir: absify(rootPath, config.htmlOutputDir),
    fileList:
      config.fileList ||
      fastGlob.sync(`${absify(rootPath, config.inputDir)}/**/*.djot`),
  };
}

export function processUsingConfig(
  rootPath: string,
  relativeConfig: DjockeyConfig
) {
  const config = resolveConfigPaths(rootPath, relativeConfig);
  console.log("dbg", config);
}
