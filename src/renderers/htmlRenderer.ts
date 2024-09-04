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
  DjockeyRenderer,
  DjockeyStaticFileFromPlugin,
} from "../types.js";
import {
  copyFilesMatchingPattern,
  ensureParentDirectoriesExist,
  fsjoin,
  joinPath,
  makePathBackToRoot,
  URL_SEPARATOR,
  writeFile,
} from "../utils/pathUtils.js";
import { LogCollector } from "../utils/logUtils.js";

export class HTMLRenderer implements DjockeyRenderer {
  identifier: DjockeyOutputFormat = "html";

  cssURLsRelativeToBase = new Array<string>();
  jsURLsRelativeToBase = new Array<string>();

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

    const p1 = copyFilesMatchingPattern({
      base: templateDir,
      dest: config.output_dir.html,
      pattern: "static/**/*",
      excludePaths: [],
      excludePatterns: ignorePatterns,
      logCollector,
    });
    const p2 = copyFilesMatchingPattern({
      base: config.input_dir,
      dest: config.output_dir.html,
      pattern: "**/*",
      excludePaths: docs.map((d) => fastGlob.convertPathToPattern(d.fsPath)),
      excludePatterns: ignorePatterns,
      logCollector,
    });
    const p3 = Promise.all(
      staticFilesFromPlugins.map((f) => {
        return writeFile(
          joinPath([config.output_dir.html, f.path]),
          f.contents
        );
      })
    );

    await Promise.all([p1, p2, p3]);

    const templateCSSFiles = fastGlob.sync(`${templateDir}/**/*.css`);
    const inputCSSFiles = fastGlob.sync(`${config.input_dir}/**/*.css`, {
      ignore: (config.html.ignore_css ?? []).map((pattern) => `**/${pattern}`),
    });
    const pluginCSSFiles = micromatch.match(
      staticFilesFromPlugins.map((f) => f.path),
      "**/*.css"
    );
    this.cssURLsRelativeToBase = templateCSSFiles
      .map((path_) => path.relative(templateDir, path_))
      .concat(
        inputCSSFiles.map((path_) => path.relative(config.input_dir, path_))
      )
      .concat(pluginCSSFiles);

    const templateJSFiles = fastGlob.sync(`${templateDir}/**/*.js`);
    const inputJSFiles = fastGlob.sync(`${config.input_dir}/**/*.js`);
    const pluginJSFiles = micromatch.match(
      staticFilesFromPlugins.map((f) => f.path),
      "**/*.js"
    );
    this.jsURLsRelativeToBase = templateJSFiles
      .map((path_) => path.relative(templateDir, path_))
      .concat(
        inputJSFiles.map((path_) => path.relative(config.input_dir, path_))
      )
      .concat(pluginJSFiles);
  }

  async writeDoc(args: {
    config: DjockeyConfigResolved;
    nj: Environment;
    doc: DjockeyDoc;
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

    const outputPage = nj.render("base.njk", {
      config,
      doc,
      docs: renderedDocs,
      baseURL,
      github: {
        path: parseGitHubPath(config.project_info?.github_url),
      },
      urls,
      urlLists: {
        css: this.cssURLsRelativeToBase.map((path_) => `${baseURL}${path_}`),
        js: this.jsURLsRelativeToBase.map((path_) => `${baseURL}${path_}`),
      },
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
  const newEl: Element = { ...node, tagName: tagName };
  const parent = node.parentNode!;

  const ix = parent.childNodes.indexOf(node);
  parent.childNodes[ix] = newEl;
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
        replaceNode(node, attr.value);
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
