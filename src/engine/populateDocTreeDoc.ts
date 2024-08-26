import { Block, Link, ListItem } from "@djot/djot";
import { DjockeyConfigResolved, DjockeyDoc, DjockeyRenderer } from "../types";
import { DocSet } from "./docset";
import { DocTreeSection } from "./doctree";

export function populateDocTreeDoc(
  docSet: DocSet,
  doc: DjockeyDoc,
  renderer: DjockeyRenderer
) {
  if (!docSet.tree) return;
  const children = renderSection(
    docSet.config,
    doc,
    docSet.tree?.rootSection,
    renderer
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
  level: number = 1
): Block[] {
  function getDocLink(doc: DjockeyDoc): Link {
    return {
      tag: "link",
      children: [{ tag: "str", text: doc.title }],
      destination: renderer.transformLink({
        config,
        sourcePath: activeDoc.relativePath,
        anchorWithoutHash: null,
        docOriginalExtension: doc.originalExtension,
        docRelativePath: doc.relativePath,
      }),
    };
  }

  const result = new Array<Block>();

  if (level > 1 || section.selfDocHasContent) {
    result.push({
      tag: "heading",
      level,
      children: [
        section.selfDoc && section.selfDocHasContent
          ? getDocLink(section.selfDoc)
          : {
              tag: "str",
              text: section.title,
            },
      ],
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
    children: renderSection(config, activeDoc, child, renderer, level + 1),
  }));

  result.push({
    tag: "bullet_list",
    style: "-",
    tight: true,
    children: [...docChildren, ...sectionChildren],
  });

  return result;
}
