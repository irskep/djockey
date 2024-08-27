import fs from "fs";
import path from "path";
import url from "url";

import fastGlob from "fast-glob";
import { parseFragment, serialize } from "parse5";

import { renderHTML } from "@djot/djot";
import { Environment } from "nunjucks";

import {
  DjockeyConfig,
  DjockeyConfigResolved,
  DjockeyDoc,
  DjockeyOutputFormat,
  DjockeyRenderer,
} from "../types.js";
import {
  copyFilesMatchingPattern,
  ensureParentDirectoriesExist,
  makePathBackToRoot,
} from "../util.js";

export class HTMLRenderer implements DjockeyRenderer {
  identifier: DjockeyOutputFormat = "html";

  cssFilePaths = new Array<string>();
  cssURLsRelativeToBase = new Array<string>();
  jsFilePaths = new Array<string>();
  jsURLsRelativeToBase = new Array<string>();

  constructor(
    public options: { relativeLinks: boolean } = { relativeLinks: false }
  ) {}

  transformLink(args: {
    config: DjockeyConfigResolved;
    sourcePath: string;
    anchorWithoutHash: string | null;
    docOriginalExtension: string;
    docRelativePath: string;
    isLinkToStaticFile: boolean;
  }) {
    const {
      anchorWithoutHash,
      config,
      docRelativePath,
      sourcePath,
      isLinkToStaticFile,
    } = args;

    const prefix = this.options.relativeLinks
      ? makePathBackToRoot(sourcePath, { sameDirectoryValue: "" })
      : `${config.urlRoot}/`;

    const ext = isLinkToStaticFile ? "" : ".html";

    if (anchorWithoutHash) {
      return `${prefix}${docRelativePath}${ext}#${anchorWithoutHash}`;
    } else {
      return `${prefix}${docRelativePath}${ext}`;
    }
  }

  handleStaticFiles(
    templateDir: string,
    config: DjockeyConfigResolved,
    docs: DjockeyDoc[]
  ) {
    const ignorePatterns = config.static?.copyIgnorePatterns ?? [];
    copyFilesMatchingPattern({
      base: templateDir,
      dest: config.outputDir.html,
      pattern: "static/**/*",
      excludePaths: [],
      excludePatterns: ignorePatterns,
    });
    copyFilesMatchingPattern({
      base: config.inputDir,
      dest: config.outputDir.html,
      pattern: "**/*",
      excludePaths: docs.map((d) => d.absolutePath),
      excludePatterns: ignorePatterns,
    });

    const templateCSSFiles = fastGlob.sync(`${templateDir}/**/*.css`);
    const inputCSSFiles = fastGlob.sync(`${config.inputDir}/**/*.css`, {
      ignore: (config.html.cssIgnorePatterns ?? []).map(
        (pattern) => `**/${pattern}`
      ),
    });
    this.cssFilePaths = templateCSSFiles
      .concat(inputCSSFiles)
      .map((path_) => url.pathToFileURL(path_).toString());
    this.cssURLsRelativeToBase = templateCSSFiles
      .map((path_) => path.relative(templateDir, path_))
      .concat(
        inputCSSFiles.map((path_) => path.relative(config.inputDir, path_))
      );

    const templateJSFiles = fastGlob.sync(`${templateDir}/**/*.js`);
    const inputJSFiles = fastGlob.sync(`${config.inputDir}/**/*.js`);
    this.jsFilePaths = templateJSFiles
      .concat(inputJSFiles)
      .map((path_) => url.pathToFileURL(path_).toString());
    this.jsURLsRelativeToBase = templateJSFiles
      .map((path_) => path.relative(templateDir, path_))
      .concat(
        inputJSFiles.map((path_) => path.relative(config.inputDir, path_))
      );
  }

  writeDoc(args: {
    config: DjockeyConfig;
    nj: Environment;
    doc: DjockeyDoc;
    context: Record<string, unknown>;
  }) {
    const { config, nj, doc } = args;
    const outputPath = `${config.outputDir.html}/${doc.relativePath}.html`;
    console.log("Rendering", outputPath);
    ensureParentDirectoriesExist(outputPath);

    const baseURL = this.options.relativeLinks
      ? makePathBackToRoot(doc.relativePath, { sameDirectoryValue: "" })
      : `${config.urlRoot}/`;
    const isFileURL = baseURL.startsWith("file://");

    const renderedDocs: Record<string, string> = {};
    for (const k of Object.keys(doc.docs)) {
      const rawHTML = renderHTML(doc.docs[k]);
      const postprocessedHTML = postprocessHTML(rawHTML);
      renderedDocs[k] = postprocessedHTML;
    }

    const outputPage = nj.render("base.njk", {
      doc,
      docs: renderedDocs,
      baseURL,
      github: {
        path: parseGitHubPath(config.projectInfo?.githubURL),
      },
      urls: {
        css: config.html.linkCSSToInputInsteadOfOutput
          ? this.cssFilePaths
          : this.cssURLsRelativeToBase.map((path_) => `${baseURL}${path_}`),
        js: this.jsURLsRelativeToBase.map((path_) => `${baseURL}${path_}`),
        home: isFileURL ? baseURL + "index.html" : baseURL,
      },
      ...args.context,
    });

    fs.writeFileSync(outputPath, outputPage);
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

/**
 * For any node that has a class `tag-X`, replace its tag name with `X`.
 */
export function postprocessHTML(html: string): string {
  const fragment = parseFragment(html);
  fragment.childNodes;

  function replaceNode(node: Element, tagName: string) {
    const newEl: Element = { ...node, tagName: tagName };
    const parent = node.parentNode!;

    const ix = parent.childNodes.indexOf(node);
    parent.childNodes[ix] = newEl;
  }

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
