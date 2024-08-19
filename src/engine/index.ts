import fs from "fs";
import path from "path";

import { Environment, FileSystemLoader } from "nunjucks";

import { DjockeyConfigResolved } from "../config";
import { DocSet } from "./docset";
import { parseDjot } from "../input/djotLogic";
import { renderDjockeyDocAsHTML } from "../output";
import { DjockeyDoc } from "../types";

export function readDocSet(config: DjockeyConfigResolved): DocSet {
  const docs = config.fileList
    .map((path_) => parseDjot(config.inputDir, path_))
    .filter((doc) => !!doc);

  return new DocSet(config, docs);
}

export function writeDocs(docSet: DocSet) {
  const nj = new Environment(
    new FileSystemLoader(
      path.resolve(path.join(__dirname, "..", "..", "templates"))
    )
  );

  if (docSet.config.outputFormats.html) {
    for (const doc of docSet.copyDocsWithOutputSpecificChanges("html")) {
      renderDjockeyDocAsHTML(docSet.config, nj, doc);
    }
  }
}

export function executeConfig(config: DjockeyConfigResolved) {
  fs.mkdirSync(config.htmlOutputDir, { recursive: true });

  const docSet = readDocSet(config);

  docSet.doAllTheComplicatedTransformStuff();

  writeDocs(docSet);
}
