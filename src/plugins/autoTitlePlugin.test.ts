import { parse } from "@djot/djot";
import { DjockeyConfigResolved, DjockeyDoc } from "../types.js";
import { AutoTitlePlugin } from "./autoTitlePlugin.js";
import { DocSet } from "../engine/docset.js";
import { getConfigDefaults } from "../config.js";
import { LogCollector } from "../utils/logUtils.js";

test("Title is set to first heading by default", async () => {
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
    rootPath: ".",
    output_dir: { html: "./dist/html", gfm: "./dist/gfm" },
    fileList: ["Test Doc.dj"],
    url_root: "URL_ROOT",
  };
  const docSet = new DocSet(config, [new AutoTitlePlugin()], [doc]);
  await docSet.runPasses(
    new LogCollector("", { shouldStart: false, silent: true })
  );

  expect(doc.title).toEqual("Heading 1");
});

test("Title is set to frontMatter.title if present", async () => {
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
    frontMatter: { title: "Custom title" },
    data: {},
  };

  const config: DjockeyConfigResolved = {
    ...getConfigDefaults(),
    link_mappings: [],
    input_dir: ".",
    rootPath: ".",
    output_dir: { html: "./dist/html", gfm: "./dist/gfm" },
    fileList: ["Test Doc.dj"],
    url_root: "URL_ROOT",
  };
  const docSet = new DocSet(config, [new AutoTitlePlugin()], [doc]);
  await docSet.runPasses(
    new LogCollector("", { shouldStart: false, silent: true })
  );

  expect(doc.title).toEqual("Custom title");
});
