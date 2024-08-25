import { BulletList, Heading, Link, ListItem, Section } from "@djot/djot";
import { applyFilter } from "../engine/djotFiltersPlus";
import { DjockeyDoc, DjockeyPlugin } from "../types";

// TODO: destinations need to include full paths! TOCEntry needs a relativePath argument.
// Should have slash prefix.
export type TOCEntry = {
  id: string;
  node: Heading;
  children: TOCEntry[];
};

function lastOf<T>(arr: T[]): T | null {
  return arr.length ? arr[arr.length - 1] : null;
}

export class TableOfContentsPlugin implements DjockeyPlugin {
  topLevelTOCEntriesByDoc: Record<string, TOCEntry[]> = {};

  onPass_read(doc: DjockeyDoc) {
    // Always reset this array because this method may be run more than once
    this.topLevelTOCEntriesByDoc[doc.relativePath] = new Array<TOCEntry>();

    const tocStack = new Array<TOCEntry>();
    const referenceStack = new Array<string>();

    // IDs are on <section>s if parsed from Djot, or on <heading>s if parsed
    // from Markdown, so look in both places.

    applyFilter(doc.docs.content, () => ({
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
          this.topLevelTOCEntriesByDoc[doc.relativePath].push(entry);
        }

        // Prepare for next heading to be processed
        tocStack.push(entry);
      },
    }));
  }

  onPass_write(doc: DjockeyDoc) {
    doc.docs.toc = {
      tag: "doc",
      references: {},
      autoReferences: {},
      footnotes: {},
      children: [
        renderTOCArray(this.topLevelTOCEntriesByDoc[doc.relativePath]),
      ],
    };
  }
}

const renderTOCArray: (arr: TOCEntry[]) => BulletList = (arr) => {
  const tocEntryToListItem = (entry: TOCEntry) => {
    const entryLink: Link = {
      tag: "link",
      children: structuredClone(entry.node.children),
      destination: `#${entry.id}`,
    };
    const entryChildren: BulletList[] = entry.children.length
      ? [renderTOCArray(entry.children)]
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
  };

  const result: BulletList = {
    style: "-",
    tag: "bullet_list",
    tight: true,
    children: arr.map(tocEntryToListItem),
  };
  return result;
};
