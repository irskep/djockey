import path from "path";

import fastGlob from "fast-glob";
import micromatch from "micromatch";
import { parseFragment, serialize } from "parse5";

import { renderHTML } from "@djot/djot";
import { Environment } from "nunjucks";

import {
  DjockeyConfigResolved,
  DjockeyDoc,
  DjockeyOutputFormat,
  DjockeyPlugin,
  DjockeyRenderer,
  DjockeyStaticFileFromPlugin,
} from "../types.js";
import {
  copyFilesMatchingPattern,
  ensureParentDirectoriesExist,
  fsjoin,
  fspath2refpath,
  makePathBackToRoot,
  refpath2fspath,
  refsplit,
  URL_SEPARATOR,
  writeFile,
} from "../utils/pathUtils.js";
import { LogCollector } from "../utils/logUtils.js";

export class HTMLRenderer implements DjockeyRenderer {
  identifier: DjockeyOutputFormat = "html";

  urlLists: { css: string[]; js: string[]; font: string[] } = {
    css: new Array<string>(),
    js: new Array<string>(),
    font: new Array<string>(),
  };

  constructor(
    public options: { relativeLinks: boolean } = { relativeLinks: false }
  ) {}

  transformLink(args: {
    config: DjockeyConfigResolved;
    sourcePath: string;
    anchorWithoutHash: string | null;
    docOriginalExtension: string;
    docRefPath: string;
    isLinkToStaticFile: boolean;
  }) {
    const {
      anchorWithoutHash,
      config,
      docRefPath,
      sourcePath,
      isLinkToStaticFile,
    } = args;

    const prefix = this.options.relativeLinks
      ? makePathBackToRoot(sourcePath, { sameDirectoryValue: "" })
      : `${config.url_root}/`;

    const ext = isLinkToStaticFile ? "" : ".html";

    if (anchorWithoutHash) {
      return `${prefix}${docRefPath}${ext}#${anchorWithoutHash}`;
    } else {
      return `${prefix}${docRefPath}${ext}`;
    }
  }

  async handleStaticFiles(args: {
    templateDir: string;
    config: DjockeyConfigResolved;
    docs: DjockeyDoc[];
    staticFilesFromPlugins: DjockeyStaticFileFromPlugin[];
    logCollector: LogCollector;
  }) {
    const { templateDir, config, docs, staticFilesFromPlugins, logCollector } =
      args;
    const ignorePatterns = config.html.ignore_static;
    const allStaticFileAbsoluteFSPaths = new Array<string>();

    await Promise.all([
      copyFilesMatchingPattern({
        base: templateDir,
        dest: config.output_dir.html,
        pattern: "static/**/*",
        excludePaths: [],
        excludePatterns: ignorePatterns,
        results: allStaticFileAbsoluteFSPaths,
        logCollector,
      }),
      copyFilesMatchingPattern({
        base: config.input_dir,
        dest: config.output_dir.html,
        pattern: "**/*",
        excludePaths: docs.map((d) => fastGlob.convertPathToPattern(d.fsPath)),
        excludePatterns: ignorePatterns,
        results: allStaticFileAbsoluteFSPaths,
        logCollector,
      }),
      ...(config.html.extra_static_dirs || []).flatMap((extraStaticDir) => {
        const fsBase = fsjoin([
          config.rootPath,
          ...refsplit(extraStaticDir.path),
        ]);
        return (extraStaticDir.patterns || ["**/*"]).map(async (pattern) => {
          copyFilesMatchingPattern({
            base: fsBase,
            dest: config.output_dir.html,
            pattern,
            excludePaths: [],
            excludePatterns: extraStaticDir.exclude_patterns ?? [],
            results: allStaticFileAbsoluteFSPaths,
            logCollector,
          });
        });
      }),

      ...staticFilesFromPlugins.map((f) => {
        const fsPath = fsjoin([
          config.output_dir.html,
          refpath2fspath(f.refPath),
        ]);
        allStaticFileAbsoluteFSPaths.push(fsPath);
        return writeFile(fsPath, f.contents);
      }),
    ]);

    const allStaticFileRelativeRefPaths = allStaticFileAbsoluteFSPaths.map(
      (fsPath) => fspath2refpath(path.relative(config.output_dir.html, fsPath))
    );

    this.urlLists.css = micromatch.match(
      allStaticFileRelativeRefPaths,
      "**/*.css",
      { ignore: config.html.ignore_css }
    );

    this.urlLists.js = micromatch.match(
      allStaticFileRelativeRefPaths,
      "**/*.js"
    );

    this.urlLists.font = micromatch.match(
      allStaticFileRelativeRefPaths,
      "**/*.woff2"
    );
  }

