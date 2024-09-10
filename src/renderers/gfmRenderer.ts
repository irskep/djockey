import { Heading, toPandoc } from "@djot/djot";
import fastGlob from "fast-glob";
import { Environment } from "nunjucks";

import {
  DjockeyConfigResolved,
  DjockeyDoc,
  DjockeyOutputFormat,
  DjockeyRenderer,
  DjockeyStaticFileFromPlugin,
} from "../types.js";
import { runPandocOnAST } from "../pandoc.js";
import { djotASTToText } from "../utils/djotUtils.js";
import { applyFilter } from "../engine/djotFiltersPlus.js";
import {
  makePathBackToRoot,
  copyFilesMatchingPattern,
  ensureParentDirectoriesExist,
  writeFile,
  fsjoin,
  refpath2fspath,
} from "../utils/pathUtils.js";
import { LogCollector } from "../utils/logUtils.js";
import { toMarkdown } from "mdast-util-to-markdown";
import { Root } from "mdast";
import { getFirstHeadingIsAlreadyDocumentTitle } from "../utils/astUtils.js";

export class GFMRenderer implements DjockeyRenderer {
  identifier: DjockeyOutputFormat = "gfm";

  transformLink(args: {
    config: DjockeyConfigResolved;
    sourcePath: string;
    anchorWithoutHash: string | null;
    docOriginalExtension: string;
    docRefPath: string;
    isLinkToStaticFile: boolean;
  }) {
    const { anchorWithoutHash, docRefPath, sourcePath, isLinkToStaticFile } =
      args;
    // All links first use `../` to go back to the root, followed by the
    // full relative path of the destination doc. When rendering Markdown
    // we always use relative paths because you can't assume any given
    // Markdown file is in a predictable place.
    const pathBackToRoot = makePathBackToRoot(sourcePath);

    const ext = isLinkToStaticFile ? "" : ".md";

    if (anchorWithoutHash) {
      return `${pathBackToRoot}${docRefPath}${ext}#${anchorWithoutHash}`;
    } else {
      return `${pathBackToRoot}${docRefPath}${ext}`;
    }
  }

  async handleStaticFiles(args: {
    templateDir: string;
    config: DjockeyConfigResolved;
    docs: DjockeyDoc[];
    staticFilesFromPlugins: DjockeyStaticFileFromPlugin[];
    logCollector: LogCollector;
  }) {
    const { templateDir, config, docs, staticFilesFromPlugins, logCollector } =
      args;
    const ignorePatterns = config.gfm.ignore_static;
    const allStaticFileAbsoluteFSPaths = new Array<string>();
    const p1 = copyFilesMatchingPattern({
      base: templateDir,
      dest: config.output_dir.gfm,
      pattern: "static/**/*",
      excludePaths: [],
      excludePatterns: ignorePatterns,
      results: allStaticFileAbsoluteFSPaths,
      logCollector,
    });
    const p2 = copyFilesMatchingPattern({
      base: config.input_dir,
      dest: config.output_dir.gfm,
      pattern: "**/*",
      excludePaths: docs.map((d) => fastGlob.convertPathToPattern(d.fsPath)),
      excludePatterns: ignorePatterns,
      results: allStaticFileAbsoluteFSPaths,
      logCollector,
    });
    const p3 = Promise.all(
      staticFilesFromPlugins.map((f) => {
        return writeFile(
          fsjoin([config.output_dir.html, refpath2fspath(f.refPath)]),
          f.contents
        );
      })
    );

    await Promise.all([p1, p2, p3]);
  }

  async writeDoc(args: {
    config: DjockeyConfigResolved;
    nj: Environment;
    doc: DjockeyDoc;
  }) {
    const { config, nj, doc } = args;
    const outputFSPath = fsjoin([
      config.output_dir.gfm,
      refpath2fspath(doc.refPath + ".md"),
    ]);
    ensureParentDirectoriesExist(outputFSPath);

    const renderedDocs: Record<string, string> = {};
    const renderOps = Object.keys(doc.docs).map((k) => {
      switch (doc.docs[k].kind) {
        case "djot":
          let outputAST = toPandoc(doc.docs[k].value, {}) as any;
          return runPandocOnAST(outputAST, "gfm").then(
            (result) => (renderedDocs[k] = result)
          );
        case "mdast":
          return toMarkdown(doc.docs[k].value as Root);
      }
    });
    await Promise.all(renderOps);

    const urls: Record<string, string> = {};
    const neighborKeys: ["previous", "next"] = ["previous", "next"];
    for (const k of neighborKeys) {
      if (!doc.neighbors || !doc.neighbors[k]) continue;
      urls[k] = this.transformLink({
        config,
        sourcePath: doc.refPath,
        anchorWithoutHash: null,
        docOriginalExtension: doc.neighbors[k].originalExtension,
        docRefPath: doc.neighbors[k].refPath,
        isLinkToStaticFile: false,
      });
    }

    const outputPage = nj.render("base.njk", {
      doc,
      docs: renderedDocs,
      urls,
      needsTitle: !getFirstHeadingIsAlreadyDocumentTitle(doc),
    });

    await writeFile(outputFSPath, outputPage);
  }
}
