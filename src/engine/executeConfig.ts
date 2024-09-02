import path, { dirname } from "path";
import { fileURLToPath } from "url";

import { Environment, FileSystemLoader } from "nunjucks";
import { print } from "gluegun";

import { DocSet } from "./docset.js";
import { parseDjot } from "../input/parseDjot.js";
import {
  DjockeyConfigResolved,
  DjockeyOutputFormat,
  DjockeyPlugin,
  DjockeyPluginModule,
} from "../types.js";
import { makeRenderer } from "../renderers/makeRenderer.js";
import { loadDocTree } from "./doctree.js";
import {
  populateDocTreeDoc,
  populateNextOrPreviousLinkDoc,
} from "./populateDocTreeDoc.js";
import { makeBuiltinPlugins } from "./builtinPlugins.js";
import { log, LogCollector } from "../utils/logUtils.js";

export async function executeConfig(
  config: DjockeyConfigResolved,
  outputFormats: DjockeyOutputFormat[]
) {
  const docSet = await readDocSet(config);

  await applyPlugins(config, docSet);

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

  const logCollectorPluginSetup = new LogCollector("Setting up plugins");
  const plugins = [...makeBuiltinPlugins(config), ...userPlugins];
  for (const plugin of plugins) {
    if (plugin.setup) {
      await plugin.setup({ logCollector: logCollectorPluginSetup });
    }
  }
  logCollectorPluginSetup.succeed("warning");

  return new DocSet(config, plugins, docs);
}

export async function applyPlugins(
  config: DjockeyConfigResolved,
  docSet: DocSet
) {
  for (let i = 0; i < config.num_passes; i++) {
    const logCollector = new LogCollector(
      `Transform pass ${i + 1} of ${config.num_passes}`
    );
    await docSet.runPasses(logCollector);
    logCollector.succeed("warning");
  }
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
        populateNextOrPreviousLinkDoc(
          "previous",
          docSet,
          doc,
          docSet.tree?.prevMap || null
        );
        populateNextOrPreviousLinkDoc(
          "next",
          docSet,
          doc,
          docSet.tree?.nextMap || null
        );
        await renderer.writeDoc({
          config: docSet.config,
          nj,
          doc,
          context: {},
          logCollector,
        });
      })
    );
    logCollector.succeed("warning");
  }
}
