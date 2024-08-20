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

export class HTMLOutputPlugin implements DjockeyRenderer {
  identifier: DjockeyOutputFormat = "html";

  transformLink(args: {
    config: DjockeyConfigResolved;
    sourcePath: string;
    anchorWithoutHash: string | null;
    docOriginalExtension: string;
    docRelativePath: string;
  }) {
    const { anchorWithoutHash, config, docRelativePath } = args;
    if (anchorWithoutHash) {
      return `${config.outputDir.html}/${docRelativePath}.html#${anchorWithoutHash}`;
    } else {
      return `${config.outputDir.html}/${docRelativePath}.html`;
    }
  }

  writeDoc(args: {
    config: DjockeyConfig;
    nj: Environment;
    doc: DjockeyDoc;
    title: string;
  }) {
    const { config, nj, doc, title } = args;
    const outputPath = `${config.outputDir.html}/${doc.relativePath}.html`;
    console.log("Rendering", outputPath);
    fs.mkdirSync(path.resolve(path.join(outputPath, "..")), {
      recursive: true,
    });
    const outputContent = renderHTML(doc.djotDoc);
    const outputPage = nj.render("base.njk", {
      doc,
      title,
      content: outputContent,
    });

    fs.writeFileSync(outputPath, outputPage);
  }
}
