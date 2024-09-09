import fs from "fs";
import path from "path";

import {
  DjockeyConfigResolved,
  DjockeyDoc,
  DjockeyLinkMappingDoc,
  DjockeyPlugin,
  DjockeyRenderer,
} from "../types.js";
import { applyFilter, processAllNodes } from "../engine/djotFiltersPlus.js";
import { pushToListIfNotPresent } from "../utils/collectionUtils.js";
import { LogCollector } from "../utils/logUtils.js";
import { fsjoin, CANONICAL_SEPARATOR, refsplit } from "../utils/pathUtils.js";

export class LinkRewritingPlugin implements DjockeyPlugin {
  name = "Link Rewriter";

  private _linkTargets: Record<string, MappableLinkTarget[]> = {};

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
          const url = `/${urlRoot}${mapping.relativeURL}`;
          if (
            this._mappedLinkDestinations[dest] &&
            // Silently ignore duplicate entries of the same thing
            this._mappedLinkDestinations[dest] !== url
          ) {
            args.logCollector.info(`Duplicate mapped link: ${dest}`);
          } else {
            this._mappedLinkDestinations[dest] = url;
            this._defaultLinkLabels[dest] = mapping.defaultLabel;
          }
        }
      }
    }
  }

  onPass_read(args: { doc: DjockeyDoc }) {
    const { doc } = args;
    const registerLinkTarget = (t: MappableLinkTarget) => {
      t.aliases.forEach((alias) =>
        pushToListIfNotPresent(this._linkTargets, alias, t, (a, b) =>
          a.equals(b)
        )
      );
    };

    registerLinkTarget(new MappableLinkTarget(doc, null));

    for (const djotDoc of Object.values(doc.docs)) {
      processAllNodes(djotDoc, (node) => {
        const attrs = { ...node.autoAttributes, ...node.attributes };
        if (!attrs.id) return;

        registerLinkTarget(new MappableLinkTarget(doc, attrs.id));
      });
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
      processAllNodes(djotDoc, (node) => {
        if (!node.destination) return;

        const defaultLabel = this._defaultLinkLabels[node.destination];

        const newDestination = this.transformNodeDestination({
          sourcePath: doc.refPath,
          inputRoot: config.input_dir,
          unresolvedNodeDestination: node.destination,
          renderArgs: {
            config: this.config,
            renderer,
            sourcePath: doc.refPath,
            logCollector,
          },
        });

        const children = [...(node.children ?? [])];
        if (!children.length && defaultLabel)
          children.push({ tag: "str", text: defaultLabel });

        return { ...node, destination: newDestination, children };
      });
    }
  }

  private transformNodeDestination(args: {
    sourcePath: string;
    inputRoot: string;
    unresolvedNodeDestination: string;
    renderArgs: Parameters<MappableLinkTarget["renderDestination"]>[0];
  }): string {
    const { sourcePath, inputRoot, unresolvedNodeDestination, renderArgs } =
      args;

    const parsedLink = parseLink(unresolvedNodeDestination);

    switch (parsedLink.kind) {
      case "url":
        return parsedLink.original;
      case "direct":
        const maybeDirectLink = resolveDirectLink(
          parsedLink,
          sourcePath,
          inputRoot,
          this._linkTargets,
          renderArgs
        );
        if (maybeDirectLink) {
          return maybeDirectLink;
        } else {
          renderArgs.logCollector.warning(
            `Unable to resolve direct link ${unresolvedNodeDestination} in ${renderArgs.sourcePath}`
          );
          return unresolvedNodeDestination;
        }
      case "unknown":
        const maybeMappedLinkDestination =
          this._mappedLinkDestinations[parsedLink.path];
        const maybeLinkTargets =
          this._linkTargets[maybeAddHash(parsedLink.path, parsedLink.hash)];

        const maybeDirectLink2 = resolveDirectLink(
          {
            kind: "direct",
            path: `./${parsedLink.path}`,
            hash: parsedLink.hash,
            original: `./${parsedLink.original}`,
          },
          sourcePath,
          inputRoot,
          this._linkTargets,
          renderArgs
        );

        if (maybeDirectLink2) {
          return maybeDirectLink2;
        } else if (maybeMappedLinkDestination) {
          // Easy case: a link map contains this string.
          // Interpret it as a static file.
          const parsedMappedLink = parseLink(maybeMappedLinkDestination);
          if (parsedMappedLink.kind !== "direct") {
            renderArgs.logCollector.warning(
              "Mapped links should only point to static files"
            );
            return unresolvedNodeDestination;
          }
          const resolvedMappedLink = resolveDirectLink(
            parsedMappedLink,
            sourcePath,
            inputRoot,
            this._linkTargets,
            renderArgs
          );
          if (!resolvedMappedLink) {
            renderArgs.logCollector.warning(
              `Couldn't find a static file mapped to ${unresolvedNodeDestination} on ${sourcePath}`
            );
            return unresolvedNodeDestination;
          }
          return resolvedMappedLink;
        } else if (maybeLinkTargets && maybeLinkTargets.length) {
          if (maybeLinkTargets.length > 1) {
            renderArgs.logCollector.warning(
              `Multiple possible destinations for ${parsedLink.original} in ${renderArgs.sourcePath}: ${maybeLinkTargets}`
            );
          }
          return maybeLinkTargets[0].renderDestination(renderArgs);
        } else {
          renderArgs.logCollector.warning(
            `Not sure what to do with link ${unresolvedNodeDestination} in ${renderArgs.sourcePath}`
          );
          return unresolvedNodeDestination;
        }
    }
  }
}

