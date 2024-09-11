import { Heading } from "@djot/djot";
import { visit, EXIT } from "unist-util-visit";
import unist from "unist";

import { applyFilter } from "../engine/djotFiltersPlus.js";
import { DjockeyDoc, DjockeyPlugin } from "../types.js";
import { djotASTToText } from "../utils/djotUtils.js";
import { LogCollector } from "../utils/logUtils.js";
import {
  djotASTToMystAST_Inline,
  mystASTToDjotAST_Inline,
  Visitable,
} from "../utils/astUtils.js";
import { toString } from "mdast-util-to-string";

export class AutoTitlePlugin implements DjockeyPlugin {
  name = "Auto Titler";

  onPass_read(args: { doc: DjockeyDoc; logCollector: LogCollector }) {
    const { doc } = args;
    if (doc.frontMatter.title) {
      doc.title = doc.frontMatter.title as string;
      doc.titleASTDjot = [{ tag: "str", text: doc.title }];
      doc.titleASTMyst = djotASTToMystAST_Inline(doc.titleASTDjot);
      return;
    }

    switch (doc.docs.content.kind) {
      case "djot":
        let isFinished = false;
        applyFilter(doc.docs.content.value, () => ({
          heading: (node: Heading) => {
            if (isFinished) return;
            isFinished = true;
            doc.title = djotASTToText([node]);
            doc.titleASTDjot = structuredClone(node.children);
            doc.titleASTMyst = djotASTToMystAST_Inline(node.children);
            return { stop: [node] };
          },
        }));
        break;
      case "mdast":
        visit(doc.docs.content.value as Visitable, "heading", (node) => {
          doc.title = toString(node);
          doc.titleASTDjot = mystASTToDjotAST_Inline(node);
          doc.titleASTMyst = node;
          return EXIT;
        });
        break;
    }
  }
}
