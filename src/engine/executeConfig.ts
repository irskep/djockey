import path, { dirname } from "path";
import { fileURLToPath } from "url";

import { Environment, FileSystemLoader } from "nunjucks";

import { DocSet } from "./docset.js";
import { parseDjot } from "../input/parseDjot.js";
import {
  DjockeyConfigResolved,
  DjockeyDoc,
  DjockeyOutputFormat,
  DjockeyPlugin,
  DjockeyPluginModule,
  DjockeyRenderer,
} from "../types.js";
import { makeRenderer } from "../renderers/makeRenderer.js";
import { loadDocTree } from "./doctree.js";
import { populateDocTreeDoc } from "./populateDocTreeDoc.js";
import { makeBuiltinPlugins } from "./builtinPlugins.js";
import { pluralize } from "../utils/djotUtils.js";

export async function executeConfig(
  config: DjockeyConfigResolved,
  outputFormats: DjockeyOutputFormat[]
) {
  const docSet = await readDocSet(config);
  console.log(
    `Applying transforms (${pluralize(config.num_passes, "pass", "passes")})`
  );
  for (let i = 0; i < config.num_passes; i++) {
    await docSet.runPasses();
  }
  docSet.tree = loadDocTree(docSet.docs);
  writeDocSet(docSet, outputFormats);
}

export async function readDocSet(
  config: DjockeyConfigResolved
): Promise<DocSet> {
  const docs = (
    await Promise.all(
      config.fileList.map((path_) => parseDjot(config.input_dir, path_))
    )
  ).filter((doc) => !!doc);

  const pluginPaths = config.plugins;
  const userPlugins = new Array<DjockeyPlugin>();
  for (const pluginPath of pluginPaths) {
    console.log("Loading plugin", pluginPath);
    try {
      const plg = (await import(pluginPath)) as DjockeyPluginModule;
      userPlugins.push(plg.makePlugin(config));
    } catch {
      console.log(
        `Unable to load plugin ${pluginPath} from node_modules. Trying file path...`
      );
      const pluginPathAbsolute = path.resolve(pluginPath);
      const plg = (await import(pluginPathAbsolute)) as DjockeyPluginModule;
      console.log("...OK!");
      userPlugins.push(plg.makePlugin(config));
    }
  }

  const plugins = [...makeBuiltinPlugins(config), ...userPlugins];
  for (const plugin of plugins) {
    if (plugin.setup) {
      await plugin.setup();
    }
  }

  return new DocSet(config, plugins, docs);
}

export function writeDocSet(
  docSet: DocSet,
  outputFormats: DjockeyOutputFormat[]
) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  for (const format of new Set(outputFormats)) {
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
    isLinkToStaticFile: false,
  });

  return { url, title: destDoc.title };
}
