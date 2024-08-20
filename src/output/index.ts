import fs from "fs";
import path from "path";

import { renderHTML, toPandoc } from "@djot/djot";
import { Environment } from "nunjucks";

import {
  DjockeyConfig,
  DjockeyDoc,
  DjockeyOutputFormat,
  DjockeyRenderer,
} from "../types";
import { runPandocOnAST } from "../pandoc";

const htmlRenderer: DjockeyRenderer = (args: {
  config: DjockeyConfig;
  nj: Environment;
  doc: DjockeyDoc;
  title: string;
}) => {
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
};

const gfmRenderer: DjockeyRenderer = (args: {
  config: DjockeyConfig;
  nj: Environment;
  doc: DjockeyDoc;
  title: string;
}) => {
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
};

// Keep the next two constants in sync
export const RENDERERS: Record<DjockeyOutputFormat, DjockeyRenderer> = {
  html: htmlRenderer,
  gfm: gfmRenderer,
};
