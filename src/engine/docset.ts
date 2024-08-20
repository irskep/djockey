import { URL } from "url";

import { DjockeyConfigResolved } from "../config";
import { DjockeyDoc, DjockeyOutputFormat } from "../types";
import { applyFilter } from "./djotFiltersPlus";
import { LinkTarget } from "../plugins/linkRewritingPlugin";

export type DjockeyPlugin = {
  onFirstPass?: (doc: DjockeyDoc) => void;
  onPrerender?: (doc: DjockeyDoc, format: DjockeyOutputFormat) => void;
};

export class DocSet {
  private _relativePathToDoc: Record<string, DjockeyDoc> = {};

  constructor(
    public config: DjockeyConfigResolved,
    public plugins: DjockeyPlugin[],
    public docs: DjockeyDoc[]
  ) {}

  public doAllTheComplicatedTransformStuff() {
    for (const doc of this.docs) {
      this.docPassInitial(doc);
    }
  }

  private docPassInitial(doc: DjockeyDoc) {
    this._relativePathToDoc[doc.relativePath] = doc;

    for (const plugin of this.plugins) {
      if (plugin.onFirstPass) {
        plugin.onFirstPass(doc);
      }
    }
  }

  public copyDocsWithOutputSpecificChanges(
    format: DjockeyOutputFormat
  ): DjockeyDoc[] {
    const docsCopy = structuredClone(this.docs);
    for (const doc of docsCopy) {
      for (const plugin of this.plugins) {
        if (plugin.onPrerender) {
          plugin.onPrerender(doc, format);
        }
      }
    }
    return docsCopy;
  }
}
