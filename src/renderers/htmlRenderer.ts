import fs from "fs";
import path from "path";
import url from "url";

import fastGlob from "fast-glob";

import { renderHTML } from "@djot/djot";
import { Environment } from "nunjucks";

import {
  DjockeyConfig,
  DjockeyConfigResolved,
  DjockeyDoc,
  DjockeyOutputFormat,
  DjockeyRenderer,
} from "../types";
import {
  copyFilesMatchingPattern,
  ensureParentDirectoriesExist,
  makePathBackToRoot,
} from "../util";
import { DocSet } from "../engine/docset";

export class HTMLRenderer implements DjockeyRenderer {
  identifier: DjockeyOutputFormat = "html";

  cssFilesFromInput = new Array<string>();
  cssFilesRelative = new Array<string>();
  jsFilesFromInput = new Array<string>();
  jsFilesRelative = new Array<string>();

  constructor(
    public options: { relativeLinks: boolean } = { relativeLinks: false }
  ) {}

  transformLink(args: {
    config: DjockeyConfigResolved;
    sourcePath: string;
    anchorWithoutHash: string | null;
    docOriginalExtension: string;
    docRelativePath: string;
  }) {
    const { anchorWithoutHash, config, docRelativePath, sourcePath } = args;

    const prefix = this.options.relativeLinks
      ? makePathBackToRoot(sourcePath, { sameDirectoryValue: "" })
      : `${config.urlRoot}/`;

    if (anchorWithoutHash) {
      return `${prefix}${docRelativePath}.html#${anchorWithoutHash}`;
    } else {
      return `${prefix}${docRelativePath}.html`;
    }
  }

  handleStaticFiles(
    templateDir: string,
    config: DjockeyConfigResolved,
    docs: DjockeyDoc[]
  ) {
    copyFilesMatchingPattern({
      base: templateDir,
      dest: config.outputDir.html,
      pattern: "static/**/*",
      exclude: [],
    });
    copyFilesMatchingPattern({
      base: config.inputDir,
      dest: config.outputDir.html,
      pattern: "**/*",
      exclude: docs.map((d) => d.absolutePath),
    });

    const templateCSSFiles = fastGlob.sync(`${templateDir}/**/*.css`);
    const inputCSSFiles = fastGlob.sync(`${config.inputDir}/**/*.css`);
    this.cssFilesFromInput = templateCSSFiles
      .concat(inputCSSFiles)
      .map((path_) => url.pathToFileURL(path_).toString());
    this.cssFilesRelative = templateCSSFiles
      .map((path_) => path.relative(templateDir, path_))
      .concat(
        inputCSSFiles.map((path_) => path.relative(config.inputDir, path_))
      );

    const templateJSFiles = fastGlob.sync(`${templateDir}/**/*.js`);
    const inputJSFiles = fastGlob.sync(`${config.inputDir}/**/*.js`);
    this.jsFilesFromInput = templateJSFiles
      .concat(inputJSFiles)
      .map((path_) => url.pathToFileURL(path_).toString());
    this.jsFilesRelative = templateJSFiles
      .map((path_) => path.relative(templateDir, path_))
      .concat(
        inputJSFiles.map((path_) => path.relative(config.inputDir, path_))
      );
  }

  writeDoc(args: {
    config: DjockeyConfig;
    nj: Environment;
    doc: DjockeyDoc;
    context: Record<string, unknown>;
  }) {
    const { config, nj, doc } = args;
    const outputPath = `${config.outputDir.html}/${doc.relativePath}.html`;
    console.log("Rendering", outputPath);
    ensureParentDirectoriesExist(outputPath);

    const baseURL = this.options.relativeLinks
      ? makePathBackToRoot(doc.relativePath, { sameDirectoryValue: "" })
      : `${config.urlRoot}/`;

    const renderedDocs: Record<string, string> = {};
    for (const k of Object.keys(doc.docs)) {
      renderedDocs[k] = renderHTML(doc.docs[k]);
    }

    const outputPage = nj.render("base.njk", {
      doc,
      docs: renderedDocs,
      baseURL,
      cssURLs: config.html.linkCSSToInputInsteadOfOutput
        ? this.cssFilesFromInput
        : this.cssFilesRelative.map((path_) => `${baseURL}${path_}`),
      jsURLs: this.jsFilesRelative.map((path_) => `${baseURL}${path_}`),
      ...args.context,
    });

    fs.writeFileSync(outputPath, outputPage);
  }
}
