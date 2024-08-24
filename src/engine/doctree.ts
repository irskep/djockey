import path from "path";
import { DjockeyDoc } from "../types";

export type DocTreeSection = {
  title: string;
  relativePath: string;
  selfDoc: DjockeyDoc | null;
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
    title: "",
    relativePath: "",
    selfDoc: null,
    children: [],
    docs: [],
  };
  const sectionsByRelativePath: Record<string, DocTreeSection> = {};

  function ensureDirCreated(relativePath: string): DocTreeSection {
    if (sectionsByRelativePath[relativePath]) {
      return sectionsByRelativePath[relativePath];
    }

    const newSection: DocTreeSection = {
      title: path.parse(relativePath).name,
      relativePath,
      selfDoc: null,
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
    const dirs = getDirs(doc.relativePath);
    for (const dir of dirs) {
      ensureDirCreated(dir);
    }

    const docSection = dirs.length
      ? sectionsByRelativePath[dirs[dirs.length - 1]]
      : root;

    if (path.parse(doc.filename).name === "index") {
      docSection.selfDoc = doc;
      docSection.title = doc.title;
    } else {
      docSection.docs.push(doc);
    }
  }

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

  if (section.selfDoc) {
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

function sortDocsByPathWithFilesBeforeDirectories(
  docs: DjockeyDoc[]
): DjockeyDoc[] {
  return docs.sort((docA, docB) => {
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
