import {
  DjockeyConfigResolved,
  DjockeyDoc,
  DjockeyPlugin,
  DjockeyRenderer,
} from "../types";
import { applyFilter } from "../engine/djotFiltersPlus";

export class LinkRewritingPlugin implements DjockeyPlugin {
  private _linkTargets: Record<string, LinkTarget[]> = {};

  constructor(public config: DjockeyConfigResolved) {}

  onPass_read(doc: DjockeyDoc) {
    const registerLinkTarget = (t: LinkTarget) => {
      t.aliases.forEach((alias) =>
        pushToListIfNotPresent(this._linkTargets, alias, t, (a, b) =>
          a.equals(b)
        )
      );
    };

    registerLinkTarget(new LinkTarget(doc, null));

    for (const djotDoc of Object.values(doc.docs)) {
      applyFilter(djotDoc, () => ({
        "*": (node) => {
          const attrs = { ...node.autoAttributes, ...node.attributes };
          if (!attrs.id) return;

          registerLinkTarget(new LinkTarget(doc, attrs.id));
        },
      }));
    }
  }

  onPrepareForRender(doc: DjockeyDoc, renderer: DjockeyRenderer) {
    for (const djotDoc of Object.values(doc.docs)) {
      applyFilter(djotDoc, () => ({
        "*": (node) => {
          if (!node.destination) return;
          const newDestination = this.transformNodeDestination(
            node.destination,
            {
              config: this.config,
              renderer,
              sourcePath: doc.relativePath,
            }
          );
          node.destination = newDestination;
        },
      }));
    }
  }

  private transformNodeDestination(
    nodeDestination: string,
    renderArgs: Parameters<LinkTarget["renderDestination"]>[0]
  ): string {
    // Don't transform ordinary URLs
    if (isURL(nodeDestination)) {
      return nodeDestination;
    }

    const values = this._linkTargets[nodeDestination];
    if (!values || !values.length) {
      console.log(
        `Not sure what to do with link ${nodeDestination} in ${renderArgs.sourcePath}`
      );
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

function pushToListIfNotPresent<T>(
  dict: Record<string, T[]>,
  k: string,
  v: T,
  checkEquality: (a: T, b: T) => boolean
) {
  const array = dict[k] ?? [];
  dict[k] = array;
  if (array.findIndex((innerValue) => checkEquality(v, innerValue)) >= 0)
    return;
  array.push(v);
}

function isURL(s: string): boolean {
  try {
    new URL(s);
    return true;
  } catch (err) {
    return false;
  }
}

export class LinkTarget {
  public docOriginalExtension: string;
  public docRelativePath: string;

  constructor(doc: DjockeyDoc, public anchorWithoutHash: string | null) {
    this.docOriginalExtension = doc.originalExtension;
    this.docRelativePath = doc.relativePath;
  }

  equals(other: LinkTarget) {
    return (
      this.docOriginalExtension === other.docOriginalExtension &&
      this.docRelativePath == other.docRelativePath &&
      this.anchorWithoutHash == other.anchorWithoutHash
    );
  }

  toString(): string {
    const hash = this.anchorWithoutHash ? `#${this.anchorWithoutHash}` : "";
    const aliases = this.aliases.join("\n  ");
    return `LinkTarget(${this.docRelativePath}${this.docOriginalExtension}${hash}) [\n  ${aliases}\n]`;
  }

  /**
   * List all ways you can refer to this anchor as an absolute path (i.e. relative
   * to the root directory of the inputs).
   */
  get aliases(): string[] {
    const hash = this.anchorWithoutHash ? `#${this.anchorWithoutHash}` : "";
    const result: string[] = this.anchorWithoutHash ? [hash] : [];
    const pathParts = this.docRelativePath.split("/");
    for (let i = pathParts.length - 1; i >= 0; i--) {
      result.push(`${pathParts.slice(i).join("/")}${hash}`);
      result.push(
        `${pathParts.slice(i).join("/")}${this.docOriginalExtension}${hash}`
      );
    }
    // This is the 100% totally unambiguous link
    result.push(`/${this.docRelativePath}${hash}`);
    result.push(`/${this.docRelativePath}${this.docOriginalExtension}${hash}`);
    return result;
  }

  renderDestination(args: {
    config: DjockeyConfigResolved;
    renderer: DjockeyRenderer;
    sourcePath: string;
  }): string {
    return args.renderer.transformLink({
      config: args.config,
      sourcePath: args.sourcePath,
      anchorWithoutHash: this.anchorWithoutHash,
      docOriginalExtension: this.docOriginalExtension,
      docRelativePath: this.docRelativePath,
    });
  }
}
