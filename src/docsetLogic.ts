import fs from "fs";
import path from "path";

import fastGlob from "fast-glob";
import { Environment, FileSystemLoader } from "nunjucks";

import { readConfig, type DjockeyConfig } from "./config";
import { parseDjot } from "./djotLogic";
import { DjockeyDoc } from "./types";
import { renderHTML } from "@djot/djot";

export function processDirectory(path_: string) {
  const configPath = `${path_}/djockey.yaml`;
  if (fs.existsSync(configPath)) {
    processUsingConfig(path.resolve(path_), readConfig(configPath));
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
): DjockeyConfig & { fileList: string[] } {
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

  fs.mkdirSync(config.htmlOutputDir, { recursive: true });

  const docs = config.fileList.map((path_) =>
    parseDjot(config.inputDir, path_)
  );

  const templateDir = path.resolve(path.join(__dirname, "..", "templates"));
  const nj = new Environment(
    new FileSystemLoader(path.resolve(path.join(__dirname, "..", "templates")))
  );

  for (const doc of docs) {
    renderDjockeyDocAsHTML(config, nj, doc);
  }
}

export function renderDjockeyDocAsHTML(
  config: DjockeyConfig,
  nj: Environment,
  doc: DjockeyDoc
) {
  const filename = path.parse(doc.relativePath).name;
  const title = doc.frontMatter.title ?? filename;
  const outputPath = `${config.htmlOutputDir}/${filename}.html`;
  const outputContentHTML = renderHTML(doc.djotDoc);
  const outputPageHTML = nj.render("base.njk", {
    doc,
    title,
    content: outputContentHTML,
  });

  fs.writeFileSync(outputPath, outputPageHTML);
}
