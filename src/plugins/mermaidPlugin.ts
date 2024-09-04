import {
  DjockeyConfigResolved,
  DjockeyPlugin,
  DjockeyPluginNodeReservation,
} from "../types.js";

/**
 * This is a stub plugin to preven SyntaxHighlightingPlugin from
 * trying to highlight Mermaid code blocks.
 */
export class MermaidPlugin implements DjockeyPlugin {
  name = "Mermaid";

  getNodeReservations(
    config: DjockeyConfigResolved
  ): DjockeyPluginNodeReservation[] {
    return [
      { match: (node) => node.tag === "code_block" && node.lang === "mermaid" },
    ];
  }
}