export function maybeAddHash(path_: string, hash: string | null): string {
  if (hash) {
    return `${path_}#${hash}`;
  } else {
    return path_;
  }
}

export function resolveDirectLink(
  link: DirectLink,
  sourceRefPath: string,
  inputRoot: string,
  linkTargets: Record<string, MappableLinkTarget[]>,
  renderArgs: Parameters<MappableLinkTarget["renderDestination"]>[0]
): string | null {
  const resolvedRelativePath = resolveRelativeRefPath(sourceRefPath, link.path);
  for (const k of [
    maybeAddHash(resolvedRelativePath, link.hash),
    resolvedRelativePath,
  ]) {
    const maybeLinkTargets = linkTargets[k];
    if (maybeLinkTargets) {
      return maybeLinkTargets[0].renderDestination(renderArgs);
    }
  }

  // Look for a static file
  const staticFileRefPath = resolvedRelativePath.slice(1);
  const staticFilePathParts = refsplit(staticFileRefPath);
  const staticFileFSPath = fsjoin([inputRoot, ...staticFilePathParts]);
  renderArgs.logCollector.info(
    `Looking for a static file at ${staticFileFSPath} based on ${link.original}`
  );
  if (
    fs.existsSync(staticFileFSPath) &&
    !fs.statSync(staticFileFSPath).isDirectory()
  ) {
    return renderArgs.renderer.transformLink({
      config: renderArgs.config,
      sourcePath: renderArgs.sourcePath,
      anchorWithoutHash: link.hash,
      docOriginalExtension: path.parse(link.original).ext,
      // We can use the destination as-is without modification
      docRefPath: staticFileRefPath,
      isLinkToStaticFile: true,
      logCollector: renderArgs.logCollector,
    });
  } else {
    return null;
  }
}

export function resolveRelativeRefPath(
  sourcePath: string,
  path_: string
): string {
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
  return (
    CANONICAL_SEPARATOR +
    sourceParts.concat(pathParts).join(CANONICAL_SEPARATOR)
  );
}

function isURL(s: string): boolean {
  try {
    new URL(s);
    return true;
  } catch (err) {
    return false;
  }
}

interface URLLink {
  kind: "url";
  original: string;
}

interface DirectLink {
  kind: "direct";
  original: string;
  path: string;
  hash: string | null;
}

interface UnknownLink_MappedOrRelative {
  kind: "unknown";
  original: string;
  path: string;
  hash: string | null;
}

type ParsedLink = URLLink | DirectLink | UnknownLink_MappedOrRelative;

function parseLink(original: string): ParsedLink {
  if (isURL(original)) {
    return { kind: "url", original };
  }

  const path = original.split("#")[0];
  const hash = original.slice(path.length + 1);

  if (path.startsWith(".") || path.startsWith("/")) {
    return { kind: "direct", original, path, hash };
  } else {
    return { kind: "unknown", original, path, hash };
  }
}

export class MappableLinkTarget {
  public docOriginalExtension: string;
  public docRefPath: string;

  constructor(doc: DjockeyDoc, public anchorWithoutHash: string | null) {
    this.docOriginalExtension = doc.originalExtension;
    this.docRefPath = doc.refPath;
  }

  equals(other: MappableLinkTarget) {
    return (
      this.docOriginalExtension === other.docOriginalExtension &&
      this.docRefPath == other.docRefPath &&
      this.anchorWithoutHash == other.anchorWithoutHash
    );
  }

  toString(): string {
    const hash = this.anchorWithoutHash ? `#${this.anchorWithoutHash}` : "";
    const aliases = this.aliases.join("\n  ");
    return `MappableLinkTarget(${this.docRefPath}${this.docOriginalExtension}${hash}) [\n  ${aliases}\n]`;
  }

  /**
   * List all ways you can refer to this anchor as an absolute path (i.e. relative
   * to the root directory of the inputs).
   */
  get aliases(): string[] {
    const hash = this.anchorWithoutHash ? `#${this.anchorWithoutHash}` : "";
    const result: string[] = this.anchorWithoutHash ? [hash] : [];
    const pathParts = this.docRefPath.split("/");
    for (let i = pathParts.length - 1; i >= 0; i--) {
      result.push(`${pathParts.slice(i).join("/")}${hash}`);
      result.push(
        `${pathParts.slice(i).join("/")}${this.docOriginalExtension}${hash}`
      );
    }
    // This is the 100% totally unambiguous link
    result.push(`/${this.docRefPath}${hash}`);
    result.push(`/${this.docRefPath}${this.docOriginalExtension}${hash}`);
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
      docRefPath: this.docRefPath,
      isLinkToStaticFile: false,
      logCollector: args.logCollector,
    });
  }
}
