import { AstNode, Div, HasAttributes, HasText, parse } from "@djot/djot";
import {
  DjockeyConfigResolved,
  DjockeyDoc,
  DjockeyPlugin,
  DjockeyPluginNodeReservation,
  PolyglotDoc,
} from "../types.js";
import { applyFilter } from "../engine/djotFiltersPlus.js";
import { getHasClass } from "../utils/djotUtils.js";
import { LogCollector } from "../utils/logUtils.js";

export class DjotDemoPlugin implements DjockeyPlugin {
  name = "Djot Example";

  getNodeReservations(
    config: DjockeyConfigResolved
  ): DjockeyPluginNodeReservation[] {
    return [
      {
        match: (node) =>
          node.tag == "code_block" &&
          getHasClass(node as HasAttributes, "dj-djot-demo"),
      },
    ];
  }

  onPass_read(args: {
    doc: DjockeyDoc;
    logCollector: LogCollector;
    getIsNodeReservedByAnotherPlugin: (node: AstNode) => boolean;
  }) {
    const { doc } = args;
    for (const djotDoc of Object.values(doc.docs)) {
      this.process(djotDoc, args);
    }
  }

  process(
    polyglotDoc: PolyglotDoc,
    args: Parameters<DjotDemoPlugin["onPass_read"]>[0]
  ) {
    switch (polyglotDoc.kind) {
      case "djot":
        applyFilter(polyglotDoc.value, () => ({
          code_block: (node: AstNode & HasAttributes & HasText) => {
            if (args.getIsNodeReservedByAnotherPlugin(node)) return;
            if (!getHasClass(node, "dj-djot-demo")) return;

            const renderedAST = parse(node.text);

            const result: Div = {
              tag: "div",
              attributes: node.attributes,
              pos: structuredClone(node.pos),
              children: [
                {
                  tag: "para",
                  children: [
                    {
                      tag: "str",
                      text: "Input:",
                    },
                  ],
                },
                {
                  tag: "code_block",
                  lang: "djot",
                  text: node.text,
                  attributes: { class: "language-text" },
                  pos: structuredClone(node.pos),
                },
                {
                  tag: "para",
                  children: [
                    {
                      tag: "str",
                      text: "Output:",
                    },
                  ],
                },
                ...renderedAST.children,
              ],
            };
            return result;
          },
        }));
        break;
      case "mdast":
        args.logCollector.warning(`Djot Demo skipping ${args.doc.refPath}`);
        break;
    }
  }
}
