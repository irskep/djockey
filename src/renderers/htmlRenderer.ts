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
} from "../types";
import {
  copyFilesMatchingPattern,
  ensureParentDirectoriesExist,
  makePathBackToRoot,
} from "../util";

export class HTMLRenderer implements DjockeyRenderer {
  identifier: DjockeyOutputFormat = "html";

  cssFilesFromInput = new Array<string>();
  cssFilesRelative = new Array<string>();
  jsFilesFromInput = new Array<string>();
  jsFilesRelative = new Array<string>();

  constructor(
    public options: { relativeLinks: boolean } = { relativeLinks: false }
  ) {}

  transformLink(args: {
    config: DjockeyConfigResolved;
    sourcePath: string;
    anchorWithoutHash: string | null;
    docOriginalExtension: string;
    docRelativePath: string;
  }) {
    const { anchorWithoutHash, config, docRelativePath, sourcePath } = args;

    const prefix = this.options.relativeLinks
      ? makePathBackToRoot(sourcePath, { sameDirectoryValue: "" })
      : `${config.urlRoot}/`;

    if (anchorWithoutHash) {
      return `${prefix}${docRelativePath}.html#${anchorWithoutHash}`;
    } else {
      return `${prefix}${docRelativePath}.html`;
    }
  }

  handleStaticFiles(
    templateDir: string,
    config: DjockeyConfigResolved,
    docs: DjockeyDoc[]
  ) {
    copyFilesMatchingPattern({
      base: templateDir,
      dest: config.outputDir.html,
      pattern: "static/**/*",
      exclude: [],
    });
    copyFilesMatchingPattern({
      base: config.inputDir,
      dest: config.outputDir.html,
      pattern: "**/*",
      exclude: docs.map((d) => d.absolutePath),
    });

    const templateCSSFiles = fastGlob.sync(`${templateDir}/**/*.css`);
    const inputCSSFiles = fastGlob.sync(`${config.inputDir}/**/*.css`);
    this.cssFilesFromInput = templateCSSFiles
      .concat(inputCSSFiles)
      .map((path_) => url.pathToFileURL(path_).toString());
    this.cssFilesRelative = templateCSSFiles
      .map((path_) => path.relative(templateDir, path_))
      .concat(
        inputCSSFiles.map((path_) => path.relative(config.inputDir, path_))
      );

    const templateJSFiles = fastGlob.sync(`${templateDir}/**/*.js`);
    const inputJSFiles = fastGlob.sync(`${config.inputDir}/**/*.js`);
    this.jsFilesFromInput = templateJSFiles
      .concat(inputJSFiles)
      .map((path_) => url.pathToFileURL(path_).toString());
    this.jsFilesRelative = templateJSFiles
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
      cssURLs: config.html.linkCSSToInputInsteadOfOutput
        ? this.cssFilesFromInput
        : this.cssFilesRelative.map((path_) => `${baseURL}${path_}`),
      jsURLs: this.jsFilesRelative.map((path_) => `${baseURL}${path_}`),
      ...args.context,
    });

    fs.writeFileSync(outputPath, outputPage);
  }
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
      if (attr.name !== "class") {
        continue;
      }
      for (const cls of attr.value.split(" ")) {
        if (!cls.startsWith("tag-")) {
          continue;
        }
        const tagName = cls.slice("tag-".length);
        replaceNode(node, tagName);
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
