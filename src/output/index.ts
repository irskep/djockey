import fs from "fs";
import path from "path";

import { renderHTML } from "@djot/djot";
import { Environment } from "nunjucks";

import { DjockeyConfig } from "../config";
import { DjockeyDoc } from "../types";

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
