import { Div, HasAttributes, HasText, parse } from "@djot/djot";
import { DjockeyDoc, DjockeyPlugin } from "../types.js";
import { applyFilter } from "../engine/djotFiltersPlus.js";
import { getHasClass } from "../util.js";

export class DjotDemoPlugin implements DjockeyPlugin {
  name = "Djot Example";

  onPass_write(doc: DjockeyDoc) {
    for (const djotDoc of Object.values(doc.docs)) {
      applyFilter(djotDoc, () => ({
        code_block: (node: HasAttributes & HasText) => {
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
    }
  }
}
