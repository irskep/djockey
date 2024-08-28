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
} from "../types.js";
import { runPandocOnAST } from "../pandoc.js";
import {
  copyFilesMatchingPattern,
  ensureParentDirectoriesExist,
  makePathBackToRoot,
} from "../util.js";
import { DocSet } from "../engine/docset.js";

export class GFMRenderer implements DjockeyRenderer {
  identifier: DjockeyOutputFormat = "gfm";

  transformLink(args: {
    config: DjockeyConfigResolved;
    sourcePath: string;
    anchorWithoutHash: string | null;
    docOriginalExtension: string;
    docRelativePath: string;
    isLinkToStaticFile: boolean;
  }) {
    const {
      anchorWithoutHash,
      docRelativePath,
      sourcePath,
      isLinkToStaticFile,
    } = args;
    // All links first use `../` to go back to the root, followed by the
    // full relative path of the destination doc. When rendering Markdown
    // we always use relative paths because you can't assume any given
    // Markdown file is in a predictable place.
    const pathBackToRoot = makePathBackToRoot(sourcePath);

    const ext = isLinkToStaticFile ? "" : ".md";

    if (anchorWithoutHash) {
      return `${pathBackToRoot}${docRelativePath}${ext}#${anchorWithoutHash}`;
    } else {
      return `${pathBackToRoot}${docRelativePath}${ext}`;
    }
  }

  handleStaticFiles(
    templateDir: string,
    config: DjockeyConfigResolved,
    docs: DjockeyDoc[]
  ) {
    const ignorePatterns = config.static?.ignore ?? [];
    copyFilesMatchingPattern({
      base: templateDir,
      dest: config.output_dir.gfm,
      pattern: "static/**/*",
      excludePaths: [],
      excludePatterns: ignorePatterns,
    });
    copyFilesMatchingPattern({
      base: config.input_dir,
      dest: config.output_dir.gfm,
      pattern: "**/*",
      excludePaths: docs.map((d) => d.absolutePath),
      excludePatterns: ignorePatterns,
    });
  }

  writeDoc(args: {
    config: DjockeyConfig;
    nj: Environment;
    doc: DjockeyDoc;
    context: Record<string, unknown>;
  }) {
    const { config, nj, doc } = args;
    const outputPath = path.normalize(
      `${config.output_dir.gfm}/${doc.relativePath}.md`
    );
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
