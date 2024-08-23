import fs from "fs";
import path from "path";

import { toPandoc } from "@djot/djot";
import { Environment } from "nunjucks";
import {
  DjockeyConfig,
  DjockeyConfigResolved,
  DjockeyDoc,
  DjockeyOutputFormat,
  DjockeyRenderer,
} from "../types";
import { runPandocOnAST } from "../pandoc";
import {
  copyFilesMatchingPattern,
  ensureParentDirectoriesExist,
  makePathBackToRoot,
} from "../util";
import { DocSet } from "../engine/docset";

export class GFMRenderer implements DjockeyRenderer {
  identifier: DjockeyOutputFormat = "gfm";

  transformLink(args: {
    config: DjockeyConfigResolved;
    sourcePath: string;
    anchorWithoutHash: string | null;
    docOriginalExtension: string;
    docRelativePath: string;
  }) {
    const { anchorWithoutHash, docRelativePath, sourcePath } = args;
    // All links first use `../` to go back to the root, followed by the
    // full relative path of the destination doc. When rendering Markdown
    // we always use relative paths because you can't assume any given
    // Markdown file is in a predictable place.
    const pathBackToRoot = makePathBackToRoot(sourcePath);

    if (anchorWithoutHash) {
      return `${pathBackToRoot}${docRelativePath}.md#${anchorWithoutHash}`;
    } else {
      return `${pathBackToRoot}${docRelativePath}.md`;
    }
  }

  handleStaticFiles(
    templateDir: string,
    config: DjockeyConfigResolved,
    docs: DjockeyDoc[]
  ) {
    copyFilesMatchingPattern({
      base: templateDir,
      dest: config.outputDir.gfm,
      pattern: "static/**/*",
      exclude: [],
    });
    copyFilesMatchingPattern({
      base: config.inputDir,
      dest: config.outputDir.gfm,
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
    const outputPath = `${config.outputDir.gfm}/${doc.relativePath}.md`;
    console.log("Rendering", outputPath);
    ensureParentDirectoriesExist(outputPath);

    const renderedDocs: Record<string, string> = {};
    for (const k of Object.keys(doc.docs)) {
      const outputAST = toPandoc(doc.docs[k], {});
      renderedDocs[k] = runPandocOnAST(outputAST, "gfm");
    }

    const outputPage = nj.render("base.njk", {
      doc,
      docs: renderedDocs,
      ...args.context,
    });

    fs.writeFileSync(outputPath, outputPage);
  }
}
