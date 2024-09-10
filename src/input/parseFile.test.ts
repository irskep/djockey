import { parseFrontmatter } from "./parseFile.js";

describe("parseFrontmatter", () => {
  test("parseFrontmatter no text", () => {
    const { text, frontMatter } = parseFrontmatter(`---
title: "x"
---`);
    expect(frontMatter).toEqual({ title: "x" });
    expect(text).toEqual("");
  });

  test("parseFrontmatter no front matter", () => {
    const { text, frontMatter } = parseFrontmatter(`Hey there`);
    expect(frontMatter).toEqual({});
    expect(text).toEqual("Hey there");
  });

  test("parseFrontmatter both", () => {
    const { text, frontMatter } = parseFrontmatter(`---
title: "x"
---
Hey there`);
    expect(frontMatter).toEqual({ title: "x" });
    expect(text).toEqual("Hey there");
  });

  test("parseFrontmatter weird edge case", () => {
    const testString = `---
order: -1
---
# Why Djockey? Why Djot?`;

    const FM_RE = /^---\n(.*?)\n---\n?/gs;
    const result = FM_RE.exec(testString);
    // console.log(result);
    expect(FM_RE.dotAll).toBeTruthy();
    expect(result).toBeTruthy();
    if (result) {
      expect(result[1]).toEqual("order: -1");
    }
    expect(testString.slice(result![0].length)).toEqual(
      "# Why Djockey? Why Djot?"
    );

    const { text, frontMatter } = parseFrontmatter(testString);
    expect(text).toEqual("# Why Djockey? Why Djot?");
    expect(frontMatter).toEqual({ order: -1 });
  });
});
