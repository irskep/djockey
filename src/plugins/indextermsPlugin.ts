import { Block } from "@djot/djot";

import { DjockeyDoc, DjockeyPlugin } from "../types.js";
import { applyFilter, processAllNodes } from "../engine/djotFiltersPlus.js";
import { getHasClass } from "../utils/djotUtils.js";
import { pushToList } from "../utils/collectionUtils.js";
import { LogCollector } from "../utils/logUtils.js";

export class IndextermsPlugin implements DjockeyPlugin {
  name = "Indexterms";

  // docRefPath: term: { docRefPath, id }
  indextermsByDoc: Record<
    string,
    Record<string, { docRefPath: string; id: string }[]>
  > = {};

  onPass_read(args: { doc: DjockeyDoc; logCollector: LogCollector }) {
    const { doc } = args;
    // During the read pass, find every node with an indexterm* attribute and
    // store it in indextermsByDoc.

    const result: Record<string, { docRefPath: string; id: string }[]> = {};
    for (const pDoc of Object.values(doc.docs)) {
      let nextID = 0;

      switch (pDoc.kind) {
        case "djot":
          processAllNodes(pDoc.value, (node) => {
            if (!node.attributes) return;
            const newNode = structuredClone(node);
            if (!newNode.attributes) return;
            let didFindIndexterm = false;
            for (const k of Object.keys(node.attributes)) {
              if (k.startsWith("indexterm")) {
                const nodeID = newNode.attributes.id
                  ? newNode.attributes.id
                  : `indexterm-${nextID++}`;
                newNode.attributes.id = nodeID;
                didFindIndexterm = true;
                pushToList(result, node.attributes[k], {
                  docRefPath: doc.refPath,
                  id: nodeID,
                });
              }
            }
            if (didFindIndexterm) {
              return newNode;
            } else {
              return;
            }
          });
          break;
        case "mdast":
          args.logCollector.warning(`Indexterms skipping ${doc.refPath}`);
          break;
      }
    }
    // Reset this dict each time for idempotency in case we have multiple passes
    this.indextermsByDoc[doc.refPath] = result;
  }

  onPass_write(args: { doc: DjockeyDoc; logCollector: LogCollector }) {
    const { doc } = args;
    // During the write pass, look for the .index class on a div and replace it
    // with the actual index.

    for (const pDoc of Object.values(doc.docs)) {
      switch (pDoc.kind) {
        case "djot":
          applyFilter(pDoc.value, () => ({
            div: (node) => {
              if (!node.attributes) return;
              if (getHasClass(node, "index")) {
                return this.buildIndexAST();
              }
            },
          }));
          break;
        case "mdast":
          args.logCollector.warning(`Indexterms skipping ${doc.refPath}`);
          break;
      }
    }
  }

  buildIndexAST(): Block[] {
    const terms: Record<string, { docRefPath: string; id: string }[]> = {};

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
                    destination: `${val.docRefPath}#${val.id}`,
                    children: [
                      { tag: "str", text: getDocLinkText(val.docRefPath) },
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