  async writeDoc(args: {
    config: DjockeyConfigResolved;
    nj: Environment;
    doc: DjockeyDoc;
    staticFileFilterFunctions: DjockeyPlugin["getShouldIncludeStaticFileInDoc"][];
  }) {
    const { config, nj, doc } = args;
    const outputFSPath = fsjoin([
      config.output_dir.html,
      doc.refPath + ".html",
    ]);
    ensureParentDirectoriesExist(outputFSPath);

    const baseURL = this.options.relativeLinks
      ? makePathBackToRoot(doc.refPath, { sameDirectoryValue: "" })
      : `${config.url_root}${URL_SEPARATOR}`;
    const isFileURL = baseURL.startsWith("file://");

    const renderedDocs: Record<string, string> = {};
    for (const k of Object.keys(doc.docs)) {
      const rawHTML = renderHTML(doc.docs[k]);
      let postprocessedHTML = postprocessHTML(rawHTML);
      renderedDocs[k] = postprocessedHTML;
    }

    const urls: Record<string, string> = {
      home: isFileURL ? baseURL + "index.html" : baseURL,
    };
    const neighborKeys: ["previous", "next"] = ["previous", "next"];
    for (const k of neighborKeys) {
      if (!doc.neighbors || !doc.neighbors[k]) continue;
      urls[k] = this.transformLink({
        config,
        sourcePath: doc.refPath,
        anchorWithoutHash: null,
        docOriginalExtension: doc.neighbors[k].originalExtension,
        docRefPath: doc.neighbors[k].refPath,
        isLinkToStaticFile: false,
      });
    }

    function doesStaticFileRefPathPassFilters(
      staticFileRefPath: string
    ): boolean {
      return !args.staticFileFilterFunctions.some(
        (fn) => fn && !fn({ doc, staticFileRefPath })
      );
    }

    const filteredURLListsAsURLs = structuredClone(this.urlLists);
    for (const k of Object.keys(this.urlLists)) {
      const typedKey = k as keyof typeof this.urlLists;
      filteredURLListsAsURLs[typedKey] = filteredURLListsAsURLs[typedKey]
        .filter(doesStaticFileRefPathPassFilters)
        .map((path_) => `${baseURL}${path_}`);
    }

    const outputPage = nj.render("base.njk", {
      config,
      doc,
      docs: renderedDocs,
      baseURL,
      github: {
        path: parseGitHubPath(config.project_info?.github_url),
      },
      urls,
      urlLists: filteredURLListsAsURLs,
    });

    await writeFile(outputFSPath, outputPage);
  }
}

function parseGitHubPath(maybeURL?: string): string | undefined {
  const GH_BASE = "https://github.com/";
  if (!maybeURL || !maybeURL.startsWith(GH_BASE)) return maybeURL;
  return maybeURL.slice(GH_BASE.length);
}

interface Element {
  attrs: { name: string; value: string }[];
  childNodes: (Element | TextNode)[];
  namespaceURI: unknown;
  nodeName: string;
  parentNode: null | Element;
  sourceCodeLocation?: null | unknown;
  tagName: string;
}

interface TextNode {
  nodeName: "#text";
  value: string;
}

function replaceNode(node: Element, tagName: string) {
  const newEl = structuredClone(node);
  newEl.tagName = tagName;
  newEl.attrs = newEl.attrs.filter((attr) => attr.name !== "tag");
  const parent = node.parentNode!;

  const ix = parent.childNodes.indexOf(node);
  parent.childNodes[ix] = newEl;
  return newEl;
}

/**
 * For any node that has a class `tag-X`, replace its tag name with `X`.
 */
export function postprocessHTML(html: string): string {
  const fragment = parseFragment(html);

  function visit(node: Element | TextNode) {
    if (node.nodeName === "#text") return;
    node = node as Element;

    for (const attr of node.attrs) {
      if (attr.name === "tag") {
        node = replaceNode(node, attr.value);
        continue;
      }
    }

    for (const child of node.childNodes) {
      visit(child);
    }
  }

  for (const child of fragment.childNodes) {
    visit(child as Element | TextNode);
  }

  return serialize(fragment);
}
