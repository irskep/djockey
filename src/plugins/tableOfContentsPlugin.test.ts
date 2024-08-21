import { Doc, parse, renderHTML } from "@djot/djot";
import { DjockeyDoc } from "../types";
import { TableOfContentsPlugin } from "./tableOfContentsPlugin";

test("Generates TOCEntry tree", () => {
  const doc: DjockeyDoc = {
    djotDoc: parse(
      `# Heading 1

      ## Heading 1.1

      # Heading 2

      ### Heading 2.2
      `,
      { sourcePositions: true }
    ),
    title: "Test doc",
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

  const html = renderHTML(doc.data.tocDoc as Doc);

  expect(html).toEqual(`<ul>
<li>
<a href="#Heading-1">Heading 1</a>
<ul>
<li>
<a href="#Heading-1-1">Heading 1.1</a>
</li>
</ul>
</li>
<li>
<a href="#Heading-2">Heading 2</a>
<ul>
<li>
<a href="#Heading-2-2">Heading 2.2</a>
</li>
</ul>
</li>
</ul>
`);
});
