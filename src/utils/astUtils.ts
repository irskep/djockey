import { Block, Heading, Inline } from "@djot/djot";
import { PhrasingContent } from "mdast";
import unist from "unist";
import { visit } from "unist-util-visit";
import { toString } from "mdast-util-to-string";

import { applyFilter } from "../engine/djotFiltersPlus.js";
import { DjockeyDoc, PolyglotDoc, PolyglotDoc_MDAST } from "../types.js";
import { djotASTToText } from "./djotUtils.js";

export type Visitable = Parameters<typeof visit>[0];

export function getDoesDocHaveContent(doc: PolyglotDoc): boolean {
  switch (doc.kind) {
    case "djot":
      return !!doc.value.children.length;
    case "mdast":
      return !!doc.value.children.length;
  }
}

export function getFirstHeadingIsAlreadyDocumentTitle(
  doc: DjockeyDoc
): boolean {
  let returnValue = false;
  let didFindNode = false;
  const polyglotDoc = doc.docs.content;
  switch (polyglotDoc.kind) {
    case "djot":
      applyFilter(polyglotDoc.value, () => ({
        heading: (node) => {
          const heading = node as Heading;
          if (heading.level > 1 || didFindNode) return;
          didFindNode = true;
          returnValue = djotASTToText([heading]) === doc.title;
        },
      }));
    case "mdast":
      visit(
        (polyglotDoc as PolyglotDoc_MDAST).value,
        "Heading",
        function (node, index, parent) {
          console.log(node);
        }
      );
  }
  return didFindNode;
}

export function mystASTToDjotAST_Inline(root: unist.Parent): Inline[] {
  return [{ tag: "str", text: toString(root) }];
}

export function mystASTToDjotAST_Block(root: unist.Parent): Block[] {
  return [{ tag: "para", children: [{ tag: "str", text: toString(root) }] }];
}

export function djotASTToMystAST_Inline(djotRoot: Inline[]): PhrasingContent[] {
  return [
    {
      type: "text",
      value: djotASTToText([{ tag: "para", children: djotRoot }]),
    },
  ];
}

export type MystPosition = {
  start: { line: number; column: number };
  end: { line: number; column: number };
};
export type DjotPosition = {
  start: { line: number; col: number; offset: number };
  end: { line: number; col: number; offset: number };
};
export function mystPositionToDjotPosition(
  position: MystPosition
): DjotPosition {
  return {
    start: {
      line: position.start.line,
      col: position.start.column,
      offset: position.start.column - 1,
    },
    end: {
      line: position.end.line,
      col: position.end.column,
      offset: position.end.column - 1,
    },
  };
}

export function djotPositionToMystPosition(
  position: DjotPosition
): MystPosition {
  return {
    start: {
      line: position.start.line,
      column: position.start.col,
    },
    end: {
      line: position.end.line,
      column: position.end.col,
    },
  };
}
