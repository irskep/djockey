import path from "path";
import { DjockeyDoc } from "../types.js";
import { CustomSortValue } from "./customSortValue.js";
import { Inline } from "@djot/djot";
import { djotASTToText } from "../util.js";
import { PATHS_NOT_IN_NORMAL_OUTPUT } from "./specialCases.js";

export type DocTreeSection = {
  title: Inline[];
  relativePath: string;
  selfDoc: DjockeyDoc | null;
  selfDocHasContent: boolean;
  children: DocTreeSection[];
  docs: DjockeyDoc[];
};

export type DocTree = {
  rootSection: DocTreeSection;
  prevMap: Record<string, string | null>;
  nextMap: Record<string, string | null>;
};

export function loadDocTree(docs: DjockeyDoc[]): DocTree {
  sortDocsByPathWithFilesBeforeDirectories(docs);

  const root: DocTreeSection = {
    title: [],
    relativePath: "",
    selfDoc: null,
    selfDocHasContent: false,
    children: [],
    docs: [],
  };
  const sectionsByRelativePath: Record<string, DocTreeSection> = {};

  function ensureDirCreated(relativePath: string): DocTreeSection {
    if (sectionsByRelativePath[relativePath]) {
      return sectionsByRelativePath[relativePath];
    }

    const newSection: DocTreeSection = {
      title: [{ tag: "str", text: path.parse(relativePath).name }],
      relativePath,
      selfDoc: null,
      selfDocHasContent: false,
      children: [],
      docs: [],
    };
    sectionsByRelativePath[relativePath] = newSection;

    const parts = relativePath.split("/");
    if (parts.length > 1) {
      const parent = parts.slice(0, parts.length - 1).join("/");
      const parentSection = sectionsByRelativePath[parent];
      parentSection.children.push(newSection);
    } else {
      root.children.push(newSection);
    }

    return newSection;
  }

  for (const doc of docs) {
    if (PATHS_NOT_IN_NORMAL_OUTPUT.has(doc.relativePath)) continue;

    const dirs = getDirs(doc.relativePath);
    for (const dir of dirs) {
      ensureDirCreated(dir);
    }

    const docSection = dirs.length
      ? sectionsByRelativePath[dirs[dirs.length - 1]]
      : root;

    if (path.parse(doc.filename).name === "index") {
      docSection.selfDoc = doc;
      docSection.title = doc.titleAST;

      docSection.selfDocHasContent = !!doc.docs.content.children.length;
    } else {
      docSection.docs.push(doc);
    }
  }

  recursivelySortSection(root);

  const prevMap: Record<string, string | null> = {};
  const nextMap: Record<string, string | null> = {};
  connectNextAndPrevious(root, prevMap, nextMap);

  const tree: DocTree = {
    rootSection: root,
    prevMap,
    nextMap,
  };

  return tree;
}

export function recursivelySortSection(section: DocTreeSection) {
  type Docish = {
    title: string;
    frontMatter: Record<string, unknown> | undefined;
  };
  function sortDocuments(docA: Docish, docB: Docish): number {
    const valA = new CustomSortValue(docA?.frontMatter ?? {});
    const valB = new CustomSortValue(docB?.frontMatter ?? {});
    const result = valA.compareTo(valB);
    if (valA.isComparable(valB) && result !== 0) {
      return result;
    } else {
      return docA.title.localeCompare(docB.title);
    }
  }

  section.docs.sort(sortDocuments);
  section.children.sort((a, b) => {
    return sortDocuments(
      {
        title: djotASTToText([{ tag: "para", children: a.title }]),
        frontMatter: a.selfDoc?.frontMatter,
      },
      {
        title: djotASTToText([{ tag: "para", children: b.title }]),
        frontMatter: b.selfDoc?.frontMatter,
      }
    );
  });

  for (const child of section.children) {
    recursivelySortSection(child);
  }
}

export function connectNextAndPrevious(
  section: DocTreeSection,
  prevMap: Record<string, string | null>,
  nextMap: Record<string, string | null>,
  lastDoc_: DjockeyDoc | null = null
): DjockeyDoc | null {
  let lastDoc = lastDoc_;

  function processDoc(doc: DjockeyDoc) {
    prevMap[doc.relativePath] = lastDoc?.relativePath || null;
    nextMap[doc.relativePath] = null; // will be overwritten shortly
    if (lastDoc) nextMap[lastDoc.relativePath] = doc.relativePath;
    lastDoc = doc;
  }

  if (section.selfDoc && section.selfDocHasContent) {
    processDoc(section.selfDoc);
  }

  for (const doc of section.docs) {
    processDoc(doc);
  }
  for (const child of section.children) {
    lastDoc = connectNextAndPrevious(child, prevMap, nextMap, lastDoc);
  }
  return lastDoc;
}

/**
 * For a given path, returns a string representing each parent directory,
 * recursively back to the root, from outermost to innermost. For example.
 * `getDirs('a/b/c')` returns `['a', 'a/b']`.
 *
 * @param path_
 * @returns
 */
function getDirs(path_: string): string[] {
  const parts = path_.split("/");
  const result = new Array<string>();
  for (let i = 1; i < parts.length; i++) {
    result.push(parts.slice(0, i).join("/"));
  }
  return result;
}

// This whole function might be useless. Try deleting it.
function sortDocsByPathWithFilesBeforeDirectories(
  docs: DjockeyDoc[]
): DjockeyDoc[] {
  return docs.sort((docA, docB) => {
    const customSortValueA = new CustomSortValue(docA.frontMatter);
    const customSortValueB = new CustomSortValue(docB.frontMatter);

    if (customSortValueA.isComparable(customSortValueB)) {
      const result = customSortValueA.compareTo(customSortValueB);
      if (result !== 0) return result; // otherwise break the tie
    }

    const a = docA.relativePath;
    const b = docB.relativePath;
    const partsA = a.split("/");
    const partsB = b.split("/");

    const aDir = partsA.slice(0, partsA.length - 1).join("/");
    const bDir = partsB.slice(0, partsB.length - 1).join("/");

    if (aDir === bDir) {
      const aName = path.parse(a).name;
      const bName = path.parse(b).name;
      if (aName === "index") return -1;
      if (bName === "index") return 1;
      return aName.localeCompare(bName);
    }

    if (a.startsWith(bDir)) {
      return 1;
    }
    if (b.startsWith(aDir)) {
      return -1;
    }

    return a.localeCompare(b);
  });
}
