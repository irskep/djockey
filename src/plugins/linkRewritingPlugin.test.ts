import { resolveRelativePath } from "./linkRewritingPlugin.js";

test("Resolves explicit relative links", () => {
  expect(resolveRelativePath("a/b/c.txt", "./d.txt")).toEqual("/a/b/d.txt");
  expect(resolveRelativePath("a/b/c.txt", "./../d.txt")).toEqual("/a/d.txt");
  expect(resolveRelativePath("a/b/c.txt", "../d.txt")).toEqual("/a/d.txt");
});
