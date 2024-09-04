import fs from "fs";
import path from "path";
import url from "url";

import fastGlob, { convertPathToPattern } from "fast-glob";
import yaml from "js-yaml";

import {
  ALL_INPUT_FORMATS,
  DjockeyConfig,
  DjockeyConfigResolved,
  DjockeyInputFormat,
} from "./types.js";
import { getExtensionForInputFormat } from "./input/fileExtensions.js";
import { getIsPandocInstalled } from "./pandoc.js";
import { log } from "./utils/logUtils.js";
import { fsjoin } from "./utils/pathUtils.js";

export function getNeedsPandoc(fmt: DjockeyInputFormat): boolean {
  return fmt !== "djot";
}

export function getConfigDefaults(): DjockeyConfig {
  return {
    input_dir: "docs",
    output_dir: {
      html: "out/html",
      gfm: "out/gfm",
    },
    num_passes: 1,
    site_name: "",

    plugins: [],
    link_mappings: [],

    gfm: {
      ignore_static: ["**/*.css", "**/*.js", "**/*.html"],
    },

    html: {
      ignore_static: [],
      footer_text: "",
    },
  };
}

export function populateConfig(values: Partial<DjockeyConfig>): DjockeyConfig {
  const defaults = getConfigDefaults();
  return {
    ...defaults,
    ...values,
    html: { ...defaults.html, ...(values.html || {}) },
    gfm: { ...defaults.gfm, ...(values.gfm || {}) },
    output_dir: { ...defaults.output_dir, ...(values.output_dir || {}) },
  };
}

export function readConfig(path_: string): DjockeyConfig {
  return populateConfig(
    yaml.load(fs.readFileSync(path_, "utf8")) as Partial<DjockeyConfig>
  );
}

function absify(rootPath: string, path_: string): string {
  if (path.isAbsolute(path_)) return path_;
  return fsjoin([rootPath, path_]);
}

export function resolveConfig(
  rootPath: string,
  config: DjockeyConfig,
  useFileURLRoot: boolean
): DjockeyConfigResolved {
  let inputExtensions: string[] = [];
  const isPandocInstalled = getIsPandocInstalled();
  for (const format of ALL_INPUT_FORMATS) {
    if (getNeedsPandoc(format) && !isPandocInstalled) continue;
    inputExtensions = [
      ...inputExtensions,
      ...getExtensionForInputFormat(format),
    ];
  }

  const resolvedLinkMappings = (config.link_mappings ?? []).map((mapping) => ({
    path: absify(rootPath, mapping.path),
    url_root: mapping.url_root,
  }));

  const result = {
    ...config,
    rootPath,
    link_mappings: resolvedLinkMappings,
    input_dir: absify(rootPath, config.input_dir),
    output_dir: {
      html: absify(rootPath, config.output_dir.html),
      gfm: absify(rootPath, config.output_dir.gfm),
    },
    fileList: fastGlob.sync(
      `${convertPathToPattern(
        absify(rootPath, config.input_dir)
      )}/**/*.(${inputExtensions.join("|")})`
    ),
  };

  const configURLRoot = config.url_root;
  const fileURLRoot = url.pathToFileURL(result.output_dir.html).toString();

  if (useFileURLRoot) {
    return { ...result, url_root: fileURLRoot };
  } else if (!configURLRoot) {
    log.error(
      `urlRoot is mandatory, though you can pass --local to use file URLs for local testing.`
    );
    throw Error();
  }
  return { ...result, url_root: configURLRoot };
}

export function resolveConfigFromDirectory(
  path_: string,
  isLocal: boolean
): DjockeyConfigResolved | null {
  const configPath = fsjoin([path_, "djockey.yaml"]);
  if (fs.existsSync(configPath)) {
    return resolveConfig(path.resolve(path_), readConfig(configPath), isLocal);
  } else {
    return null;
  }
}
