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
  outputFormats: DjockeyOutputFormat[],
  logCollectorParent?: LogCollector
) {
  logCollectorParent =
    logCollectorParent ??
    new LogCollector("stub", { silent: true, shouldStart: false });

  const docSet = await readDocSet(config, logCollectorParent);

  await applyPlugins(config, docSet, logCollectorParent);

  const connectSpinner = print.spin("Connecting pages");
  connectSpinner.start();
  docSet.tree = loadDocTree(docSet.docs);
  connectSpinner.succeed();

  await writeDocSet(docSet, outputFormats, logCollectorParent);
}

export async function readDocSet(
  config: DjockeyConfigResolved,
  logCollectorParent: LogCollector
): Promise<DocSet> {
  const logCollector = logCollectorParent.getChild("Parsing documents");

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

  const logCollectorPluginSetup =
    logCollectorParent.getChild("Setting up plugins");
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
  docSet: DocSet,
  logCollectorParent: LogCollector
) {
  for (let i = 0; i < config.num_passes; i++) {
    const logCollector = logCollectorParent.getChild(
      `Transform pass ${i + 1} of ${config.num_passes}`
    );
    await docSet.runPasses(logCollector);
    logCollector.succeed("warning");
  }
}

export async function writeDocSet(
  docSet: DocSet,
  outputFormats: DjockeyOutputFormat[],
  logCollectorParent: LogCollector
) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

  for (const format of new Set(outputFormats)) {
    const templateDir = path.resolve(
      path.join(__dirname, "..", "..", "templates", format)
    );
    const nj = new Environment(new FileSystemLoader(templateDir));
    const renderer = makeRenderer(format);

    const logCollector1 = logCollectorParent.getChild("Copying static files");

    const staticFilesFromPlugins = docSet.plugins
      .filter((plg) => plg.getStaticFiles)
      .flatMap((plg) =>
        plg.getStaticFiles!({
          docs: docSet.docs,
          config: docSet.config,
          logCollector: logCollector1,
          renderer,
        })
      );

    await renderer.handleStaticFiles({
      templateDir,
      config: docSet.config,
      docs: docSet.docs,
      staticFilesFromPlugins,
      logCollector: logCollector1,
    });

    logCollector1.succeed("warning");

    const logCollector2 = logCollectorParent.getChild(`Rendering ${format}`);

    await Promise.all(
      docSet.makeRenderableCopy(renderer, logCollector2).map(async (doc) => {
        populateDocTreeDoc(docSet, doc, renderer, logCollector2);
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
          logCollector: logCollector2,
        });
      })
    );
    logCollector2.succeed("warning");
  }
}
