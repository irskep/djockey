import { BulletList, Doc, Heading, Link, ListItem, Section } from "@djot/djot";
import {
  applyFilter,
  applyFilterToFragment,
} from "../engine/djotFiltersPlus.js";
import { DjockeyDoc, DjockeyPlugin } from "../types.js";
import { makeStubDjotDoc } from "../utils/djotUtils.js";
import { LogCollector } from "../utils/logUtils.js";

export type TOCEntry = {
  id: string;
  node: Heading;
  children: TOCEntry[];
};

function lastOf<T>(arr: T[]): T | null {
  return arr.length ? arr[arr.length - 1] : null;
}

export class TableOfContentsPlugin implements DjockeyPlugin {
  name = "Table of Contents";

  topLevelTOCEntriesByDoc: Record<string, TOCEntry[]> = {};

  onPass_read(args: { doc: DjockeyDoc; logCollector: LogCollector }) {
    const { doc } = args;
    // Always reset this array because this method may be run more than once
    this.topLevelTOCEntriesByDoc[doc.refPath] = new Array<TOCEntry>();

    const tocStack = new Array<TOCEntry>();
    const referenceStack = new Array<string>();

    // IDs are on <section>s if parsed from Djot, or on <heading>s if parsed
    // from Markdown, so look in both places.

    switch (doc.docs.content.kind) {
      case "djot":
        applyFilter(doc.docs.content.value, () => ({
          // IDs live on sections, not headings, so keep a stack of IDs.
          section: {
            enter: (node: Section) => {
              const attrs = { ...node.autoAttributes, ...node.attributes };
              if (attrs.id) {
                referenceStack.push(attrs.id);
              }
            },
            exit: (node: Section) => {
              const attrs = { ...node.autoAttributes, ...node.attributes };
              if (attrs.id) {
                referenceStack.pop();
              }
            },
          },
          heading: (node: Heading) => {
            const attrs = { ...node.autoAttributes, ...node.attributes };

            if (attrs.skipTOC) {
              return;
            }

            const entry: TOCEntry = {
              node,
              id: attrs.id || lastOf(referenceStack)!,
              children: [],
            };

            // Make sure last stack item is the parent of this entry
            while (
              tocStack.length &&
              tocStack[tocStack.length - 1].node.level >= node.level
            ) {
              tocStack.pop();
            }

            // Add this entry as a child of the parent entry
            const lastNode = lastOf(tocStack);
            if (lastNode) {
              lastNode.children.push(entry);
            } else {
              this.topLevelTOCEntriesByDoc[doc.refPath].push(entry);
            }

            // Prepare for next heading to be processed
            tocStack.push(entry);
          },
        }));
        break;
      case "mdast":
        args.logCollector.warning(`Table of contents ignoring ${doc.refPath}`);
        break;
    }
  }

  onPass_write(args: { doc: DjockeyDoc }) {
    const { doc } = args;
    doc.docs.toc = {
      kind: "djot",
      value: {
        tag: "doc",
        references: {},
        autoReferences: {},
        footnotes: {},
        children: [
          renderTOCArray(
            doc.refPath,
            this.topLevelTOCEntriesByDoc[doc.refPath]
          ),
        ],
      },
    };
  }
}

function renderTOCArray(relativePath: string, arr: TOCEntry[]): BulletList {
  function tocEntryToListItem(entry: TOCEntry): ListItem {
    const entryLink: Link = {
      tag: "link",
      children: replaceLinksWithSpans(structuredClone(entry.node.children)),
      destination: `/${relativePath}#${entry.id}`,
    };
    const entryChildren: BulletList[] = entry.children.length
      ? [renderTOCArray(relativePath, entry.children)]
      : [];

    const result: ListItem = {
      tag: "list_item",
      children: [
        {
          tag: "para",
          children: [entryLink],
        },
        ...entryChildren,
      ],
    };
    return result;
  }

  const result: BulletList = {
    style: "-",
    tag: "bullet_list",
    tight: true,
    children: arr.map(tocEntryToListItem),
  };
  return result;
}

function replaceLinksWithSpans(children: Link["children"]): Link["children"] {
  return children.map((child) => {
    if (child.tag === "link") {
      child = { ...child, tag: "span" };
    }
    applyFilterToFragment(child, () => ({
      link: (node) => {
        return { ...structuredClone(node as Link), tag: "span" };
      },
    }));
    return child;
  });
}
