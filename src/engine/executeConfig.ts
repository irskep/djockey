import path, { dirname } from "path";
import { fileURLToPath } from "url";

import { Environment, FileSystemLoader } from "nunjucks";
import { print } from "gluegun";

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
import { log, LogCollector } from "../utils/logUtils.js";

export async function executeConfig(
  config: DjockeyConfigResolved,
  outputFormats: DjockeyOutputFormat[]
) {
  const docSet = await readDocSet(config);
  for (let i = 0; i < config.num_passes; i++) {
    const loader = print.spin(
      `Transform pass ${i + 1} of ${config.num_passes}`
    );
    loader.start();
    await docSet.runPasses();
    loader.succeed();
  }
  const connectSpinner = print.spin("Connecting pages");
  connectSpinner.start();
  docSet.tree = loadDocTree(docSet.docs);
  connectSpinner.succeed();
  await writeDocSet(docSet, outputFormats);
}

export async function readDocSet(
  config: DjockeyConfigResolved
): Promise<DocSet> {
  const logCollector = new LogCollector("Parsing documents");

  const parsePromises = config.fileList.map((path_) =>
    parseDjot(config.input_dir, path_, logCollector)
  );

  const docs = (await Promise.all(parsePromises)).filter((doc) => !!doc);
  logCollector.succeed("warning");

  const pluginPaths = config.plugins;
  const userPlugins = new Array<DjockeyPlugin>();
  for (const pluginPath of pluginPaths) {
    log.info(`Loading plugin ${pluginPath}`);
    try {
      const plg = (await import(pluginPath)) as DjockeyPluginModule;
      userPlugins.push(plg.makePlugin(config));
    } catch {
      const pluginPathAbsolute = path.resolve(pluginPath);
      const plg = (await import(pluginPathAbsolute)) as DjockeyPluginModule;
      userPlugins.push(plg.makePlugin(config));
    }
  }

  const loader = print.spin("Setting up plugins");
  loader.start();
  const plugins = [...makeBuiltinPlugins(config), ...userPlugins];
  for (const plugin of plugins) {
    if (plugin.setup) {
      await plugin.setup();
    }
  }
  loader.succeed();

  return new DocSet(config, plugins, docs);
}

export async function writeDocSet(
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

    await renderer.handleStaticFiles(templateDir, docSet.config, docSet.docs);

    const logCollector = new LogCollector(`Rendering ${format}`);
    await Promise.all(
      docSet.makeRenderableCopy(renderer, logCollector).map(async (doc) => {
        populateDocTreeDoc(docSet, doc, renderer, logCollector);
        await renderer.writeDoc({
          config: docSet.config,
          nj,
          doc,
          context: getTemplateContext(doc, docSet, renderer, logCollector),
          logCollector,
        });
      })
    );
    logCollector.succeed("warning");
  }
}

function getTemplateContext(
  doc: DjockeyDoc,
  docSet: DocSet,
  renderer: DjockeyRenderer,
  logCollector: LogCollector
): Record<string, unknown> {
  return {
    previous: getNextOrPreviousLink(
      doc,
      docSet,
      renderer,
      docSet.tree?.prevMap || null,
      logCollector
    ),
    next: getNextOrPreviousLink(
      doc,
      docSet,
      renderer,
      docSet.tree?.nextMap || null,
      logCollector
    ),
    config: docSet.config,
  };
}

function getNextOrPreviousLink(
  doc: DjockeyDoc,
  docSet: DocSet,
  renderer: DjockeyRenderer,
  map: Record<string, string | null> | null,
  logCollector: LogCollector
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
    logCollector,
  });

  return { url, title: destDoc.title };
}
