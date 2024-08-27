import { Heading, Str } from "@djot/djot";
import { applyFilter } from "../engine/djotFiltersPlus";
import { DjockeyDoc, DjockeyPlugin } from "../types";
import { djotASTToText } from "../util";

export class AutoTitlePlugin implements DjockeyPlugin {
  name = "Auto Titler";

  onPass_read(doc: DjockeyDoc) {
    if (doc.frontMatter.title) {
      doc.title = doc.frontMatter.title as string;
      doc.titleAST = [{ tag: "str", text: doc.title }];
      return;
    }

    let isFinished = false;

    applyFilter(doc.docs.content, () => ({
      heading: (node: Heading) => {
        if (isFinished) return;
        isFinished = true;
        doc.title = djotASTToText([node]);
        doc.titleAST = structuredClone(node.children);
        return { stop: [node] };
      },
    }));
  }
}
