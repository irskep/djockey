import { DjockeyOutputPlugin } from "../output/djockeyRenderer";
import {
  DjockeyConfigResolved,
  DjockeyDoc,
  DjockeyOutputFormat,
  DjockeyPlugin,
} from "../types";

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
    renderer: DjockeyOutputPlugin
  ): DjockeyDoc[] {
    const docsCopy = structuredClone(this.docs);
    for (const doc of docsCopy) {
      for (const plugin of this.plugins) {
        if (plugin.onPrepareForRender) {
          plugin.onPrepareForRender(doc, renderer);
        }
      }
    }
    return docsCopy;
  }
}
