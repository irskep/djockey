import fs from "fs";
import path from "path";

import {
  DjockeyConfigResolved,
  DjockeyDoc,
  DjockeyLinkMappingDoc,
  DjockeyPlugin,
  DjockeyRenderer,
} from "../types.js";
import { applyFilter } from "../engine/djotFiltersPlus.js";
import { pushToListIfNotPresent } from "../utils/collectionUtils.js";
import { LogCollector } from "../utils/logUtils.js";

export class LinkRewritingPlugin implements DjockeyPlugin {
  name = "Link Rewriter";

  private _linkTargets: Record<string, LinkTarget[]> = {};

  private _mappedLinkDestinations: Record<string, string> = {};
  private _defaultLinkLabels: Record<string, string> = {};

  constructor(public config: DjockeyConfigResolved) {}

  async setup(args: { logCollector: LogCollector }) {
    for (const mappingDoc of this.config.link_mappings) {
      const data: DjockeyLinkMappingDoc = JSON.parse(
        fs.readFileSync(mappingDoc.path, "utf8")
      );
      const urlRoot = mappingDoc.url_root.endsWith("/")
        ? mappingDoc.url_root
        : `${mappingDoc.url_root}/`;
      for (const mapping of data.linkMappings) {
        for (const ns of data.namespaces) {
          const dest = `:${ns}:${mapping.linkDestination}`;
          const url = `${urlRoot}/${mapping.relativeURL}`;
          if (
            this._mappedLinkDestinations[dest] &&
            // Silently ignore duplicate entries of the same thing
            this._mappedLinkDestinations[dest] !== url
          ) {
            args.logCollector.warning(`Duplicate mapped link: ${dest}`);
          } else {
            this._mappedLinkDestinations[dest] = url;
            this._defaultLinkLabels[dest] = mapping.defaultLabel;
          }
        }
      }
    }
  }

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

  onPrepareForRender(args: {
    doc: DjockeyDoc;
    renderer: DjockeyRenderer;
    config: DjockeyConfigResolved;
    logCollector: LogCollector;
  }) {
    const { doc, renderer, config, logCollector } = args;
    for (const djotDoc of Object.values(doc.docs)) {
      applyFilter(djotDoc, () => ({
        "*": (node) => {
          if (!node.destination) return;

          const defaultLabel = this._defaultLinkLabels[node.destination];

          const newDestination = this.transformNodeDestination(
            doc.relativePath,
            config.input_dir,
            node.destination,
            {
              config: this.config,
              renderer,
              sourcePath: doc.relativePath,
              logCollector,
            }
          );

          const children = [...(node.children ?? [])];
          if (!children.length && defaultLabel)
            children.push({ tag: "str", text: defaultLabel });

          return { ...node, destination: newDestination, children };
        },
      }));
    }
  }

  private transformNodeDestination(
    sourcePath: string,
    inputRoot: string,
    unresolvedNodeDestination: string,
    renderArgs: Parameters<LinkTarget["renderDestination"]>[0]
  ): string {
    // Don't transform ordinary URLs
    if (isURL(unresolvedNodeDestination)) {
      return unresolvedNodeDestination;
    }

    const nodeDestination = this._mappedLinkDestinations[
      unresolvedNodeDestination
    ]
      ? this._mappedLinkDestinations[unresolvedNodeDestination]
      : resolveRelativePath(sourcePath, unresolvedNodeDestination);

    const values = this._linkTargets[nodeDestination];
    if (!values || !values.length) {
      const prefixlessNodeDestinationWithHash = nodeDestination.startsWith("/")
        ? nodeDestination.slice(1)
        : nodeDestination;

      const prefixlessNodeDestination =
        prefixlessNodeDestinationWithHash.split("#")[0];
      const anchorWithoutHash =
        prefixlessNodeDestination === prefixlessNodeDestinationWithHash
          ? null
          : prefixlessNodeDestinationWithHash.slice(
              prefixlessNodeDestination.length + 1
            );

      const staticFilePath = `${inputRoot}/${prefixlessNodeDestination}`;
      if (fs.existsSync(staticFilePath)) {
        return renderArgs.renderer.transformLink({
          config: renderArgs.config,
          sourcePath: renderArgs.sourcePath,
          anchorWithoutHash,
          docOriginalExtension: path.parse(nodeDestination).ext,
          docRelativePath: prefixlessNodeDestination,
          isLinkToStaticFile: true,
          logCollector: renderArgs.logCollector,
        });
      } else {
        renderArgs.logCollector.warning(
          `Not sure what to do with link ${nodeDestination} in ${renderArgs.sourcePath}`
        );
        renderArgs.logCollector.warning(
          `  Looked for but did not find a static file at ${staticFilePath}`
        );
      }
      return nodeDestination;
    }

    if (values.length > 1) {
      renderArgs.logCollector.warning(
        `Multiple possible destinations for ${nodeDestination} in ${renderArgs.sourcePath}: ${values}`
      );
    }
    return values[0].renderDestination(renderArgs);
  }
}

export function resolveRelativePath(sourcePath: string, path_: string): string {
  if (!path_.startsWith("./") && !path_.startsWith("../")) return path_;
  let pathParts = path_.split("/");
  const sourceParts = sourcePath.split("/");
  sourceParts.pop();

  if (pathParts[0] === ".") {
    pathParts = pathParts.slice(1);
  }

  while (pathParts.length && pathParts[0] === "..") {
    pathParts = pathParts.slice(1);
    sourceParts.pop();
  }
  return "/" + sourceParts.concat(pathParts).join("/");
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
    logCollector: LogCollector;
  }): string {
    return args.renderer.transformLink({
      config: args.config,
      sourcePath: args.sourcePath,
      anchorWithoutHash: this.anchorWithoutHash,
      docOriginalExtension: this.docOriginalExtension,
      docRelativePath: this.docRelativePath,
      isLinkToStaticFile: false,
      logCollector: args.logCollector,
    });
  }
}
