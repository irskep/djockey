import { DjockeyDoc, DjockeyPlugin } from "../types.js";
import { applyFilter } from "../engine/djotFiltersPlus.js";
import { djotASTToText, getHasClass } from "../utils/djotUtils.js";
import { Block } from "@djot/djot";

// These happen to correspond to Djockey's 'aside' classes, so we're just going
// to replace the 'div' tag with the 'aside' tag and remove the starting paragraph.
const GITHUB_ALERT_CLASSES = ["note", "tip", "important", "warning", "caution"];

export class GFMAlertsPlugin implements DjockeyPlugin {
  name = "GitHub Flavored Markdown Alerts";

  onPass_write(doc: DjockeyDoc) {
    applyFilter(doc.docs.content, () => ({
      div: (node) => {
        for (const cls of GITHUB_ALERT_CLASSES) {
          if (getHasClass(node, cls) && !node.attributes?.tag) {
            const newNode = structuredClone(node);

            const children = newNode.children || ([] as Block[]);
            if (
              !children.length ||
              children[0].tag !== "p" ||
              djotASTToText(children[0]).toLowerCase() !== cls
            )
              if (newNode.children && newNode.children.length)
                newNode.attributes = { ...node.attributes, tag: "aside" };
            newNode.children = newNode.children.slice(1);
            return newNode;
          }
        }
      },
    }));
  }
}
