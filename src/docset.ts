import { Link } from "@djot/djot";
import { applyFilter } from "./djotFiltersPlus";
import { DjockeyConfig } from "./config";
import { DjockeyDoc } from "./types";
import path from "path";

/**
 * Returns an absolute URL with the file extension `$EXTENSION$` (for later replacement)
 */
function makeFullLink(
  config: DjockeyConfig,
  relativePath: string,
  id: string
): string {
  return `${config.urlRoot}/${relativePath}.$EXTENSION$#${id}`;
}

function makeShorthandLinks(relativePath: string, id: string): string[] {
  const filename = path.parse(relativePath).name;
  return [`${filename}#${id}`, `${filename}.$EXTENSION$#${id}`];
}

function replaceLinkExtension(original: string, newExtension: string): string {
  return original.replace("$EXTENSION$", newExtension);
}

export class DocSet {
  private _relativePathToDoc: Record<string, DjockeyDoc> = {};
  private _partialLinkToFullLink: Record<string, string[]> = {};

  constructor(public config: DjockeyConfig, public docs: DjockeyDoc[]) {}

  public copyDocsWithOutputSpecificChanges(extension: string): DjockeyDoc[] {
    const docsCopy = structuredClone(this.docs);
    for (const doc of docsCopy) {
      applyFilter(doc.djotDoc, () => ({
        "*": (node) => {
          if (!node.destination) return;
          node.destination = replaceLinkExtension(node.destination, extension);
        },
      }));
    }
    return docsCopy;
  }

  public run() {
    for (const doc of this.docs) {
      this.docPassInitial(doc);
    }

    console.log(this._partialLinkToFullLink);

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

        for (const shorthandLink of [
          attrs.id,
          ...makeShorthandLinks(doc.relativePath, attrs.id),
        ]) {
          pushToListIfNotPresent(
            this._partialLinkToFullLink,
            shorthandLink,
            makeFullLink(this.config, doc.relativePath, attrs.id)
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
            destination: makeFullLink(
              this.config,
              doc.relativePath,
              destination
            ),
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
