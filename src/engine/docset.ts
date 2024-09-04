import {
  DjockeyConfigResolved,
  DjockeyDoc,
  DjockeyPlugin,
  DjockeyPluginNodeReservation,
  DjockeyRenderer,
} from "../types.js";
import { LogCollector } from "../utils/logUtils.js";
import { DocTree } from "./doctree.js";

export class DocSet {
  public tree: DocTree | null = null;

  private reservations: DjockeyPluginNodeReservation[][];

  constructor(
    public config: DjockeyConfigResolved,
    public plugins: DjockeyPlugin[],
    public docs: DjockeyDoc[]
  ) {
    this.reservations = this.plugins.map((p) =>
      p.getNodeReservations ? p.getNodeReservations(this.config) : []
    );
  }

  private getRelevantReservations(
    pluginIndex: number
  ): DjockeyPluginNodeReservation[] {
    return this.reservations
      .slice(0, pluginIndex)
      .concat(
        this.reservations.slice(pluginIndex + 1, this.reservations.length)
      )
      .flatMap((list) => list);
  }

  public getDoc(refPath: string): DjockeyDoc | null {
    return this.docs.find((d) => d.refPath === refPath) || null;
  }

  public async runPasses(logCollector: LogCollector) {
    this.runPass("onPass_read", logCollector);

    const jobs = new Array<Promise<void>>();
    for (const doc of this.docs) {
      for (let i = 0; i < this.plugins.length; i++) {
        const plugin = this.plugins[i];
        if (plugin.doAsyncWorkBetweenReadAndWrite) {
          jobs.push(
            plugin.doAsyncWorkBetweenReadAndWrite({ doc, logCollector })
          );
        }
      }
    }
    await Promise.all(jobs);

    this.runPass("onPass_write", logCollector);
  }

  private runPass(
    fn: "onPass_read" | "onPass_write",
    logCollector: LogCollector
  ) {
    for (const doc of this.docs) {
      for (let i = 0; i < this.plugins.length; i++) {
        const plugin = this.plugins[i];
        if (plugin[fn]) {
          plugin[fn]({
            doc,
            logCollector,
            getIsNodeReservedByAnotherPlugin: (node) => {
              return this.getRelevantReservations(i).some((res) =>
                res.match(node)
              );
            },
          });
        }
      }
    }
  }

  public makeRenderableCopy(
    renderer: DjockeyRenderer,
    logCollector: LogCollector
  ): DjockeyDoc[] {
    const docsCopy = structuredClone(this.docs);
    for (const doc of docsCopy) {
      for (const plugin of this.plugins) {
        if (plugin.onPrepareForRender) {
          plugin.onPrepareForRender({
            doc,
            renderer,
            config: this.config,
            logCollector,
          });
        }
      }
    }
    return docsCopy;
  }
}
