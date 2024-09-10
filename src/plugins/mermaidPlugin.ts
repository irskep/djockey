import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import {
  DjockeyConfigResolved,
  DjockeyDoc,
  DjockeyPlugin,
  DjockeyPluginNodeReservation,
  DjockeyRenderer,
  DjockeyStaticFileFromPlugin,
} from "../types.js";
import { LogCollector } from "../utils/logUtils.js";
import { djotASTContainsNode } from "../utils/djotUtils.js";

/**
 * This is a stub plugin to preven SyntaxHighlightingPlugin from
 * trying to highlight Mermaid code blocks.
 */
export class MermaidPlugin implements DjockeyPlugin {
  name = "Mermaid";

  getStaticFiles(args: {
    docs: DjockeyDoc[];
    renderer: DjockeyRenderer;
    config: DjockeyConfigResolved;
    logCollector: LogCollector;
  }): DjockeyStaticFileFromPlugin[] {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    return [
      {
        refPath: "static/plugins/mermaid.js",
        contents: fs.readFileSync(
          path.join(__dirname, "static", "mermaid.js"),
          { encoding: "utf8" }
        ),
      },
    ];
  }

  getShouldIncludeStaticFileInDoc(args: {
    doc: DjockeyDoc;
    staticFileRefPath: string;
  }): boolean {
    if (args.staticFileRefPath !== "static/plugins/mermaid.js") return true;
    // Only include mermaid JS file on pages where it's needed (because it's >18 MB)
    switch (args.doc.docs.content.kind) {
      case "djot":
        return djotASTContainsNode(
          args.doc.docs.content.value,
          (node) => node.tag === "code_block" && node.lang === "mermaid"
        );
      case "mdast":
        console.warn(
          "Mermaid static file collection skipping",
          args.doc.refPath
        );
        return false;
    }
  }

  getNodeReservations(
    config: DjockeyConfigResolved
  ): DjockeyPluginNodeReservation[] {
    return [
      { match: (node) => node.tag === "code_block" && node.lang === "mermaid" },
    ];
  }
}
