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
import { makePathBackToRoot } from "./gfmRenderer";

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

  writeDoc(args: { config: DjockeyConfig; nj: Environment; doc: DjockeyDoc }) {
    const { config, nj, doc } = args;
    const outputPath = `${config.outputDir.html}/${doc.relativePath}.html`;
    console.log("Rendering", outputPath);
    fs.mkdirSync(path.resolve(path.join(outputPath, "..")), {
      recursive: true,
    });
    const renderedDocs: Record<string, string> = {};
    for (const k of Object.keys(doc.docs)) {
      renderedDocs[k] = renderHTML(doc.docs[k]);
    }
    const outputPage = nj.render("base.njk", {
      doc,
      docs: renderedDocs,
    });

    fs.writeFileSync(outputPath, outputPage);
  }
}
