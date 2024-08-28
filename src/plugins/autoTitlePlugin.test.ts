import { parse } from "@djot/djot";
import { DjockeyConfigResolved, DjockeyDoc } from "../types.js";
import { AutoTitlePlugin } from "./autoTitlePlugin.js";
import { DocSet } from "../engine/docset.js";
import { getConfigDefaults } from "../config.js";

test("Title is set to first heading by default", () => {
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
    originalExtension: ".dj",
    absolutePath: "Test Doc.dj",
    relativePath: "Test Doc.dj",
    filename: "Test Doc",
    frontMatter: {},
    data: {},
  };

  const config: DjockeyConfigResolved = {
    ...getConfigDefaults(),
    input_dir: ".",
    rootPath: ".",
    output_dir: { html: "./dist/html", gfm: "./dist/gfm" },
    fileList: ["Test Doc.dj"],
    url_root: "URL_ROOT",
  };
  const docSet = new DocSet(config, [new AutoTitlePlugin()], [doc]);
  docSet.runPasses();

  expect(doc.title).toEqual("Heading 1");
});

test("Title is set to frontMatter.title if present", () => {
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
    originalExtension: ".dj",
    absolutePath: "Test Doc.dj",
    relativePath: "Test Doc.dj",
    filename: "Test Doc",
    frontMatter: { title: "Custom title" },
    data: {},
  };

  const config: DjockeyConfigResolved = {
    ...getConfigDefaults(),
    input_dir: ".",
    rootPath: ".",
    output_dir: { html: "./dist/html", gfm: "./dist/gfm" },
    fileList: ["Test Doc.dj"],
    url_root: "URL_ROOT",
  };
  const docSet = new DocSet(config, [new AutoTitlePlugin()], [doc]);
  docSet.runPasses();

  expect(doc.title).toEqual("Custom title");
});
