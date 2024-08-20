import { DjockeyConfigResolved } from "../config";
import { DjockeyDoc, DjockeyOutputFormat } from "../types";

/**
 * Notes:
 * - Passes should be idempotent so they can be run multiple times
 */
export type DjockeyPlugin = {
  onPass_read?: (doc: DjockeyDoc) => void;
  onPass_write?: (doc: DjockeyDoc) => void;
  onPrepareForRender?: (doc: DjockeyDoc, format: DjockeyOutputFormat) => void;
};

export class DocSet {
  constructor(
    public config: DjockeyConfigResolved,
    public plugins: DjockeyPlugin[],
    public docs: DjockeyDoc[]
  ) {}

  public runPasses() {
    this.runPass("onPass_read");
    this.runPass("onPass_write");
  }

  private runPass(fn: "onPass_read" | "onPass_write") {
    for (const doc of this.docs) {
      for (const plugin of this.plugins) {
        if (plugin[fn]) {
          plugin[fn](doc);
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
