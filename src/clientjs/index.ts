import mermaid from "mermaid";

window.onload = () => {
  /* TAB GROUPS */

  document.querySelectorAll(".tab-group").forEach((tabsEl) => {
    tabsEl.querySelectorAll(".dj-tab-heading").forEach((el) => {
      const contentCls = (el as HTMLElement).dataset.tabId;
      const groupCls = (el as HTMLElement).dataset.tabGroup;
      el.addEventListener("click", (e) => {
        tabsEl.querySelectorAll("." + groupCls).forEach((contentEl) => {
          contentEl.classList.remove("m-active");
        });
        tabsEl.querySelectorAll("." + contentCls).forEach((contentEl) => {
          contentEl.classList.add("m-active");
        });
      });
    });
  });

  /* CLOSE ON-THIS-PAGE POPOVER WHEN CLICKING LINKS INSIDE IT */

  document
    .querySelectorAll("details.DJTableOfContents")
    .forEach((popoverEl) => {
      popoverEl.querySelectorAll("a").forEach((linkEl) => {
        (linkEl as HTMLAnchorElement).addEventListener("click", (e) => {
          (popoverEl as HTMLDetailsElement).open = false;
          return true;
        });
      });
    });

  /* MERMAID */

  // Replace all <pre><code class="language-mermaid">...</code></pre> with just <pre class="mermaid"></pre>
  [...document.querySelectorAll("pre code.language-mermaid")].map((codeEl) => {
    const parent = codeEl.parentElement!;
    parent.innerHTML = codeEl.innerHTML;
    parent.className = "language-mermaid";
  });

  mermaid.run({ querySelector: ".language-mermaid" });

  window.dispatchEvent(new Event("dj-onload"));
};
