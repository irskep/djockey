import fs from "fs";
import path from "path";

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
      : `${config.outputDir.html}/`;

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
      : `${config.outputDir.html}/`;

    const renderedDocs: Record<string, string> = {};
    for (const k of Object.keys(doc.docs)) {
      renderedDocs[k] = renderHTML(doc.docs[k]);
    }
    const outputPage = nj.render("base.njk", {
      doc,
      docs: renderedDocs,
      baseURL,
      ...args.context,
    });

    fs.writeFileSync(outputPath, outputPage);
  }
}
