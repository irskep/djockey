import { postprocessHTML } from "./htmlRenderer";

test("postprocessHTML", () => {
  const result = postprocessHTML(
    `<div><span class='tag-code'>CODE</span></div>`
  );

  expect(result).toEqual(`<div><code class="tag-code">CODE</code></div>`);
});
