import { DjockeyOutputFormat } from "../types";
import { GFMOutputPlugin } from "./gfmOutputPlugin";
import { HTMLOutputPlugin } from "./htmlOutputPlugin";
import { DjockeyOutputPlugin } from "./djockeyRenderer";

export function makeRenderer(format: DjockeyOutputFormat): DjockeyOutputPlugin {
  switch (format) {
    case "html":
      return new HTMLOutputPlugin();
    case "gfm":
      return new GFMOutputPlugin();
  }
}
