import { AstNode, Heading } from "@djot/djot";
import { applyFilter } from "../engine/djotFiltersPlus.js";
import {
  DjockeyConfigResolved,
  DjockeyDoc,
  DjockeyPlugin,
  DjockeyPluginNodeReservation,
} from "../types.js";
import { djotASTToText } from "../utils/djotUtils.js";

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
