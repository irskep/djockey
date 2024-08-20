import path from "path";

import { Environment, FileSystemLoader } from "nunjucks";

import { DocSet } from "./docset";
import { parseDjot } from "../input/parseDjot";
import { LinkRewritingPlugin } from "../plugins/linkRewritingPlugin";
import { ALL_OUTPUT_FORMATS, DjockeyConfigResolved } from "../types";
import { makeRenderer } from "../output/makeRenderer";

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
  for (const format of ALL_OUTPUT_FORMATS) {
    if (!docSet.config.outputFormats[format]) continue;

    const nj = new Environment(
      new FileSystemLoader(
        path.resolve(path.join(__dirname, "..", "..", "templates", format))
      )
    );

    const renderer = makeRenderer(format);

    for (const doc of docSet.makeRenderableCopy(renderer)) {
      const title: string =
        (doc.frontMatter.title as string | undefined) ??
        path.parse(doc.relativePath).name;
      renderer.writeDoc({
        config: docSet.config,
        nj,
        doc,
        title,
      });
    }
  }
}
