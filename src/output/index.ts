import fs from "fs";
import path from "path";

import { renderHTML, toPandoc } from "@djot/djot";
import { Environment } from "nunjucks";

import { DjockeyConfig } from "../config";
import { DjockeyDoc } from "../types";
import { runPandocOnAST } from "../pandoc";

export function renderDjockeyDocAsHTML(
  config: DjockeyConfig,
  nj: Environment,
  doc: DjockeyDoc
) {
  const outputPath = `${config.outputDir.html}/${doc.relativePath}.html`;
  console.log("Rendering", outputPath);
  fs.mkdirSync(path.resolve(path.join(outputPath, "..")), {
    recursive: true,
  });
  const title = doc.frontMatter.title ?? path.parse(doc.relativePath).name;
  const outputContent = renderHTML(doc.djotDoc);
  const outputPage = nj.render("html/base.njk", {
    doc,
    title,
    content: outputContent,
  });

  fs.writeFileSync(outputPath, outputPage);
}

export function renderDjockeyDocAsGFM(
  config: DjockeyConfig,
  nj: Environment,
  doc: DjockeyDoc
) {
  const outputPath = `${config.outputDir.gfm}/${doc.relativePath}.md`;
  console.log("Rendering", outputPath);
  fs.mkdirSync(path.resolve(path.join(outputPath, "..")), {
    recursive: true,
  });
  const title = doc.frontMatter.title ?? path.parse(doc.relativePath).name;
  const outputAST = toPandoc(doc.djotDoc, {});
  const outputContent = runPandocOnAST(outputAST, "gfm");
  const outputPage = nj.render("gfm/base.njk", {
    doc,
    title,
    content: outputContent,
  });

  fs.writeFileSync(outputPath, outputPage);
}
