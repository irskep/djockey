import { BulletList, Heading, Inline, ListItem } from "@djot/djot";
import { applyFilter } from "../engine/djotFiltersPlus";
import { DjockeyDoc, DjockeyPlugin } from "../types";

export type TOCEntry = {
  id: string;
  node: Heading;
  children: TOCEntry[];
};

function lastOf<T>(arr: T[]): T | null {
  return arr.length ? arr[arr.length - 1] : null;
}

export class TableOfContentsPlugin implements DjockeyPlugin {
  topLevelTOCEntries = new Array<TOCEntry>();

  onPass_read(doc: DjockeyDoc) {
    // Always reset this array because this method may be run more than once
    this.topLevelTOCEntries = new Array<TOCEntry>();

    const tocStack = new Array<TOCEntry>();

    // THIS IS WRONG. Go by heading levels, not div nesting.
    applyFilter(doc.djotDoc, () => ({
      heading: (node: Heading) => {
        const entry: TOCEntry = {
          node,
          id: { ...node.autoAttributes, ...node.attributes }.id!,
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
          this.topLevelTOCEntries.push(entry);
        }

        // Prepare for next heading to be processed
        tocStack.push(entry);
      },
    }));
  }

  onPass_write(doc: DjockeyDoc) {
    doc.data.toc = renderTOCArray(this.topLevelTOCEntries);
  }
}

const renderTOCArray: (arr: TOCEntry[]) => BulletList = (arr) => {
  const tocEntryToListItem = (entry: TOCEntry) => {
    const entryChildren: BulletList[] = entry.children.length
      ? [renderTOCArray(entry.children)]
      : [];
    const result: ListItem = {
      tag: "list_item",
      children: [
        {
          tag: "para",
          children: entry.node.children,
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
