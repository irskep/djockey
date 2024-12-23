import lunr from "lunr";

/**
 * This is a lot of hacky bullshit. The main thing is there's a popover element, a debounced input
 * field, a search function, and a function that builds an HTML string to plop into the results.
 */

interface MatchData {
  metadata: Record<
    string,
    Record<keyof SearchDoc, { position: [number, number][] }>
  >;
}

interface SearchDoc {
  name: string;
  url: string;
  text: string;
}

function doSearch(
  docsByRef: Record<string, SearchDoc>,
  l: lunr.Index,
  query: string,
  resultEl: HTMLDivElement
) {
  if (!query.trim().length) {
    resultEl.innerHTML = `<div class="DJSearchResults_Empty m-noquery">Type a search into the box.</div>`;
    return;
  }
  const results = l.query(function (q) {
    q.term(query, { boost: 100, usePipeline: true });
    q.term(query, {
      boost: 10,
      usePipeline: false,
      wildcard: lunr.Query.wildcard.TRAILING,
    });
    q.term(query, { boost: 1, editDistance: 1 });
  });

  if (!results.length) {
    resultEl.innerHTML = `<div class="DJSearchResults_Empty m-noresults">No results found.</div>`;
    return;
  }

  resultEl.innerHTML = results
    .map((r) => buildResultHTML(r, docsByRef[r.ref]))
    .join("\n");
}

function buildResultHTML(result: lunr.Index.Result, doc: SearchDoc): string {
  const metadata = (result.matchData as MatchData).metadata;
  return `
  <a class="DJSearchResult" tabindex="0" href="${doc.url}">
    <h1>${buildHighlightedTermsHTML(doc.name, "name", metadata, false)}</h1>
    <div class="DJSearchResult_Text">${buildHighlightedTermsHTML(
      doc.text,
      "text",
      metadata,
      true
    )}</div>
  </div>`;
}

interface SubstringLine {
  startInclusive: number;
  endExclusive: number;
  text: string;
}

function buildHighlightedTermsHTML(
  text: string,
  metadataKey: keyof SearchDoc,
  metadata: MatchData["metadata"], // term: field: position[]
  useParagraphs: boolean
): string {
  const result = new Array<string>();
  let positions = new Array<[number, number]>();

  for (const termMetadata of Object.values(metadata)) {
    if (!termMetadata[metadataKey]) continue;
    positions = positions.concat(termMetadata[metadataKey].position);
  }
  positions.sort((a, b) => a[0] - b[0]);

  let textIndex = 0;

  function getNextLine(): null | SubstringLine {
    if (textIndex >= text.length) return null;
    const lbIndex = text.indexOf("\n", textIndex);
    const originalTextIndex = textIndex;
    let substring = "";
    if (lbIndex >= 0) {
      substring = text.slice(textIndex, lbIndex);
      textIndex = lbIndex + 1;
    } else {
      substring = text.slice(textIndex);
      textIndex = text.length;
    }
    return {
      startInclusive: originalTextIndex,
      endExclusive: textIndex,
      text: substring,
    };
  }

  if (useParagraphs) {
    let nextLine = getNextLine();
    while (nextLine) {
      // WARNING: N^2 ALGORITHM!
      const relevantPositions = positions.filter(
        (pos) =>
          pos[0] >= nextLine!.startInclusive && pos[0] < nextLine!.endExclusive
      );
      if (relevantPositions.length)
        result.push(`<p>${lineToHTML(nextLine, relevantPositions)}`);
      nextLine = getNextLine();
    }
  } else {
    result.push(
      lineToHTML(
        { startInclusive: 0, endExclusive: text.length, text },
        positions
      )
    );
  }

  return result.join("\n");
}

function lineToHTML(
  line: SubstringLine,
  positions: [number, number][]
): string {
  const result = new Array<string>();

  let lastPlainIndex = 0;

  for (const [start, len] of positions) {
    const localStart = start - line.startInclusive;
    if (localStart > lastPlainIndex) {
      result.push(line.text.slice(lastPlainIndex, localStart));
    }
    result.push("<mark>");
    result.push(line.text.slice(localStart, localStart + len));
    result.push("</mark>");
    lastPlainIndex = localStart + len;
  }

  if (lastPlainIndex < line.text.length) {
    result.push(line.text.slice(lastPlainIndex));
  }

  if (!result.length) return "";

  return result.join("");
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

  const popoverEl = document.querySelector(
    "#dj-search-menu"
  )! as HTMLDivElement;
  if (!popoverEl) return;

  // The flex container seems to prevent the backdrop from getting click events. :-(
  // So just close the damn thing on click.
  document.querySelectorAll(".DJSearchMenu_FlexContainer").forEach((flexEl) => {
    flexEl.addEventListener("click", (e) => {
      if (e.target !== flexEl) return;
      popoverEl.hidePopover();
    });
  });

  const win = window as {
    djSearchIndex?: { name: string; text: string; url: string }[];
  };
  if (!win.djSearchIndex) {
    console.warn("Search index not found");
    return;
  }
  const searchIndex = win.djSearchIndex;

  const docsByRef: Record<string, SearchDoc> = {};

  const l = lunr(function () {
    this.ref("url");
    this.field("name");
    this.field("text");
    this.field("url");

    this.metadataWhitelist = ["position"];

    for (const doc of searchIndex) {
      this.add(doc);
      docsByRef[doc.url] = doc;
    }
  });

  function debounce(
    func: Function,
    wait: number,
    immediate: boolean = false,
    alwaysImmediateCallback?: () => void
  ): typeof func {
    let timeout: any | null = null;
    return function (this: unknown) {
      let context = this;
      let args = arguments;
      let later = function () {
        timeout = null;
        if (!immediate) func.apply(context, args);
      };
      let callNow = immediate && !timeout;
      clearTimeout(timeout!);
      timeout = setTimeout(later, wait);
      if (alwaysImmediateCallback) alwaysImmediateCallback();
      if (callNow) func.apply(context, args);
    };
  }

  const debouncedSearcher = debounce((query: string) => {
    doSearch(docsByRef, l, query, resultEl);
  }, 500);

  // use 'input' for keystrokes, 'change' for enter or unfocus
  inputEl.addEventListener("input", (e) => {
    debouncedSearcher((e.target! as HTMLInputElement).value);
  });

  (
    document.querySelector(".DJOpenSearchButton")! as HTMLButtonElement
  ).addEventListener("click", (e) => {
    e.preventDefault();
    popoverEl.showPopover();
    inputEl.focus();
    return true;
  });

  window.addEventListener("keydown", (e) => {
    if (popoverEl.matches(":popover-open")) return;
    if (e.key === "/") {
      popoverEl.showPopover();
      inputEl.focus();
      e.preventDefault();
    }
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      popoverEl.hidePopover();
    }
  });
});
