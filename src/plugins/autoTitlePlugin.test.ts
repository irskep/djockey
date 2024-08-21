import { parse } from "@djot/djot";
import { DjockeyConfigResolved, DjockeyDoc } from "../types";
import { AutoTitlePlugin } from "./autoTitlePlugin";
import { DocSet } from "../engine/docset";

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
    originalExtension: ".djot",
    absolutePath: "Test Doc.djot",
    relativePath: "Test Doc.djot",
    filename: "Test Doc",
    frontMatter: {},
    data: {},
  };

  const config: DjockeyConfigResolved = {
    inputDir: ".",
    outputDir: { html: "./dist/html", gfm: "./dist/gfm" },
    fileList: ["Test Doc.djot"],
    urlRoot: "URL_ROOT",
    inputFormats: { djot: true },
    outputFormats: { html: true },
    numPasses: 1,
    rootPath: ".",
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
    originalExtension: ".djot",
    absolutePath: "Test Doc.djot",
    relativePath: "Test Doc.djot",
    filename: "Test Doc",
    frontMatter: { title: "Custom title" },
    data: {},
  };

  const config: DjockeyConfigResolved = {
    inputDir: ".",
    outputDir: { html: "./dist/html", gfm: "./dist/gfm" },
    fileList: ["Test Doc.djot"],
    urlRoot: "URL_ROOT",
    inputFormats: { djot: true },
    outputFormats: { html: true },
    numPasses: 1,
    rootPath: ".",
  };
  const docSet = new DocSet(config, [new AutoTitlePlugin()], [doc]);
  docSet.runPasses();

  expect(doc.title).toEqual("Custom title");
});
