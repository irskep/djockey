import {
  AstNode,
  Block,
  Doc,
  HasAttributes,
  HasText,
  isBlock,
} from "@djot/djot";
import mdast from "mdast";
import { visit } from "unist-util-visit";

import { processAllNodes } from "../engine/djotFiltersPlus.js";
import { MystDoc } from "../types.js";

export function getHasClass(node: HasAttributes, cls: string): boolean {
  if (!node.attributes || !node.attributes["class"]) return false;
  const values = new Set(node.attributes["class"].split(" "));
  return values.has(cls);
}

export function addClass(node: HasAttributes, cls: string) {
  const classString = node.attributes?.class || "";
  node.attributes = { ...node.attributes, class: classString + " " + cls };
}

export function getAttribute(node: HasAttributes, k: string): string | null {
  if (!node.attributes || node.attributes[k] === undefined) return null;
  return node.attributes[k];
}

export function getAnyAttribute(
  node: HasAttributes,
  keys: string[]
): [string, string] | null {
  if (!node.attributes) return null;
  for (const k of keys) {
    if (node.attributes[k] !== undefined) return [k, node.attributes[k]];
  }
  return null;
}

export function makeStubDjotDoc(children: Block[]): Doc {
  return {
    tag: "doc",
    references: {},
    autoReferences: {},
    footnotes: {},
    children,
  };
}

export function djotASTToText(children: Block[]) {
  const result = new Array<string>();
  processAllNodes(makeStubDjotDoc(children), (node) => {
    if (!node.text) return;
    result.push(node.text);
  });
  return result.join("");
}

export function mystASTToText(root: mdast.Parent) {
  const result = new Array<string>();
  visit(root, "text", (node) => {
    result.push((node as mdast.Text).value);
  });
  return result.join("");
}

export function djotASTToTextWithLineBreaks(children: Block[]) {
  const result = new Array<string>();

  processAllNodes(makeStubDjotDoc(children), (node) => {
    const text = (node as HasText).text;
    result.push(text ?? "");
    if (isBlock(node)) {
      result.push("\n\n");
    }
  });
  return result.join("").replace(/\n\n+/g, "\n\n");
}

export function djotASTContainsNode(
  doc: Doc,
  predicate: (node: AstNode) => boolean
): boolean {
  let result = false;

  processAllNodes(doc, (node) => {
    result = result || predicate(node);
  });

  return result;
}
