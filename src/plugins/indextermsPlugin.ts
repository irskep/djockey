import { Block } from "@djot/djot";

import { DjockeyDoc, DjockeyPlugin } from "../types.js";
import { applyFilter } from "../engine/djotFiltersPlus.js";
import { getHasClass } from "../utils/djotUtils.js";
import { pushToList } from "../utils/collectionUtils.js";

export class IndextermsPlugin implements DjockeyPlugin {
  name = "Indexterms";

  // docRelativePath: term: { docRelativePath, id }
  indextermsByDoc: Record<
    string,
    Record<string, { docRelativePath: string; id: string }[]>
  > = {};

  onPass_read(doc: DjockeyDoc) {
    // During the read pass, find every node with an indexterm* attribute and
    // store it in indextermsByDoc.

    const result: Record<string, { docRelativePath: string; id: string }[]> =
      {};
    for (const djotDoc of Object.values(doc.docs)) {
      let nextID = 0;
      applyFilter(djotDoc, () => ({
        "*": (node) => {
          if (!node.attributes) return;
          const newNode = structuredClone(node);
          if (!newNode.attributes) return;
          let didFindIndexterm = false;
          for (const k of Object.keys(node.attributes)) {
            if (k.startsWith("indexterm")) {
              const nodeID = node.attributes.id
                ? node.attributes.id
                : `indexterm-${nextID++}`;
              newNode.attributes.id = nodeID;
              didFindIndexterm = true;
              pushToList(result, node.attributes[k], {
                docRelativePath: doc.relativePath,
                id: nodeID,
              });
            }
          }
          if (didFindIndexterm) {
            return newNode;
          } else {
            return;
          }
        },
      }));
    }
    // Reset this dict each time for idempotency in case we have multiple passes
    this.indextermsByDoc[doc.relativePath] = result;
  }

  onPass_write(doc: DjockeyDoc) {
    // During the write pass, look for the .index class on a div and replace it
    // with the actual index.

    for (const djotDoc of Object.values(doc.docs)) {
      applyFilter(djotDoc, () => ({
        div: (node) => {
          if (!node.attributes) return;
          if (getHasClass(node, "index")) {
            return this.buildIndexAST();
          }
        },
      }));
    }
  }

  buildIndexAST(): Block[] {
    const terms: Record<string, { docRelativePath: string; id: string }[]> = {};

    for (const dict of Object.values(this.indextermsByDoc)) {
      for (const k of Object.keys(dict)) {
        terms[k] = (terms[k] || []).concat(dict[k]);
      }
    }

    const allTerms = Object.keys(terms).sort();

    const result = new Array<Block>();
    for (const term of allTerms) {
      result.push({
        tag: "heading",
        level: 2,
        children: [{ tag: "str", text: term }],
      });

      const docNums: Record<string, number> = {};
      function getDocLinkText(relativePath: string): string {
        docNums[relativePath] = (docNums[relativePath] || 0) + 1;
        if (docNums[relativePath] === 1) {
          return relativePath;
        } else {
          return `${relativePath} (${docNums[relativePath]})`;
        }
      }

      result.push({
        tag: "bullet_list",
        tight: true,
        style: "*",
        children: terms[term].map((val) => {
          return {
            tag: "list_item",
            children: [
              {
                tag: "para",
                children: [
                  {
                    tag: "link",
                    destination: `${val.docRelativePath}#${val.id}`,
                    children: [
                      { tag: "str", text: getDocLinkText(val.docRelativePath) },
                    ],
                  },
                ],
              },
            ],
          };
        }),
      });
    }

    return result;
  }
}
