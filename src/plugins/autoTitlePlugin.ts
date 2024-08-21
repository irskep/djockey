import { Heading, Str } from "@djot/djot";
import { applyFilter } from "../engine/djotFiltersPlus";
import { DjockeyDoc, DjockeyPlugin } from "../types";

export class AutoTitlePlugin implements DjockeyPlugin {
  onPass_read(doc: DjockeyDoc) {
    if (doc.frontMatter.title) {
      doc.title = doc.frontMatter.title as string;
      return;
    }

    let title: string | null = null;
    let didFindHeading = false;

    const stringParts = new Array<string>();
    let isInFirstHeading = false;

    applyFilter(doc.docs.content, () => ({
      heading: {
        enter: (node: Heading) => {
          didFindHeading = true;
          if (title === null) isInFirstHeading = true;
        },
        exit: (node: Heading) => {
          isInFirstHeading = false;
          title = stringParts.join("");
        },
      },
      str: (node: Str) => {
        if (!isInFirstHeading) return;
        stringParts.push(node.text);
      },
    }));

    if (didFindHeading) {
      doc.title = title!;
    }
  }
}
