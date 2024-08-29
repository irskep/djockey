import { Block, Inline, Link, ListItem } from "@djot/djot";
import {
  DjockeyConfigResolved,
  DjockeyDoc,
  DjockeyRenderer,
} from "../types.js";
import { DocSet } from "./docset.js";
import { DocTreeSection } from "./doctree.js";
import { LogCollector } from "../utils/logUtils.js";

export function populateDocTreeDoc(
  docSet: DocSet,
  doc: DjockeyDoc,
  renderer: DjockeyRenderer,
  logCollector: LogCollector
) {
  if (!docSet.tree) return;
  const children = renderSection(
    docSet.config,
    doc,
    docSet.tree?.rootSection,
    renderer,
    logCollector
  );
  if (!children.length) return;
  doc.docs.doctree = {
    tag: "doc",
    references: {},
    autoReferences: {},
    footnotes: {},
    children: children,
  };
}

function renderSection(
  config: DjockeyConfigResolved,
  activeDoc: DjockeyDoc,
  section: DocTreeSection,
  renderer: DjockeyRenderer,
  logCollector: LogCollector,
  level: number = 1
): Block[] {
  function getDocLink(doc: DjockeyDoc): Link {
    return {
      tag: "link",
      children: structuredClone(doc.titleAST),
      destination: renderer.transformLink({
        config,
        sourcePath: activeDoc.relativePath,
        anchorWithoutHash: null,
        docOriginalExtension: doc.originalExtension,
        docRelativePath: doc.relativePath,
        isLinkToStaticFile: false,
        logCollector: logCollector,
      }),
    };
  }

  const result = new Array<Block>();

  if (level > 1 || section.selfDocHasContent) {
    result.push({
      tag: "heading",
      level,
      children:
        section.selfDoc && section.selfDocHasContent
          ? [getDocLink(section.selfDoc)]
          : section.title,
    });
  }

  const docChildren: ListItem[] = section.docs.map((doc) => ({
    tag: "list_item",
    children: [
      {
        tag: "para",
        children: [getDocLink(doc)],
      },
    ],
  }));
  const sectionChildren: ListItem[] = section.children.map((child) => ({
    tag: "list_item",
    children: renderSection(
      config,
      activeDoc,
      child,
      renderer,
      logCollector,
      level + 1
    ),
  }));

  result.push({
    tag: "bullet_list",
    style: "-",
    tight: true,
    children: [...docChildren, ...sectionChildren],
  });

  return result;
}
