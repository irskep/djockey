import { Heading } from "@djot/djot";
import { applyFilter } from "../engine/djotFiltersPlus.js";
import { DjockeyDoc, DjockeyPlugin } from "../types.js";
import { djotASTToText } from "../utils/djotUtils.js";

export class AutoTitlePlugin implements DjockeyPlugin {
  name = "Auto Titler";

  onPass_read(args: { doc: DjockeyDoc }) {
    const { doc } = args;
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
