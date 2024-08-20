import os from "os";
import { DjockeyDoc } from "../types";
import { DjockeyConfigResolved } from "../config";

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
