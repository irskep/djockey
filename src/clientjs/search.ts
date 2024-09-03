import lunr from "lunr";

interface MatchData {
  metadata: Record<string, unknown>;
}

function doSearch(l: lunr.Index, query: string, resultEl: HTMLDivElement) {
  const results = l.query(function (q) {
    q.term(query, { boost: 100, usePipeline: true });
    q.term(query, {
      boost: 10,
      usePipeline: false,
      wildcard: lunr.Query.wildcard.TRAILING,
    });
    q.term(query, { boost: 1, editDistance: 1 });
  });
  console.log(results);

  resultEl.innerHTML = results.map((r) => buildResultHTML(r, query)).join("\n");
}

function buildResultHTML(result: lunr.Index.Result, query: string): string {
  console.log(result.matchData.metadata);
  return `
  <div class="DJSearchResult">
    <h1>${result.ref}</h1>
    <div>${JSON.stringify((result.matchData as MatchData).metadata)}</div>
  </div>`;
}

window.addEventListener("dj-onload", () => {
  const inputEl = document.querySelector(
    "#dj-search-input"
  ) as HTMLInputElement | null;
  if (!inputEl) return;

  const resultEl = document.querySelector(
    "#dj-search-menu-results"
  )! as HTMLDivElement;
  if (!resultEl) return;

  const win = window as { djSearchIndex?: { name: string; text: string }[] };
  if (!win.djSearchIndex) {
    console.warn("Search index not found");
    return;
  }
  const searchIndex = win.djSearchIndex;

  const l = lunr(function () {
    this.ref("name");
    this.field("text");

    for (const doc of searchIndex) {
      this.add(doc);
    }
  });

  (document.querySelector("#dj-search-menu")! as HTMLDivElement).showPopover();

  // use 'input' for keystrokes, 'change' for enter or unfocus
  inputEl.addEventListener("change", (e) => {
    console.log(e);

    doSearch(l, (e.target! as HTMLInputElement).value, resultEl);
  });

  (
    document.querySelector(".DJOpenSearchButton")! as HTMLButtonElement
  ).addEventListener("click", () => {
    inputEl.focus();
    return true;
  });
});
