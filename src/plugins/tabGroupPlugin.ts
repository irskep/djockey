import {
  DjockeyConfigResolved,
  DjockeyDoc,
  DjockeyPlugin,
  DjockeyRenderer,
} from "../types.js";
import { applyFilter } from "../engine/djotFiltersPlus.js";
import { addClass, getHasClass } from "../utils/djotUtils.js";
import { Block, Div } from "@djot/djot";
import { LogCollector } from "../utils/logUtils.js";

export class TabGroupPlugin implements DjockeyPlugin {
  name = "Tab Group";

  onPass_read(args: { doc: DjockeyDoc; logCollector: LogCollector }) {
    const { doc } = args;
    let nextID = 0;

    switch (doc.docs.content.kind) {
      case "djot":
        applyFilter(doc.docs.content.value, () => ({
          div: (node) => {
            const div = node as Div;
            if (!getHasClass(node, "tab-group")) return;

            const children = div.children;

            if (!children || children[0].tag !== "heading") {
              console.error("The first thing in a tab-group must be a heading");
              return;
            }

            const tabGroupID = `tabgroup-${nextID}`;

            const childHeadingLevel = children[0].level;
            const newChildren = new Array<Block>();

            let tabIndex = -1;
            let tabID = `${tabGroupID}-tab--1`;
            let nextChildDiv: Div | null = null;

            for (const child of children) {
              if (
                child.tag === "heading" &&
                child.level === childHeadingLevel
              ) {
                tabIndex += 1;
                tabID = `${tabGroupID}-tab-${tabIndex}`;
                const replacedHeading = structuredClone(child);
                addClass(
                  replacedHeading,
                  `dj-tab-heading ${tabGroupID} ${tabID}`
                );
                if (tabIndex === 0) addClass(replacedHeading, "m-active");
                replacedHeading.attributes = {
                  ...replacedHeading.attributes,
                  tabindex: "1",
                  "data-tab-id": tabID,
                  "data-tab-group": tabGroupID,
                  skipTOC: "true",
                };
                newChildren.push(replacedHeading);

                nextChildDiv = {
                  tag: "div",
                  attributes: {
                    class: `dj-tab ${tabGroupID} ${tabID} ${
                      tabIndex === 0 ? "m-active" : ""
                    }`,
                  },
                  children: [],
                };
                newChildren.push(nextChildDiv);
              } else {
                nextChildDiv!.children.push(structuredClone(child));
              }
            }
            const newNode = structuredClone(node);
            newNode.children = newChildren;
            return newNode;
          },
        }));
        break;
      case "mdast":
        args.logCollector.warning(`Tab Groups ignoring ${doc.refPath}`);
        break;
    }
  }

  onPrepareForRender(args: {
    doc: DjockeyDoc;
    renderer: DjockeyRenderer;
    logCollector: LogCollector;
    config: DjockeyConfigResolved;
  }) {
    if (args.renderer.identifier !== "html") return;

    switch (args.doc.docs.content.kind) {
      case "djot":
        applyFilter(args.doc.docs.content.value, () => ({
          div: (node) => {
            const div = node as Div;
            if (!getHasClass(node, "tab-group")) return;
            const headings = div.children.filter(
              (child) => child.tag === "heading"
            );
            const divs = div.children.filter((child) => child.tag === "div");

            return {
              ...node,
              children: [
                {
                  tag: "div",
                  attributes: { class: "dj-tab-group-tabs" },
                  children: headings,
                },
                {
                  tag: "div",
                  attributes: { class: "dj-tab-group-content" },
                  children: divs,
                },
              ],
            };
          },
        }));
        break;
      case "mdast":
        args.logCollector.warning(`Tab group ignoring ${args.doc.refPath}`);
        break;
    }
  }
}
