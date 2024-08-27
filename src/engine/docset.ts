import {
  DjockeyConfigResolved,
  DjockeyDoc,
  DjockeyPlugin,
  DjockeyRenderer,
} from "../types";
import { DocTree } from "./doctree";

export class DocSet {
  public tree: DocTree | null = null;

  constructor(
    public config: DjockeyConfigResolved,
    public plugins: DjockeyPlugin[],
    public docs: DjockeyDoc[]
  ) {}

  public getDoc(relativePath: string): DjockeyDoc | null {
    return this.docs.find((d) => d.relativePath === relativePath) || null;
  }

  public async runPasses() {
    this.runPass("onPass_read");

    for (const doc of this.docs) {
      for (const plugin of this.plugins) {
        if (plugin.doAsyncWorkBetweenReadAndWrite) {
          await plugin.doAsyncWorkBetweenReadAndWrite(doc);
        }
      }
    }

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

  public makeRenderableCopy(renderer: DjockeyRenderer): DjockeyDoc[] {
    const docsCopy = structuredClone(this.docs);
    for (const doc of docsCopy) {
      for (const plugin of this.plugins) {
        if (plugin.onPrepareForRender) {
          plugin.onPrepareForRender({
            doc,
            renderer,
            config: this.config,
          });
        }
      }
    }
    return docsCopy;
  }
}
