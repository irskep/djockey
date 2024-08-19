import fs from "fs";
import path from "path";
import url from "url";

import fastGlob from "fast-glob";
import { configure, Environment, FileSystemLoader } from "nunjucks";

import { readConfig, type DjockeyConfig } from "./config";
import { parseDjot } from "./djotLogic";
import { DjockeyDoc } from "./types";
import { renderHTML } from "@djot/djot";
import { DocSet } from "./docset";

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
    inputFormats: {
      djot: true,
      gfm: false,
    },
    outputFormats: {
      gfm: false,
      html: true,
    },
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
): DjockeyConfig & { fileList: string[]; urlRoot: string } {
  const inputExtensions: string[] = [];
  if (config.inputFormats.djot) {
    inputExtensions.push("djot");
  }
  if (config.inputFormats.gfm) {
    inputExtensions.push("md");
  }
  const result = {
    ...config,
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

export function processUsingConfig(
  rootPath: string,
  relativeConfig: DjockeyConfig
) {
  const config = resolveConfigPaths(rootPath, relativeConfig);

  console.log("Config:", config);

  fs.mkdirSync(config.htmlOutputDir, { recursive: true });

  const docs = config.fileList
    .map((path_) => parseDjot(config.inputDir, path_))
    .filter((doc) => !!doc);

  const docset = new DocSet(config, docs);
  docset.run();

  const nj = new Environment(
    new FileSystemLoader(path.resolve(path.join(__dirname, "..", "templates")))
  );

  if (config.outputFormats.html) {
    for (const doc of docset.copyDocsWithOutputSpecificChanges("html")) {
      renderDjockeyDocAsHTML(config, nj, doc);
    }
  }
}

export function renderDjockeyDocAsHTML(
  config: DjockeyConfig,
  nj: Environment,
  doc: DjockeyDoc
) {
  const title = doc.frontMatter.title ?? path.parse(doc.relativePath).name;
  const outputPath = `${config.htmlOutputDir}/${doc.relativePath}.html`;
  const outputContentHTML = renderHTML(doc.djotDoc);
  const outputPageHTML = nj.render("html/base.njk", {
    doc,
    title,
    content: outputContentHTML,
  });

  fs.writeFileSync(outputPath, outputPageHTML);
}
