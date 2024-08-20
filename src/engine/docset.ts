import { URL } from "url";

import { DjockeyConfigResolved } from "../config";
import { DjockeyDoc, DjockeyOutputFormat } from "../types";
import { applyFilter } from "./djotFiltersPlus";
import { LinkTarget } from "../plugins/linkRewritingPlugin";

export type DjockeyPlugin = {
  onPass_read?: (doc: DjockeyDoc) => void;
  onPrepareForRender?: (doc: DjockeyDoc, format: DjockeyOutputFormat) => void;
};

export class DocSet {
  private _relativePathToDoc: Record<string, DjockeyDoc> = {};

  constructor(
    public config: DjockeyConfigResolved,
    public plugins: DjockeyPlugin[],
    public docs: DjockeyDoc[]
  ) {}

  public doAllTheComplicatedTransformStuff() {
    this.runPass_read();
  }

  private runPass_read() {
    for (const doc of this.docs) {
      this._relativePathToDoc[doc.relativePath] = doc;
      for (const plugin of this.plugins) {
        if (plugin.onPass_read) {
          plugin.onPass_read(doc);
        }
      }
    }
  }

  public copyDocsWithOutputSpecificChanges(
    format: DjockeyOutputFormat
  ): DjockeyDoc[] {
    const docsCopy = structuredClone(this.docs);
    for (const doc of docsCopy) {
      for (const plugin of this.plugins) {
        if (plugin.onPrepareForRender) {
          plugin.onPrepareForRender(doc, format);
        }
      }
    }
    return docsCopy;
  }
}
