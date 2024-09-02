import { DjockeyDoc, DjockeyPlugin } from "../types.js";
import { applyFilter } from "../engine/djotFiltersPlus.js";
import { djotASTToText, getHasClass } from "../utils/djotUtils.js";
import { AstNode, Block } from "@djot/djot";

// These happen to correspond to Djockey's 'aside' classes, so we're just going
// to replace the 'div' tag with the 'aside' tag and remove the starting paragraph.
const GITHUB_ALERT_CLASSES = ["note", "tip", "important", "warning", "caution"];

export class GFMAlertsPlugin implements DjockeyPlugin {
  name = "GitHub Flavored Markdown Alerts";

  onPass_write(args: { doc: DjockeyDoc }) {
    const { doc } = args;
    applyFilter(doc.docs.content, () => ({
      div: (node) => {
        for (const cls of GITHUB_ALERT_CLASSES) {
          if (!getHasClass(node, cls) && !node.attributes?.tag) continue;
          const newNode = structuredClone(node);
          newNode.attributes.tag = "aside";

          if (!node.children) return newNode;

          newNode.children = structuredClone(
            getIsDivWithTitleInside(node.children[0], cls)
              ? node.children.slice(1)
              : node.children
          );
          return newNode;
        }
      },
    }));
  }
}

function getIsDivWithTitleInside(node: AstNode, expectedText: string): boolean {
  console.log("Check", node);
  if (node.tag !== "div") return false;
  console.log(1);
  if (node.children.length !== 1) return false;
  console.log(2);
  if (node.children[0].tag !== "para") return false;
  console.log(3);
  if (node.children[0].children.length !== 1) return false;
  console.log(4);
  if (node.children[0].children[0].tag !== "str") return false;
  console.log(5);
  if (node.children[0].children[0].text.toLowerCase() !== expectedText)
    return false;
  console.log(6);
  return true;
}
