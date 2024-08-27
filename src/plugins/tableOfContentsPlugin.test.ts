import { Doc, parse, renderHTML } from "@djot/djot";
import { DjockeyConfig, DjockeyConfigResolved, DjockeyDoc } from "../types";
import { TableOfContentsPlugin } from "./tableOfContentsPlugin";
import { LinkRewritingPlugin } from "./linkRewritingPlugin";
import { DocSet } from "../engine/docset";
import { HTMLRenderer } from "../renderers/htmlRenderer";
import { getConfigDefaults } from "../config";

test("Generates TOCEntry tree for one doc", () => {
  const doc: DjockeyDoc = {
    docs: {
      content: parse(
        `# Heading 1

      ## Heading 1.1

      # Heading 2

      ### Heading 2.2
      `,
        { sourcePositions: true }
      ),
    },
    title: "Test doc",
    titleAST: [{ tag: "str", text: "Test doc" }],
    originalExtension: ".djot",
    absolutePath: "Test Doc.djot",
    relativePath: "Test Doc.djot",
    filename: "Test Doc",
    frontMatter: {},
    data: {},
  };

  const plg = new TableOfContentsPlugin();
  plg.onPass_read(doc);
  plg.onPass_write(doc);

  const html = renderHTML(doc.docs.toc);

  expect(html).toEqual(`<ul>
<li>
<a href="/Test Doc.djot#Heading-1">Heading 1</a>
<ul>
<li>
<a href="/Test Doc.djot#Heading-1-1">Heading 1.1</a>
</li>
</ul>
</li>
<li>
<a href="/Test Doc.djot#Heading-2">Heading 2</a>
<ul>
<li>
<a href="/Test Doc.djot#Heading-2-2">Heading 2.2</a>
</li>
</ul>
</li>
</ul>
`);
});

test("Works end-to-end with LinkRewritingPlugin", () => {
  const doc: DjockeyDoc = {
    docs: {
      content: parse(
        `# Heading 1

      ## Heading 1.1

      # Heading 2

      ### Heading 2.2
      `,
        { sourcePositions: true }
      ),
    },
    title: "Test doc",
    titleAST: [{ tag: "str", text: "Test doc" }],
    originalExtension: ".djot",
    absolutePath: "Test Doc.djot",
    relativePath: "Test Doc.djot",
    filename: "Test Doc",
    frontMatter: {},
    data: {},
  };

  const config: DjockeyConfigResolved = {
    ...getConfigDefaults(),
    inputDir: ".",
    outputDir: { html: "./dist/html", gfm: "./dist/gfm" },
    fileList: ["Test Doc.djot"],
    urlRoot: "URL_ROOT",
    inputFormats: { djot: true },
    rootPath: ".",
    html: { footerText: "", linkCSSToInputInsteadOfOutput: false },
  };
  const docSet = new DocSet(
    config,
    [new TableOfContentsPlugin(), new LinkRewritingPlugin(config)],
    [doc]
  );
  docSet.runPasses();
  const htmlCopy = docSet.makeRenderableCopy(
    new HTMLRenderer({ relativeLinks: true })
  )[0];
  const html = renderHTML(htmlCopy.docs.toc);

  expect(html).toEqual(`<ul>
<li>
<a href="Test Doc.djot.html#Heading-1">Heading 1</a>
<ul>
<li>
<a href="Test Doc.djot.html#Heading-1-1">Heading 1.1</a>
</li>
</ul>
</li>
<li>
<a href="Test Doc.djot.html#Heading-2">Heading 2</a>
<ul>
<li>
<a href="Test Doc.djot.html#Heading-2-2">Heading 2.2</a>
</li>
</ul>
</li>
</ul>
`);
});
