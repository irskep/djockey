import path from "path";

import { Link } from "@djot/djot";

import { DjockeyConfigResolved } from "../config";
import { DjockeyDoc } from "../types";
import { applyFilter } from "./djotFiltersPlus";

const SUB_URL_ROOT = "$URL_ROOT$";
const SUB_EXTENSION = "$EXTENSION$";

/**
 * Returns an absolute URL with strings for future replacement
 *
 * TODO: do relative links for some formats (like Markdown)
 *
 * TODO: handle links directly to docs, not just headings
 */
export function makeFullLink(
  pathRelativeToInputDir: string,
  id: string
): string {
  return `${SUB_URL_ROOT}${pathRelativeToInputDir}.${SUB_EXTENSION}#${id}`;
}

export function makeShorthandLinks(relativePath: string, id: string): string[] {
  const filename = path.parse(relativePath).name;
  // This is placeholder logic to represent the idea that a user might refer to an
  // anchor in multiple ways. Just #id works if the id is globally unique, but if
  // it's not, they should be able to add filenames until it's not ambiguous
  // anymore. For example, doc#id should work if there's only one file named 'doc'
  // that contains #id.
  //
  // The advantage of doing this vs just making people use full paths is that
  // PEOPLE MOVE DOCS AROUND. Links are more likely to work if they don't need to
  // be updated after changes.
  return [id, `${filename}#${id}`, `${filename}.$EXTENSION$#${id}`];
}

export function makePathBackToRoot(pathRelativeToInputDir: string): string {
  let numSlashes = 0;
  for (const char of pathRelativeToInputDir) {
    if (char === "/") {
      numSlashes += 1;
    }
    if (char === "#") {
      break;
    }
  }

  if (numSlashes === 0) return "./";

  const result = new Array<string>();
  for (let i = 0; i < numSlashes; i++) {
    result.push("..");
  }
  return result.join("/") + "/";
}

function transformLinkForOutput(args: {
  sourceFilePathRelativeToInputDir: string;
  outputDir: string;
  needsRelativeLinks: boolean;
  original: string;
  extensionReplacement: string;
}): string {
  const urlRootReplacement = args.needsRelativeLinks
    ? makePathBackToRoot(args.sourceFilePathRelativeToInputDir)
    : args.outputDir;

  return args.original
    .replace(SUB_EXTENSION, args.extensionReplacement)
    .replace(SUB_URL_ROOT, urlRootReplacement);
}

export class DocSet {
  private _relativePathToDoc: Record<string, DjockeyDoc> = {};
  private _partialLinkToFullLink: Record<string, string[]> = {};

  constructor(
    public config: DjockeyConfigResolved,
    public docs: DjockeyDoc[]
  ) {}

  public copyDocsWithOutputSpecificChanges(
    extension: string,
    needsRelativeLinks: boolean,
    outputDir: string
  ): DjockeyDoc[] {
    const docsCopy = structuredClone(this.docs);
    for (const doc of docsCopy) {
      applyFilter(doc.djotDoc, () => ({
        "*": (node) => {
          if (!node.destination) return;
          node.destination = transformLinkForOutput({
            sourceFilePathRelativeToInputDir: doc.relativePath,
            outputDir,
            needsRelativeLinks,
            original: node.destination,
            extensionReplacement: extension,
          });
        },
      }));
    }
    return docsCopy;
  }

  public doAllTheComplicatedTransformStuff() {
    for (const doc of this.docs) {
      this.docPassInitial(doc);
    }

    for (const doc of this.docs) {
      this.docPassResolveLinks(doc);
    }
  }

  private docPassInitial(doc: DjockeyDoc) {
    this._relativePathToDoc[doc.relativePath] = doc;

    // Find all the anchors
    // TODO: and headings

    function pushToListIfNotPresent(
      dict: Record<string, string[]>,
      k: string,
      v: string
    ) {
      const value = dict[k] ?? [];
      dict[k] = value;
      if (value.indexOf(v) >= 0) return;
      value.push(v);
    }

    applyFilter(doc.djotDoc, () => ({
      "*": (node) => {
        const attrs = { ...node.autoAttributes, ...node.attributes };
        if (!attrs.id) return;

        for (const shorthandLink of makeShorthandLinks(
          doc.relativePath,
          attrs.id
        )) {
          pushToListIfNotPresent(
            this._partialLinkToFullLink,
            shorthandLink,
            makeFullLink(doc.relativePath, attrs.id)
          );
        }
      },
    }));
  }

  private docPassResolveLinks(doc: DjockeyDoc) {
    applyFilter(doc.djotDoc, () => ({
      link: (node: Link) => {
        // Ignore all links except anchor
        if (!node.destination) return;
        if (!node.destination.startsWith("#")) {
          return;
        }
        const destination = node.destination.slice(1);

        const options = this._partialLinkToFullLink[destination];
        // Abort if link not found in collection
        if (!options.length) return;

        // Return option if only one
        if (options.length === 1) {
          return { ...node, destination: options[0] };
        }

        // If more than one option, pick the one inside the doc itself if possible
        if (options.indexOf(destination) >= 0) {
          return {
            ...node,
            destination: makeFullLink(doc.relativePath, destination),
          };
        }

        // Otherwise, pick the first
        // TODO: warn the user
        console.log("Return an arbitrary option for", destination);
        return { ...node, destination: options[0] };
      },
    }));
  }
}
