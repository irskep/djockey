import { BulletList, parse, renderHTML } from "@djot/djot";
import { DjockeyDoc } from "../types";
import { TableOfContentsPlugin, TOCEntry } from "./tableOfContentsPlugin";

test("Generates TOCEntry tree", () => {
  const doc: DjockeyDoc = {
    djotDoc: parse(`
      # Heading 1
      ## Heading 1.1
      # Heading 2
      ### Heading 2.2
      `),
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

  const html = renderHTML({
    tag: "doc",
    references: {},
    autoReferences: {},
    footnotes: {},
    children: [doc.data.toc as BulletList],
  });

  expect(html).toEqual(`<ul>
<li>
Heading 1
<ul>
<li>
Heading 1.1
</li>
</ul>
</li>
<li>
Heading 2
<ul>
<li>
Heading 2.2
</li>
</ul>
</li>
</ul>
`);
});
