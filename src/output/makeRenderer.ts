import { DjockeyOutputFormat, DjockeyRenderer } from "../types";
import { GFMOutputPlugin } from "./gfmOutputPlugin";
import { HTMLOutputPlugin } from "./htmlOutputPlugin";

export function makeRenderer(format: DjockeyOutputFormat): DjockeyRenderer {
  switch (format) {
    case "html":
      return new HTMLOutputPlugin();
    case "gfm":
      return new GFMOutputPlugin();
  }
}
