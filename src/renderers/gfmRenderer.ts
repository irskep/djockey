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

  writeDoc(args: {
    config: DjockeyConfig;
    nj: Environment;
    doc: DjockeyDoc;
    title: string;
  }) {
    const { config, nj, doc, title } = args;
    const outputPath = `${config.outputDir.gfm}/${doc.relativePath}.md`;
    console.log("Rendering", outputPath);
    fs.mkdirSync(path.resolve(path.join(outputPath, "..")), {
      recursive: true,
    });
    const outputAST = toPandoc(doc.djotDoc, {});
    const outputContent = runPandocOnAST(outputAST, "gfm");
    const outputPage = nj.render("base.njk", {
      doc,
      title,
      content: outputContent,
    });

    fs.writeFileSync(outputPath, outputPage);
  }
}

export function makePathBackToRoot(pathRelativeToInputDir: string): string {
  let numSlashes = 0;
  for (const char of pathRelativeToInputDir) {
    if (char === "/") {
      numSlashes += 1;
    }
    if (char === "#") {
      break;
    }
  }

  if (numSlashes === 0) return "./";

  const result = new Array<string>();
  for (let i = 0; i < numSlashes; i++) {
    result.push("..");
  }
  return result.join("/") + "/";
}