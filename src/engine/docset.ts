import { URL } from "url";

import { Link } from "@djot/djot";

import { DjockeyConfigResolved } from "../config";
import { DjockeyDoc } from "../types";
import { applyFilter } from "./djotFiltersPlus";
import { LinkTarget } from "./links";

export class DocSet {
  private _relativePathToDoc: Record<string, DjockeyDoc> = {};
  private _linkTargets: Record<string, LinkTarget[]> = {};

  constructor(
    public config: DjockeyConfigResolved,
    public docs: DjockeyDoc[]
  ) {}

  public copyDocsWithOutputSpecificChanges(
    format: "html" | "gfm"
  ): DjockeyDoc[] {
    const docsCopy = structuredClone(this.docs);
    for (const doc of docsCopy) {
      applyFilter(doc.djotDoc, () => ({
        "*": (node) => {
          if (!node.destination) return;
          const newDestination = this.transformNodeDestination(
            node.destination,
            {
              config: this.config,
              format: format,
              sourcePath: doc.relativePath,
            }
          );
          node.destination = newDestination;
        },
      }));
    }
    return docsCopy;
  }

  public doAllTheComplicatedTransformStuff() {
    for (const doc of this.docs) {
      this.docPassInitial(doc);
    }
  }

  private docPassInitial(doc: DjockeyDoc) {
    this._relativePathToDoc[doc.relativePath] = doc;
    const docLinkTarget = new LinkTarget(doc, null);

    // Find all the anchors
    // TODO: and headings

    function pushToListIfNotPresent<T>(
      dict: Record<string, T[]>,
      k: string,
      v: T
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

        const linkTarget = new LinkTarget(doc, attrs.id);
        linkTarget.aliases.forEach((alias) =>
          pushToListIfNotPresent(this._linkTargets, alias, linkTarget)
        );
      },
    }));
  }

  private transformNodeDestination(
    nodeDestination: string,
    renderArgs: Parameters<LinkTarget["renderDestination"]>[0]
  ): string {
    const values = this._linkTargets[nodeDestination];
    if (!values || !values.length) {
      console.log(
        `Not sure what to do with link ${nodeDestination} in ${renderArgs.sourcePath}`
      );
      return nodeDestination;
    }
    // Don't transform ordinary URLs
    if (isURL(nodeDestination)) {
      return nodeDestination;
    }

    if (values.length > 1) {
      console.warn(
        `Multiple possible destinations for ${nodeDestination} in ${renderArgs.sourcePath}`
      );
    }
    return values[0].renderDestination(renderArgs);
  }
}

function isURL(s: string): boolean {
  try {
    new URL(s);
    return true;
  } catch (err) {
    return false;
  }
}
