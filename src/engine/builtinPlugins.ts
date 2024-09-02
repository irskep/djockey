import { AutoTitlePlugin } from "../plugins/autoTitlePlugin.js";
import { DjotDemoPlugin } from "../plugins/djotDemoPlugin.js";
import { GFMAlertsPlugin } from "../plugins/gfmAlertsPlugin.js";
import { IndextermsPlugin } from "../plugins/indextermsPlugin.js";
import { LinkRewritingPlugin } from "../plugins/linkRewritingPlugin.js";
import { MermaidPlugin } from "../plugins/mermaidPlugin.js";
import { SyntaxHighlightingPlugin } from "../plugins/syntaxHighlighting.js";
import { TabGroupPlugin } from "../plugins/tabGroupPlugin.js";
import { TableOfContentsPlugin } from "../plugins/tableOfContentsPlugin.js";
import { VersionDirectivesPlugin } from "../plugins/versionDirectives.js";
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
  ];
}
