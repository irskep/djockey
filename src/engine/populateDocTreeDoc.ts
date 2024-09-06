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
    [],
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

export function populateNextOrPreviousLinkDoc(
  docKey: "next" | "previous",
  docSet: DocSet,
  doc: DjockeyDoc,
  map: Record<string, string | null> | null
) {
  if (!map) return null;
  const relativePath = map[doc.refPath];
  if (!relativePath) return null;

  const destDoc = docSet.getDoc(relativePath);
  if (!destDoc) {
    throw Error(`Can't find doc for ${relativePath}???`);
  }

  doc.neighbors = doc.neighbors || {};
  doc.neighbors[docKey] = destDoc;

  doc.docs[docKey + "DocTitle"] = {
    tag: "doc",
    references: {},
    autoReferences: {},
    footnotes: {},
    children: [
      {
        tag: "para",
        attributes: { class: "dj-noop" },
        children: destDoc.titleAST,
      },
    ],
  };
}

function renderSection(
  config: DjockeyConfigResolved,
  activeDoc: DjockeyDoc,
  section: DocTreeSection,
  renderer: DjockeyRenderer,
  idPath: string[],
  logCollector: LogCollector,
  level: number = 1
): Block[] {
  function getDocLink(doc: DjockeyDoc): Link {
    return {
      tag: "link",
      children: structuredClone(doc.titleAST),
      attributes: {
        class: doc.refPath === activeDoc.refPath ? "m-active" : "",
      },
      destination: renderer.transformLink({
        config,
        sourcePath: activeDoc.refPath,
        anchorWithoutHash: null,
        docOriginalExtension: doc.originalExtension,
        docRefPath: doc.refPath,
        isLinkToStaticFile: false,
        logCollector: logCollector,
      }),
    };
  }

  const result = new Array<Block>();

  const isOpen = activeDoc.refPath.startsWith(section.refPath);

  if (level > 1 || section.selfDocHasContent) {
    result.push({
      tag: "heading",
      level,
      attributes: {
        "data-collapse-target": idPath.join("-"),
        class: idPath.length
          ? isOpen
            ? "DJCollapse_Collapser m-uncollapsed"
            : "DJCollapse_Collapser m-collapsed"
          : "",
      },
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
  const sectionChildren: ListItem[] = section.children.map((child, i) => ({
    tag: "list_item",
    children: renderSection(
      config,
      activeDoc,
      child,
      renderer,
      idPath.concat([`doctree${i}`]),
      logCollector,
      level + 1
    ),
  }));

  result.push({
    tag: "bullet_list",
    style: "-",
    tight: true,
    attributes: idPath.length
      ? {
          id: idPath.join("-"),
          class: isOpen
            ? "DJCollapse_Collapsee"
            : "DJCollapse_Collapsee m-collapsed",
        }
      : {},
    children: [...docChildren, ...sectionChildren],
  });

  return result;
}
