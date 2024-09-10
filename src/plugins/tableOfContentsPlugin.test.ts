import { Doc, parse, renderHTML } from "@djot/djot";
import { DjockeyConfigResolved, DjockeyDoc } from "../types.js";
import { TableOfContentsPlugin } from "./tableOfContentsPlugin.js";
import { LinkRewritingPlugin } from "./linkRewritingPlugin.js";
import { DocSet } from "../engine/docset.js";
import { HTMLRenderer } from "../renderers/htmlRenderer.js";
import { getConfigDefaults } from "../config.js";
import { LogCollector } from "../utils/logUtils.js";

test("Generates TOCEntry tree for one doc", async () => {
  const doc: DjockeyDoc = {
    docs: {
      content: {
        kind: "djot",
        value: parse(
          `# Heading 1

      ## Heading 1.1

      # Heading 2

      ### Heading 2.2
      `,
          { sourcePositions: true }
        ),
      },
    },
    title: "Test doc",
    titleAST: [{ tag: "str", text: "Test doc" }],
    originalExtension: ".dj",
    fsPath: "Test Doc.dj",
    refPath: "Test Doc.dj",
    filename: "Test Doc",
    frontMatter: {},
    data: {},
  };

  const plg = new TableOfContentsPlugin();
  plg.onPass_read({
    doc,
    logCollector: new LogCollector("", { shouldStart: false, silent: true }),
  });
  plg.onPass_write({ doc });

  const html = await renderHTML(doc.docs.toc.value as Doc);

  expect(html).toEqual(`<ul>
<li>
<a href="/Test Doc.dj#Heading-1">Heading 1</a>
<ul>
<li>
<a href="/Test Doc.dj#Heading-1-1">Heading 1.1</a>
</li>
</ul>
</li>
<li>
<a href="/Test Doc.dj#Heading-2">Heading 2</a>
<ul>
<li>
<a href="/Test Doc.dj#Heading-2-2">Heading 2.2</a>
</li>
</ul>
</li>
</ul>
`);
});

test("Works end-to-end with LinkRewritingPlugin", async () => {
  const doc: DjockeyDoc = {
    docs: {
      content: {
        kind: "djot",
        value: parse(
          `# Heading 1
      ## Heading 1.1
      # Heading 2
      ### Heading 2.2
      `,
          { sourcePositions: true }
        ),
      },
    },
    title: "Test doc",
    titleAST: [{ tag: "str", text: "Test doc" }],
    originalExtension: ".dj",
    fsPath: "Test Doc.dj",
    refPath: "Test Doc.dj",
    filename: "Test Doc",
    frontMatter: {},
    data: {},
  };
  const config: DjockeyConfigResolved = {
    ...getConfigDefaults(),
    link_mappings: [],
    input_dir: ".",
    output_dir: { html: "./dist/html", gfm: "./dist/gfm" },
    fileList: ["Test Doc.dj"],
    url_root: "URL_ROOT",
    rootPath: ".",
    html: { footer_text: "", ignore_static: [] },
  };
  const docSet = new DocSet(
    config,
    [new TableOfContentsPlugin(), new LinkRewritingPlugin(config)],
    [doc]
  );
  await docSet.runPasses(
    new LogCollector("", { shouldStart: false, silent: true })
  );
  const htmlCopy = docSet.makeRenderableCopy(
    new HTMLRenderer({ relativeLinks: true }),
    new LogCollector("", { shouldStart: false, silent: true })
  )[0];
  const html = renderHTML(htmlCopy.docs.toc.value as Doc);
  expect(html).toEqual(`<ul>
<li>
<a href="Test Doc.dj.html#Heading-1">Heading 1</a>
<ul>
<li>
<a href="Test Doc.dj.html#Heading-1-1">Heading 1.1</a>
</li>
</ul>
</li>
<li>
<a href="Test Doc.dj.html#Heading-2">Heading 2</a>
<ul>
<li>
<a href="Test Doc.dj.html#Heading-2-2">Heading 2.2</a>
</li>
</ul>
</li>
</ul>
`);
});
