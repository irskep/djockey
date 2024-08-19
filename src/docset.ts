import { Link } from "@djot/djot";
import { applyFilter } from "./djotFiltersPlus";
import { DjockeyConfig } from "./config";
import { DjockeyDoc } from "./types";

/**
 * Returns an absolute URL with the file extension `$EXTENSION$` (for later replacement)
 *
 * @param config
 * @param relativePath
 * @param id
 * @returns
 */
function makeFullLink(
  config: DjockeyConfig,
  relativePath: string,
  id: string
): string {
  return `${config.urlRoot}/${relativePath}.$EXTENSION$#${id}`;
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
          console.log(
            "Replace",
            node.destination,
            "with",
            replaceLinkExtension(node.destination, extension)
          );
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

    for (const doc of this.docs) {
      this.docPassResolveLinks(doc);
    }
  }

  private docPassInitial(doc: DjockeyDoc) {
    this._relativePathToDoc[doc.relativePath] = doc;

    // Find all the anchors
    // TODO: and headings

    applyFilter(doc.djotDoc, () => ({
      "*": (node) => {
        const attrs = { ...node.autoAttributes, ...node.attributes };
        if (!attrs.id) return;
        const value = this._partialLinkToFullLink[attrs.id] ?? [];
        value.push(makeFullLink(this.config, doc.relativePath, attrs.id));
        this._partialLinkToFullLink[attrs.id] = value;
      },
    }));
  }

  private docPassResolveLinks(doc: DjockeyDoc) {
    applyFilter(doc.djotDoc, () => ({
      link: (node: Link) => {
        // Ignore all links except anchor
        if (!node.destination) return;
        if (!node.destination.startsWith("#")) {
          console.log("(Not an anchor link)");
          return;
        }
        const destination = node.destination.slice(1);

        const options = this._partialLinkToFullLink[destination];
        console.log("Options:", options);
        // Abort if link not found in collection
        if (!options.length) return;

        // Return option if only one
        if (options.length === 1) {
          console.log("Return the only option");
          return { ...node, destination: options[0] };
        }

        // If more than one option, pick the one inside the doc itself if possible
        console.log("Return doc-local link");
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
        console.log("Return an arbitrary option");
        return { ...node, destination: options[0] };
      },
    }));
  }
}
