import path from "path";
import { DjockeyDoc } from "../types";

function getDirs(path_: string): string[] {
  const parts = path_.split("/");
  const result = new Array<string>();
  for (let i = 1; i < parts.length; i++) {
    result.push(parts.slice(0, i).join("/"));
  }
  return result;
}

export type DocTreeSection = {
  absolutePath: string;
  relativePath: string;
  children: DocTreeSection[];
  docs: DjockeyDoc[];
};

export function loadDocTree(docs: DjockeyDoc[]): DocTreeSection[] {
  sortDocsByPathWithFilesBeforeDirectories(docs);

  const result = new Array<DocTreeSection>();
  const sections: Record<string, DocTreeSection> = {};

  let lastPathParts = new Array<string>();

  function ensureDirCreated(relativePath: string) {
    console.log("Visit", relativePath);
  }

  for (const doc of docs) {
    const dirs = getDirs(doc.relativePath);
    for (const dir of dirs) {
      ensureDirCreated(dir);
    }
  }

  return result;
}

function getCommonPrefix(a: string[], b: string[]) {
  let lastCommonIndex = -1;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] !== b[i]) break;
    lastCommonIndex = i;
  }
  if (lastCommonIndex < 0) return [];
  return a.slice(0, lastCommonIndex + 1);
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
