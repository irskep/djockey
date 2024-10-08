import { AutoTitlePlugin } from "../plugins/autoTitlePlugin.js";
import { DjotDemoPlugin } from "../plugins/djotDemoPlugin.js";
import { GFMAlertsPlugin } from "../plugins/gfmAlertsPlugin.js";
import { IndextermsPlugin } from "../plugins/indextermsPlugin.js";
import { LinkRewritingPlugin } from "../plugins/linkRewritingPlugin.js";
import { MermaidPlugin } from "../plugins/mermaidPlugin.js";
import { SearchPlugin } from "../plugins/searchPlugin.js";
import { SyntaxHighlightingPlugin } from "../plugins/syntaxHighlightingPlugin.js";
import { TabGroupPlugin } from "../plugins/tabGroupPlugin.js";
import { TableOfContentsPlugin } from "../plugins/tableOfContentsPlugin.js";
import { VersionDirectivesPlugin } from "../plugins/versionDirectivePlugin.js";
import { DjockeyConfigResolved, DjockeyPlugin } from "../types.js";

export function makeBuiltinPlugins(
  config: DjockeyConfigResolved
): DjockeyPlugin[] {
  return [
    new MermaidPlugin(),
    new TabGroupPlugin(),
    new TableOfContentsPlugin(),
    new IndextermsPlugin(),
    new LinkRewritingPlugin(config),
    new DjotDemoPlugin(),
    new AutoTitlePlugin(),
    new SyntaxHighlightingPlugin(config),
    new GFMAlertsPlugin(),
    new VersionDirectivesPlugin(config),
    new SearchPlugin(),
  ];
}
