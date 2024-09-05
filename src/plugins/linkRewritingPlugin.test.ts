import { Doc } from "@djot/djot";
import {
  MappableLinkTarget,
  resolveRelativeRefPath,
} from "./linkRewritingPlugin.js";

test("Resolves explicit relative links", () => {
  expect(resolveRelativeRefPath("a/b/c.txt", "./d.txt")).toEqual("/a/b/d.txt");
  expect(resolveRelativeRefPath("a/b/c.txt", "./../d.txt")).toEqual("/a/d.txt");
  expect(resolveRelativeRefPath("a/b/c.txt", "../d.txt")).toEqual("/a/d.txt");
});

test("MappableLinkTarget has expected values", () => {
  const stubDoc: Doc = {
    tag: "doc",
    references: {},
    autoReferences: {},
    footnotes: {},
    children: [],
  };
  const t = new MappableLinkTarget(
    {
      docs: {
        content: stubDoc,
      },
      title: "The Doc",
      titleAST: [],
      originalExtension: ".djot",
      fsPath: "/fsroot/input/subdir/the_doc.djot",
      refPath: "subdir/the_doc",
      filename: "the_doc",
      frontMatter: {},
      data: {},
    },
    "the-hash"
  );

  expect(t.aliases).toEqual([
    "#the-hash",
    "the_doc#the-hash",
    "the_doc.djot#the-hash",
    "subdir/the_doc#the-hash",
    "subdir/the_doc.djot#the-hash",
    "/subdir/the_doc#the-hash",
    "/subdir/the_doc.djot#the-hash",
  ]);
});
