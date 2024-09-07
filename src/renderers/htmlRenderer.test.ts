import { postprocessHTML } from "./htmlRenderer.js";

test("postprocessHTML", () => {
  const result = postprocessHTML(`<div><span tag='code'>CODE</span></div>`);

  expect(result).toEqual(`<div><code>CODE</code></div>`);
});
