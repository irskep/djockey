import fs from "fs";
import path from "path";

import { Environment, FileSystemLoader } from "nunjucks";

import { DocSet } from "./docset";
import { parseDjot } from "../input/parseDjot";
import { LinkRewritingPlugin } from "../plugins/linkRewritingPlugin";
import {
  ALL_OUTPUT_FORMATS,
  DjockeyConfigResolved,
  DjockeyDoc,
  DjockeyPlugin,
  DjockeyPluginModule,
  DjockeyRenderer,
} from "../types";
import { makeRenderer } from "../renderers/makeRenderer";
import { TableOfContentsPlugin } from "../plugins/tableOfContentsPlugin";
import { AutoTitlePlugin } from "../plugins/autoTitlePlugin";
import { loadDocTree } from "./doctree";
import { populateDocTreeDoc } from "./populateDocTreeDoc";

function pluralize(n: number, singular: string, plural: string): string {
  return n === 1 ? `1 ${singular}` : `${n} ${plural}`;
}

export async function executeConfig(config: DjockeyConfigResolved) {
  const docSet = await readDocSet(config);
  console.log(
    `Applying transforms (${pluralize(config.numPasses, "pass", "passes")})`
  );
  for (let i = 0; i < config.numPasses; i++) {
    docSet.runPasses();
  }
  docSet.tree = loadDocTree(docSet.docs);
  writeDocSet(docSet);
}

export async function readDocSet(
  config: DjockeyConfigResolved
): Promise<DocSet> {
  const docs = config.fileList
    .map((path_) => {
      console.log("Parsing", path_);
      const result = parseDjot(config.inputDir, path_);
      return result;
    })
    .filter((doc) => !!doc);

  const pluginPaths = config.plugins;
  const userPlugins = new Array<DjockeyPlugin>();
  for (const pluginPath of pluginPaths) {
    console.log("Loading plugin", pluginPath);
    try {
      const plg = (await import(pluginPath)) as DjockeyPluginModule;
      userPlugins.push(plg.makePlugin());
    } catch {
      console.log(
        `Unable to load plugin ${pluginPath} from node_modules. Trying file path...`
      );
      const pluginPathAbsolute = path.resolve(pluginPath);
      const plg = (await import(pluginPathAbsolute)) as DjockeyPluginModule;
      console.log("...OK!");
      userPlugins.push(plg.makePlugin());
    }
  }

  return new DocSet(
    config,
    [
      new TableOfContentsPlugin(),
      new LinkRewritingPlugin(config),
      new AutoTitlePlugin(),
      ...userPlugins,
    ],
    docs
  );
}

export function writeDocSet(docSet: DocSet) {
  for (const format of ALL_OUTPUT_FORMATS) {
    if (!docSet.config.outputFormats[format]) continue;

    const templateDir = path.resolve(
      path.join(__dirname, "..", "..", "templates", format)
    );
    const nj = new Environment(new FileSystemLoader(templateDir));
    const renderer = makeRenderer(format);

    renderer.handleStaticFiles(templateDir, docSet.config, docSet.docs);

    for (const doc of docSet.makeRenderableCopy(renderer)) {
      populateDocTreeDoc(docSet, doc, renderer);
      renderer.writeDoc({
        config: docSet.config,
        nj,
        doc,
        context: getTemplateContext(doc, docSet, renderer),
      });
    }
  }
}

function getTemplateContext(
  doc: DjockeyDoc,
  docSet: DocSet,
  renderer: DjockeyRenderer
): Record<string, unknown> {
  return {
    previous: getNextOrPreviousLink(
      doc,
      docSet,
      renderer,
      docSet.tree?.prevMap || null
    ),
    next: getNextOrPreviousLink(
      doc,
      docSet,
      renderer,
      docSet.tree?.nextMap || null
    ),
    config: docSet.config,
  };
}

function getNextOrPreviousLink(
  doc: DjockeyDoc,
  docSet: DocSet,
  renderer: DjockeyRenderer,
  map: Record<string, string | null> | null
): { url: string; title: string } | null {
  if (!map) return null;
  const relativePath = map[doc.relativePath];
  if (!relativePath) return null;

  const destDoc = docSet.getDoc(relativePath);
  if (!destDoc) {
    throw Error(`Can't find doc for ${relativePath}???`);
  }

  const url = renderer.transformLink({
    config: docSet.config,
    sourcePath: doc.relativePath,
    anchorWithoutHash: null,
    docOriginalExtension: destDoc.originalExtension,
    docRelativePath: relativePath,
  });

  return { url, title: destDoc.title };
}
