import mermaid from "mermaid";

window.onload = () => {
  /* TAB GROUPS */

  document.querySelectorAll(".dj-tab-heading").forEach((el) => {
    const contentCls = (el as HTMLElement).dataset.tabId;
    const groupCls = (el as HTMLElement).dataset.tabGroup;
    el.addEventListener("click", (e) => {
      document.querySelectorAll("." + groupCls).forEach((contentEl) => {
        contentEl.classList.remove("m-active");
      });
      document.querySelectorAll("." + contentCls).forEach((contentEl) => {
        contentEl.classList.add("m-active");
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
};
