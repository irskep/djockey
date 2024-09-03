import {
  DjockeyConfigResolved,
  DjockeyDoc,
  DjockeyPlugin,
  DjockeyRenderer,
  DjockeyStaticFileFromPlugin,
} from "../types.js";
import { djotASTToTextWithLineBreaks } from "../utils/djotUtils.js";
import { LogCollector } from "../utils/logUtils.js";

/**
 * This is a stub plugin to preven SyntaxHighlightingPlugin from
 * trying to highlight Mermaid code blocks.
 */
export class SearchPlugin implements DjockeyPlugin {
  name = "Search";

  getStaticFiles(args: {
    docs: DjockeyDoc[];
    renderer: DjockeyRenderer;
    config: DjockeyConfigResolved;
    logCollector: LogCollector;
  }): DjockeyStaticFileFromPlugin[] {
    if (args.renderer.identifier !== "html") return [];
    const searchIndex = args.docs.map((doc) => ({
      name: doc.title,
      text: djotASTToTextWithLineBreaks(doc.docs.content.children),
      url: args.renderer.transformLink({
        config: args.config,
        sourcePath: "index",
        anchorWithoutHash: null,
        logCollector: args.logCollector,
        docOriginalExtension: doc.originalExtension,
        docRelativePath: doc.relativePath,
        isLinkToStaticFile: false,
      }),
    }));
    return [
      {
        path: "static/js/search-index.js",
        contents: `window.djSearchIndex = ${JSON.stringify(searchIndex)}`,
      },
    ];
  }
}
