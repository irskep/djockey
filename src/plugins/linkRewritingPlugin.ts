import { DjockeyDoc, DjockeyOutputFormat } from "../types";
import { DjockeyConfigResolved } from "../config";
import { DjockeyPlugin, DocSet } from "../engine/docset";
import { applyFilter } from "../engine/djotFiltersPlus";

export class LinkRewritingPlugin implements DjockeyPlugin {
  private _linkTargets: Record<string, LinkTarget[]> = {};

  constructor(public config: DjockeyConfigResolved) {}

  onFirstPass(doc: DjockeyDoc) {
    const docLinkTarget = new LinkTarget(doc, null);
    docLinkTarget.aliases.forEach((alias) =>
      pushToListIfNotPresent(this._linkTargets, alias, docLinkTarget)
    );

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

  onPrerender(doc: DjockeyDoc, format: DjockeyOutputFormat) {
    applyFilter(doc.djotDoc, () => ({
      "*": (node) => {
        if (!node.destination) return;
        const newDestination = this.transformNodeDestination(node.destination, {
          config: this.config,
          format: format,
          sourcePath: doc.relativePath,
        });
        node.destination = newDestination;
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

function pushToListIfNotPresent<T>(dict: Record<string, T[]>, k: string, v: T) {
  const value = dict[k] ?? [];
  dict[k] = value;
  if (value.indexOf(v) >= 0) return;
  value.push(v);
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
    return result;
  }

  renderDestination(args: {
    config: DjockeyConfigResolved;
    format: "html" | "gfm";
    sourcePath: string;
  }): string {
    if (!LINK_RENDERERS[args.format]) {
      console.error(`No link renderer for format ${args.format}`);
      return "<error>";
    }
    return LINK_RENDERERS[args.format]({
      config: args.config,
      sourcePath: args.sourcePath,
      anchorWithoutHash: this.anchorWithoutHash,
      docOriginalExtension: this.docOriginalExtension,
      docRelativePath: this.docRelativePath,
    });
  }
}

type LinkRenderer = (args: {
  config: DjockeyConfigResolved;
  sourcePath: string;
  anchorWithoutHash: string | null;
  docOriginalExtension: string;
  docRelativePath: string;
}) => string;

const LINK_RENDERERS: Record<string, LinkRenderer> = {
  html: (args) => {
    const { anchorWithoutHash, config, docRelativePath } = args;
    if (anchorWithoutHash) {
      return `${config.outputDir.html}/${docRelativePath}.html#${anchorWithoutHash}`;
    } else {
      return `${config.outputDir.html}/${docRelativePath}.html`;
    }
  },

  gfm: (args) => {
    const { anchorWithoutHash, docRelativePath, sourcePath } = args;
    // All links first use `../` to go back to the root, followed by the
    // full relative path of the destination doc. When rendering Markdown
    // we always use relative paths because you can't assume any given
    // Markdown file is in a predictable place.
    const pathBackToRoot = makePathBackToRoot(sourcePath);

    if (anchorWithoutHash) {
      return `${pathBackToRoot}${docRelativePath}.md#${anchorWithoutHash}`;
    } else {
      return `${pathBackToRoot}${docRelativePath}.md`;
    }
  },
};

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
