import fs from "fs";
import path from "path";

import { Heading, toPandoc } from "@djot/djot";
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
  djotASTToText,
  ensureParentDirectoriesExist,
  makePathBackToRoot,
} from "../util.js";
import { DocSet } from "../engine/docset.js";
import { applyFilter } from "../engine/djotFiltersPlus.js";

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
    const ignorePatterns = config.gfm.ignore_static;
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
    const outputPath = `${config.output_dir.gfm}/${doc.relativePath}.md`;
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
      needsTitle: !getFirstHeadingIsAlreadyDocumentTitle(doc),
      ...args.context,
    });

    fs.writeFileSync(outputPath, outputPage);
  }
}

function getFirstHeadingIsAlreadyDocumentTitle(doc: DjockeyDoc): boolean {
  let returnValue = false;
  let didFindNode = false;
  applyFilter(doc.docs.content, () => ({
    heading: (node) => {
      const heading = node as Heading;
      if (heading.level > 1 || didFindNode) return;
      didFindNode = true;
      returnValue = djotASTToText([heading]) === doc.title;
    },
  }));
  return didFindNode;
}
