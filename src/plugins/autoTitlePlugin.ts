import { Heading } from "@djot/djot";
import { applyFilter } from "../engine/djotFiltersPlus.js";
import { DjockeyDoc, DjockeyPlugin } from "../types.js";
import { djotASTToText } from "../utils/djotUtils.js";
import { LogCollector } from "../utils/logUtils.js";

export class AutoTitlePlugin implements DjockeyPlugin {
  name = "Auto Titler";

  onPass_read(args: { doc: DjockeyDoc; logCollector: LogCollector }) {
    const { doc } = args;
    if (doc.frontMatter.title) {
      doc.title = doc.frontMatter.title as string;
      doc.titleAST = [{ tag: "str", text: doc.title }];
      return;
    }

    let isFinished = false;

    switch (doc.docs.content.kind) {
      case "djot":
        applyFilter(doc.docs.content.value, () => ({
          heading: (node: Heading) => {
            if (isFinished) return;
            isFinished = true;
            doc.title = djotASTToText([node]);
            doc.titleAST = structuredClone(node.children);
            return { stop: [node] };
          },
        }));
        break;
      case "mdast":
        args.logCollector.warning(`Auto Titler is skipping ${doc.refPath}`);
        break;
    }
  }
}
