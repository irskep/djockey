import { Block, BulletList, Doc, Link, ListItem } from "@djot/djot";
import { DjockeyConfigResolved, DjockeyDoc, DjockeyRenderer } from "../types";
import { DocSet } from "./docset";
import { DocTreeSection } from "./doctree";

export function populateDocTreeDoc(
  docSet: DocSet,
  doc: DjockeyDoc,
  renderer: DjockeyRenderer
) {
  if (!docSet.tree) return;
  doc.docs.doctree = {
    tag: "doc",
    references: {},
    autoReferences: {},
    footnotes: {},
    children: renderSection(
      docSet.config,
      doc,
      docSet.tree?.rootSection,
      renderer
    ),
  };
}

function renderSection(
  config: DjockeyConfigResolved,
  activeDoc: DjockeyDoc,
  section: DocTreeSection,
  renderer: DjockeyRenderer,
  level: number = 1
): Block[] {
  function docToListItem(doc: DjockeyDoc): ListItem {
    return {
      tag: "list_item",
      children: [
        {
          tag: "para",
          children: [
            {
              tag: "link",
              children: [{ tag: "str", text: doc.title }],
              destination: renderer.transformLink({
                config,
                sourcePath: activeDoc.relativePath,
                anchorWithoutHash: null,
                docOriginalExtension: doc.originalExtension,
                docRelativePath: doc.relativePath,
              }),
            },
          ],
        },
      ],
    };
  }

  const result = new Array<Block>();

  if (section.title.length) {
    result.push({
      tag: "heading",
      level,
      children: [
        {
          tag: "str",
          text: section.title,
        },
      ],
    });
  }

  const docChildren: ListItem[] = section.docs.map(docToListItem);
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
