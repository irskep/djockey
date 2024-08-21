import { DjockeyOutputFormat, DjockeyRenderer } from "../types";
import { GFMRenderer } from "./gfmRenderer";
import { HTMLRenderer } from "./htmlRenderer";

export function makeRenderer(format: DjockeyOutputFormat): DjockeyRenderer {
  switch (format) {
    case "html":
      return new HTMLRenderer();
    case "gfm":
      return new GFMRenderer();
  }
}
