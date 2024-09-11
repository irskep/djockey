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

    const searchIndex = args.docs.map((doc) => {
      let text = "";
      switch (doc.docs.content.kind) {
        case "djot":
          text = djotASTToTextWithLineBreaks(doc.docs.content.value.children);
          break;
        case "mdast":
          text = "";
          args.logCollector.warning(`Search ignoring ${doc.refPath}`);
          break;
      }
      return {
        name: doc.title,
        text,
        url: args.renderer.transformLink({
          config: args.config,
          sourcePath: "index",
          anchorWithoutHash: null,
          logCollector: args.logCollector,
          docOriginalExtension: doc.originalExtension,
          docRefPath: doc.refPath,
          isLinkToStaticFile: false,
        }),
      };
    });
    return [
      {
        refPath: "static/js/search-index.js",
        contents: `window.djSearchIndex = ${JSON.stringify(searchIndex)}`,
      },
    ];
  }
}
