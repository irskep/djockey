import path from "path";

import { Environment, FileSystemLoader } from "nunjucks";

import { DjockeyConfigResolved } from "../config";
import { DocSet } from "./docset";
import { parseDjot } from "../input/djotLogic";
import { renderDjockeyDocAsGFM, renderDjockeyDocAsHTML } from "../output";

export function executeConfig(config: DjockeyConfigResolved) {
  const docSet = readDocSet(config);
  console.log("Applying transforms");
  docSet.doAllTheComplicatedTransformStuff();
  writeDocSet(docSet);
}

export function readDocSet(config: DjockeyConfigResolved): DocSet {
  const docs = config.fileList
    .map((path_) => {
      console.log("Parsing", path_);
      const result = parseDjot(config.inputDir, path_);
      return result;
    })
    .filter((doc) => !!doc);

  return new DocSet(config, docs);
}

export function writeDocSet(docSet: DocSet) {
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

  if (docSet.config.outputFormats.gfm) {
    for (const doc of docSet.copyDocsWithOutputSpecificChanges("gfm")) {
      renderDjockeyDocAsGFM(docSet.config, nj, doc);
    }
  }
}
