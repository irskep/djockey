import path from "path";

import { Environment, FileSystemLoader } from "nunjucks";

import { DjockeyConfigResolved } from "../config";
import { DocSet } from "./docset";
import { parseDjot } from "../input/parseDjot";
import { renderDjockeyDocAsGFM, renderDjockeyDocAsHTML } from "../output";
import { LinkRewritingPlugin } from "../plugins/linkRewritingPlugin";

function pluralize(n: number, singular: string, plural: string): string {
  return n === 1 ? `1 ${singular}` : `${n} ${plural}`;
}

export function executeConfig(config: DjockeyConfigResolved) {
  const docSet = readDocSet(config);
  console.log(
    `Applying transforms (${pluralize(config.numPasses, "pass", "passes")})`
  );
  for (let i = 0; i < config.numPasses; i++) {
    docSet.runPasses();
  }
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

  return new DocSet(config, [new LinkRewritingPlugin(config)], docs);
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
