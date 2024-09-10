import { Heading } from "@djot/djot";
import { applyFilter } from "../engine/djotFiltersPlus.js";
import { DjockeyDoc, PolyglotDoc, PolyglotDoc_MDAST } from "../types.js";
import { djotASTToText } from "./djotUtils.js";
import { visit } from "unist-util-visit";

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
