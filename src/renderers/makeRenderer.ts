import { DjockeyOutputFormat, DjockeyRenderer } from "../types.js";
import { GFMRenderer } from "./gfmRenderer.js";
import { HTMLRenderer } from "./htmlRenderer.js";

export function makeRenderer(format: DjockeyOutputFormat): DjockeyRenderer {
  switch (format) {
    case "html":
      return new HTMLRenderer();
    case "gfm":
      return new GFMRenderer();
  }
}
