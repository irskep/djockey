import { PolyglotDoc } from "../types.js";

export function getDoesDocHaveContent(doc: PolyglotDoc): boolean {
  switch (doc.kind) {
    case "djot":
      return !!doc.value.children.length;
    case "mdast":
      return !!doc.value.children.length;
  }
}
